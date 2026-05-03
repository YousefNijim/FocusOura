import plant1 from "@/assets/plant-1.png";
import plant2 from "@/assets/plant-2.png";
import plant3 from "@/assets/plant-3.png";

export const PLANT_CATALOG = [
  { id: "orchid",    name: "Orchid",    image: plant1, desc: "Exotic & rare" },
  { id: "fern",      name: "Fern",      image: plant2, desc: "Resilient & lush" },
  { id: "succulent", name: "Succulent", image: plant3, desc: "Stores energy" },
  { id: "rose",      name: "Rose",      image: plant1, desc: "Classic beauty" },
  { id: "bamboo",    name: "Bamboo",    image: plant2, desc: "Swift grower" },
  { id: "lily",      name: "Lily",      image: plant3, desc: "Pure elegance" },
  { id: "cactus",    name: "Cactus",    image: plant3, desc: "Hardy survivor" },
  { id: "lavender",  name: "Lavender",  image: plant1, desc: "Calm focus" },
] as const;

export type PlantId = typeof PLANT_CATALOG[number]["id"];
