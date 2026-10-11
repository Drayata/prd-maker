import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatibleProvider } from './openaiCompatible.js';
import type { LLMProvider, ProviderConfig } from './types.js';

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai_compatible':
      return new OpenAICompatibleProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google_gemini':
      return new GeminiProvider(config);
    case 'ollama_native':
      return new OllamaProvider(config);
  }
}
