import type { ProviderType } from './schemas.js';

export interface ProviderPreset {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  exampleModel: string;
  apiKeyOptional?: boolean;
}

export const providerPresets = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    exampleModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    exampleModel: 'claude-3-5-sonnet-latest',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'google_gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    exampleModel: 'gemini-2.0-flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai_compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    exampleModel: 'openai/gpt-4o-mini',
  },
  {
    id: 'groq',
    name: 'Groq',
    type: 'openai_compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    exampleModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    exampleModel: 'deepseek-chat',
  },
  {
    id: 'together',
    name: 'Together AI',
    type: 'openai_compatible',
    baseUrl: 'https://api.together.xyz/v1',
    exampleModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    type: 'openai_compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    exampleModel: 'mistral-small-latest',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama_native',
    baseUrl: 'http://localhost:11434',
    exampleModel: 'llama3.2',
    apiKeyOptional: true,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    type: 'openai_compatible',
    baseUrl: 'http://localhost:1234/v1',
    exampleModel: 'local-model',
    apiKeyOptional: true,
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    type: 'openai_compatible',
    baseUrl: '',
    exampleModel: '',
  },
] as const satisfies readonly ProviderPreset[];
