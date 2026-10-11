import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { ProviderInput, ProviderUpdate } from '@prdforge/shared';
import { db } from '../../db/client.js';
import { providers } from '../../db/schema.js';
import { decryptSecret, encryptSecret, maskSecret } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { validateProviderUrl } from '../../lib/ssrf.js';
import { createProvider } from '../../providers/registry.js';
import type { ProviderConfig } from '../../providers/types.js';

type Row = typeof providers.$inferSelect;
export type PublicProvider = ReturnType<typeof serialize>;
function serialize(row: Row) {
  const key =
    row.apiKeyEncrypted && row.apiKeyIv && row.apiKeyTag
      ? decryptSecret({ ciphertext: row.apiKeyEncrypted, iv: row.apiKeyIv, authTag: row.apiKeyTag })
      : '';
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.baseUrl,
    apiKeyMasked: key ? maskSecret(key) : '',
    hasApiKey: Boolean(key),
    defaultModel: row.defaultModel,
    customHeaders: row.customHeadersJson ?? {},
    extraBodyParams: row.extraBodyJson ?? {},
    defaultParams: row.defaultParamsJson ?? {},
    supportsStreaming: row.supportsStreaming,
    supportsJsonMode: row.supportsJsonMode,
    modelProfile: row.modelProfile,
    timeoutMs: row.timeoutMs,
    inputPricePerM: row.inputPricePerM === null ? null : Number(row.inputPricePerM),
    outputPricePerM: row.outputPricePerM === null ? null : Number(row.outputPricePerM),
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function config(row: Row): ProviderConfig {
  const apiKey =
    row.apiKeyEncrypted && row.apiKeyIv && row.apiKeyTag
      ? decryptSecret({ ciphertext: row.apiKeyEncrypted, iv: row.apiKeyIv, authTag: row.apiKeyTag })
      : undefined;
  return {
    type: row.type,
    baseUrl: row.baseUrl,
    ...(apiKey ? { apiKey } : {}),
    defaultModel: row.defaultModel,
    customHeaders: row.customHeadersJson as Record<string, string> | undefined,
    extraBodyParams: row.extraBodyJson as Record<string, unknown> | undefined,
    defaultParams: row.defaultParamsJson as ProviderConfig['defaultParams'],
    timeoutMs: row.timeoutMs,
    supportsJsonMode: row.supportsJsonMode,
  };
}
async function owned(userId: string, id: string) {
  const row = await db.query.providers.findFirst({
    where: and(eq(providers.id, id), eq(providers.userId, userId)),
  });
  if (!row) throw new AppError(404, 'PROVIDER_NOT_FOUND', 'Provider tidak ditemukan.');
  return row;
}
async function normalize(input: ProviderInput | ProviderUpdate) {
  if (!input.baseUrl) return input;
  return { ...input, baseUrl: (await validateProviderUrl(input.baseUrl)).toString() };
}
function encrypted(apiKey: string | undefined) {
  if (!apiKey) return {};
  const value = encryptSecret(apiKey);
  return {
    apiKeyEncrypted: value.ciphertext,
    apiKeyIv: value.iv,
    apiKeyTag: value.authTag,
    keyVersion: value.keyVersion,
  };
}

export const providerService = {
  async list(userId: string) {
    return (
      await db.query.providers.findMany({
        where: eq(providers.userId, userId),
        orderBy: (table, { desc }) => [desc(table.isDefault), desc(table.updatedAt)],
      })
    ).map(serialize);
  },
  async get(userId: string, id: string) {
    return serialize(await owned(userId, id));
  },
  async create(userId: string, raw: ProviderInput) {
    const input = (await normalize(raw)) as ProviderInput;
    const id = randomUUID();
    await db.transaction(async (tx) => {
      if (input.isDefault)
        await tx.update(providers).set({ isDefault: false }).where(eq(providers.userId, userId));
      await tx.insert(providers).values({
        id,
        userId,
        name: input.name,
        type: input.type,
        baseUrl: input.baseUrl,
        ...encrypted(input.apiKey),
        defaultModel: input.defaultModel,
        customHeadersJson: input.customHeaders,
        extraBodyJson: input.extraBodyParams,
        defaultParamsJson: input.defaultParams,
        supportsStreaming: input.supportsStreaming,
        supportsJsonMode: input.supportsJsonMode,
        modelProfile: input.modelProfile,
        timeoutMs: input.timeoutMs,
        inputPricePerM: input.inputPricePerM?.toString(),
        outputPricePerM: input.outputPricePerM?.toString(),
        isDefault: input.isDefault,
      });
    });
    return this.get(userId, id);
  },
  async update(userId: string, id: string, raw: ProviderUpdate) {
    await owned(userId, id);
    const input = await normalize(raw);
    const {
      apiKey,
      customHeaders,
      extraBodyParams,
      defaultParams,
      inputPricePerM,
      outputPricePerM,
      ...plain
    } = input;
    await db.transaction(async (tx) => {
      if (input.isDefault)
        await tx.update(providers).set({ isDefault: false }).where(eq(providers.userId, userId));
      await tx
        .update(providers)
        .set({
          ...plain,
          ...(apiKey ? encrypted(apiKey) : {}),
          ...(customHeaders ? { customHeadersJson: customHeaders } : {}),
          ...(extraBodyParams ? { extraBodyJson: extraBodyParams } : {}),
          ...(defaultParams ? { defaultParamsJson: defaultParams } : {}),
          ...(inputPricePerM !== undefined
            ? { inputPricePerM: inputPricePerM?.toString() ?? null }
            : {}),
          ...(outputPricePerM !== undefined
            ? { outputPricePerM: outputPricePerM?.toString() ?? null }
            : {}),
        })
        .where(and(eq(providers.id, id), eq(providers.userId, userId)));
    });
    return this.get(userId, id);
  },
  async remove(userId: string, id: string) {
    const row = await owned(userId, id);
    await db.delete(providers).where(and(eq(providers.id, id), eq(providers.userId, userId)));
    if (row.isDefault) {
      const next = await db.query.providers.findFirst({ where: eq(providers.userId, userId) });
      if (next)
        await db.update(providers).set({ isDefault: true }).where(eq(providers.id, next.id));
    }
  },
  async duplicate(userId: string, id: string) {
    const row = await owned(userId, id);
    return this.create(userId, {
      name: `${row.name} (Salinan)`,
      type: row.type,
      baseUrl: row.baseUrl,
      apiKey: config(row).apiKey,
      defaultModel: row.defaultModel,
      customHeaders: row.customHeadersJson as Record<string, string>,
      extraBodyParams: row.extraBodyJson as Record<string, unknown>,
      defaultParams: row.defaultParamsJson as ProviderInput['defaultParams'],
      supportsStreaming: row.supportsStreaming,
      supportsJsonMode: row.supportsJsonMode,
      modelProfile: row.modelProfile,
      timeoutMs: row.timeoutMs,
      inputPricePerM: row.inputPricePerM === null ? null : Number(row.inputPricePerM),
      outputPricePerM: row.outputPricePerM === null ? null : Number(row.outputPricePerM),
      isDefault: false,
    });
  },
  async test(userId: string, id: string) {
    return createProvider(config(await owned(userId, id))).testConnection();
  },
  async testDraft(raw: ProviderInput) {
    const input = (await normalize(raw)) as ProviderInput;
    return createProvider({
      type: input.type,
      baseUrl: input.baseUrl,
      ...(input.apiKey ? { apiKey: input.apiKey } : {}),
      defaultModel: input.defaultModel,
      customHeaders: input.customHeaders,
      extraBodyParams: input.extraBodyParams,
      defaultParams: input.defaultParams,
      timeoutMs: input.timeoutMs,
      supportsJsonMode: input.supportsJsonMode,
    }).testConnection();
  },
  async models(userId: string, id: string) {
    const adapter = createProvider(config(await owned(userId, id)));
    if (!adapter.listModels)
      throw new AppError(400, 'MODELS_UNSUPPORTED', 'Provider ini tidak mendukung daftar model.');
    return adapter.listModels();
  },
};
