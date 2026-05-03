import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth.js";

const router: IRouter = Router();

export const PET_CATALOG = [
  {
    id: "mochi",
    name: "Mochi",
    emoji: "🐱",
    description: "Your loyal study buddy, always by your side",
    unlock: { type: "free" as const },
    gradient: "from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20",
    accentColor: "#f97316",
  },
  {
    id: "sprout",
    name: "Sprout",
    emoji: "🐸",
    description: "Loves rainy study sessions and quiet libraries",
    unlock: { type: "minutes" as const, value: 180 },
    gradient: "from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20",
    accentColor: "#22c55e",
  },
  {
    id: "luna",
    name: "Luna",
    emoji: "🐰",
    description: "A moonlit learner who shines at night",
    unlock: { type: "minutes" as const, value: 600 },
    gradient: "from-purple-100 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20",
    accentColor: "#a855f7",
  },
  {
    id: "ember",
    name: "Ember",
    emoji: "🦊",
    description: "Cunning and curious, always finds a way",
    unlock: { type: "coins" as const, value: 100 },
    gradient: "from-red-100 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20",
    accentColor: "#ef4444",
  },
  {
    id: "cosmo",
    name: "Cosmo",
    emoji: "🐻",
    description: "Cozy, dependable, and wise beyond their years",
    unlock: { type: "coins" as const, value: 250 },
    gradient: "from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20",
    accentColor: "#d97706",
  },
];

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const unlockedIds: string[] = Array.isArray(user.unlockedPetIds)
    ? (user.unlockedPetIds as string[])
    : ["mochi"];

  const catalog = PET_CATALOG.map((pet) => ({
    ...pet,
    unlocked: unlockedIds.includes(pet.id),
    selected: user.selectedPetId === pet.id,
  }));

  res.json({ catalog, selectedPetId: user.selectedPetId, unlockedPetIds: unlockedIds });
});

router.post("/select", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { petId } = req.body as { petId: string };

  if (!PET_CATALOG.find((p) => p.id === petId)) {
    res.status(400).json({ error: "Invalid pet ID" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const unlockedIds: string[] = Array.isArray(user.unlockedPetIds)
    ? (user.unlockedPetIds as string[])
    : ["mochi"];

  if (!unlockedIds.includes(petId)) {
    res.status(403).json({ error: "Pet not unlocked" }); return;
  }

  await db.update(usersTable).set({ selectedPetId: petId }).where(eq(usersTable.id, userId));
  res.json({ selectedPetId: petId });
});

router.post("/unlock", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { petId } = req.body as { petId: string };

  const pet = PET_CATALOG.find((p) => p.id === petId);
  if (!pet) { res.status(400).json({ error: "Invalid pet ID" }); return; }
  if (pet.unlock.type === "free") { res.status(400).json({ error: "This pet is already free" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const unlockedIds: string[] = Array.isArray(user.unlockedPetIds)
    ? (user.unlockedPetIds as string[])
    : ["mochi"];

  if (unlockedIds.includes(petId)) {
    res.status(400).json({ error: "Already unlocked" }); return;
  }

  if (pet.unlock.type === "coins") {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
    if (!wallet || wallet.balance < pet.unlock.value) {
      res.status(400).json({ error: `Need ${pet.unlock.value} coins to unlock ${pet.name}` }); return;
    }
    const txId = `tx_pet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.update(walletsTable)
      .set({ balance: wallet.balance - pet.unlock.value, lastUpdated: new Date() })
      .where(eq(walletsTable.userId, userId));
    await db.insert(transactionsTable).values({
      id: txId,
      userId,
      type: "purchase",
      amount: -pet.unlock.value,
      description: `Unlocked pet: ${pet.name}`,
      referenceId: petId,
    });
  }

  const newUnlockedIds = [...unlockedIds, petId];
  await db.update(usersTable)
    .set({ unlockedPetIds: newUnlockedIds })
    .where(eq(usersTable.id, userId));

  res.json({ unlockedPetIds: newUnlockedIds, petId });
});

export default router;
