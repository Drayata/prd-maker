import type { ClarificationRequest } from '@prdforge/shared';
export function clarifyingQuestionsPrompt(input: ClarificationRequest) {
  return `Analisis konteks produk berikut dan hasilkan 5-8 pertanyaan klarifikasi yang paling memengaruhi kualitas PRD. Hindari pertanyaan yang jawabannya sudah tersedia. Output hanya JSON ketat berbentuk {"questions":[{"id":"q1","question":"...","why":"...","suggestedAnswers":["..."]}]}.

DATA PENGGUNA:\n${JSON.stringify(input)}`;
}
