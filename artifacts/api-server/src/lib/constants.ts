// Plant growth cap increases by a flat +50 each level (additive).
// Sequence: 100 → 150 → 200 → 250 → ...
// Multiplicative (×1.5) was evaluated and rejected as too steep.
export const PLANT_GROWTH = {
  BASE_MAX: 100,
  LEVEL_INCREMENT: 50,
  calculateNextMax: (currentMax: number): number => currentMax + PLANT_GROWTH.LEVEL_INCREMENT,
  calculatePrevMax: (currentMax: number): number =>
    Math.max(PLANT_GROWTH.BASE_MAX, currentMax - PLANT_GROWTH.LEVEL_INCREMENT),

  // Growth accrues per minute rather than per completed 25-minute block. The
  // block rule made a 24-minute session worth exactly nothing and a 49-minute
  // one worth the same as a 25-minute one, with nothing in the UI saying so.
  // Four points a minute keeps 25 minutes worth 100, so existing plants keep
  // their pace.
  POINTS_PER_MINUTE: 4,

  // The art has four stages. Levels used to run past it forever, so a plant
  // studied for months drew as stage 4 with a bar that reset endlessly and
  // never finished. Beyond level 4 a plant blooms instead of levelling.
  MAX_LEVEL: 4,
} as const;

// The species the garden can draw. `plant_type` is a text column, so an
// unknown value is stored happily and then renders as a fern forever — the
// web picker offered "lily" for months this way. Validate on the way in.
export const PLANT_TYPES = [
  "fern",
  "succulent",
  "bamboo",
  "rose",
  "cactus",
  "bonsai",
  "orchid",
  "lavender",
] as const;

export type PlantType = (typeof PLANT_TYPES)[number];

export function isPlantType(value: unknown): value is PlantType {
  return typeof value === "string" && (PLANT_TYPES as readonly string[]).includes(value);
}
