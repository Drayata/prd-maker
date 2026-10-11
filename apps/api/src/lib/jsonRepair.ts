import type { ZodType } from 'zod';
export function extractJson<T>(text: string, schema: ZodType<T>): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const starts = [...cleaned.matchAll(/[\[{]/g)].map((match) => match.index ?? 0);
  for (const start of starts) {
    const opening = cleaned[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && quoted) {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = !quoted;
      if (quoted) continue;
      if (char === opening) depth += 1;
      if (char === closing) depth -= 1;
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(cleaned.slice(start, index + 1));
          const result = schema.safeParse(value);
          if (result.success) return result.data;
        } catch {
          break;
        }
      }
    }
  }
  throw new Error('Output model tidak mengandung JSON valid.');
}
