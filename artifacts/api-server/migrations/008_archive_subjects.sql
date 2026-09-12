-- Archiving replaces deleting. DELETE /subjects removed only the subject row
-- and left the plant behind with a subject_id pointing at nothing, which the
-- garden then rendered as a second "General" plant — while the confirmation
-- had promised to delete the plant too.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Plants already orphaned by a past delete become honestly unsorted rather
-- than pointing at a subject that no longer exists.
UPDATE plants p
SET subject_id = NULL
WHERE p.subject_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM subjects s WHERE s.id = p.subject_id);
