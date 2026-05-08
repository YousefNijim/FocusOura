// Plant growth cap increases by a flat +50 each level (additive).
// Sequence: 100 → 150 → 200 → 250 → ...
// Multiplicative (×1.5) was evaluated and rejected as too steep.
export const PLANT_GROWTH = {
  BASE_MAX: 100,
  LEVEL_INCREMENT: 50,
  calculateNextMax: (currentMax: number): number => currentMax + PLANT_GROWTH.LEVEL_INCREMENT,
} as const;
