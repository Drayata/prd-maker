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
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  finishReason?: string;
  raw?: unknown;
}
export interface StreamChunk {
  delta: string;
  done?: boolean;
  usage?: GenerateResult['usage'];
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
  customHeaders?: Record<string, string>;
  extraBodyParams?: Record<string, unknown>;
  defaultParams?: { temperature?: number; maxTokens?: number; topP?: number };
  timeoutMs: number;
  supportsJsonMode?: boolean;
}
