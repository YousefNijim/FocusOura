-- Safe to run multiple times (all statements are idempotent)
-- Matches Drizzle schema in lib/db/src/schema/focusoura.ts exactly
-- IDs are TEXT (not UUID) — Drizzle uses text().primaryKey() throughout

-- =============================================================
-- USERS TABLE — add columns missing from initial deployment
-- =============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_code INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS users_user_code_uniq
  ON users(user_code)
  WHERE user_code IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- =============================================================
-- SESSIONS TABLE — add columns missing from initial deployment
-- =============================================================
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS calendar_item_id TEXT;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS total_paused_ms INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS pause_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sessions_calendar_item_id_idx
  ON sessions(calendar_item_id);

-- =============================================================
-- CALENDAR ITEMS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS calendar_items (
  id           TEXT      PRIMARY KEY,
  user_id      TEXT      NOT NULL,
  subject_id   TEXT,
  title        TEXT      NOT NULL,
  type         TEXT      NOT NULL DEFAULT 'homework',
  due_date     TIMESTAMP NOT NULL,
  completed    BOOLEAN   NOT NULL DEFAULT false,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_user_id_idx
  ON calendar_items(user_id);

CREATE INDEX IF NOT EXISTS calendar_subject_id_idx
  ON calendar_items(subject_id);

CREATE INDEX IF NOT EXISTS calendar_due_date_idx
  ON calendar_items(due_date);

-- =============================================================
-- PUSH TOKENS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id         TEXT      PRIMARY KEY,
  user_id    TEXT      NOT NULL,
  token      TEXT      NOT NULL,
  device_id  TEXT,
  platform   TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  last_used  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
  ON push_tokens(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_idx
  ON push_tokens(user_id, token);

-- =============================================================
-- PASSWORD RESET TOKENS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT      PRIMARY KEY,
  user_id    TEXT      NOT NULL,
  token_hash TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prt_token_hash_idx
  ON password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS prt_user_id_idx
  ON password_reset_tokens(user_id);

-- =============================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         TEXT      PRIMARY KEY,
  user_id    TEXT      NOT NULL,
  token_hash TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evt_token_hash_idx
  ON email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS evt_user_id_idx
  ON email_verification_tokens(user_id);
