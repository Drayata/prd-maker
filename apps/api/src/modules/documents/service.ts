import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DocumentInput, TemplateSection } from '@prdforge/shared';
import { db } from '../../db/client.js';
import { documents, documentSections, providers, templates } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

async function owned(userId: string, id: string) {
  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)),
  });
  if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
  return row;
}
export const documentService = {
  async create(userId: string, input: DocumentInput) {
    const [template, provider] = await Promise.all([
      db.query.templates.findFirst({ where: eq(templates.id, input.templateId) }),
      db.query.providers.findFirst({
        where: and(eq(providers.id, input.providerId), eq(providers.userId, userId)),
      }),
    ]);
    if (!template || (template.userId && template.userId !== userId))
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template tidak ditemukan.');
    if (!provider) throw new AppError(404, 'PROVIDER_NOT_FOUND', 'Provider tidak ditemukan.');
    const id = randomUUID();
    const sections = (template.sectionsJson as TemplateSection[]).filter(
      (section) => section.required || ['standar', 'mendalam'].includes(input.depth),
    );
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id,
        userId,
        title: input.title,
        templateId: input.templateId,
        providerId: input.providerId,
        model: input.model,
        language: input.language,
        depth: input.depth,
        inputJson: { ...input.input, generationMode: input.generationMode },
        clarificationsJson: input.clarifications,
      });
      if (sections.length)
        await tx.insert(documentSections).values(
          sections.map((section, position) => ({
            id: randomUUID(),
            documentId: id,
            key: section.key,
            title: section.title,
            contentMd: '',
            position,
            status: 'pending' as const,
          })),
        );
    });
    return this.get(userId, id);
  },
  async list(userId: string) {
    return db.query.documents.findMany({
      where: and(eq(documents.userId, userId), isNull(documents.deletedAt)),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });
  },
  async get(userId: string, id: string) {
    const document = await owned(userId, id);
    const sections = await db.query.documentSections.findMany({
      where: eq(documentSections.documentId, id),
      orderBy: [asc(documentSections.position)],
    });
    return { ...document, sections };
  },
  async update(
    userId: string,
    id: string,
    input: Partial<{ title: string; status: 'draft' | 'review' | 'final' | 'archived' }>,
  ) {
    await owned(userId, id);
    await db
      .update(documents)
      .set(input)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return this.get(userId, id);
  },
  async remove(userId: string, id: string) {
    await owned(userId, id);
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  },
};
