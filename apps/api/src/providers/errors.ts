export type ProviderErrorCode =
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'bad_request'
  | 'network'
  | 'unknown';
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: ProviderErrorCode,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
  }
}
export class ProviderAuthError extends ProviderError {
  constructor(status = 401) {
    super('API key ditolak oleh provider.', 'auth', status);
  }
}
export class ProviderRateLimitError extends ProviderError {
  constructor() {
    super('Batas permintaan provider tercapai. Coba lagi beberapa saat.', 'rate_limit', 429, true);
  }
}
export class ProviderTimeoutError extends ProviderError {
  constructor() {
    super('Provider tidak merespons dalam batas waktu.', 'timeout', 408, true);
  }
}
export class ProviderBadRequestError extends ProviderError {
  constructor(message = 'Konfigurasi, model, atau permintaan provider tidak valid.', status = 400) {
    super(message, 'bad_request', status);
  }
}
export class ProviderNetworkError extends ProviderError {
  constructor() {
    super('Provider tidak dapat dijangkau. Periksa URL dan jaringan.', 'network', undefined, true);
  }
}
export class ProviderUnknownError extends ProviderError {
  constructor(status?: number) {
    super(
      'Provider mengembalikan kesalahan yang tidak dikenal.',
      'unknown',
      status,
      status !== undefined && status >= 500,
    );
  }
}

export function mapProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof DOMException && error.name === 'AbortError')
    return new ProviderTimeoutError();
  if (error instanceof TypeError) return new ProviderNetworkError();
  return new ProviderUnknownError();
}
export function mapHttpError(status: number): ProviderError {
  if (status === 401 || status === 403) return new ProviderAuthError(status);
  if (status === 429) return new ProviderRateLimitError();
  if (status === 400 || status === 404 || status === 422)
    return new ProviderBadRequestError(
      status === 404 ? 'Base URL atau model provider tidak ditemukan.' : undefined,
      status,
    );
  return new ProviderUnknownError(status);
}
