import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  challengesTable, challengeParticipantsTable,
  walletsTable, transactionsTable, usersTable, friendshipsTable,
} from "@workspace/db";
import { eq, or, and, desc, inArray, gt, lt, lte, sql, gte } from "drizzle-orm";
import { sendPushNotification } from "../lib/push.js";
import { requireVerified } from "../middleware/requireVerified.js";

const router: IRouter = Router();

function getUserId(req: Request): string {
  return (req as any).userId ?? (req.headers["x-user-id"] as string) ?? "default-user";
}
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Auto-resolve expired challenges ─────────────────────────────────────────
async function resolveExpiredChallenges() {
  const now = new Date();
  const expired = await db
    .select()
    .from(challengesTable)
    .where(and(eq(challengesTable.status, "active"), lt(challengesTable.endTime, now)));

  for (const ch of expired) {
    // Optimistic lock: mark completed first (WHERE status = 'active') to prevent
    // double-processing when resolveExpiredChallenges runs concurrently on parallel requests
    const [locked] = await db.update(challengesTable)
      .set({ status: "completed", endTime: now })
      .where(and(eq(challengesTable.id, ch.id), eq(challengesTable.status, "active")))
      .returning({ id: challengesTable.id });

    if (!locked) continue; // Already processed by a concurrent call

    const participants = await db
      .select()
      .from(challengeParticipantsTable)
      .where(eq(challengeParticipantsTable.challengeId, ch.id))
      .orderBy(desc(challengeParticipantsTable.focusMinutes));

    if (participants.length === 0) continue;

    const targetMinutes = ch.durationMinutes;
    let winnerId: string | null = null;

    if (ch.challengeType === "competitive") {
      // Winner = most focus minutes
      winnerId = participants[0].userId;
      if (ch.stake > 0 && winnerId) {
        const totalPrize = ch.stake * participants.length;
        await db.update(walletsTable)
          .set({ balance: sql`${walletsTable.balance} + ${totalPrize}` })
          .where(eq(walletsTable.userId, winnerId));
        await db.insert(transactionsTable).values({
          id: genId("tx"), userId: winnerId, type: "challenge_win",
          amount: totalPrize, description: `Won challenge: ${ch.title}`,
        });
      }
    } else {
      // Cooperative: every participant must individually meet the target
      const cooperativeSuccess = participants.every((p) => p.focusMinutes >= targetMinutes);
      if (cooperativeSuccess && ch.stake > 0) {
        for (const p of participants) {
          await db.update(walletsTable)
            .set({ balance: sql`${walletsTable.balance} + ${ch.stake}` })
            .where(eq(walletsTable.userId, p.userId));
          await db.insert(transactionsTable).values({
            id: genId("tx"), userId: p.userId, type: "challenge_win",
            amount: ch.stake, description: `Cooperative challenge success: ${ch.title}`,
          });
        }
        winnerId = "cooperative_success";
      }
    }

    if (winnerId !== null) {
      await db.update(challengesTable)
        .set({ winnerId })
        .where(eq(challengesTable.id, ch.id));
    }

    const participantIds = participants.map((p) => p.userId);
    void sendPushNotification(participantIds, {
      title: "Challenge complete! 🏆",
      body: `"${ch.title}" has ended. Check your results!`,
      data: { type: "challenge_resolved", challengeId: ch.id },
    });
  }
}

