import { BaseProvider } from './base.js';
import { ProviderBadRequestError } from './errors.js';
import type { ChatMessage, GenerateOptions, GenerateResult, StreamChunk } from './types.js';
import { lines } from './utils.js';

type OllamaResponse = {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  models?: Array<{ name?: string }>;
};
export class OllamaProvider extends BaseProvider {
  private payload(messages: ChatMessage[], opts: GenerateOptions, stream: boolean) {
    return {
      model: opts.model,
      messages,
      stream,
      options: {
        temperature: opts.temperature ?? this.config.defaultParams?.temperature,
        num_predict: opts.maxTokens ?? this.config.defaultParams?.maxTokens,
        top_p: opts.topP ?? this.config.defaultParams?.topP,
      },
      ...(opts.jsonMode ? { format: 'json' } : {}),
      ...opts.extraBody,
    };
  }
  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<GenerateResult> {
    const response = await this.request(
      'api/chat',
      {
        method: 'POST',
        headers: this.headers(),
        body: this.body(this.payload(messages, opts, false)),
      },
      opts.signal,
    );
    const raw = (await response.json()) as OllamaResponse;
    const text = raw.message?.content;
    if (!text) throw new ProviderBadRequestError('Ollama tidak mengembalikan teks.');
    return {
      text,
      finishReason: raw.done_reason,
      usage: {
        promptTokens: raw.prompt_eval_count,
        completionTokens: raw.eval_count,
        totalTokens: (raw.prompt_eval_count ?? 0) + (raw.eval_count ?? 0),
      },
      raw,
    };
  }
  async *stream(messages: ChatMessage[], opts: GenerateOptions): AsyncIterable<StreamChunk> {
    const response = await this.request(
      'api/chat',
      {
        method: 'POST',
        headers: this.headers(),
        body: this.body(this.payload(messages, opts, true)),
      },
      opts.signal,
    );
    if (!response.body) throw new ProviderBadRequestError('Ollama tidak mengembalikan stream.');
    for await (const line of lines(response.body)) {
      if (!line.trim()) continue;
      const raw = JSON.parse(line) as OllamaResponse;
      const delta = raw.message?.content ?? '';
      if (delta || raw.done)
        yield {
          delta,
          done: raw.done,
          usage: raw.done
            ? { promptTokens: raw.prompt_eval_count, completionTokens: raw.eval_count }
            : undefined,
        };
    }
  }
  async listModels() {
    const response = await this.request('api/tags', { headers: this.headers() });
    const raw = (await response.json()) as OllamaResponse;
    return (raw.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
      .sort();
  }
}
