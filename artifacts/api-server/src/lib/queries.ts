import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getUserStreak(
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  const allSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.startTime));

  const completed = allSessions.filter((s) => s.state === "completed");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Copied exactly from analytics.ts
  const studyDates = new Set(completed.map((s) => s.startTime ? formatDate(s.startTime) : "").filter(Boolean));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i <= 365; i++) {
    const d = new Date(todayStart); d.setDate(d.getDate() - i);
    if (studyDates.has(formatDate(d))) {
      tempStreak++;
      if (i === 0 || currentStreak > 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (i === 0) currentStreak = 0;
      else tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}
