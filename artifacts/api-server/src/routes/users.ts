import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  sessionsTable,
  plantsTable,
} from "@workspace/db";
import { eq, and, gte, sql, isNull } from "drizzle-orm";
import { getUserStreak } from "../lib/queries.js";

const router: IRouter = Router();

function getUserId(req: Request): string {
  return (req as any).userId ?? (req.headers["x-user-id"] as string) ?? "default-user";
}

async function ensureUser(userId: string, displayName?: string, email?: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existing.length === 0) {
    const newUser = {
      id: userId,
      displayName: displayName || "Student",
      email: email || `${userId}@focusoura.app`,
      studyMode: "light" as const,
      notificationsEnabled: true,
    };
    await db.insert(usersTable).values(newUser).onConflictDoNothing();
    await db.insert(walletsTable).values({ userId, balance: 100 }).onConflictDoNothing();
    const created = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return created[0] ?? newUser;
  }

  return existing[0];
}

async function ensureUserCode(userId: string): Promise<number | null> {
  const code = 100000 + Math.floor(Math.random() * 900000);
  try {
    await db.update(usersTable)
      .set({ userCode: code })
      .where(and(eq(usersTable.id, userId), isNull(usersTable.userCode)));
  } catch {
    // ignore unique constraint violations
  }
  const [u] = await db.select({ userCode: usersTable.userCode }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return u?.userCode ?? null;
}

router.get("/me", async (req, res) => {
  const userId = getUserId(req);
  let user = await ensureUser(userId);
  if (!user.userCode) {
    await ensureUserCode(userId);
    const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    user = fresh ?? user;
  }
  const unlockedPetIds = Array.isArray(user.unlockedPetIds) ? user.unlockedPetIds : ["mochi"];
  res.json({
    id: user.id,
    userCode: user.userCode,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role ?? "student",
    authProvider: user.authProvider ?? "email",
    studyMode: user.studyMode,
    notificationsEnabled: user.notificationsEnabled,
    onboardingCompleted: user.onboardingCompleted ?? false,
    emailVerified: user.emailVerified ?? false,
    selectedPetId: user.selectedPetId ?? "mochi",
    unlockedPetIds,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.patch("/onboarding-complete", async (req, res) => {
  const userId = getUserId(req);
  await db.update(usersTable)
    .set({ onboardingCompleted: true })
    .where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.patch("/me", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);
  const { displayName, studyMode, notificationsEnabled, avatarUrl } = req.body;
  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (studyMode !== undefined) updates.studyMode = studyMode;
  if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  const updated = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const u = updated[0];
  res.json({
    id: u.id,
    userCode: u.userCode,
    avatarUrl: u.avatarUrl ?? null,
    displayName: u.displayName,
    email: u.email,
    role: u.role ?? "student",
    authProvider: u.authProvider ?? "email",
    studyMode: u.studyMode,
    notificationsEnabled: u.notificationsEnabled,
    createdAt: u.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.put("/me", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const { displayName, studyMode, notificationsEnabled } = req.body;
  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (studyMode !== undefined) updates.studyMode = studyMode;
  if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const u = updated[0];
  res.json({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    studyMode: u.studyMode,
    notificationsEnabled: u.notificationsEnabled,
    createdAt: u.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const [user] = await db.select({
    id: usersTable.id,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    userCode: usersTable.userCode,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });

  const [plantCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(plantsTable)
    .where(eq(plantsTable.userId, userId));

  const allSessions = await db
    .select({ state: sessionsTable.state, durationMinutes: sessionsTable.durationMinutes, startTime: sessionsTable.startTime })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));

  const completed = allSessions.filter((s) => s.state === "completed");
  const totalMinutes = completed.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const streakDays = new Set(
    completed
      .filter((s) => s.startTime)
      .map((s) => s.startTime!.toISOString().split("T")[0])
  );
  const sortedDays = Array.from(streakDays).sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let cursor = today;
  for (const day of sortedDays) {
    if (day === cursor) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split("T")[0];
    } else break;
  }

  res.json({
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    userCode: user.userCode,
    memberSince: user.createdAt?.toISOString() ?? null,
    plantCount: plantCount?.count ?? 0,
    totalStudyMinutes: totalMinutes,
    completedSessions: completed.length,
    currentStreak: streak,
  });
});

router.get(["/", "/stats"], async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Using SQL aggregations for better performance
  const statsQuery = await db.select({
    totalFocusMinutes: sql<number>`COALESCE(SUM(${sessionsTable.durationMinutes}), 0)::int`,
    totalSessions: sql<number>`COUNT(*)::int`,
    completedSessions: sql<number>`COUNT(CASE WHEN ${sessionsTable.state} = 'completed' THEN 1 END)::int`,
    todayMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${sessionsTable.startTime} >= ${todayStart} AND ${sessionsTable.state} = 'completed' THEN ${sessionsTable.durationMinutes} END), 0)::int`,
    weekMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${sessionsTable.startTime} >= ${weekStart} AND ${sessionsTable.state} = 'completed' THEN ${sessionsTable.durationMinutes} END), 0)::int`,
    lastSessionDate: sql<Date>`MAX(${sessionsTable.startTime})`,
  })
  .from(sessionsTable)
  .where(eq(sessionsTable.userId, userId));

  const stats = statsQuery[0];

  const allPlants = await db.select({ growthLevel: plantsTable.growthLevel }).from(plantsTable).where(eq(plantsTable.userId, userId));
  const { currentStreak, longestStreak } = await getUserStreak(userId);

  // Pet unlock: need 5+ fully-grown plants (growthLevel >= 3 = max level)
  const FULLY_GROWN_LEVEL = 3;
  const fullyGrownCount = allPlants.filter((p) => (p.growthLevel ?? 1) >= FULLY_GROWN_LEVEL).length;
  const petUnlocked = fullyGrownCount >= 5;

  // Pet mood: 3 states — happy (studied today), neutral (1-2 days), sad (3+ days or never)
  let petMood: "happy" | "neutral" | "sad" = "sad";
  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) petMood = "happy";
    else if (daysDiff <= 2) petMood = "neutral";
    else petMood = "sad";
  }

  res.json({
    totalFocusMinutes: stats.totalFocusMinutes,
    totalSessions: stats.totalSessions,
    completedSessions: stats.completedSessions,
    currentStreak,
    longestStreak,
    todayMinutes: stats.todayMinutes,
    weekMinutes: stats.weekMinutes,
    plantCount: allPlants.length,
    fullyGrownCount,
    petUnlocked,
    lastSessionDate: stats.lastSessionDate?.toISOString() ?? null,
    petMood,
  });
});

export { getUserId, ensureUser };
export default router;
