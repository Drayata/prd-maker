import { BaseProvider } from './base.js';
import { ProviderBadRequestError } from './errors.js';
import type { ChatMessage, GenerateOptions, GenerateResult, StreamChunk } from './types.js';
import { lines } from './utils.js';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};
export class GeminiProvider extends BaseProvider {
  private path(model: string, stream = false) {
    return `models/${encodeURIComponent(model)}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}${this.config.apiKey ? `${stream ? '&' : '?'}key=${encodeURIComponent(this.config.apiKey)}` : ''}`;
  }
  private payload(messages: ChatMessage[], opts: GenerateOptions) {
    const system = messages.filter((m) => m.role === 'system').map((m) => ({ text: m.content }));
    return {
      ...(system.length ? { systemInstruction: { parts: system } } : {}),
      contents: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      generationConfig: {
        temperature: opts.temperature ?? this.config.defaultParams?.temperature,
        maxOutputTokens: opts.maxTokens ?? this.config.defaultParams?.maxTokens,
        topP: opts.topP ?? this.config.defaultParams?.topP,
        ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
      ...opts.extraBody,
    };
  }
  private result(raw: GeminiResponse): GenerateResult {
    const text = raw.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    if (!text) throw new ProviderBadRequestError('Gemini tidak mengembalikan teks.');
    return {
      text,
      finishReason: raw.candidates?.[0]?.finishReason,
      usage: {
        promptTokens: raw.usageMetadata?.promptTokenCount,
        completionTokens: raw.usageMetadata?.candidatesTokenCount,
        totalTokens: raw.usageMetadata?.totalTokenCount,
      },
      raw,
    };
  }
  async generate(messages: ChatMessage[], opts: GenerateOptions) {
    const response = await this.request(
      this.path(opts.model),
      { method: 'POST', headers: this.headers(), body: this.body(this.payload(messages, opts)) },
      opts.signal,
    );
    return this.result((await response.json()) as GeminiResponse);
  }
  async *stream(messages: ChatMessage[], opts: GenerateOptions): AsyncIterable<StreamChunk> {
    const response = await this.request(
      this.path(opts.model, true),
      { method: 'POST', headers: this.headers(), body: this.body(this.payload(messages, opts)) },
      opts.signal,
    );
    if (!response.body) throw new ProviderBadRequestError('Gemini tidak mengembalikan stream.');
    for await (const line of lines(response.body)) {
      if (!line.startsWith('data:')) continue;
      const raw = JSON.parse(line.slice(5).trim()) as GeminiResponse;
      const delta =
        raw.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      if (delta) yield { delta };
    }
    yield { delta: '', done: true };
  }
}
