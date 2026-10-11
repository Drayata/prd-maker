import { mapProviderError, type ProviderError } from './errors.js';

export async function withRetry<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let lastError: ProviderError | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = mapProviderError(error);
      if (!lastError.retryable || attempt === 2 || signal?.aborted) throw lastError;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 250 * 2 ** attempt);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(mapProviderError(new DOMException('Aborted', 'AbortError')));
          },
          { once: true },
        );
      });
    }
  }
  throw lastError ?? mapProviderError(undefined);
}

export async function* lines(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? '';
      for (const line of parts) yield line;
      if (done) break;
    }
    if (buffer) yield buffer;
  } finally {
    reader.releaseLock();
  }
}
