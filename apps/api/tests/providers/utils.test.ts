import { describe, expect, it } from 'vitest';
import { lines, withRetry } from '../../src/providers/utils.js';
import { ProviderBadRequestError, ProviderNetworkError } from '../../src/providers/errors.js';

function stream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

describe('provider utils', () => {
  it('memproses baris yang terpotong antar chunk', async () => {
    const result: string[] = [];
    for await (const line of lines(stream(['data: {"a":', '1}\n\ndata: done\n'])))
      result.push(line);
    expect(result).toEqual(['data: {"a":1}', '', 'data: done']);
  });
  it('retry maksimal dua kali untuk error sementara', async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts += 1;
        if (attempts < 3) throw new ProviderNetworkError();
        return 'ok';
      }),
    ).resolves.toBe('ok');
    expect(attempts).toBe(3);
  });
  it('tidak retry error 4xx', async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts += 1;
        throw new ProviderBadRequestError();
      }),
    ).rejects.toBeInstanceOf(ProviderBadRequestError);
    expect(attempts).toBe(1);
  });
});
