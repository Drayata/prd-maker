export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface GenerateOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
  extraBody?: Record<string, unknown>;
}
export interface GenerateResult {
  text: string;
  usage?: {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
  };
  finishReason?: string | undefined;
  raw?: unknown;
}
export interface StreamChunk {
  delta: string;
  done?: boolean | undefined;
  usage?: GenerateResult['usage'] | undefined;
}
export interface LLMProvider {
  generate(messages: ChatMessage[], opts: GenerateOptions): Promise<GenerateResult>;
  stream(messages: ChatMessage[], opts: GenerateOptions): AsyncIterable<StreamChunk>;
  listModels?(): Promise<string[]>;
  testConnection(): Promise<{ ok: boolean; latencyMs: number; message: string }>;
}
export interface ProviderConfig {
  type: 'openai_compatible' | 'anthropic' | 'google_gemini' | 'ollama_native';
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  customHeaders?: Record<string, string> | undefined;
  extraBodyParams?: Record<string, unknown> | undefined;
  defaultParams?:
    | {
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
      }
    | undefined;
  timeoutMs: number;
  supportsJsonMode?: boolean;
}
