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
  calendarItemsTable,
} from "@workspace/db";
import { eq, and, desc, isNull, inArray, sql, gte } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";
import { PLANT_GROWTH } from "../lib/constants.js";
import { logger } from "../lib/logger.js";
import { sendPushNotification } from "../lib/push.js";
import { requireVerified } from "../middleware/requireVerified.js";

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
    .where(and(eq(sessionsTable.userId, userId), inArray(sessionsTable.state, ["started", "paused"])))
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

  let activeCalendarItemTitle: string | null = null;
  if (s.calendarItemId) {
    const [calItem] = await db
      .select({ title: calendarItemsTable.title })
      .from(calendarItemsTable)
      .where(eq(calendarItemsTable.id, s.calendarItemId))
      .limit(1);
    activeCalendarItemTitle = calItem?.title ?? null;
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
      pausedAt: s.pausedAt?.toISOString() ?? null,
      totalPausedMs: s.totalPausedMs ?? 0,
      pauseCount: s.pauseCount ?? 0,
      calendarItemId: s.calendarItemId,
      calendarItemTitle: activeCalendarItemTitle,
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

router.post("/", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const { subjectId, calendarItemId, plantType, sessionType, durationMinutes } = req.body;

  if (!plantType || !sessionType || !durationMinutes) {
    res.status(400).json({ error: "plantType, sessionType, durationMinutes required" });
    return;
  }

  const parsedDuration = Number(durationMinutes);
  if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 180) {
    res.status(400).json({ error: "durationMinutes must be between 1 and 180" });
    return;
  }

  const VALID_SESSION_TYPES = ["routine", "homework", "deep_focus"];
  if (!VALID_SESSION_TYPES.includes(sessionType)) {
    res.status(400).json({ error: "sessionType must be 'routine', 'homework', or 'deep_focus'" });
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

  // Verify calendar item ownership before linking — prevents linking or auto-completing another user's item
  let verifiedCalendarItemId: string | null = null;
  let calendarItemTitle: string | null = null;
  if (calendarItemId) {
    const [calItem] = await db
      .select({ title: calendarItemsTable.title })
      .from(calendarItemsTable)
      .where(and(eq(calendarItemsTable.id, calendarItemId), eq(calendarItemsTable.userId, userId)))
      .limit(1);
    if (calItem) {
      verifiedCalendarItemId = calendarItemId;
      calendarItemTitle = calItem.title;
    }
  }

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId,
    subjectId: resolvedSubjectId,
    calendarItemId: verifiedCalendarItemId,
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
    calendarItemId: verifiedCalendarItemId,
    calendarItemTitle,
    createdAt: new Date().toISOString(),
  });
});

