// Plant growth cap increases by a flat +50 each level (additive).
// Sequence: 100 → 150 → 200 → 250 → ...
// Multiplicative (×1.5) was evaluated and rejected as too steep.
export const PLANT_GROWTH = {
  BASE_MAX: 100,
  LEVEL_INCREMENT: 50,
  calculateNextMax: (currentMax: number): number => currentMax + PLANT_GROWTH.LEVEL_INCREMENT,
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
