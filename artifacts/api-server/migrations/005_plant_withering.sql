-- Withering: a plant carries the mark of an abandoned session until the next
-- completed one. NULL means healthy, so existing rows need no backfill.
ALTER TABLE plants ADD COLUMN IF NOT EXISTS withered_at TIMESTAMP;
