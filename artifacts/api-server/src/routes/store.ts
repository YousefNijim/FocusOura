import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { storeItemsTable, userInventoryTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "./users.js";
import { randomUUID } from "crypto";
import { requireVerified } from "../middleware/requireVerified.js";

const router: IRouter = Router();

// ─── Seed Store Items ─────────────────────────────────────────────────────────
const SEED_ITEMS = [
  // Avatar Frames
  { id: "frame_emerald",  name: "Emerald Ring",      description: "A gleaming emerald border for your avatar.", category: "avatar_frame",     price: 80,   icon: "💚", rarity: "common",    colorValue: "#10b981" },
  { id: "frame_gold",     name: "Gold Crown",         description: "A prestigious golden frame for top scholars.", category: "avatar_frame",    price: 200,  icon: "👑", rarity: "rare",      colorValue: "#f59e0b" },
  { id: "frame_galaxy",   name: "Galaxy Halo",        description: "A cosmic ring that shimmers with starlight.", category: "avatar_frame",    price: 500,  icon: "🌌", rarity: "legendary", colorValue: "#8b5cf6" },
  { id: "frame_cherry",   name: "Cherry Blossom",     description: "A delicate floral ring of cherry blossoms.", category: "avatar_frame",    price: 120,  icon: "🌸", rarity: "common",    colorValue: "#f472b6" },
  { id: "frame_neon",     name: "Neon Pulse",         description: "An electric neon frame for night owls.", category: "avatar_frame",        price: 350,  icon: "⚡", rarity: "rare",      colorValue: "#06b6d4" },
  // Focus Backgrounds
  { id: "bg_forest",      name: "Forest Retreat",     description: "A peaceful forest canopy for deep focus.", category: "focus_background", price: 100,  icon: "🌲", rarity: "common",    colorValue: "#166534" },
  { id: "bg_ocean",       name: "Ocean Depths",       description: "Calming deep-sea waves around your session.", category: "focus_background", price: 150, icon: "🌊", rarity: "common",    colorValue: "#1e40af" },
  { id: "bg_space",       name: "Cosmic Void",        description: "Study among the stars in deep space.", category: "focus_background",     price: 400,  icon: "🚀", rarity: "legendary", colorValue: "#1e1b4b" },
  { id: "bg_cozy",        name: "Cozy Cabin",         description: "A warm cabin interior by a crackling fire.", category: "focus_background", price: 200, icon: "🔥", rarity: "rare",      colorValue: "#92400e" },
  { id: "bg_zenith",      name: "Zenith Sunrise",     description: "A mountain summit at golden hour.", category: "focus_background",       price: 180,  icon: "🌅", rarity: "common",    colorValue: "#d97706" },
  // Pet Outfits
  { id: "outfit_wizard",  name: "Wizard Robes",       description: "Arcane robes for the scholarly companion.", category: "pet_outfit",      price: 150,  icon: "🧙", rarity: "rare",      colorValue: "#7c3aed" },
  { id: "outfit_knight",  name: "Knight Armor",       description: "Shining armor for a courageous pet.", category: "pet_outfit",          price: 120,  icon: "⚔️", rarity: "common",    colorValue: "#6b7280" },
  { id: "outfit_chef",    name: "Chef Hat",           description: "A classic chef's hat for your culinary pet.", category: "pet_outfit",    price: 80,   icon: "👨‍🍳", rarity: "common",    colorValue: "#f3f4f6" },
  { id: "outfit_astro",   name: "Astronaut Suit",     description: "Full space gear for the ultimate explorer.", category: "pet_outfit",   price: 450,  icon: "👨‍🚀", rarity: "legendary", colorValue: "#bfdbfe" },
  { id: "outfit_samurai", name: "Samurai Armor",      description: "Ancient samurai armor for focused warriors.", category: "pet_outfit",  price: 300,  icon: "🥷", rarity: "rare",      colorValue: "#dc2626" },
];

let storeSeeded = false;
async function seedStoreItems() {
  if (storeSeeded) return;
  const count = await db.select({ n: sql<number>`count(*)` }).from(storeItemsTable);
  if (Number(count[0]?.n) === 0) {
    await db.insert(storeItemsTable).values(SEED_ITEMS).onConflictDoNothing();
  }
  storeSeeded = true;
}

router.get("/items", async (req, res) => {
  const userId = getUserId(req);
  await seedStoreItems();

  const [items, inventory] = await Promise.all([
    db.select().from(storeItemsTable).orderBy(storeItemsTable.category, storeItemsTable.price),
    db.select().from(userInventoryTable).where(eq(userInventoryTable.userId, userId)),
  ]);

  const ownedMap = new Map(inventory.map((i) => [i.itemId, i]));

  res.json(
    items.map((item) => {
      const inv = ownedMap.get(item.id);
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        icon: item.icon,
        rarity: item.rarity,
        colorValue: item.colorValue,
        owned: !!inv,
        equipped: inv?.equipped ?? false,
      };
    })
  );
});

