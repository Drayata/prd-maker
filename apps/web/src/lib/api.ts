import { useAuthStore, type User } from '../stores/auth';

const API_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1');
interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok)
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  throw new ApiError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.message ?? 'Permintaan gagal.',
    body.error?.details,
  );
}

export async function refreshSession() {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const result = await parse<{ user: User; accessToken: string }>(response);
  useAuthStore.getState().setSession(result.user, result.accessToken);
  return result;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    await refreshSession();
    return api<T>(path, init, false);
  }
  return parse<T>(response);
}
