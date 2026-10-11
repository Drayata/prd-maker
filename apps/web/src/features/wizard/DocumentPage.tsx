import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
interface DocumentData {
  title: string;
  status: string;
  sections: Array<{
    id: string;
    title: string;
    contentMd: string;
    status: string;
    lastError?: string;
  }>;
}
export default function DocumentPage() {
  const { id } = useParams();
  const [document, setDocument] = useState<DocumentData>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (id)
      void api<{ document: DocumentData }>(`/documents/${id}`)
        .then((result) => setDocument(result.document))
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Gagal memuat dokumen.'),
        );
  }, [id]);
  if (error) return <p role="alert">{error}</p>;
  if (!document) return <p>Memuat dokumen...</p>;
  return (
    <article className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-neutral-500">{document.status}</p>
          <h1 className="mt-2 text-3xl font-semibold">{document.title}</h1>
        </div>
        <Link to="/app/new" className="rounded-md border px-3 py-2 text-sm">
          PRD Baru
        </Link>
      </div>
      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id}>
            <h2 className="border-b pb-2 text-xl font-semibold">{section.title}</h2>
            {section.status === 'failed' ? (
              <p className="mt-3 text-red-500">Gagal: {section.lastError}</p>
            ) : (
              <pre className="mt-4 whitespace-pre-wrap font-sans leading-7 text-neutral-700 dark:text-neutral-300">
                {section.contentMd || 'Belum dibuat.'}
              </pre>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
