import { BaseProvider } from './base.js';
import { ProviderBadRequestError } from './errors.js';
import type { ChatMessage, GenerateOptions, GenerateResult, StreamChunk } from './types.js';
import { lines } from './utils.js';

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  delta?: { text?: string };
  type?: string;
};
export class AnthropicProvider extends BaseProvider {
  private headersAuth() {
    return { 'x-api-key': this.config.apiKey ?? '', 'anthropic-version': '2023-06-01' };
  }
  private payload(messages: ChatMessage[], opts: GenerateOptions, stream: boolean) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    return {
      model: opts.model,
      system: system || undefined,
      messages: messages.filter((m) => m.role !== 'system'),
      max_tokens: opts.maxTokens ?? this.config.defaultParams?.maxTokens ?? 2048,
      temperature: opts.temperature ?? this.config.defaultParams?.temperature,
      top_p: opts.topP ?? this.config.defaultParams?.topP,
      stream,
      ...opts.extraBody,
    };
  }
  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<GenerateResult> {
    const response = await this.request(
      'v1/messages',
      {
        method: 'POST',
        headers: this.headers(this.headersAuth()),
        body: this.body(this.payload(messages, opts, false)),
      },
      opts.signal,
    );
    const raw = (await response.json()) as AnthropicResponse;
    const text =
      raw.content
        ?.filter((item) => item.type === 'text')
        .map((item) => item.text ?? '')
        .join('') ?? '';
    if (!text) throw new ProviderBadRequestError('Anthropic tidak mengembalikan teks.');
    return {
      text,
      finishReason: raw.stop_reason,
      usage: {
        promptTokens: raw.usage?.input_tokens,
        completionTokens: raw.usage?.output_tokens,
        totalTokens: (raw.usage?.input_tokens ?? 0) + (raw.usage?.output_tokens ?? 0),
      },
      raw,
    };
  }
  async *stream(messages: ChatMessage[], opts: GenerateOptions): AsyncIterable<StreamChunk> {
    const response = await this.request(
      'v1/messages',
      {
        method: 'POST',
        headers: this.headers(this.headersAuth()),
        body: this.body(this.payload(messages, opts, true)),
      },
      opts.signal,
    );
    if (!response.body) throw new ProviderBadRequestError('Anthropic tidak mengembalikan stream.');
    for await (const line of lines(response.body)) {
      if (!line.startsWith('data:')) continue;
      const parsed = JSON.parse(line.slice(5).trim()) as AnthropicResponse;
      if (parsed.type === 'message_stop') {
        yield { delta: '', done: true };
        break;
      }
      if (parsed.delta?.text) yield { delta: parsed.delta.text };
    }
  }
}
