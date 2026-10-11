import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from '@prdforge/shared';
import { useState } from 'react';
import { ZodError } from 'zod';
import { t } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import { useAuthStore, type User } from '../../stores/auth';

export default function SettingsPage() {
  const auth = useAuthStore();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof ZodError
            ? (cause.issues[0]?.message ?? t('auth.error.generic'))
            : t('auth.error.generic'),
      );
    }
  }
  async function updateName() {
    const input = updateProfileSchema.parse({ name });
    const result = await api<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    auth.setSession(result.user, auth.accessToken!);
    setMessage(t('settings.saved'));
  }
  async function changePassword() {
    const input = changePasswordSchema.parse({
      currentPassword,
      newPassword,
    });
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
    auth.clear();
    window.location.assign('/masuk');
  }
  async function deleteAccount() {
    const input = deleteAccountSchema.parse({ password: deletePassword, confirmation });
    await api('/auth/me', { method: 'DELETE', body: JSON.stringify(input) });
    auth.clear();
    window.location.assign('/');
  }
  const inputClass =
    'mt-2 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2.5 dark:border-neutral-700';
  return (
    <section className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
        {t('settings.eyebrow')}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t('settings.title')}</h1>
      {message && (
        <p className="mt-6 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      <form
        className="mt-10 border-t border-neutral-200 py-8 dark:border-neutral-800"
        onSubmit={(event) => {
          event.preventDefault();
          void run(updateName);
        }}
      >
        <h2 className="font-semibold">{t('settings.identity')}</h2>
        <label className="mt-5 block text-sm">
          {t('auth.name')}
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button className="mt-5 rounded-md bg-neutral-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-black">
          {t('settings.save')}
        </button>
      </form>
      <form
        className="border-t border-neutral-200 py-8 dark:border-neutral-800"
        onSubmit={(event) => {
          event.preventDefault();
          void run(changePassword);
        }}
      >
        <h2 className="font-semibold">{t('settings.password.title')}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            {t('settings.password.current')}
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="text-sm">
            {t('settings.password.new')}
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
        </div>
        <button className="mt-5 rounded-md border border-neutral-300 px-4 py-2.5 text-sm dark:border-neutral-700">
          {t('settings.password.submit')}
        </button>
      </form>
      <form
        className="border-t border-red-200 py-8 dark:border-red-950"
        onSubmit={(event) => {
          event.preventDefault();
          void run(deleteAccount);
        }}
      >
        <h2 className="font-semibold text-red-800 dark:text-red-300">
          {t('settings.delete.title')}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">{t('settings.delete.body')}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            {t('auth.password')}
            <input
              className={inputClass}
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </label>
          <label className="text-sm">
            {t('settings.delete.confirm')}
            <input
              className={inputClass}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
        </div>
        <button className="mt-5 rounded-md bg-red-800 px-4 py-2.5 text-sm text-white">
          {t('settings.delete.submit')}
        </button>
      </form>
    </section>
  );
}
