-- challenges.end_time was created as a quoted camelCase "endTime".
--
-- Every query Drizzle builds asks for "end_time", so GET /api/challenges failed
-- with `Failed query: … where status = $1 and end_time < $2` and the whole
-- Arena page showed "Couldn't load challenges. Check your connection."
--
-- The generated DDL and the schema both say end_time, and neither the repo's
-- migrations nor the backup contain "endTime" — most likely a drizzle-kit push
-- against an older schema. Renaming brings the column back in line.
--
-- Idempotent: renames only when the wrong name is there and the right one is not.

DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'endTime'
     )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'end_time'
     )
  THEN
    ALTER TABLE challenges RENAME COLUMN "endTime" TO end_time;
    RAISE NOTICE 'challenges."endTime" renamed to end_time';
  ELSE
    RAISE NOTICE 'challenges.end_time already correct — nothing to do';
  END IF;
END $$;