// ─── Enrich challenge for API response ───────────────────────────────────────
async function enrichChallenge(ch: typeof challengesTable.$inferSelect, userId: string) {
  const participants = await db
    .select()
    .from(challengeParticipantsTable)
    .where(eq(challengeParticipantsTable.challengeId, ch.id))
    .orderBy(desc(challengeParticipantsTable.focusMinutes));

  let userMap: Record<string, { displayName: string; email: string }> = {};
  const userIds = participants.map((p) => p.userId);
  if (userIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, displayName: usersTable.displayName, email: usersTable.email })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds));
    users.forEach((u) => { userMap[u.id] = u; });
  }

  const enrichedParticipants = participants.map((p, i) => ({
    ...p,
    rank: i + 1,
    focusHours: +(p.focusMinutes / 60).toFixed(2),
    user: userMap[p.userId] ?? { displayName: "Unknown", email: "" },
  }));

  const myParticipant = participants.find((p) => p.userId === userId);
  const [creator] = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, ch.creatorId))
    .limit(1);

  const targetHours = +(ch.durationMinutes / 60).toFixed(1);
  const now = new Date();
  let daysLeft = 0;
  if (ch.endTime && ch.status === "active") {
    daysLeft = Math.max(0, Math.ceil((ch.endTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }
  const prizePool = ch.stake * participants.length;
  const myFocusMinutes = myParticipant?.focusMinutes ?? 0;
  const cooperativeProgress = participants.length > 0
    ? Math.min(100, Math.round((participants.reduce((s, p) => s + p.focusMinutes, 0) / (ch.durationMinutes * participants.length)) * 100))
    : 0;

  return {
    ...ch,
    targetHours,
    daysLeft,
    prizePool,
    participants: enrichedParticipants,
    participantCount: participants.length,
    isParticipant: !!myParticipant,
    isCreator: ch.creatorId === userId,
    myFocusMinutes,
    myFocusHours: +(myFocusMinutes / 60).toFixed(2),
    myProgress: ch.durationMinutes > 0 ? Math.min(100, Math.round((myFocusMinutes / ch.durationMinutes) * 100)) : 0,
    cooperativeProgress,
    creator: creator ?? { id: ch.creatorId, displayName: "Unknown" },
  };
}

// ─── GET /api/challenges ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  await resolveExpiredChallenges();

  const myParticipations = await db
    .select()
    .from(challengeParticipantsTable)
    .where(eq(challengeParticipantsTable.userId, userId));
  const myChallengeIds = myParticipations.map((p) => p.challengeId);

  const myCreated = await db.select().from(challengesTable)
    .where(eq(challengesTable.creatorId, userId))
    .orderBy(desc(challengesTable.createdAt));

  const myJoined = myChallengeIds.length > 0
    ? await db.select().from(challengesTable)
        .where(inArray(challengesTable.id, myChallengeIds))
        .orderBy(desc(challengesTable.createdAt))
    : [];

  const allOpen = await db.select().from(challengesTable)
    .where(eq(challengesTable.status, "open"))
    .orderBy(desc(challengesTable.createdAt))
    .limit(20);

  const combined = [...myCreated, ...myJoined, ...allOpen].reduce((acc, c) => {
    if (!acc.find((x) => x.id === c.id)) acc.push(c);
    return acc;
  }, [] as typeof myCreated);

  const enriched = await Promise.all(combined.map((c) => enrichChallenge(c, userId)));
  res.json(enriched);
});