router.post("/:sessionId/pause", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.state !== "started") {
    res.status(400).json({ error: "Session is not active" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(sessionsTable)
    .set({ state: "paused", pausedAt: now, pauseCount: sql`pause_count + 1` })
    .where(eq(sessionsTable.id, sessionId))
    .returning({ pauseCount: sessionsTable.pauseCount });

  res.json({
    sessionId,
    status: "paused",
    pausedAt: now.toISOString(),
    pauseCount: updated?.pauseCount ?? 1,
  });
});

router.post("/:sessionId/resume", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.state !== "paused") {
    res.status(400).json({ error: "Session is not paused" });
    return;
  }

  const now = new Date();
  const pauseDuration = now.getTime() - (session.pausedAt?.getTime() ?? now.getTime());

  // Auto-abort if paused for more than 2 hours
  if (pauseDuration > 2 * 60 * 60 * 1000) {
    await db
      .update(sessionsTable)
      .set({
        state: "aborted",
        endTime: now,
        totalPausedMs: sql`total_paused_ms + ${pauseDuration}`,
        pausedAt: null,
      })
      .where(eq(sessionsTable.id, sessionId));

    await db.insert(sessionEventsTable).values({
      id: `evt_${Date.now()}_pause_timeout`,
      sessionId,
      userId,
      eventType: "aborted",
      metadata: { reason: "pause_timeout", pauseDuration },
    });

    res.status(400).json({ error: "Session expired during pause" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({
      state: "started",
      totalPausedMs: sql`total_paused_ms + ${pauseDuration}`,
      pausedAt: null,
    })
    .where(eq(sessionsTable.id, sessionId))
    .returning({ totalPausedMs: sessionsTable.totalPausedMs, pauseCount: sessionsTable.pauseCount });

  res.json({
    sessionId,
    status: "active",
    totalPausedMs: updated?.totalPausedMs ?? 0,
    pauseCount: updated?.pauseCount ?? 0,
  });
});

router.put("/:sessionId", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;
  const { state, actualMinutes: rawActualMinutes } = req.body;

  if (state !== "completed" && state !== "aborted") {
    res.status(400).json({ error: "state must be 'completed' or 'aborted'" });
    return;
  }

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

  if (session.state === "completed" || session.state === "aborted") {
    res.status(409).json({ error: "Session already finished" });
    return;
  }

  const endTime = new Date();

  const actualMinutes = rawActualMinutes ?? session.durationMinutes;

  // Finalize total_paused_ms if completing/aborting from a paused state
  let finalTotalPausedMs = session.totalPausedMs ?? 0;
  if (session.state === "paused" && session.pausedAt) {
    finalTotalPausedMs += endTime.getTime() - session.pausedAt.getTime();
  }

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

      if (plantData.length && state === "completed") {
        const plant = plantData[0];
        let newPoints = (plant.growthPoints ?? 0) + growthPoints;
        let newLevel = plant.growthLevel ?? 1;
        let maxPoints = plant.maxGrowthPoints ?? 100;

        while (newPoints >= maxPoints) {
          newPoints -= maxPoints;
          newLevel += 1;
          maxPoints = PLANT_GROWTH.calculateNextMax(maxPoints);
        }

        await db
          .update(plantsTable)
          .set({
            growthPoints: newPoints,
            growthLevel: newLevel,
            maxGrowthPoints: maxPoints,
            // A finished session revives a withered plant.
            witheredAt: null,
          })
          .where(eq(plantsTable.id, targetPlantId));
      }
    }

    await db
      .update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${pointsEarned}`, lastUpdated: new Date() })
      .where(eq(walletsTable.userId, userId));

      await db.insert(transactionsTable).values({
        id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        type: "reward",
        amount: pointsEarned,
        description: `Completed ${session.sessionType} session`,
        referenceId: sessionId,
      });

      // Mark calendar item as completed if linked
      if (session.calendarItemId) {
        try {
          await db.update(calendarItemsTable)
            .set({ completed: true })
            .where(eq(calendarItemsTable.id, session.calendarItemId));
        } catch (err) {
          logger.warn({
            msg: "Failed to mark calendar item as completed after session",
            error: err instanceof Error ? err.message : String(err),
            context: { sessionId, userId, calendarItemId: session.calendarItemId },
          });
        }
      }
    }

  await db
    .update(sessionsTable)
    .set({
      state,
      endTime,
      pointsEarned,
      durationMinutes: actualMinutes,
      totalPausedMs: finalTotalPausedMs,
      pausedAt: null,
    })
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
    } catch (error) {
      // TODO: Add to a dead-letter queue for manual resolution
      logger.error({
        msg: "Failed to update challenge progress after session completion — participant minutes may be out of sync",
        error: error instanceof Error ? error.message : String(error),
        context: { sessionId, userId },
      });
    }
  }

  // Withering: an aborted session leaves the plant withered until the next
  // completed one on it, and costs half its progress toward the next level.
  // The level itself is kept — losing a level would erase days of work for
  // one cancelled session.
  if (state === "aborted" && session.plantId) {
    try {
      const [withering] = await db
        .select({ growthPoints: plantsTable.growthPoints })
        .from(plantsTable)
        .where(eq(plantsTable.id, session.plantId))
        .limit(1);

      if (withering) {
        await db
          .update(plantsTable)
          .set({
            witheredAt: new Date(),
            growthPoints: Math.floor((withering.growthPoints ?? 0) / 2),
          })
          .where(eq(plantsTable.id, session.plantId));
      }
    } catch (err) {
      logger.error({
        msg: "Failed to wither plant after aborted session",
        plantId: session.plantId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.insert(sessionEventsTable).values({
    id: `evt_${Date.now()}_${state}`,
    sessionId,
    userId,
    eventType: state === "completed" ? "completed" : "aborted",
    metadata: { pointsEarned },
  });

  // Fire daily-goal notification when the user crosses the 60-minute threshold today
  // (replace 60 with user.dailyGoalMinutes once that column is added)
  if (state === "completed") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    db.select({ total: sql<number>`COALESCE(SUM(${sessionsTable.durationMinutes}), 0)::int` })
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.state, "completed"),
        gte(sessionsTable.startTime, todayStart),
      ))
      .then(([stats]) => {
        const totalToday = stats?.total ?? 0;
        const prevTotal = totalToday - actualMinutes;
        if (prevTotal < 60 && totalToday >= 60) {
          void sendPushNotification([userId], {
            title: "Daily goal reached! 🌱",
            body: "You hit your study goal for today. Amazing work!",
            data: { type: "goal_reached" },
          });
        }
      })
      .catch(() => {});
  }

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
    durationMinutes: actualMinutes,
    pointsEarned,
    totalPausedMs: finalTotalPausedMs,
    pauseCount: session.pauseCount ?? 0,
    actualStudyMinutes: actualMinutes,
    createdAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/:sessionId/events", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;
  const { eventType, metadata } = req.body;

  const [owned] = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);

  if (!owned) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

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
