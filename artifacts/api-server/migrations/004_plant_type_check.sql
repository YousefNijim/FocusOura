-- Constrain plants.plant_type to the species the garden can actually draw.
--
-- The column is plain text with no constraint, so the web picker's "lily"
-- (which had no art) was stored happily and rendered as a fern forever.
-- Normalise any such rows before adding the constraint, or it will not apply.

UPDATE plants
SET plant_type = 'fern'
WHERE plant_type NOT IN
  ('fern', 'succulent', 'bamboo', 'rose', 'cactus', 'bonsai', 'orchid', 'lavender');

ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_plant_type_check;

ALTER TABLE plants ADD CONSTRAINT plants_plant_type_check
  CHECK (plant_type IN
    ('fern', 'succulent', 'bamboo', 'rose', 'cactus', 'bonsai', 'orchid', 'lavender'));
