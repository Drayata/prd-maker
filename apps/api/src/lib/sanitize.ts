export function sanitizeLlmOutput(text: string): string {
  return text
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(
      /^(?:Tentu|Baik|Sure|Certainly)[,!]?\s*(?:berikut(?: adalah)?|here(?: is| are))?[^\n]*\n+/i,
      '',
    )
    .trim();
}
