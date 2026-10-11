import type { DocumentInput, TemplateSection } from '@prdforge/shared';
export function baseContext(input: DocumentInput) {
  return JSON.stringify(
    {
      title: input.title,
      language: input.language,
      depth: input.depth,
      product: input.input,
      clarifications: input.clarifications,
    },
    null,
    2,
  );
}
export function outlinePrompt(sections: readonly TemplateSection[], context: string) {
  return `Buat outline konsisten berupa satu kalimat untuk setiap section. Output JSON {"outline":[{"key":"...","summary":"..."}]}. Section:\n${JSON.stringify(sections)}\n\nDATA PENGGUNA:\n${context}`;
}
export function sectionPrompt(
  section: TemplateSection,
  context: string,
  depth: DocumentInput['depth'],
  outline = '',
  previousSummary = '',
) {
  return `Tulis hanya isi section "${section.title}" dalam Bahasa ${context.includes('"language": "en"') ? 'Inggris' : 'Indonesia'}. Kedalaman: ${depth}. Instruksi section: ${section.promptInstruction}. Jangan tulis heading section. ${section.key === 'kebutuhan-fungsional' ? 'Gunakan ID FR-001 berurutan dan prioritas MoSCoW.' : ''} ${section.key === 'user-stories' ? 'Gunakan format Sebagai [persona], saya ingin [aksi], agar [manfaat], lalu acceptance criteria Given/When/Then.' : ''}\n\nOUTLINE:\n${outline}\n\nRINGKASAN BAGIAN SEBELUMNYA:\n${previousSummary}\n\nDATA PENGGUNA:\n${context}`;
}
export function regenerateSectionPrompt(
  section: TemplateSection,
  currentText: string,
  userInstruction: string,
  context: string,
) {
  return `Tulis ulang section ${section.title}. Pertahankan fakta valid, ikuti instruksi pengguna, dan output hanya isi section.\nINSTRUKSI: ${userInstruction}\nTEKS SAAT INI:\n${currentText}\nDATA PENGGUNA:\n${context}`;
}
export function improvePrompt(
  action: 'shorten' | 'expand' | 'formal' | 'metrics' | 'table' | 'clarity',
  text: string,
) {
  const instructions = {
    shorten: 'Perpendek tanpa menghilangkan keputusan penting.',
    expand: 'Perluas dengan detail terukur dan relevan.',
    formal: 'Ubah menjadi nada formal dan profesional.',
    metrics: 'Tambahkan metrik terukur; tandai angka baru [Asumsi].',
    table: 'Ubah bagian yang cocok menjadi tabel Markdown.',
    clarity: 'Perbaiki kejelasan, ambiguitas, dan keterujian.',
  };
  return `${instructions[action]} Output hanya hasil revisi Markdown.\n\n${text}`;
}
