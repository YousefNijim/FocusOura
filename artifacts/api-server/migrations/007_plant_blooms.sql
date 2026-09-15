-- A plant reaching the final level used to keep levelling forever, drawing as
-- stage 4 with a progress bar that reset endlessly. Levels now cap at 4 and
-- further study blooms the plant instead.
ALTER TABLE plants ADD COLUMN IF NOT EXISTS blooms INTEGER NOT NULL DEFAULT 0;

-- Anything already past the cap is folded back: the excess levels become the
-- blooms they would have been under the new rule.
UPDATE plants
SET blooms = blooms + (growth_level - 4),
    growth_level = 4,
    max_growth_points = 250
WHERE growth_level > 4;
