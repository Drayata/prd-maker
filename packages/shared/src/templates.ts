export type PrdDepth = 'ringkas' | 'standar' | 'mendalam';
export interface TemplateSection {
  key: string;
  title: string;
  description: string;
  promptInstruction: string;
  required: boolean;
  minDepth: PrdDepth;
}
export interface PrdTemplate {
  id: string;
  name: string;
  description: string;
  depthDefault: PrdDepth;
  sections: readonly TemplateSection[];
}
const section = (
  key: string,
  title: string,
  description: string,
  promptInstruction = description,
  minDepth: PrdDepth = 'ringkas',
  required = true,
): TemplateSection => ({ key, title, description, promptInstruction, required, minDepth });
const common = {
  summary: section(
    'ringkasan-eksekutif',
    'Ringkasan Eksekutif',
    'Ringkas masalah, solusi, pengguna, dan hasil yang diharapkan.',
  ),
  problem: section(
    'masalah',
    'Latar Belakang dan Masalah',
    'Jelaskan konteks dan masalah pengguna tanpa mengarang data pasar.',
  ),
  goals: section(
    'tujuan',
    'Tujuan dan Non-Tujuan',
    'Pisahkan tujuan terukur dan hal yang sengaja tidak dicakup.',
  ),
  personas: section(
    'persona',
    'Persona Pengguna',
    'Jelaskan persona berdasarkan input dan tandai asumsi.',
  ),
  stories: section(
    'user-stories',
    'User Stories',
    'Gunakan format Sebagai/saya ingin/agar beserta Given/When/Then.',
    'Tulis user story dan acceptance criteria Given/When/Then.',
  ),
  functional: section(
    'kebutuhan-fungsional',
    'Kebutuhan Fungsional',
    'Beri ID FR-001 berurutan dan prioritas MoSCoW.',
    "Setiap kebutuhan wajib memiliki ID FR-001 berurutan dan prioritas Must/Should/Could/Won't.",
  ),
  nonFunctional: section(
    'kebutuhan-non-fungsional',
    'Kebutuhan Non-Fungsional',
    'Definisikan target performa, keamanan, reliabilitas, dan aksesibilitas.',
    undefined,
    'standar',
  ),
  metrics: section(
    'metrik',
    'Metrik Keberhasilan',
    'Gunakan baseline dan target terukur; tandai angka tanpa sumber sebagai [Asumsi].',
  ),
  risks: section(
    'risiko',
    'Risiko dan Mitigasi',
    'Pasangkan tiap risiko dengan kemungkinan, dampak, mitigasi, dan pemilik.',
  ),
};
export const builtInTemplates: readonly PrdTemplate[] = [
  {
    id: 'lean',
    name: 'Lean PRD',
    description: 'PRD ringkas 1-2 halaman.',
    depthDefault: 'ringkas',
    sections: [
      section('ringkasan', 'Ringkasan', 'Ringkas ide dan nilai utama.'),
      section('masalah', 'Masalah', 'Jelaskan masalah inti dan dampaknya.'),
      section('tujuan', 'Tujuan', 'Tetapkan hasil yang ingin dicapai.'),
      section('pengguna', 'Pengguna', 'Identifikasi pengguna utama.'),
      section('fitur', 'Fitur Inti', 'Daftar kemampuan minimum dengan prioritas MoSCoW.'),
      common.metrics,
      common.risks,
    ],
  },
  {
    id: 'standard',
    name: 'Standar',
    description: 'PRD lengkap untuk kebanyakan produk.',
    depthDefault: 'standar',
    sections: [
      common.summary,
      common.problem,
      common.goals,
      common.personas,
      common.stories,
      common.functional,
      common.nonFunctional,
      section('alur-pengguna', 'Alur Pengguna', 'Jelaskan alur utama dan kondisi gagal.'),
      section('ruang-lingkup', 'Ruang Lingkup', 'Pisahkan cakupan masuk dan keluar.'),
      common.metrics,
      section(
        'asumsi-dependensi',
        'Asumsi dan Dependensi',
        'Daftar asumsi, dependensi, dan cara validasinya.',
      ),
      common.risks,
      section(
        'milestone',
        'Milestone dan Timeline',
        'Susun milestone berbasis hasil tanpa mengarang tanggal.',
      ),
      section(
        'pertanyaan-terbuka',
        'Pertanyaan Terbuka',
        'Daftar keputusan yang belum terselesaikan.',
      ),
    ],
  },
  {
    id: 'startup-mvp',
    name: 'Startup/MVP',
    description: 'Fokus hipotesis, MVP, validasi, dan traction.',
    depthDefault: 'standar',
    sections: [
      section(
        'hipotesis',
        'Hipotesis Produk',
        'Nyatakan pengguna, masalah, solusi, dan hasil yang bisa dibantah.',
      ),
      common.problem,
      section('mvp-scope', 'Cakupan MVP', 'Tentukan fitur minimum dan yang ditunda.'),
      common.stories,
      section(
        'validasi',
        'Rencana Validasi',
        'Rancang eksperimen, sinyal lulus, dan keputusan sesudahnya.',
      ),
      common.metrics,
      section(
        'traction',
        'Metrik Traction',
        'Tentukan activation, retention, atau revenue yang relevan.',
      ),
      common.risks,
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'PRD untuk sistem organisasi dengan governance lengkap.',
    depthDefault: 'mendalam',
    sections: [
      common.summary,
      common.problem,
      common.goals,
      section(
        'stakeholder-raci',
        'Stakeholder dan RACI',
        'Petakan Responsible, Accountable, Consulted, Informed.',
      ),
      common.personas,
      common.functional,
      common.nonFunctional,
      section(
        'keamanan',
        'Keamanan',
        'Definisikan threat, kontrol, data classification, dan audit.',
      ),
      section('kepatuhan', 'Kepatuhan', 'Catat regulasi, bukti, dan kontrol yang dibutuhkan.'),
      section('integrasi', 'Integrasi', 'Definisikan sistem, kontrak, ownership, dan kegagalan.'),
      section(
        'sla',
        'SLA dan Operasional',
        'Tetapkan SLI/SLO, RTO/RPO, eskalasi, dan observability.',
      ),
      section('rollout', 'Rencana Rollout', 'Susun fase, feature flag, rollback, dan komunikasi.'),
      section('dukungan', 'Rencana Dukungan', 'Tentukan support tier, runbook, dan handover.'),
      common.metrics,
      common.risks,
    ],
  },
  {
    id: 'feature',
    name: 'Fitur Tambahan',
    description: 'Perubahan terfokus pada sistem yang sudah ada.',
    depthDefault: 'standar',
    sections: [
      section(
        'konteks-sistem',
        'Konteks Sistem Saat Ini',
        'Jelaskan perilaku, constraint, dan dependensi yang ada.',
      ),
      common.problem,
      section(
        'perubahan',
        'Perubahan yang Diusulkan',
        'Jelaskan perubahan UX, data, API, dan aturan bisnis.',
      ),
      common.stories,
      common.functional,
      section('dampak', 'Analisis Dampak', 'Nilai dampak ke pengguna, data, sistem, dan operasi.'),
      section(
        'eksperimen',
        'Eksperimen dan Rollout',
        'Rancang eksperimen, segmentasi, rollout, rollback.',
      ),
      common.metrics,
      common.risks,
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Susun bagian PRD sendiri.',
    depthDefault: 'standar',
    sections: [],
  },
];
