export type PetUnlock =
  | { type: "free" }
  | { type: "minutes"; value: number }
  | { type: "coins"; value: number };

export type PetDefinition = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlock: PetUnlock;
  bgGradient: string;
  accentColor: string;
};

export const PET_CATALOG: PetDefinition[] = [
  {
    id: "mochi",
    name: "Mochi",
    emoji: "🐱",
    description: "Your loyal study buddy, always by your side",
    unlock: { type: "free" },
    bgGradient: "from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20",
    accentColor: "#f97316",
  },
  {
    id: "sprout",
    name: "Sprout",
    emoji: "🐸",
    description: "Loves rainy study sessions and quiet libraries",
    unlock: { type: "minutes", value: 180 },
    bgGradient: "from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20",
    accentColor: "#22c55e",
  },
  {
    id: "luna",
    name: "Luna",
    emoji: "🐰",
    description: "A moonlit learner who shines at night",
    unlock: { type: "minutes", value: 600 },
    bgGradient: "from-purple-100 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20",
    accentColor: "#a855f7",
  },
  {
    id: "ember",
    name: "Ember",
    emoji: "🦊",
    description: "Cunning and curious, always finds a way",
    unlock: { type: "coins", value: 100 },
    bgGradient: "from-red-100 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20",
    accentColor: "#ef4444",
  },
  {
    id: "cosmo",
    name: "Cosmo",
    emoji: "🐻",
    description: "Cozy, dependable, and wise beyond their years",
    unlock: { type: "coins", value: 250 },
    bgGradient: "from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20",
    accentColor: "#d97706",
  },
];

export type PetMood = {
  key: string;
  label: string;
  emoji: string;
  description: string;
};

export const PET_MOODS: Record<string, PetMood> = {
  happy:   { key: "happy",   label: "Happy",   emoji: "😊", description: "Great session today!" },
  neutral: { key: "neutral", label: "Neutral", emoji: "😐", description: "Let's study soon!" },
  sad:     { key: "sad",     label: "Sad",     emoji: "😢", description: "Missing your focus time..." },
};

export function getPetMoodFromKey(moodKey: string): PetMood {
  return PET_MOODS[moodKey] ?? PET_MOODS.neutral;
}

export function getPetMood(todayMinutes: number, streak: number): PetMood {
  if (todayMinutes >= 1) return PET_MOODS.happy;
  if (streak >= 1)       return PET_MOODS.neutral;
  return PET_MOODS.sad;
}

export function getPetById(id: string): PetDefinition {
  return PET_CATALOG.find((p) => p.id === id) ?? PET_CATALOG[0];
}

export function getUnlockLabel(unlock: PetUnlock): string {
  if (unlock.type === "free")    return "Default";
  if (unlock.type === "minutes") return `${unlock.value / 60}h studied`;
  return `${unlock.value} coins`;
}
