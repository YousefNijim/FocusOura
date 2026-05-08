import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable, subjectsTable, plantsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth.js";
import { getUserStreak } from "../lib/queries.js";

const router: IRouter = Router();

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const allSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.startTime));

  const completed = allSessions.filter((s) => s.state === "completed");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);

  // ── Daily breakdown: last 7 days ──────────────────────────────────
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart); d.setDate(d.getDate() - i);
    dailyMap[formatDate(d)] = 0;
  }
  for (const s of completed) {
    if (!s.startTime) continue;
    const key = formatDate(s.startTime);
    if (key in dailyMap) dailyMap[key] += s.durationMinutes ?? 0;
  }
  const dailyBreakdown = Object.entries(dailyMap).map(([date, minutes]) => ({ date, minutes }));

  // ── Subject breakdown ─────────────────────────────────────────────
  const subjectMap: Record<string, { minutes: number; count: number }> = {};
  for (const s of completed) {
    if (!s.subjectId) continue;
    if (!subjectMap[s.subjectId]) subjectMap[s.subjectId] = { minutes: 0, count: 0 };
    subjectMap[s.subjectId].minutes += s.durationMinutes ?? 0;
    subjectMap[s.subjectId].count++;
  }
  const subjectsData = await db.select().from(subjectsTable).where(eq(subjectsTable.userId, userId));
  const subjectBreakdown = Object.entries(subjectMap)
    .map(([subjectId, data]) => {
      const subj = subjectsData.find((s) => s.id === subjectId);
      return { subjectId, name: subj?.name ?? "Unknown", color: subj?.accentColor ?? "#94a3b8", ...data };
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  // ── Session type breakdown ────────────────────────────────────────
  const typeMap: Record<string, { count: number; minutes: number }> = {};
  for (const s of completed) {
    const t = s.sessionType ?? "routine";
    if (!typeMap[t]) typeMap[t] = { count: 0, minutes: 0 };
    typeMap[t].count++;
    typeMap[t].minutes += s.durationMinutes ?? 0;
  }
  const sessionTypeBreakdown = Object.entries(typeMap).map(([type, data]) => ({ type, ...data }));

  // ── Streak calculation ────────────────────────────────────────────
  const { currentStreak, longestStreak } = await getUserStreak(userId);

  // ── Aggregate stats ───────────────────────────────────────────────
  const totalFocusMinutes = completed.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const todayMinutes = completed.filter((s) => s.startTime && s.startTime >= todayStart).reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const weekMinutes  = completed.filter((s) => s.startTime && s.startTime >= weekStart).reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const avgDailyMinutes = dailyBreakdown.length ? Math.round(dailyBreakdown.reduce((s, d) => s + d.minutes, 0) / dailyBreakdown.length) : 0;
  const bestDayMinutes = Math.max(0, ...dailyBreakdown.map((d) => d.minutes));

  const plantsGrown = await db.select().from(plantsTable).where(eq(plantsTable.userId, userId));

  res.json({
    totalFocusMinutes,
    totalSessions: allSessions.length,
    completedSessions: completed.length,
    currentStreak,
    longestStreak,
    todayMinutes,
    weekMinutes,
    avgDailyMinutes,
    bestDayMinutes,
    plantsGrown: plantsGrown.length,
    dailyBreakdown,
    subjectBreakdown,
    sessionTypeBreakdown,
  });
});

export default router;
