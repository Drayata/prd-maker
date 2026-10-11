import { resolveSafeUrl } from '../lib/ssrf.js';
import { mapHttpError, mapProviderError, ProviderBadRequestError } from './errors.js';
import type { LLMProvider, ProviderConfig } from './types.js';
import { withRetry } from './utils.js';

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
export abstract class BaseProvider implements LLMProvider {
  constructor(protected readonly config: ProviderConfig) {}
  abstract generate(
    ...args: Parameters<LLMProvider['generate']>
  ): ReturnType<LLMProvider['generate']>;
  abstract stream(...args: Parameters<LLMProvider['stream']>): ReturnType<LLMProvider['stream']>;
  async testConnection() {
    const started = performance.now();
    try {
      const result = await this.generate([{ role: 'user', content: 'Balas dengan kata OK' }], {
        model: this.config.defaultModel,
        maxTokens: 8,
        temperature: 0,
      });
      return {
        ok: true,
        latencyMs: Math.round(performance.now() - started),
        message: result.text.trim() || 'Koneksi berhasil.',
      };
    } catch (error) {
      const mapped = mapProviderError(error);
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        message: mapped.message,
      };
    }
  }
  protected async request(
    path: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<Response> {
    const base = await resolveSafeUrl(new URL(this.config.baseUrl));
    const url = await resolveSafeUrl(
      new URL(`${base.pathname.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, base.origin),
    );
    return withRetry(async () => {
      const timeout = AbortSignal.timeout(this.config.timeoutMs);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
      let response: Response;
      try {
        response = await fetch(url, { ...init, signal: combined, redirect: 'manual' });
      } catch (error) {
        throw mapProviderError(error);
      }
      if (response.status >= 300 && response.status < 400)
        throw new ProviderBadRequestError(
          'Redirect provider diblokir untuk mencegah SSRF.',
          response.status,
        );
      if (!response.ok) throw mapHttpError(response.status);
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > MAX_RESPONSE_BYTES)
        throw new ProviderBadRequestError('Respons provider terlalu besar.');
      return response;
    }, signal);
  }
  protected headers(extra: Record<string, string> = {}) {
    return { 'content-type': 'application/json', ...this.config.customHeaders, ...extra };
  }
  protected body(extra: Record<string, unknown>) {
    return JSON.stringify({ ...extra, ...this.config.extraBodyParams });
  }
}
