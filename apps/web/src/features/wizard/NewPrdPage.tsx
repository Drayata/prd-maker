import { ArrowLeft, ArrowRight, Check, LoaderCircle, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ClarificationRequest, DocumentInput, TemplateSection } from '@prdforge/shared';
import { api, ApiError } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
interface Provider {
  id: string;
  name: string;
  defaultModel: string;
  isDefault: boolean;
}
interface Template {
  id: string;
  name: string;
  description: string;
  depthDefault: 'ringkas' | 'standar' | 'mendalam';
  sections: TemplateSection[];
}
interface WizardForm {
  title: string;
  description: string;
  prdType: 'produk_baru' | 'fitur_baru' | 'iterasi' | 'internal';
  targetUsers: string;
  platforms: string[];
  constraints: string;
  competitors: string;
  language: 'id' | 'en';
  depth: 'ringkas' | 'standar' | 'mendalam';
  templateId: string;
  providerId: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
interface Question {
  id: string;
  question: string;
  why: string;
  suggestedAnswers: string[];
}
const API_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1');
export default function NewPrdPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<WizardForm>({
    title: '',
    description: '',
    prdType: 'produk_baru' as const,
    targetUsers: '',
    platforms: ['web'] as string[],
    constraints: '',
    competitors: '',
    language: 'id' as const,
    depth: 'standar' as const,
    templateId: '',
    providerId: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2500,
  });
  useEffect(() => {
    void Promise.all([
      api<{ providers: Provider[] }>('/providers'),
      api<{ templates: Template[] }>('/templates'),
    ])
      .then(([p, t]) => {
        setProviders(p.providers);
        setTemplates(t.templates);
        const provider = p.providers.find((item) => item.isDefault) ?? p.providers[0];
        const template = t.templates.find((item) => item.name === 'Standar') ?? t.templates[0];
        setForm((value) => ({
          ...value,
          providerId: provider?.id ?? '',
          model: provider?.defaultModel ?? '',
          templateId: template?.id ?? '',
          depth: template?.depthDefault ?? 'standar',
        }));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat data.'));
  }, []);
  function context(): ClarificationRequest {
    return {
      title: form.title,
      providerId: form.providerId,
      model: form.model,
      language: form.language,
      input: {
        description: form.description,
        prdType: form.prdType,
        targetUsers: form.targetUsers,
        platforms: form.platforms as ('web' | 'mobile' | 'desktop' | 'api' | 'lainnya')[],
        constraints: form.constraints,
        competitors: form.competitors,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
      },
    };
  }
  async function clarify() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ questions: Question[] }>('/generate/clarifying-questions', {
        method: 'POST',
        body: JSON.stringify(context()),
      });
      setQuestions(result.questions);
      setStep(3);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Gagal membuat pertanyaan.');
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError('');
    setStep(4);
    try {
      const payload: DocumentInput = {
        ...context(),
        templateId: form.templateId,
        depth: form.depth,
        generationMode: 'per_section',
        clarifications: questions
          .map((q) => ({ id: q.id, question: q.question, answer: answers[q.id] ?? '' }))
          .filter((a) => a.answer),
      };
      const created = await api<{
        document: { id: string; sections: Array<{ id: string; title: string }> };
      }>('/documents', { method: 'POST', body: JSON.stringify(payload) });
      setProgress(
        Object.fromEntries(created.document.sections.map((s) => [s.id, `${s.title}: menunggu`])),
      );
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch(
        `${API_URL}/generate/documents/${created.document.id}/generate`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body) throw new Error('Stream generation gagal.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const block of events) {
          if (block.startsWith(':')) continue;
          const event = /event: (.+)/.exec(block)?.[1];
          const dataLine = /data: (.+)/.exec(block)?.[1];
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine) as {
            sectionId?: string;
            title?: string;
            status?: string;
            message?: string;
          };
          if (event === 'section_start' && data.sectionId)
            setProgress((p) => ({ ...p, [data.sectionId!]: `${data.title}: menghasilkan...` }));
          if (event === 'section_end' && data.sectionId)
            setProgress((p) => ({ ...p, [data.sectionId!]: 'Selesai' }));
          if (event === 'error' && data.sectionId)
            setProgress((p) => ({ ...p, [data.sectionId!]: `Gagal: ${data.message}` }));
          if (event === 'done') void navigate(`/app/documents/${created.document.id}`);
        }
      }
    } catch (cause) {
      if ((cause as Error).name !== 'AbortError')
        setError(cause instanceof Error ? cause.message : 'Generation gagal.');
    } finally {
      setBusy(false);
    }
  }
  const canNext =
    form.title.trim().length >= 2 &&
    form.description.trim().length >= 20 &&
    form.platforms.length > 0;
  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/app" aria-label="Kembali">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            PRD Baru / Langkah {step} dari 4
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {
              [
                '',
                'Ide dan Konteks',
                'Template dan Kedalaman',
                'Pertanyaan Klarifikasi',
                'Generate',
              ][step]
            }
          </h1>
        </div>
      </div>
      <div className="mt-8 flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={`h-1 flex-1 rounded ${item <= step ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`}
          />
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {step === 1 && (
        <div className="mt-8 space-y-5">
          <Input
            label="Judul produk atau fitur"
            value={form.title}
            onChange={(title) => setForm({ ...form, title })}
          />
          <label className="block text-sm">
            Deskripsi ide
            <textarea
              className="input min-h-40"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Target pengguna (opsional)"
              value={form.targetUsers}
              onChange={(targetUsers) => setForm({ ...form, targetUsers })}
            />
            <Input
              label="Batasan (opsional)"
              value={form.constraints}
              onChange={(constraints) => setForm({ ...form, constraints })}
            />
          </div>
          <fieldset>
            <legend className="text-sm">Platform</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {['web', 'mobile', 'desktop', 'api', 'lainnya'].map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() =>
                    setForm({
                      ...form,
                      platforms: form.platforms.includes(item)
                        ? form.platforms.filter((x) => x !== item)
                        : [...form.platforms, item],
                    })
                  }
                  className={`rounded-md border px-3 py-2 text-sm ${form.platforms.includes(item) ? 'bg-neutral-950 text-white dark:bg-white dark:text-black' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            disabled={!canNext}
            onClick={() => setStep(2)}
            className="float-right flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            Lanjut
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="mt-8">
          <h2 className="font-medium">Pilih template</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {templates.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setForm({ ...form, templateId: item.id, depth: item.depthDefault })}
                className={`rounded-lg border p-4 text-left ${form.templateId === item.id ? 'border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-900' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                <b>{item.name}</b>
                <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
                <p className="mt-3 font-mono text-xs text-neutral-500">
                  {item.sections.length} bagian
                </p>
              </button>
            ))}
          </div>
          {providers.length === 0 ? (
            <div className="mt-6 rounded-md border border-amber-700 p-4 text-sm">
              Belum ada provider.{' '}
              <Link className="underline" to="/app/providers">
                Tambah provider
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Provider
                <div className="mt-2 grid gap-2">
                  {providers.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setForm({ ...form, providerId: p.id, model: p.defaultModel })}
                      className={`rounded-md border px-3 py-2 text-left ${form.providerId === p.id ? 'border-white bg-neutral-900' : ''}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </label>
              <Input
                label="Model"
                value={form.model}
                onChange={(model) => setForm({ ...form, model })}
              />
            </div>
          )}
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-md border px-4 py-2.5">
              Kembali
            </button>
            <button
              disabled={!form.providerId || !form.templateId || busy}
              onClick={() => void clarify()}
              className="rounded-md bg-neutral-950 px-4 py-2.5 text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {busy ? 'Memuat...' : 'Buat pertanyaan'}
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-8 space-y-5">
          {questions.map((q) => (
            <label
              key={q.id}
              className="block rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
            >
              <span className="font-medium">{q.question}</span>
              <span className="mt-1 block text-xs text-neutral-500">{q.why}</span>
              <textarea
                className="input min-h-20"
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {q.suggestedAnswers.map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => setAnswers({ ...answers, [q.id]: a })}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </label>
          ))}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="rounded-md border px-4 py-2.5">
              Kembali
            </button>
            <button
              onClick={() => void generate()}
              className="rounded-md bg-neutral-950 px-4 py-2.5 text-white dark:bg-white dark:text-black"
            >
              Generate PRD
            </button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="mt-8">
          <div className="space-y-2">
            {Object.entries(progress).map(([id, status]) => (
              <div key={id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                {status === 'Selesai' ? (
                  <Check size={17} />
                ) : (
                  <LoaderCircle className="animate-spin" size={17} />
                )}
                <span>{status}</span>
              </div>
            ))}
          </div>
          {busy && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="mt-6 flex items-center gap-2 rounded-md border px-4 py-2.5"
            >
              <Square size={14} />
              Stop
            </button>
          )}
        </div>
      )}
    </section>
  );
}
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
