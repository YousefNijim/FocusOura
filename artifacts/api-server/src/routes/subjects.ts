import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable, plantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";
import { requireVerified } from "../middleware/requireVerified.js";

const router: IRouter = Router();

const PLANT_TYPES = ["fern", "succulent", "bamboo", "rose", "cactus", "bonsai", "orchid", "lavender"];

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.userId, userId));

  res.json(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      accentColor: s.accentColor,
      plantId: s.plantId,
      totalFocusMinutes: s.totalFocusMinutes,
      sessionCount: s.sessionCount,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.post("/", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const { name, accentColor, plantType } = req.body;
  if (!name || !accentColor) {
    res.status(400).json({ error: "name and accentColor are required" });
    return;
  }

  const subjectId = `subj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const plantId = `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const chosenPlantType = plantType || PLANT_TYPES[Math.floor(Math.random() * PLANT_TYPES.length)];

  await db.insert(subjectsTable).values({
    id: subjectId,
    userId,
    name,
    accentColor,
    plantId,
    totalFocusMinutes: 0,
    sessionCount: 0,
  });

  await db.insert(plantsTable).values({
    id: plantId,
    userId,
    subjectId,
    plantType: chosenPlantType,
    growthLevel: 1,
    growthPoints: 0,
    maxGrowthPoints: 100,
  });

  res.status(201).json({
    id: subjectId,
    name,
    accentColor,
    plantId,
    totalFocusMinutes: 0,
    sessionCount: 0,
    createdAt: new Date().toISOString(),
  });
});

router.put("/:subjectId", async (req, res) => {
  const userId = getUserId(req);
  const { subjectId } = req.params;

  const { name, accentColor } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (accentColor) updates.accentColor = accentColor;

  await db
    .update(subjectsTable)
    .set(updates)
    .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));

  const updated = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId)).limit(1);
  const s = updated[0];
  res.json({
    id: s.id,
    name: s.name,
    accentColor: s.accentColor,
    plantId: s.plantId,
    totalFocusMinutes: s.totalFocusMinutes,
    sessionCount: s.sessionCount,
    createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.delete("/:subjectId", async (req, res) => {
  const userId = getUserId(req);
  const { subjectId } = req.params;

  await db
    .delete(subjectsTable)
    .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));

  res.json({ success: true });
});

export default router;
