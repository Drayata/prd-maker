import { eq } from 'drizzle-orm';
import {
  clarificationResponseSchema,
  type ClarificationRequest,
  type TemplateSection,
} from '@prdforge/shared';
import { db } from '../../db/client.js';
import { documentSections, documentVersions, generationLogs, templates } from '../../db/schema.js';
import { extractJson } from '../../lib/jsonRepair.js';
import { sanitizeLlmOutput } from '../../lib/sanitize.js';
import { AppError } from '../../lib/errors.js';
import { clarifyingQuestionsPrompt } from '../../prompts/clarifying.js';
import { baseContext, sectionPrompt } from '../../prompts/generation.js';
import { systemPrompt } from '../../prompts/system.js';
import { providerService } from '../providers/service.js';
import { documentService } from '../documents/service.js';
import { randomUUID } from 'node:crypto';

export const generateService = {
  async clarifications(userId: string, input: ClarificationRequest) {
    const adapter = await providerService.adapter(userId, input.providerId);
    let result = await adapter.generate(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: clarifyingQuestionsPrompt(input) },
      ],
      { model: input.model, jsonMode: true, maxTokens: 1500 },
    );
    try {
      return extractJson(result.text, clarificationResponseSchema);
    } catch {
      result = await adapter.generate(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Perbaiki menjadi JSON valid sesuai schema. Output sebelumnya:\n${result.text}`,
          },
        ],
        { model: input.model, jsonMode: true, maxTokens: 1500 },
      );
      return extractJson(result.text, clarificationResponseSchema);
    }
  },
  async generateDocument(
    userId: string,
    documentId: string,
    signal: AbortSignal,
    emit: (event: string, data: unknown) => void,
  ) {
    const document = await documentService.get(userId, documentId);
    if (!document.providerId || !document.templateId || !document.model)
      throw new AppError(
        400,
        'DOCUMENT_CONFIG_INVALID',
        'Provider, template, atau model belum dipilih.',
      );
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, document.templateId),
    });
    if (!template) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template tidak ditemukan.');
    const adapter = await providerService.adapter(userId, document.providerId);
    const definitions = new Map(
      (template.sectionsJson as TemplateSection[]).map((item) => [item.key, item]),
    );
    const context = baseContext({
      title: document.title,
      templateId: document.templateId,
      providerId: document.providerId,
      model: document.model,
      language: document.language,
      depth: document.depth,
      generationMode:
        ((document.inputJson as Record<string, unknown>).generationMode as
          | 'per_section'
          | 'single_shot') ?? 'per_section',
      input: document.inputJson as never,
      clarifications: (document.clarificationsJson as never[]) ?? [],
    });
    let previous = '';
    for (const section of document.sections) {
      if (signal.aborted) break;
      const definition = definitions.get(section.key);
      if (!definition) continue;
      emit('section_start', { sectionId: section.id, key: section.key, title: section.title });
      await db
        .update(documentSections)
        .set({ status: 'generating', lastError: null })
        .where(eq(documentSections.id, section.id));
      const started = Date.now();
      let text = '';
      try {
        for await (const chunk of adapter.stream(
          [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: sectionPrompt(definition, context, document.depth, '', previous),
            },
          ],
          {
            model: document.model,
            signal,
            ...((document.inputJson as { maxTokens?: number }).maxTokens !== undefined
              ? { maxTokens: (document.inputJson as { maxTokens: number }).maxTokens }
              : {}),
            ...((document.inputJson as { temperature?: number }).temperature !== undefined
              ? { temperature: (document.inputJson as { temperature: number }).temperature }
              : {}),
          },
        )) {
          text += chunk.delta;
          emit('delta', { sectionId: section.id, delta: chunk.delta });
        }
        text = sanitizeLlmOutput(text);
        await db
          .update(documentSections)
          .set({ contentMd: text, status: 'done' })
          .where(eq(documentSections.id, section.id));
        previous = text.slice(0, 500);
        emit('section_end', { sectionId: section.id, status: 'done' });
        await db.insert(generationLogs).values({
          id: randomUUID(),
          userId,
          documentId,
          providerId: document.providerId,
          model: document.model,
          actionType: 'section',
          latencyMs: Date.now() - started,
          status: 'success',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation gagal.';
        await db
          .update(documentSections)
          .set({ status: 'failed', lastError: message })
          .where(eq(documentSections.id, section.id));
        emit('error', { sectionId: section.id, message });
        await db.insert(generationLogs).values({
          id: randomUUID(),
          userId,
          documentId,
          providerId: document.providerId,
          model: document.model,
          actionType: 'section',
          latencyMs: Date.now() - started,
          status: signal.aborted ? 'cancelled' : 'failed',
          errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        });
      }
    }
    const final = await documentService.get(userId, documentId);
    await db.insert(documentVersions).values({
      id: randomUUID(),
      documentId,
      label: 'Hasil generate',
      snapshotJson: final,
      createdByAction: 'generate',
    });
    emit('done', { documentId, cancelled: signal.aborted });
  },
};
