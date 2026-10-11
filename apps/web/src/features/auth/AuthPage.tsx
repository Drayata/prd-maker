import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@prdforge/shared';
import { cloneElement, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { t } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import { useAuthStore, type User } from '../../stores/auth';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore();
  const [serverError, setServerError] = useState('');
  const schema = mode === 'login' ? loginSchema : registerSchema;
  const form = useForm<LoginInput | RegisterInput>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === 'login' ? { email: '', password: '' } : { name: '', email: '', password: '' },
  });
  if (session.user) return <Navigate to="/app" replace />;
  async function submit(values: LoginInput | RegisterInput) {
    setServerError('');
    try {
      const result = await api<{ user: User; accessToken: string }>(
        `/auth/${mode === 'login' ? 'login' : 'register'}`,
        { method: 'POST', body: JSON.stringify(values) },
      );
      session.setSession(result.user, result.accessToken);
      void navigate((location.state as { from?: string } | null)?.from ?? '/app', {
        replace: true,
      });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : t('auth.error.generic'));
    }
  }
  return (
    <main className="grid min-h-screen bg-white text-neutral-950 lg:grid-cols-2 dark:bg-neutral-950 dark:text-white">
      <section className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
        <Link to="/" className="font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <div className="my-auto w-full max-w-sm self-center py-16">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-neutral-500">
            {mode === 'login' ? t('auth.login.eyebrow') : t('auth.register.eyebrow')}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {mode === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>
          <form
            className="mt-9 space-y-5"
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            noValidate
          >
            {mode === 'register' && (
              <Field
                label={t('auth.name')}
                error={
                  'name' in form.formState.errors ? form.formState.errors.name?.message : undefined
                }
              >
                <input {...form.register('name')} autoComplete="name" />
              </Field>
            )}
            <Field label={t('auth.email')} error={form.formState.errors.email?.message}>
              <input {...form.register('email')} type="email" autoComplete="email" />
            </Field>
            <Field
              label={t('auth.password')}
              hint={mode === 'register' ? t('auth.passwordHint') : undefined}
              error={form.formState.errors.password?.message}
            >
              <input
                {...form.register('password')}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>
            {serverError && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {serverError}
              </p>
            )}
            <button
              disabled={form.formState.isSubmitting}
              className="w-full rounded-md bg-neutral-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {form.formState.isSubmitting
                ? t('auth.submitting')
                : mode === 'login'
                  ? t('auth.login.submit')
                  : t('auth.register.submit')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-neutral-500">
            {mode === 'login' ? t('auth.login.switch') : t('auth.register.switch')}{' '}
            <Link
              className="font-medium text-neutral-950 underline underline-offset-4 dark:text-white"
              to={mode === 'login' ? '/daftar' : '/masuk'}
            >
              {mode === 'login' ? t('nav.register') : t('nav.login')}
            </Link>
          </p>
        </div>
      </section>
      <aside className="hidden border-l border-neutral-200 bg-neutral-50 p-16 lg:flex lg:flex-col lg:justify-end dark:border-neutral-800 dark:bg-neutral-900">
        <blockquote className="max-w-lg text-3xl font-medium leading-tight tracking-tight">
          “{t('auth.quote')}”
        </blockquote>
        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-neutral-500">
          {t('auth.quoteBy')}
        </p>
      </aside>
    </main>
  );
}
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactElement<{ className?: string; 'aria-invalid'?: boolean }>;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="ml-2 font-normal text-neutral-500">{hint}</span>}
      <span className="mt-2 block">
        {cloneElement(children, {
          className:
            'w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-white',
          'aria-invalid': Boolean(error),
        })}
      </span>
      {error && <span className="mt-1 block text-xs text-red-700 dark:text-red-300">{error}</span>}
    </label>
  );
}
