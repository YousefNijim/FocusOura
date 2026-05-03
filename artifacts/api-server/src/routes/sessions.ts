import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  sessionEventsTable,
  subjectsTable,
  plantsTable,
  walletsTable,
  transactionsTable,
  challengeParticipantsTable,
  challengesTable,
} from "@workspace/db";
import { eq, and, desc, isNull, inArray, sql } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";

const router: IRouter = Router();

const PLANT_INTERVAL_MINS = 25;
const GROWTH_PER_PLANT    = 100;

function calcPoints(actualMinutes: number, sessionType: string): number {
  const multiplier =
    sessionType === "deep_focus" ? 3 : sessionType === "homework" ? 2 : 1;
  return Math.floor(actualMinutes * multiplier);
}

function calcGrowthPoints(actualMinutes: number): number {
  const plantsEarned = Math.floor(actualMinutes / PLANT_INTERVAL_MINS);
  return plantsEarned * GROWTH_PER_PLANT;
}

async function findOrCreatePlant(
  userId: string,
  plantType: string,
  subjectId: string | null,
  subjectPlantId: string | null
): Promise<string> {
  if (subjectId && subjectPlantId) {
    return subjectPlantId;
  }

  if (subjectId) {
    const plantId = `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(plantsTable).values({
      id: plantId,
      userId,
      subjectId,
      plantType,
      growthLevel: 1,
      growthPoints: 0,
      maxGrowthPoints: 100,
    });
    await db.update(subjectsTable).set({ plantId }).where(eq(subjectsTable.id, subjectId));
    return plantId;
  }

  const existing = await db
    .select()
    .from(plantsTable)
    .where(
      and(
        eq(plantsTable.userId, userId),
        eq(plantsTable.plantType, plantType),
        isNull(plantsTable.subjectId)
      )
    )
    .limit(1);

  if (existing.length) return existing[0].id;

  const plantId = `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(plantsTable).values({
    id: plantId,
    userId,
    subjectId: null,
    plantType,
    growthLevel: 1,
    growthPoints: 0,
    maxGrowthPoints: 100,
  });
  return plantId;
}

router.get("/active", async (req, res) => {
  const userId = getUserId(req);

  const active = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.state, "started")))
    .limit(1);

  if (!active.length) {
    res.json({ session: null });
    return;
  }

  const s = active[0];
  let subjectName = "General";
  if (s.subjectId) {
    const subject = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, s.subjectId))
      .limit(1);
    subjectName = subject[0]?.name ?? "General";
  }

  res.json({
    session: {
      id: s.id,
      subjectId: s.subjectId,
      subjectName,
      plantId: s.plantId,
      sessionType: s.sessionType,
      state: s.state,
      startTime: s.startTime?.toISOString() ?? new Date().toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      durationMinutes: s.durationMinutes,
      pointsEarned: s.pointsEarned,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
    },
  });
});

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const limit = parseInt(req.query["limit"] as string) || 50;

  const sessions = await db
    .select({
      id: sessionsTable.id,
      subjectId: sessionsTable.subjectId,
      subjectName: subjectsTable.name,
      plantId: sessionsTable.plantId,
      sessionType: sessionsTable.sessionType,
      state: sessionsTable.state,
      startTime: sessionsTable.startTime,
      endTime: sessionsTable.endTime,
      durationMinutes: sessionsTable.durationMinutes,
      pointsEarned: sessionsTable.pointsEarned,
      createdAt: sessionsTable.createdAt,
    })
    .from(sessionsTable)
    .leftJoin(subjectsTable, eq(sessionsTable.subjectId, subjectsTable.id))
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(limit);

  res.json(
    sessions.map((s) => ({
      id: s.id,
      subjectId: s.subjectId,
      subjectName: s.subjectName ?? "General",
      plantId: s.plantId,
      sessionType: s.sessionType,
      state: s.state,
      startTime: s.startTime?.toISOString() ?? new Date().toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      durationMinutes: s.durationMinutes,
      pointsEarned: s.pointsEarned,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const { subjectId, plantType, sessionType, durationMinutes } = req.body;

  if (!plantType || !sessionType || !durationMinutes) {
    res.status(400).json({ error: "plantType, sessionType, durationMinutes required" });
    return;
  }

  const parsedDuration = Number(durationMinutes);
  if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 180) {
    res.status(400).json({ error: "durationMinutes must be between 1 and 180" });
    return;
  }

  let resolvedSubjectId: string | null = null;
  let subjectName = "General";
  let subjectPlantId: string | null = null;

  if (subjectId) {
    const subjectCheck = await db
      .select()
      .from(subjectsTable)
      .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)))
      .limit(1);

    if (!subjectCheck.length) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }
    resolvedSubjectId = subjectId;
    subjectName = subjectCheck[0].name;
    subjectPlantId = subjectCheck[0].plantId ?? null;
  }

  const resolvedPlantId = await findOrCreatePlant(
    userId,
    plantType,
    resolvedSubjectId,
    subjectPlantId
  );

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId,
    subjectId: resolvedSubjectId,
    plantId: resolvedPlantId,
    sessionType,
    state: "started",
    durationMinutes,
    pointsEarned: 0,
    startTime: new Date(),
  });

  await db.insert(sessionEventsTable).values({
    id: `evt_${Date.now()}_start`,
    sessionId,
    userId,
    eventType: "started",
    metadata: { sessionType, plantType },
  });

  res.status(201).json({
    id: sessionId,
    subjectId: resolvedSubjectId,
    subjectName,
    plantId: resolvedPlantId,
    sessionType,
    state: "started",
    startTime: new Date().toISOString(),
    endTime: null,
    durationMinutes,
    pointsEarned: 0,
    createdAt: new Date().toISOString(),
  });
});