// ─── POST /api/challenges ─────────────────────────────────────────────────────
router.post("/", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  const { title, challengeType, targetHours, durationDays, entryFee } = req.body as {
    title: string;
    challengeType: "competitive" | "cooperative";
    targetHours: number;
    durationDays: number;
    entryFee: number;
  };

  if (!title?.trim()) return res.status(400).json({ error: "Title required" });

  const validationErrors: Record<string, string> = {};
  const parsedHours = Number(targetHours);
  const parsedDays  = Number(durationDays);
  if (!Number.isInteger(parsedHours) || parsedHours < 1 || parsedHours > 10000) {
    validationErrors.targetHours = "Must be an integer between 1 and 10000";
  }
  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
    validationErrors.durationDays = "Must be an integer between 1 and 365";
  }
  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({ error: "Invalid challenge parameters", details: validationErrors });
  }

  const fee = Math.max(0, Number(entryFee) || 0);
  const hours = Math.max(0.5, Number(targetHours) || 10);
  const days  = Math.max(1, Number(durationDays) || 7);
  const type  = challengeType === "cooperative" ? "cooperative" : "competitive";

  if (fee > 0) {
    const [deducted] = await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} - ${fee}` })
      .where(and(eq(walletsTable.userId, userId), gte(walletsTable.balance, fee)))
      .returning({ balance: walletsTable.balance });
    if (!deducted) return res.status(400).json({ error: "Insufficient coins for entry fee" });
    await db.insert(transactionsTable).values({
      id: genId("tx"), userId, type: "challenge_stake",
      amount: -fee, description: `Entry fee for challenge: ${title}`,
    });
  }

  const [challenge] = await db.insert(challengesTable).values({
    id: genId("ch"),
    creatorId: userId,
    title: title.trim(),
    sessionType: "deep_focus",
    durationMinutes: Math.round(hours * 60),
    stake: fee,
    challengeType: type,
    durationDays: days,
    status: "open",
  }).returning();

  await db.insert(challengeParticipantsTable).values({
    id: genId("cp"), challengeId: challenge.id, userId, focusMinutes: 0,
  });

  res.status(201).json(await enrichChallenge(challenge, userId));
});

// ─── GET /api/challenges/:id ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const userId = getUserId(req);
  const [ch] = await db.select().from(challengesTable).where(eq(challengesTable.id, req.params.id)).limit(1);
  if (!ch) return res.status(404).json({ error: "Not found" });
  res.json(await enrichChallenge(ch, userId));
});

// ─── POST /api/challenges/:id/join ────────────────────────────────────────────
router.post("/:id/join", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const [ch] = await db.select().from(challengesTable).where(eq(challengesTable.id, id)).limit(1);
  if (!ch) return res.status(404).json({ error: "Not found" });
  if (ch.status === "completed") return res.status(400).json({ error: "Challenge already ended" });

  const existing = await db.select().from(challengeParticipantsTable)
    .where(and(eq(challengeParticipantsTable.challengeId, id), eq(challengeParticipantsTable.userId, userId)))
    .limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Already joined" });

  if (ch.stake > 0) {
    const [deducted] = await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} - ${ch.stake}` })
      .where(and(eq(walletsTable.userId, userId), gte(walletsTable.balance, ch.stake)))
      .returning({ balance: walletsTable.balance });
    if (!deducted) return res.status(400).json({ error: "Insufficient coins" });
    await db.insert(transactionsTable).values({
      id: genId("tx"), userId, type: "challenge_stake",
      amount: -ch.stake, description: `Joined challenge: ${ch.title}`,
    });
  }

  // Start challenge: set startTime + endTime
  if (ch.status === "open") {
    const start = new Date();
    const end = new Date(start.getTime() + ch.durationDays * 24 * 60 * 60 * 1000);
    await db.update(challengesTable)
      .set({ status: "active", startTime: start, endTime: end })
      .where(eq(challengesTable.id, id));
  }

  await db.insert(challengeParticipantsTable).values({
    id: genId("cp"), challengeId: id, userId, focusMinutes: 0,
  });

  const [updated] = await db.select().from(challengesTable).where(eq(challengesTable.id, id)).limit(1);
  const enriched = await enrichChallenge(updated, userId);
  res.json(enriched);

  if (ch.creatorId !== userId) {
    const [joiner] = await db
      .select({ displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    void sendPushNotification([ch.creatorId], {
      title: "Someone joined your challenge! 💪",
      body: `${joiner?.displayName ?? "Someone"} joined "${ch.title}"`,
      data: { type: "challenge_joined", challengeId: ch.id },
    });
  }
});

// ─── PUT /api/challenges/:id/progress ────────────────────────────────────────
// Called by session completion — adds minutes to participant's total
router.put("/:id/progress", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { addMinutes } = req.body as { addMinutes: number };

  const [participant] = await db.select().from(challengeParticipantsTable)
    .where(and(eq(challengeParticipantsTable.challengeId, id), eq(challengeParticipantsTable.userId, userId)))
    .limit(1);
  if (!participant) return res.status(404).json({ error: "Not a participant" });

  const add = Math.max(0, Number(addMinutes) || 0);
  const newMinutes = participant.focusMinutes + add;

  await db.update(challengeParticipantsTable)
    .set({ focusMinutes: newMinutes })
    .where(eq(challengeParticipantsTable.id, participant.id));

  const [ch] = await db.select().from(challengesTable).where(eq(challengesTable.id, id)).limit(1);
  const [updated] = await db.select().from(challengesTable).where(eq(challengesTable.id, id)).limit(1);
  res.json(await enrichChallenge(updated, userId));
});

export default router;
