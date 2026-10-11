import { BaseProvider } from './base.js';
import { ProviderBadRequestError } from './errors.js';
import type { ChatMessage, GenerateOptions, GenerateResult, StreamChunk } from './types.js';
import { lines } from './utils.js';

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
    delta?: { content?: string };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  data?: Array<{ id?: string }>;
};
export class OpenAICompatibleProvider extends BaseProvider {
  private auth() {
    return this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {};
  }
  private payload(messages: ChatMessage[], opts: GenerateOptions, stream: boolean) {
    return {
      model: opts.model,
      messages,
      stream,
      temperature: opts.temperature ?? this.config.defaultParams?.temperature,
      max_tokens: opts.maxTokens ?? this.config.defaultParams?.maxTokens,
      top_p: opts.topP ?? this.config.defaultParams?.topP,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...opts.extraBody,
    };
  }
  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<GenerateResult> {
    const response = await this.request(
      'chat/completions',
      {
        method: 'POST',
        headers: this.headers(this.auth()),
        body: this.body(this.payload(messages, opts, false)),
      },
      opts.signal,
    );
    const raw = (await response.json()) as OpenAIResponse;
    const choice = raw.choices?.[0];
    if (!choice?.message?.content)
      throw new ProviderBadRequestError('Provider tidak mengembalikan teks.');
    return {
      text: choice.message.content,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: raw.usage?.prompt_tokens,
        completionTokens: raw.usage?.completion_tokens,
        totalTokens: raw.usage?.total_tokens,
      },
      raw,
    };
  }
  async *stream(messages: ChatMessage[], opts: GenerateOptions): AsyncIterable<StreamChunk> {
    const response = await this.request(
      'chat/completions',
      {
        method: 'POST',
        headers: this.headers(this.auth()),
        body: this.body(this.payload(messages, opts, true)),
      },
      opts.signal,
    );
    if (!response.body) throw new ProviderBadRequestError('Provider tidak mengembalikan stream.');
    for await (const line of lines(response.body)) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        yield { delta: '', done: true };
        break;
      }
      const parsed = JSON.parse(data) as OpenAIResponse;
      const delta = parsed.choices?.[0]?.delta?.content ?? '';
      if (delta) yield { delta };
    }
  }
  async listModels() {
    const response = await this.request('models', { headers: this.headers(this.auth()) });
    const raw = (await response.json()) as OpenAIResponse;
    return (raw.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .sort();
  }
}
