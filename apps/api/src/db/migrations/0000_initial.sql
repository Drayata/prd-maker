CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(320) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `locale` enum('id','en') NOT NULL DEFAULT 'id',
  `theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `users_email_unique` (`email`), KEY `users_deleted_at_idx` (`deleted_at`)
);
CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `token_hash` char(64) NOT NULL,
  `expires_at` timestamp NOT NULL, `revoked_at` timestamp NULL, `user_agent` varchar(500), `ip` varchar(45),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `refresh_tokens_hash_unique` (`token_hash`), KEY `refresh_tokens_user_idx` (`user_id`), KEY `refresh_tokens_expiry_idx` (`expires_at`),
  CONSTRAINT `refresh_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `providers` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `name` varchar(120) NOT NULL,
  `type` enum('openai_compatible','anthropic','google_gemini','ollama_native') NOT NULL, `base_url` varchar(2048) NOT NULL,
  `api_key_encrypted` text, `api_key_iv` varchar(64), `api_key_tag` varchar(64), `key_version` int NOT NULL DEFAULT 1,
  `default_model` varchar(255) NOT NULL, `custom_headers_json` json, `extra_body_json` json, `default_params_json` json,
  `supports_streaming` boolean NOT NULL DEFAULT true, `supports_json_mode` boolean NOT NULL DEFAULT false,
  `model_profile` enum('small','medium','large') NOT NULL DEFAULT 'medium', `timeout_ms` int NOT NULL DEFAULT 120000,
  `input_price_per_m` decimal(12,4), `output_price_per_m` decimal(12,4), `is_default` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `providers_user_idx` (`user_id`), KEY `providers_user_default_idx` (`user_id`,`is_default`),
  CONSTRAINT `providers_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `templates` (
  `id` char(36) NOT NULL, `user_id` char(36), `name` varchar(120) NOT NULL, `description` text NOT NULL,
  `depth_default` enum('ringkas','standar','mendalam') NOT NULL DEFAULT 'standar', `is_system` boolean NOT NULL DEFAULT false, `sections_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `templates_user_idx` (`user_id`), KEY `templates_system_idx` (`is_system`),
  CONSTRAINT `templates_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `folders` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `name` varchar(120) NOT NULL, `parent_id` char(36),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `folders_user_idx` (`user_id`), KEY `folders_parent_idx` (`parent_id`),
  CONSTRAINT `folders_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `folders_parent_fk` FOREIGN KEY (`parent_id`) REFERENCES `folders` (`id`) ON DELETE CASCADE
);
CREATE TABLE `documents` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `title` varchar(255) NOT NULL,
  `status` enum('draft','review','final','archived') NOT NULL DEFAULT 'draft', `template_id` char(36), `provider_id` char(36), `model` varchar(255),
  `language` enum('id','en') NOT NULL DEFAULT 'id', `depth` enum('ringkas','standar','mendalam') NOT NULL DEFAULT 'standar',
  `input_json` json NOT NULL, `clarifications_json` json, `folder_id` char(36),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, `deleted_at` timestamp NULL,
  PRIMARY KEY (`id`), KEY `documents_user_status_idx` (`user_id`,`status`), KEY `documents_user_updated_idx` (`user_id`,`updated_at`), KEY `documents_user_deleted_idx` (`user_id`,`deleted_at`),
  CONSTRAINT `documents_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `documents_template_fk` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documents_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documents_folder_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL
);
CREATE TABLE `document_sections` (
  `id` char(36) NOT NULL, `document_id` char(36) NOT NULL, `key` varchar(100) NOT NULL, `title` varchar(255) NOT NULL,
  `content_md` text NOT NULL, `position` int NOT NULL, `status` enum('pending','generating','done','failed') NOT NULL DEFAULT 'pending',
  `is_hidden` boolean NOT NULL DEFAULT false, `last_error` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `document_sections_key_unique` (`document_id`,`key`), KEY `document_sections_order_idx` (`document_id`,`position`),
  CONSTRAINT `document_sections_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
);
CREATE TABLE `document_versions` (
  `id` char(36) NOT NULL, `document_id` char(36) NOT NULL, `label` varchar(255), `snapshot_json` json NOT NULL,
  `created_by_action` enum('generate','manual','ai_action','restore') NOT NULL, `is_manual_label` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `document_versions_document_idx` (`document_id`,`created_at`),
  CONSTRAINT `document_versions_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
);
CREATE TABLE `share_links` (
  `id` char(36) NOT NULL, `document_id` char(36) NOT NULL, `token_hash` char(64) NOT NULL, `password_hash` varchar(255),
  `expires_at` timestamp NULL, `revoked_at` timestamp NULL, `view_count` bigint unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `share_links_token_unique` (`token_hash`), KEY `share_links_document_idx` (`document_id`),
  CONSTRAINT `share_links_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
);
CREATE TABLE `tags` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `name` varchar(80) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `tags_user_name_unique` (`user_id`,`name`),
  CONSTRAINT `tags_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `document_tags` (
  `document_id` char(36) NOT NULL, `tag_id` char(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`,`tag_id`), KEY `document_tags_tag_idx` (`tag_id`),
  CONSTRAINT `document_tags_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_tags_tag_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
);
CREATE TABLE `generation_logs` (
  `id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `document_id` char(36), `provider_id` char(36), `model` varchar(255) NOT NULL,
  `action_type` varchar(50) NOT NULL, `prompt_tokens` int, `completion_tokens` int, `latency_ms` int NOT NULL,
  `status` enum('success','failed','cancelled') NOT NULL, `error_code` varchar(100),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `generation_logs_user_created_idx` (`user_id`,`created_at`), KEY `generation_logs_provider_idx` (`provider_id`),
  CONSTRAINT `generation_logs_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `generation_logs_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `generation_logs_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE SET NULL
);
