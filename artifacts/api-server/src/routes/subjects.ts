import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable, plantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";
import { requireVerifiedOrOnboarding } from "../middleware/requireVerified.js";
import { PLANT_TYPES, isPlantType } from "../lib/constants.js";

const router: IRouter = Router();


router.get("/", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  // Archived subjects stay in the database with their plant and history but
  // leave the pickers and the garden.
  const includeArchived = req.query.includeArchived === "1";

  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(
      includeArchived
        ? eq(subjectsTable.userId, userId)
        : and(eq(subjectsTable.userId, userId), eq(subjectsTable.archived, false)),
    );

  res.json(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      archived: s.archived,
      accentColor: s.accentColor,
      plantId: s.plantId,
      totalFocusMinutes: s.totalFocusMinutes,
      sessionCount: s.sessionCount,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.post("/", requireVerifiedOrOnboarding, async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const { name, accentColor, plantType } = req.body;
  if (!name || !accentColor) {
    res.status(400).json({ error: "name and accentColor are required" });
    return;
  }

  if (plantType !== undefined && !isPlantType(plantType)) {
    res.status(400).json({ error: `plantType must be one of: ${PLANT_TYPES.join(", ")}` });
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

  const { name, accentColor, plantType, archived } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (accentColor) updates.accentColor = accentColor;
  if (typeof archived === "boolean") updates.archived = archived;

  if (plantType !== undefined && !isPlantType(plantType)) {
    res.status(400).json({ error: `plantType must be one of: ${PLANT_TYPES.join(", ")}` });
    return;
  }

  if (Object.keys(updates).length) {
    await db
      .update(subjectsTable)
      .set(updates)
      .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));
  }

  // The species belongs to the subject, so changing it here re-skins the
  // subject's plant. Only the drawing changes — level, points and blooms are
  // the user's history and survive the swap, which is what makes changing your
  // mind cheap enough to offer at all.
  if (plantType) {
    await db
      .update(plantsTable)
      .set({ plantType })
      .where(and(eq(plantsTable.subjectId, subjectId), eq(plantsTable.userId, userId)));
  }

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

  // The plant goes too. Deleting only the subject row left the plant behind
  // with a subject_id pointing at nothing, and the garden drew it as a second
  // "General" plant — while the confirmation had promised to delete it.
  await db
    .delete(plantsTable)
    .where(and(eq(plantsTable.subjectId, subjectId), eq(plantsTable.userId, userId)));

  await db
    .delete(subjectsTable)
    .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));

  res.json({ success: true });
});

export default router;