router.get("/inventory", async (req, res) => {
  const userId = getUserId(req);

  const inventory = await db
    .select({ inv: userInventoryTable, item: storeItemsTable })
    .from(userInventoryTable)
    .innerJoin(storeItemsTable, eq(userInventoryTable.itemId, storeItemsTable.id))
    .where(eq(userInventoryTable.userId, userId));

  res.json(
    inventory.map(({ inv, item }) => ({
      id: inv.id,
      itemId: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      icon: item.icon,
      rarity: item.rarity,
      colorValue: item.colorValue,
      equipped: inv.equipped,
      purchasedAt: inv.purchasedAt?.toISOString(),
    }))
  );
});

router.post("/buy", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  const { itemId } = req.body;

  if (!itemId) {
    res.status(400).json({ error: "itemId required" });
    return;
  }

  const [item] = await db.select().from(storeItemsTable).where(eq(storeItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const existing = await db
    .select()
    .from(userInventoryTable)
    .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "You already own this item" });
    return;
  }

  let walletRows = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!walletRows.length) {
    await db.insert(walletsTable).values({ userId, balance: 0 });
    walletRows = [{ userId, balance: 0, lastUpdated: new Date() }];
  }

  const wallet = walletRows[0];
  if (wallet.balance < item.price) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  await db
    .update(walletsTable)
    .set({ balance: wallet.balance - item.price, lastUpdated: new Date() })
    .where(eq(walletsTable.userId, userId));

  await db.insert(transactionsTable).values({
    id: randomUUID(),
    userId,
    type: "debit",
    amount: item.price,
    description: `Purchased: ${item.name}`,
    referenceId: item.id,
  });

  await db.insert(userInventoryTable).values({
    id: randomUUID(),
    userId,
    itemId: item.id,
    equipped: false,
  });

  res.json({ success: true, newBalance: wallet.balance - item.price });
});

router.post("/equip", async (req, res) => {
  const userId = getUserId(req);
  const { itemId, equipped } = req.body;

  if (!itemId || equipped === undefined) {
    res.status(400).json({ error: "itemId and equipped required" });
    return;
  }

  const [item] = await db.select().from(storeItemsTable).where(eq(storeItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const [inv] = await db
    .select()
    .from(userInventoryTable)
    .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)))
    .limit(1);

  if (!inv) {
    res.status(403).json({ error: "You don't own this item" });
    return;
  }

  if (equipped) {
    const allInCategory = await db
      .select({ inv: userInventoryTable })
      .from(userInventoryTable)
      .innerJoin(storeItemsTable, eq(userInventoryTable.itemId, storeItemsTable.id))
      .where(
        and(
          eq(userInventoryTable.userId, userId),
          eq(storeItemsTable.category, item.category)
        )
      );

    for (const row of allInCategory) {
      if (row.inv.equipped) {
        await db
          .update(userInventoryTable)
          .set({ equipped: false })
          .where(eq(userInventoryTable.id, row.inv.id));
      }
    }
  }

  await db
    .update(userInventoryTable)
    .set({ equipped })
    .where(eq(userInventoryTable.id, inv.id));

  res.json({ success: true });
});

export default router;
