import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
};

export const users = mysqlTable(
  'users',
  {
    id: char('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    locale: mysqlEnum('locale', ['id', 'en']).notNull().default('id'),
    theme: mysqlEnum('theme', ['light', 'dark', 'system']).notNull().default('system'),
    ...timestamps,
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    index('users_deleted_at_idx').on(table.deletedAt),
  ],
);

export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    userAgent: varchar('user_agent', { length: 500 }),
    ip: varchar('ip', { length: 45 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash_unique').on(table.tokenHash),
    index('refresh_tokens_user_idx').on(table.userId),
    index('refresh_tokens_expiry_idx').on(table.expiresAt),
  ],
);

export const providers = mysqlTable(
  'providers',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    type: mysqlEnum('type', [
      'openai_compatible',
      'anthropic',
      'google_gemini',
      'ollama_native',
    ]).notNull(),
    baseUrl: varchar('base_url', { length: 2048 }).notNull(),
    apiKeyEncrypted: text('api_key_encrypted'),
    apiKeyIv: varchar('api_key_iv', { length: 64 }),
    apiKeyTag: varchar('api_key_tag', { length: 64 }),
    keyVersion: int('key_version').notNull().default(1),
    defaultModel: varchar('default_model', { length: 255 }).notNull(),
    customHeadersJson: json('custom_headers_json'),
    extraBodyJson: json('extra_body_json'),
    defaultParamsJson: json('default_params_json'),
    supportsStreaming: boolean('supports_streaming').notNull().default(true),
    supportsJsonMode: boolean('supports_json_mode').notNull().default(false),
    modelProfile: mysqlEnum('model_profile', ['small', 'medium', 'large'])
      .notNull()
      .default('medium'),
    timeoutMs: int('timeout_ms').notNull().default(120000),
    inputPricePerM: decimal('input_price_per_m', { precision: 12, scale: 4 }),
    outputPricePerM: decimal('output_price_per_m', { precision: 12, scale: 4 }),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('providers_user_idx').on(table.userId),
    index('providers_user_default_idx').on(table.userId, table.isDefault),
  ],
);

export const templates = mysqlTable(
  'templates',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull(),
    depthDefault: mysqlEnum('depth_default', ['ringkas', 'standar', 'mendalam'])
      .notNull()
      .default('standar'),
    isSystem: boolean('is_system').notNull().default(false),
    sectionsJson: json('sections_json').notNull(),
    ...timestamps,
  },
  (table) => [
    index('templates_user_idx').on(table.userId),
    index('templates_system_idx').on(table.isSystem),
  ],
);

export const folders = mysqlTable(
  'folders',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    parentId: char('parent_id', { length: 36 }),
    ...timestamps,
  },
  (table) => [
    index('folders_user_idx').on(table.userId),
    index('folders_parent_idx').on(table.parentId),
  ],
);

export const documents = mysqlTable(
  'documents',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['draft', 'review', 'final', 'archived'])
      .notNull()
      .default('draft'),
    templateId: char('template_id', { length: 36 }).references(() => templates.id, {
      onDelete: 'set null',
    }),
    providerId: char('provider_id', { length: 36 }).references(() => providers.id, {
      onDelete: 'set null',
    }),
    model: varchar('model', { length: 255 }),
    language: mysqlEnum('language', ['id', 'en']).notNull().default('id'),
    depth: mysqlEnum('depth', ['ringkas', 'standar', 'mendalam']).notNull().default('standar'),
    inputJson: json('input_json').notNull(),
    clarificationsJson: json('clarifications_json'),
    folderId: char('folder_id', { length: 36 }).references(() => folders.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('documents_user_status_idx').on(table.userId, table.status),
    index('documents_user_updated_idx').on(table.userId, table.updatedAt),
    index('documents_user_deleted_idx').on(table.userId, table.deletedAt),
  ],
);

export const documentSections = mysqlTable(
  'document_sections',
  {
    id: char('id', { length: 36 }).primaryKey(),
    documentId: char('document_id', { length: 36 })
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    contentMd: text('content_md').notNull(),
    position: int('position').notNull(),
    status: mysqlEnum('status', ['pending', 'generating', 'done', 'failed'])
      .notNull()
      .default('pending'),
    isHidden: boolean('is_hidden').notNull().default(false),
    lastError: text('last_error'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('document_sections_key_unique').on(table.documentId, table.key),
    index('document_sections_order_idx').on(table.documentId, table.position),
  ],
);

export const documentVersions = mysqlTable(
  'document_versions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    documentId: char('document_id', { length: 36 })
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 255 }),
    snapshotJson: json('snapshot_json').notNull(),
    createdByAction: mysqlEnum('created_by_action', [
      'generate',
      'manual',
      'ai_action',
      'restore',
    ]).notNull(),
    isManualLabel: boolean('is_manual_label').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('document_versions_document_idx').on(table.documentId, table.createdAt)],
);

export const shareLinks = mysqlTable(
  'share_links',
  {
    id: char('id', { length: 36 }).primaryKey(),
    documentId: char('document_id', { length: 36 })
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    expiresAt: timestamp('expires_at'),
    revokedAt: timestamp('revoked_at'),
    viewCount: bigint('view_count', { mode: 'number', unsigned: true }).notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('share_links_token_unique').on(table.tokenHash),
    index('share_links_document_idx').on(table.documentId),
  ],
);

export const tags = mysqlTable(
  'tags',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('tags_user_name_unique').on(table.userId, table.name)],
);

export const documentTags = mysqlTable(
  'document_tags',
  {
    documentId: char('document_id', { length: 36 })
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    tagId: char('tag_id', { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.tagId] }),
    index('document_tags_tag_idx').on(table.tagId),
  ],
);

export const generationLogs = mysqlTable(
  'generation_logs',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentId: char('document_id', { length: 36 }).references(() => documents.id, {
      onDelete: 'set null',
    }),
    providerId: char('provider_id', { length: 36 }).references(() => providers.id, {
      onDelete: 'set null',
    }),
    model: varchar('model', { length: 255 }).notNull(),
    actionType: varchar('action_type', { length: 50 }).notNull(),
    promptTokens: int('prompt_tokens'),
    completionTokens: int('completion_tokens'),
    latencyMs: int('latency_ms').notNull(),
    status: mysqlEnum('status', ['success', 'failed', 'cancelled']).notNull(),
    errorCode: varchar('error_code', { length: 100 }),
    ...timestamps,
  },
  (table) => [
    index('generation_logs_user_created_idx').on(table.userId, table.createdAt),
    index('generation_logs_provider_idx').on(table.providerId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  providers: many(providers),
  documents: many(documents),
  templates: many(templates),
}));
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));
export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  sections: many(documentSections),
  versions: many(documentVersions),
}));

export const now = sql`CURRENT_TIMESTAMP`;
