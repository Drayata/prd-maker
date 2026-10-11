import { randomUUID } from 'node:crypto';
import { and, eq, or, isNull } from 'drizzle-orm';
import type { TemplateInput, TemplateSection } from '@prdforge/shared';
import { db } from '../../db/client.js';
import { templates } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

function serialize(row: typeof templates.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    depthDefault: row.depthDefault,
    isSystem: row.isSystem,
    sections: row.sectionsJson as TemplateSection[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
async function owned(userId: string, id: string) {
  const row = await db.query.templates.findFirst({
    where: and(eq(templates.id, id), eq(templates.userId, userId), eq(templates.isSystem, false)),
  });
  if (!row) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template tidak ditemukan.');
  return row;
}
export const templateService = {
  async list(userId: string) {
    return (
      await db.query.templates.findMany({
        where: or(isNull(templates.userId), eq(templates.userId, userId)),
        orderBy: (table, { desc, asc }) => [desc(table.isSystem), asc(table.name)],
      })
    ).map(serialize);
  },
  async create(userId: string, input: TemplateInput) {
    const id = randomUUID();
    await db.insert(templates).values({
      id,
      userId,
      name: input.name,
      description: input.description,
      depthDefault: input.depthDefault,
      isSystem: false,
      sectionsJson: input.sections,
    });
    return serialize(await owned(userId, id));
  },
  async update(userId: string, id: string, input: Partial<TemplateInput>) {
    await owned(userId, id);
    await db
      .update(templates)
      .set({
        ...input,
        ...(input.sections ? { sectionsJson: input.sections, sections: undefined } : {}),
      })
      .where(and(eq(templates.id, id), eq(templates.userId, userId)));
    return serialize(await owned(userId, id));
  },
  async remove(userId: string, id: string) {
    await owned(userId, id);
    await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId)));
  },
  async duplicate(userId: string, id: string) {
    const row = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), or(isNull(templates.userId), eq(templates.userId, userId))),
    });
    if (!row) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template tidak ditemukan.');
    return this.create(userId, {
      name: `${row.name} (Salinan)`,
      description: row.description,
      depthDefault: row.depthDefault,
      sections: row.sectionsJson as TemplateSection[],
    });
  },
};
