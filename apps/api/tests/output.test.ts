import { describe, expect, it } from 'vitest';
import { clarificationResponseSchema } from '@prdforge/shared';
import { extractJson } from '../src/lib/jsonRepair.js';
import { sanitizeLlmOutput } from '../src/lib/sanitize.js';

describe('output LLM', () => {
  it('mengambil JSON valid dari code fence dan preamble', () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({
      id: `q${index}`,
      question: 'Pertanyaan?',
      why: 'Penting',
      suggestedAnswers: [],
    }));
    expect(
      extractJson(
        `Tentu\n\n\`\`\`json\n${JSON.stringify({ questions })}\n\`\`\``,
        clarificationResponseSchema,
      ),
    ).toEqual({ questions });
  });
  it('menolak JSON yang tidak sesuai schema', () =>
    expect(() => extractJson('{"questions":[]}', clarificationResponseSchema)).toThrow(
      'JSON valid',
    ));
  it('menghapus preamble dan code fence markdown', () =>
    expect(sanitizeLlmOutput('```markdown\nTentu, berikut hasilnya\n\nIsi PRD\n```')).toBe(
      'Isi PRD',
    ));
});
