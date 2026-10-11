import { Blocks, KeyRound, PanelsTopLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import { t } from '../i18n';

const features = [
  { icon: Blocks, title: t('features.providers.title'), body: t('features.providers.body') },
  { icon: PanelsTopLeft, title: t('features.sections.title'), body: t('features.sections.body') },
  { icon: KeyRound, title: t('features.keys.title'), body: t('features.keys.body') },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-base font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-5 text-sm">
          <a
            className="hidden text-neutral-600 hover:text-black sm:block dark:text-neutral-400 dark:hover:text-white"
            href="#fitur"
          >
            {t('nav.features')}
          </a>
          <a
            className="hidden text-neutral-600 hover:text-black sm:block dark:text-neutral-400 dark:hover:text-white"
            href="#cara-kerja"
          >
            {t('nav.howItWorks')}
          </a>
          <Link
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            to="/masuk"
          >
            {t('nav.login')}
          </Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid min-h-[70vh] max-w-6xl content-center gap-8 px-5 py-20 lg:grid-cols-[1fr_22rem]">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              {t('hero.eyebrow')}
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              {t('hero.title')}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-400">
              {t('hero.description')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-neutral-950 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
                to="/daftar"
              >
                {t('hero.cta')}
              </Link>
              <a
                className="rounded-md border border-neutral-300 px-5 py-3 text-sm font-medium dark:border-neutral-700"
                href="#cara-kerja"
              >
                {t('hero.secondary')}
              </a>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="hidden self-end border-l border-neutral-200 pl-8 font-mono text-xs leading-7 text-neutral-500 lg:block dark:border-neutral-800"
          >
            <p>01 / konteks produk</p>
            <p>02 / klarifikasi</p>
            <p>03 / outline</p>
            <p>04 / generate per bagian</p>
            <p>05 / tinjau dan ekspor</p>
          </div>
        </section>
        <section id="fitur" className="border-y border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('features.title')}
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 md:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
              {features.map(({ icon: Icon, title, body }) => (
                <article key={title} className="bg-white p-7 dark:bg-neutral-950">
                  <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
                  <h3 className="mt-10 font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="cara-kerja" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('steps.title')}
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {[t('steps.one'), t('steps.two'), t('steps.three')].map((step, index) => (
              <li key={step} className="border-t border-neutral-300 pt-5 dark:border-neutral-700">
                <span className="font-mono text-xs text-neutral-500">0{index + 1}</span>
                <p className="mt-3 font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-neutral-200 px-5 py-8 text-center text-sm text-neutral-500 dark:border-neutral-800">
        {t('footer.tagline')}
      </footer>
    </div>
  );
}
