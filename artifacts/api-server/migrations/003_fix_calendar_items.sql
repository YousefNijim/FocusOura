-- Fix calendar_items table: id column may have been created as UUID instead of TEXT.
-- PostgreSQL rejects inserting "cal_1778398672141_ea24mj" into a UUID column.
--
-- This table was just created with no user data — safe to drop and recreate.
-- If you have verified your calendar_items table already has id TEXT (not UUID),
-- skip this file and run only the CREATE INDEX statements at the bottom.

DROP TABLE IF EXISTS "calendar_items";

CREATE TABLE "calendar_items" (
  "id"         text      PRIMARY KEY,
  "user_id"    text      NOT NULL,
  "subject_id" text,
  "title"      text      NOT NULL,
  "type"       text      NOT NULL DEFAULT 'homework',
  "due_date"   timestamp NOT NULL,
  "completed"  boolean   NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "calendar_user_id_idx"    ON "calendar_items" ("user_id");
CREATE INDEX IF NOT EXISTS "calendar_subject_id_idx" ON "calendar_items" ("subject_id");
CREATE INDEX IF NOT EXISTS "calendar_due_date_idx"   ON "calendar_items" ("due_date");
