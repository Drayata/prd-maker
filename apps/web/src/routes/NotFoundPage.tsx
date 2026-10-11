import { Link } from 'react-router-dom';
import { t } from '../i18n';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-content-center gap-5 bg-white text-center text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <p className="font-mono text-sm text-neutral-500">404</p>
      <h1 className="text-3xl font-semibold">{t('notFound.title')}</h1>
      <Link className="underline underline-offset-4" to="/">
        {t('notFound.home')}
      </Link>
    </main>
  );
}
