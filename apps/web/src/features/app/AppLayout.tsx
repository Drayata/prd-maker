import { FileText, LogOut, Moon, Settings, Sun, Waypoints } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

export function ProtectedRoute() {
  const auth = useAuthStore();
  const location = useLocation();
  if (!auth.initialized)
    return (
      <div className="grid min-h-screen place-content-center" aria-label={t('common.loading')} />
    );
  return auth.user ? (
    <Outlet />
  ) : (
    <Navigate to="/masuk" state={{ from: location.pathname }} replace />
  );
}
export default function AppLayout() {
  const auth = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    const theme = auth.user?.theme ?? 'system';
    const dark =
      theme === 'dark' ||
      (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, [auth.user?.theme]);
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    auth.clear();
    void navigate('/masuk');
  }
  async function toggleTheme() {
    if (!auth.user || !auth.accessToken) return;
    const theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    const result = await api<{ user: typeof auth.user }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    });
    auth.setSession(result.user, auth.accessToken);
  }
  return (
    <div className="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/app" className="font-semibold">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-2" aria-label={t('app.navigation')}>
            <button
              onClick={() => void toggleTheme()}
              className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              aria-label={t('app.theme')}
            >
              {document.documentElement.classList.contains('dark') ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <button
              onClick={() => void logout()}
              className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              aria-label={t('app.logout')}
            >
              <LogOut size={18} />
            </button>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[14rem_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-neutral-200 p-4 md:block dark:border-neutral-800">
          <nav className="space-y-1">
            <Link
              className="flex items-center gap-3 rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900"
              to="/app"
            >
              <FileText size={17} />
              {t('app.documents')}
            </Link>
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              to="/app/providers"
            >
              <Waypoints size={17} />
              {t('app.providers')}
            </Link>
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              to="/app/settings"
            >
              <Settings size={17} />
              {t('app.settings')}
            </Link>
          </nav>
        </aside>
        <main className="p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  return (
    <section>
      <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
        {t('app.dashboard')}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {t('app.welcome').replace('{name}', user?.name ?? '')}
      </h1>
      <div className="mt-10 rounded-lg border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
        <FileText className="mx-auto text-neutral-400" />
        <h2 className="mt-4 font-medium">{t('app.empty.title')}</h2>
        <p className="mt-2 text-sm text-neutral-500">{t('app.empty.body')}</p>
      </div>
    </section>
  );
}
