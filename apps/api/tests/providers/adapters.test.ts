import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProvider } from '../../src/providers/registry.js';
import type { ProviderConfig } from '../../src/providers/types.js';

const base: ProviderConfig = {
  type: 'openai_compatible',
  baseUrl: 'https://93.184.216.34/v1',
  apiKey: 'secret',
  defaultModel: 'model',
  timeoutMs: 1000,
};
function response(body: unknown, contentType = 'application/json') {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': contentType },
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('provider adapters', () => {
  it('memetakan respons OpenAI-compatible', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await createProvider(base).generate([{ role: 'user', content: 'test' }], {
      model: 'model',
    });
    expect(result).toMatchObject({ text: 'OK', finishReason: 'stop', usage: { totalTokens: 4 } });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/v1/chat/completions' }),
      expect.objectContaining({ redirect: 'manual' }),
    );
  });
  it('memproses SSE OpenAI yang terpotong', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"con'));
        controller.enqueue(encoder.encode('tent":"Halo"}}]}\n\ndata: [DONE]\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));
    const chunks = [];
    for await (const chunk of createProvider(base).stream([{ role: 'user', content: 'test' }], {
      model: 'model',
    }))
      chunks.push(chunk);
    expect(chunks).toEqual([{ delta: 'Halo' }, { delta: '', done: true }]);
  });
  it('memetakan respons Anthropic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          content: [{ type: 'text', text: 'OK' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 2, output_tokens: 1 },
        }),
      ),
    );
    const result = await createProvider({
      ...base,
      type: 'anthropic',
      baseUrl: 'https://93.184.216.34',
    }).generate(
      [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' },
      ],
      { model: 'claude' },
    );
    expect(result).toMatchObject({ text: 'OK', usage: { totalTokens: 3 } });
  });
  it('memetakan respons Gemini', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
          usageMetadata: { totalTokenCount: 5 },
        }),
      ),
    );
    const result = await createProvider({
      ...base,
      type: 'google_gemini',
      baseUrl: 'https://93.184.216.34/v1beta',
    }).generate([{ role: 'user', content: 'u' }], { model: 'gemini' });
    expect(result).toMatchObject({ text: 'OK', finishReason: 'STOP', usage: { totalTokens: 5 } });
  });
  it('memproses NDJSON Ollama terpotong', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('{"message":{"content":"Ha'));
        controller.enqueue(
          encoder.encode('lo"},"done":false}\n{"message":{"content":""},"done":true}\n'),
        );
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));
    const provider = createProvider({
      ...base,
      type: 'ollama_native',
      baseUrl: 'https://93.184.216.34',
      apiKey: undefined,
    });
    const chunks = [];
    for await (const chunk of provider.stream([{ role: 'user', content: 'u' }], { model: 'llama' }))
      chunks.push(chunk);
    expect(chunks).toEqual([
      { delta: 'Halo', done: false, usage: undefined },
      { delta: '', done: true, usage: { promptTokens: undefined, completionTokens: undefined } },
    ]);
  });
});
