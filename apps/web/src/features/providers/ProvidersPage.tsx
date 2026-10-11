import { Copy, PlugZap, Plus, Server, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { providerPresets, type ProviderInput } from '@prdforge/shared';
import { t } from '../../i18n';
import { api, ApiError } from '../../lib/api';

interface Provider extends Omit<ProviderInput, 'apiKey'> {
  id: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}
const empty: ProviderInput = {
  name: '',
  type: 'openai_compatible',
  baseUrl: '',
  apiKey: '',
  defaultModel: '',
  customHeaders: {},
  extraBodyParams: {},
  defaultParams: {},
  supportsStreaming: true,
  supportsJsonMode: false,
  modelProfile: 'medium',
  timeoutMs: 120000,
  inputPricePerM: null,
  outputPricePerM: null,
  isDefault: false,
};
export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null | undefined>();
  const [form, setForm] = useState<ProviderInput>(empty);
  const [headersJson, setHeadersJson] = useState('{}');
  const [extraJson, setExtraJson] = useState('{}');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  async function load() {
    const list = await api<{ providers: Provider[] }>('/providers');
    setProviders(list.providers);
  }
  useEffect(() => {
    void load().catch((cause) =>
      setError(cause instanceof Error ? cause.message : t('providers.error.load')),
    );
  }, []);
  function open(provider?: Provider) {
    setEditing(provider ?? null);
    setForm(provider ? { ...provider, apiKey: '' } : empty);
    setHeadersJson(JSON.stringify(provider?.customHeaders ?? {}, null, 2));
    setExtraJson(JSON.stringify(provider?.extraBodyParams ?? {}, null, 2));
    setModels([]);
    setError('');
    setMessage('');
  }
  function preset(id: string) {
    const value = providerPresets.find((item) => item.id === id);
    if (value)
      setForm((current) => ({
        ...current,
        name: value.name,
        type: value.type,
        baseUrl: value.baseUrl,
        defaultModel: value.exampleModel,
      }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        customHeaders: JSON.parse(headersJson) as Record<string, string>,
        extraBodyParams: JSON.parse(extraJson) as Record<string, unknown>,
      };
      if (editing)
        await api(`/providers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/providers', { method: 'POST', body: JSON.stringify(payload) });
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof SyntaxError
            ? t('providers.error.json')
            : t('providers.error.save'),
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(path: string, method = 'POST', provider?: Provider) {
    setError('');
    setMessage('');
    try {
      const result = await api<{ ok?: boolean; message?: string; models?: string[] }>(path, {
        method,
      });
      if (result.models) {
        if (provider) open(provider);
        setModels(result.models);
      }
      setMessage(result.message ?? t('providers.action.success'));
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('providers.error.action'));
    }
  }
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            {t('providers.eyebrow')}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t('providers.title')}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t('providers.description')}</p>
        </div>
        <button
          onClick={() => open()}
          className="flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-black"
        >
          <Plus size={17} />
          {t('providers.add')}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {message}
        </p>
      )}
      {providers.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <Server className="mx-auto text-neutral-400" />
          <h2 className="mt-4 font-medium">{t('providers.empty.title')}</h2>
          <p className="mt-2 text-sm text-neutral-500">{t('providers.empty.body')}</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article
              key={provider.id}
              className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{provider.name}</h2>
                    {provider.isDefault && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-neutral-500">
                    {provider.type} / {provider.defaultModel}
                  </p>
                </div>
                <button
                  onClick={() => open(provider)}
                  className="text-sm underline underline-offset-4"
                >
                  Ubah
                </button>
              </div>
              <p className="mt-5 truncate text-sm text-neutral-500">{provider.baseUrl}</p>
              <p className="mt-1 font-mono text-xs text-neutral-500">
                {provider.hasApiKey ? provider.apiKeyMasked : 'Tanpa API key'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => void action(`/providers/${provider.id}/test`)}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs"
                >
                  <PlugZap size={14} />
                  Tes koneksi
                </button>
                <button
                  onClick={() => void action(`/providers/${provider.id}/models`, 'GET', provider)}
                  className="rounded-md border px-3 py-2 text-xs"
                >
                  Ambil model
                </button>
                <button
                  onClick={() => void action(`/providers/${provider.id}/duplicate`)}
                  aria-label="Duplikat"
                  className="rounded-md border p-2"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Hapus provider ini?'))
                      void action(`/providers/${provider.id}`, 'DELETE');
                  }}
                  aria-label="Hapus"
                  className="rounded-md border p-2 text-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Form provider"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 sm:p-6"
        >
          <form
            onSubmit={(event) => void save(event)}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white px-6 text-neutral-950 shadow-xl sm:max-h-[calc(100dvh-3rem)] dark:bg-neutral-950 dark:text-white"
          >
            <div className="sticky top-0 z-10 -mx-6 flex justify-between border-b border-neutral-200 bg-white px-6 py-5 dark:border-neutral-800 dark:bg-neutral-950">
              <h2 className="text-xl font-semibold">
                {editing ? 'Ubah provider' : 'Tambah provider'}
              </h2>
              <button type="button" onClick={() => setEditing(undefined)} aria-label="Tutup">
                <X />
              </button>
            </div>
            <fieldset className="mt-6">
              <legend className="text-sm">Preset</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {providerPresets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => preset(item.id)}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-left text-xs hover:border-neutral-950 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-white dark:hover:bg-neutral-900"
                  >
                    <span className="block font-medium">{item.name}</span>
                    {item.exampleModel && (
                      <span className="mt-1 block truncate font-mono text-[10px] text-neutral-500">
                        {item.exampleModel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Nama"
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
              />
              <fieldset>
                <legend className="text-sm">Tipe</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    ['openai_compatible', 'anthropic', 'google_gemini', 'ollama_native'] as const
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={form.type === type}
                      onClick={() => setForm({ ...form, type })}
                      className={`rounded-md border px-3 py-2.5 text-left text-xs transition-colors ${
                        form.type === type
                          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-4">
              <Input
                label="Base URL"
                value={form.baseUrl}
                onChange={(baseUrl) => setForm({ ...form, baseUrl })}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Model default"
                value={form.defaultModel}
                onChange={(defaultModel) => setForm({ ...form, defaultModel })}
              />
              <Input
                label={
                  editing
                    ? 'API key baru (kosong = tidak berubah)'
                    : 'API key (opsional untuk lokal)'
                }
                type="password"
                required={false}
                value={form.apiKey ?? ''}
                onChange={(apiKey) => setForm({ ...form, apiKey })}
              />
            </div>
            <details className="mt-5 border-t pt-5">
              <summary className="cursor-pointer text-sm font-medium">Pengaturan lanjutan</summary>
              <label className="mt-4 block text-sm">
                Custom headers JSON
                <textarea
                  className="input min-h-24 font-mono"
                  value={headersJson}
                  onChange={(event) => setHeadersJson(event.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm">
                Extra body JSON
                <textarea
                  className="input min-h-24 font-mono"
                  value={extraJson}
                  onChange={(event) => setExtraJson(event.target.value)}
                />
              </label>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
                />
                Jadikan provider default
              </label>
            </details>
            {models.length > 0 && (
              <fieldset className="mt-5">
                <legend className="text-sm">Model tersedia</legend>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-neutral-300 p-1 dark:border-neutral-700">
                  {models.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setForm({ ...form, defaultModel: model })}
                      className={`block w-full rounded px-3 py-2 text-left font-mono text-xs ${
                        form.defaultModel === model
                          ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="sticky bottom-0 -mx-6 mt-7 flex justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-5 dark:border-neutral-800 dark:bg-neutral-950">
              <button
                type="button"
                onClick={() => setEditing(undefined)}
                className="rounded-md border px-4 py-2.5 text-sm"
              >
                Batal
              </button>
              <button
                disabled={busy}
                className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {busy ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        required={required}
        className="input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
