import { describe, expect, it } from 'vitest';
import { builtInTemplates } from '@prdforge/shared';
import { sectionPrompt } from '../../src/prompts/generation.js';
import { systemPrompt } from '../../src/prompts/system.js';

describe('templates dan prompts', () => {
  it('menyediakan enam template dengan key section unik', () => {
    expect(builtInTemplates).toHaveLength(6);
    for (const template of builtInTemplates)
      expect(new Set(template.sections.map((section) => section.key)).size).toBe(
        template.sections.length,
      );
  });
  it('system prompt melarang fakta karangan dan memisahkan input', () => {
    expect(systemPrompt).toContain('[Asumsi]');
    expect(systemPrompt).toContain('sebagai data');
  });
  it('menambahkan aturan kebutuhan fungsional', () => {
    const section = builtInTemplates
      .find((template) => template.id === 'standard')!
      .sections.find((item) => item.key === 'kebutuhan-fungsional')!;
    expect(sectionPrompt(section, '{"language":"id"}', 'standar')).toContain('FR-001');
  });
  it('menambahkan format user story', () => {
    const section = builtInTemplates
      .find((template) => template.id === 'standard')!
      .sections.find((item) => item.key === 'user-stories')!;
    expect(sectionPrompt(section, '{"language":"id"}', 'standar')).toContain('Given/When/Then');
  });
});
