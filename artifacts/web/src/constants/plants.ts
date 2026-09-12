import type { PlantType } from "@/components/garden/PlantArt";

/**
 * The species a user can choose from. Every id here must be one the garden can
 * actually draw — `lily` used to sit in this list and `bonsai` did not, so
 * choosing Lily stored a type the Garden had no art for and silently fell back
 * to a fern.
 */
export const PLANT_CATALOG: ReadonlyArray<{ id: PlantType; name: string; desc: string }> = [
  { id: "orchid", name: "Orchid", desc: "Exotic & rare" },
  { id: "fern", name: "Fern", desc: "Resilient & lush" },
  { id: "succulent", name: "Succulent", desc: "Stores energy" },
  { id: "rose", name: "Rose", desc: "Classic beauty" },
  { id: "bamboo", name: "Bamboo", desc: "Swift grower" },
  { id: "bonsai", name: "Bonsai", desc: "Patient & deliberate" },
  { id: "cactus", name: "Cactus", desc: "Hardy survivor" },
  { id: "lavender", name: "Lavender", desc: "Calm focus" },
];

export type PlantId = PlantType;
