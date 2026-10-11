import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { refreshSession } from './lib/api';
import { useAuthStore } from './stores/auth';
import './styles/index.css';

const LandingPage = lazy(() => import('./routes/LandingPage'));
const NotFoundPage = lazy(() => import('./routes/NotFoundPage'));
const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const AppLayout = lazy(() => import('./features/app/AppLayout'));
const DashboardPage = lazy(() =>
  import('./features/app/AppLayout').then((module) => ({ default: module.DashboardPage })),
);
const ProtectedRoute = lazy(() =>
  import('./features/app/AppLayout').then((module) => ({ default: module.ProtectedRoute })),
);
const SettingsPage = lazy(() => import('./features/app/SettingsPage'));
const ProvidersPage = lazy(() => import('./features/providers/ProvidersPage'));
const NewPrdPage = lazy(() => import('./features/wizard/NewPrdPage'));
const DocumentPage = lazy(() => import('./features/wizard/DocumentPage'));
const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/masuk', element: <AuthPage mode="login" /> },
  { path: '/daftar', element: <AuthPage mode="register" /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'providers', element: <ProvidersPage /> },
          { path: 'new', element: <NewPrdPage /> },
          { path: 'documents/:id', element: <DocumentPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
const queryClient = new QueryClient();

function Root() {
  const setInitialized = useAuthStore((state) => state.setInitialized);
  useEffect(() => {
    void refreshSession().catch(setInitialized);
  }, [setInitialized]);
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={<div className="grid min-h-screen place-content-center" aria-label="Memuat" />}
      >
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById('root')!).render(<Root />);