router.put("/:sessionId", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;
  const { state, actualMinutes: rawActualMinutes } = req.body;

  const existing = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = existing[0];
  const endTime = new Date();

  const actualMinutes = rawActualMinutes ?? session.durationMinutes;

  let pointsEarned = 0;
  if (state === "completed" || (state === "aborted" && actualMinutes >= 1)) {
    pointsEarned = calcPoints(actualMinutes, session.sessionType);
    const growthPoints = calcGrowthPoints(actualMinutes);

    if (session.subjectId) {
      // Use SQL increment to ADD to existing totals — not overwrite them
      await db.update(subjectsTable)
        .set({
          totalFocusMinutes: sql`total_focus_minutes + ${actualMinutes}`,
          sessionCount: sql`session_count + 1`,
        })
        .where(eq(subjectsTable.id, session.subjectId));
    }

    const targetPlantId = session.plantId;

    if (targetPlantId) {
      const plantData = await db
        .select()
        .from(plantsTable)
        .where(eq(plantsTable.id, targetPlantId))
        .limit(1);

      if (plantData.length) {
        const plant = plantData[0];
        let newPoints = (plant.growthPoints ?? 0) + growthPoints;
        let newLevel = plant.growthLevel ?? 1;
        let maxPoints = plant.maxGrowthPoints ?? 100;

        while (newPoints >= maxPoints) {
          newPoints -= maxPoints;
          newLevel += 1;
          maxPoints = maxPoints + 50; // Additive scaling: 100, 150, 200, 250... (was ×1.5: too steep)
        }

        await db
          .update(plantsTable)
          .set({ growthPoints: newPoints, growthLevel: newLevel, maxGrowthPoints: maxPoints })
          .where(eq(plantsTable.id, targetPlantId));
      }
    }

    const wallet = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);

    if (wallet.length) {
      await db
        .update(walletsTable)
        .set({ balance: (wallet[0].balance ?? 0) + pointsEarned, lastUpdated: new Date() })
        .where(eq(walletsTable.userId, userId));
    }

    await db.insert(transactionsTable).values({
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type: "reward",
      amount: pointsEarned,
      description: `Completed ${session.sessionType} session`,
      referenceId: sessionId,
    });
  }

  await db
    .update(sessionsTable)
    .set({ state, endTime, pointsEarned, durationMinutes: actualMinutes })
    .where(eq(sessionsTable.id, sessionId));

  // Auto-update challenge progress for any active challenges this user is in
  if (state === "completed" && actualMinutes > 0) {
    try {
      const myParticipations = await db
        .select()
        .from(challengeParticipantsTable)
        .where(eq(challengeParticipantsTable.userId, userId));

      if (myParticipations.length > 0) {
        const challengeIds = myParticipations.map((p) => p.challengeId);
        const activeChallenges = await db
          .select()
          .from(challengesTable)
          .where(and(eq(challengesTable.status, "active"), inArray(challengesTable.id, challengeIds)));

        for (const ch of activeChallenges) {
          const part = myParticipations.find((p) => p.challengeId === ch.id);
          if (part) {
            await db.update(challengeParticipantsTable)
              .set({ focusMinutes: part.focusMinutes + actualMinutes })
              .where(eq(challengeParticipantsTable.id, part.id));
          }
        }
      }
    } catch (_) {}
  }

  await db.insert(sessionEventsTable).values({
    id: `evt_${Date.now()}_${state}`,
    sessionId,
    userId,
    eventType: state === "completed" ? "completed" : "aborted",
    metadata: { pointsEarned },
  });

  let subjectName = "General";
  if (session.subjectId) {
    const subject = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, session.subjectId))
      .limit(1);
    subjectName = subject[0]?.name ?? "General";
  }

  res.json({
    id: session.id,
    subjectId: session.subjectId,
    subjectName,
    plantId: session.plantId,
    sessionType: session.sessionType,
    state,
    startTime: session.startTime?.toISOString() ?? new Date().toISOString(),
    endTime: endTime.toISOString(),
    durationMinutes: session.durationMinutes,
    pointsEarned,
    createdAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/:sessionId/events", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;
  const { eventType, metadata } = req.body;

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(sessionEventsTable).values({
    id: eventId,
    sessionId,
    userId,
    eventType,
    metadata: metadata ?? {},
  });

  res.status(201).json({
    id: eventId,
    sessionId,
    eventType,
    eventTime: new Date().toISOString(),
    metadata: metadata ?? {},
  });
});

export default router;
