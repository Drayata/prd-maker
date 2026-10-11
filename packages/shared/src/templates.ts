export interface TemplateSection {
  key: string;
  title: string;
  description: string;
  promptInstruction: string;
  required: boolean;
  minDepth: 'ringkas' | 'standar' | 'mendalam';
}

export interface PrdTemplate {
  id: string;
  name: string;
  description: string;
  sections: readonly TemplateSection[];
}

const section = (key: string, title: string): TemplateSection => ({
  key,
  title,
  description: title,
  promptInstruction: `Tulis bagian ${title} berdasarkan konteks pengguna.`,
  required: true,
  minDepth: 'ringkas',
});

export const builtInTemplates: readonly PrdTemplate[] = [
  {
    id: 'lean',
    name: 'Lean PRD',
    description: 'PRD ringkas 1-2 halaman.',
    sections: [
      section('ringkasan', 'Ringkasan'),
      section('masalah', 'Masalah'),
      section('tujuan', 'Tujuan'),
      section('pengguna', 'Pengguna'),
      section('fitur', 'Fitur Inti'),
      section('metrik', 'Metrik'),
      section('risiko', 'Risiko'),
    ],
  },
];
