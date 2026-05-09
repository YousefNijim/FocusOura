import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  aiInsightsTable,
  sessionsTable,
  subjectsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserId } from "./users.js";
import { logger } from "../lib/logger.js";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.get("/:sessionId", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  const insights = await db
    .select()
    .from(aiInsightsTable)
    .where(
      and(
        eq(aiInsightsTable.sessionId, sessionId),
        eq(aiInsightsTable.userId, userId)
      )
    );

  res.json(
    insights.map((i) => ({
      id: i.id,
      sessionId: i.sessionId,
      type: i.type,
      content: i.content,
      createdAt: i.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.post("/:sessionId", async (req, res) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  const sessions = await db
    .select({
      id: sessionsTable.id,
      sessionType: sessionsTable.sessionType,
      durationMinutes: sessionsTable.durationMinutes,
      state: sessionsTable.state,
      subjectName: subjectsTable.name,
    })
    .from(sessionsTable)
    .leftJoin(subjectsTable, eq(sessionsTable.subjectId, subjectsTable.id))
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        eq(sessionsTable.userId, userId)
      )
    )
    .limit(1);

  if (!sessions.length) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = sessions[0];

  const existing = await db
    .select()
    .from(aiInsightsTable)
    .where(
      and(
        eq(aiInsightsTable.sessionId, sessionId),
        eq(aiInsightsTable.userId, userId)
      )
    );

  if (existing.length > 0) {
    res.status(201).json(
      existing.map((i) => ({
        id: i.id,
        sessionId: i.sessionId,
        type: i.type,
        content: i.content,
        createdAt: i.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    );
    return;
  }

  let insightContent = "";
  let insightType: "motivation" | "achievement" | "warning" = "motivation";

  try {
    const prompt = `You are an encouraging AI coach for a student productivity app called FocusOura. 
A student just completed a ${session.sessionType?.replace("_", " ")} session for "${session.subjectName}" 
lasting ${session.durationMinutes} minutes. The session was ${session.state}.

Generate a brief, warm, encouraging insight (2-3 sentences max) that:
- Celebrates their effort (not just the outcome)
- Is specific to the session type and duration
- Ends with a gentle forward-looking encouragement

Be warm, human, and concise. Do not use generic phrases.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 200 },
    });

    insightContent = response.text ?? "";

    if (session.state === "completed") {
      insightType =
        session.durationMinutes >= 45 ? "achievement" : "motivation";
    } else {
      insightType = "warning";
    }
  } catch (err) {
    logger.warn({ msg: "Gemini AI call failed — using fallback insight", error: err instanceof Error ? err.message : String(err) });
    const fallbacks: Record<string, string> = {
      routine: "Great job showing up for your routine study session! Consistency is the key to mastery.",
      homework: "You tackled your homework with focus. Each assignment completed is progress made!",
      deep_focus: "Deep focus sessions like this one are where real learning happens. Well done!",
    };
    insightContent =
      fallbacks[session.sessionType ?? "routine"] ??
      "Great session! Keep building your focus habits.";
    insightType = "motivation";
  }

  const insightId = `ins_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(aiInsightsTable).values({
    id: insightId,
    sessionId,
    userId,
    type: insightType,
    content: insightContent.trim(),
  });

  res.status(201).json([
    {
      id: insightId,
      sessionId,
      type: insightType,
      content: insightContent.trim(),
      createdAt: new Date().toISOString(),
    },
  ]);
});

export default router;
