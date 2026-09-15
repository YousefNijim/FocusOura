import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { plantsTable, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";
import { PLANT_GROWTH } from "../lib/constants.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const plants = await db
    .select({
      id: plantsTable.id,
      subjectId: plantsTable.subjectId,
      subjectName: subjectsTable.name,
      accentColor: subjectsTable.accentColor,
      plantType: plantsTable.plantType,
      growthLevel: plantsTable.growthLevel,
      growthPoints: plantsTable.growthPoints,
      maxGrowthPoints: plantsTable.maxGrowthPoints,
      witheredAt: plantsTable.witheredAt,
      blooms: plantsTable.blooms,
      createdAt: plantsTable.createdAt,
    })
    .from(plantsTable)
    .leftJoin(subjectsTable, eq(plantsTable.subjectId, subjectsTable.id))
    .where(eq(plantsTable.userId, userId));

  res.json(
    plants.map((p) => ({
      id: p.id,
      subjectId: p.subjectId,
      subjectName: p.subjectName ?? "General Progress",
      plantType: p.plantType,
      growthLevel: p.growthLevel,
      growthPoints: p.growthPoints,
      maxGrowthPoints: p.maxGrowthPoints,
      accentColor: p.accentColor ?? "#4CAF50",
      withered: p.witheredAt !== null,
      blooms: p.blooms ?? 0,
      createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.put("/:plantId", async (req, res) => {
  const userId = getUserId(req);
  const { plantId } = req.params;
  const { growthPoints } = req.body;

  const existing = await db
    .select()
    .from(plantsTable)
    .where(and(eq(plantsTable.id, plantId), eq(plantsTable.userId, userId)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Plant not found" });
    return;
  }

  const plant = existing[0];
  let newPoints = (plant.growthPoints ?? 0) + (growthPoints ?? 0);
  let newLevel = plant.growthLevel ?? 1;
  let maxPoints = plant.maxGrowthPoints ?? 100;

  while (newPoints >= maxPoints) {
    newPoints -= maxPoints;
    newLevel += 1;
    maxPoints = PLANT_GROWTH.calculateNextMax(maxPoints);
  }

  await db
    .update(plantsTable)
    .set({ growthPoints: newPoints, growthLevel: newLevel, maxGrowthPoints: maxPoints })
    .where(eq(plantsTable.id, plantId));

  const updated = await db
    .select({
      id: plantsTable.id,
      subjectId: plantsTable.subjectId,
      subjectName: subjectsTable.name,
      accentColor: subjectsTable.accentColor,
      plantType: plantsTable.plantType,
      growthLevel: plantsTable.growthLevel,
      growthPoints: plantsTable.growthPoints,
      maxGrowthPoints: plantsTable.maxGrowthPoints,
      witheredAt: plantsTable.witheredAt,
      blooms: plantsTable.blooms,
      createdAt: plantsTable.createdAt,
    })
    .from(plantsTable)
    .leftJoin(subjectsTable, eq(plantsTable.subjectId, subjectsTable.id))
    .where(eq(plantsTable.id, plantId))
    .limit(1);

  const p = updated[0];
  res.json({
    id: p.id,
    subjectId: p.subjectId,
    subjectName: p.subjectName ?? "Unknown",
    plantType: p.plantType,
    growthLevel: p.growthLevel,
    growthPoints: p.growthPoints,
    maxGrowthPoints: p.maxGrowthPoints,
    accentColor: p.accentColor ?? "#4CAF50",
    withered: p.witheredAt !== null,
    blooms: p.blooms ?? 0,
    createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

export default router;
