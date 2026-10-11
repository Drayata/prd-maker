import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { builtInTemplates } from '@prdforge/shared';
import { env } from '../config/env.js';
import { db, pool } from './client.js';
import { templates, users } from './schema.js';

if (env.NODE_ENV === 'production')
  throw new Error('Seed tidak boleh dijalankan pada NODE_ENV=production.');

const systemTemplates = [
  ...builtInTemplates,
  {
    id: 'standard',
    name: 'Standar',
    description: 'PRD lengkap untuk kebanyakan produk.',
    sections: [],
  },
  {
    id: 'startup-mvp',
    name: 'Startup/MVP',
    description: 'Fokus hipotesis, validasi, dan traction.',
    sections: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Keamanan, kepatuhan, SLA, dan rollout.',
    sections: [],
  },
  {
    id: 'feature',
    name: 'Fitur Tambahan',
    description: 'Perubahan dalam sistem yang sudah ada.',
    sections: [],
  },
  { id: 'custom', name: 'Custom', description: 'Susun bagian PRD sendiri.', sections: [] },
];

for (const template of systemTemplates) {
  const hash = createHash('sha256').update(`prdforge-template:${template.id}`).digest('hex');
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  await db
    .insert(templates)
    .values({
      id,
      userId: null,
      name: template.name,
      description: template.description,
      isSystem: true,
      sectionsJson: template.sections,
    })
    .onDuplicateKeyUpdate({
      set: {
        name: template.name,
        description: template.description,
        sectionsJson: template.sections,
      },
    });
}

const demoEmail = 'demo@prdforge.local';
if (!(await db.query.users.findFirst({ where: eq(users.email, demoEmail) }))) {
  await db.insert(users).values({
    id: randomUUID(),
    name: 'Pengguna Demo',
    email: demoEmail,
    passwordHash: await bcrypt.hash(process.env.DEMO_PASSWORD ?? 'demo-prdforge-123', 12),
  });
}

await pool.end();
console.log('Seed development selesai.');
