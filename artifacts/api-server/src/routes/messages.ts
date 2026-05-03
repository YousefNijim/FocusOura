import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { motivationMessagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const SEED_MESSAGES = [
  "Every minute of focus is a step toward your goals. Keep going!",
  "You're building something amazing, one session at a time.",
  "The effort you put in today shapes who you become tomorrow.",
  "Consistency is the secret to mastery. You're doing great!",
  "Your future self will thank you for this moment of focus.",
  "Progress over perfection — every session counts.",
  "You chose to focus when it would have been easier not to. That's strength.",
  "Each session grows your garden. Keep nurturing it.",
  "The hardest part is starting. You already did that — now finish strong.",
  "You're not just studying, you're building your future.",
];

async function seedMessages() {
  const count = await db.select({ count: sql<number>`count(*)` }).from(motivationMessagesTable);
  if (Number(count[0]?.count) === 0) {
    const msgs = SEED_MESSAGES.map((content, i) => ({
      id: `seed_msg_${i}`,
      content,
      approved: true,
    }));
    await db.insert(motivationMessagesTable).values(msgs).onConflictDoNothing();
  }
}

router.get("/random", async (req, res) => {
  await seedMessages();

  const all = await db
    .select()
    .from(motivationMessagesTable)
    .where(eq(motivationMessagesTable.approved, true));

  if (!all.length) {
    res.json({ id: "default", content: "Keep going! Every moment of focus counts.", source: "system", createdAt: new Date().toISOString() });
    return;
  }

  // Prefer human-submitted messages (not seeded system messages)
  const humanMessages = all.filter((m) => !m.id.startsWith("seed_msg_"));
  const pool = humanMessages.length > 0 ? humanMessages : all;
  const random = pool[Math.floor(Math.random() * pool.length)];
  const isSeeded = random.id.startsWith("seed_msg_");

  res.json({
    id: random.id,
    content: random.content,
    source: isSeeded ? "system" : "human",
    createdAt: random.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

const BLOCKED_TERMS = [
  "hate", "stupid", "idiot", "useless", "fail", "loser", "dumb",
  "worthless", "hopeless", "pathetic", "give up", "quit", "lazy",
  "ugly", "shut up", "die", "kill", "suck", "terrible", "awful",
];

function containsNegativeContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

router.post("/", async (req, res) => {
  const { content, sessionId } = req.body;

  if (!content || content.trim().length < 5) {
    res.status(400).json({ error: "Message too short" });
    return;
  }

  if (containsNegativeContent(content)) {
    res.status(422).json({ error: "Message contains inappropriate content. Please keep it positive and encouraging!" });
    return;
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(motivationMessagesTable).values({
    id: messageId,
    content: content.trim(),
    sessionId: sessionId ?? null,
    approved: true,
  });

  res.status(201).json({
    id: messageId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  });
});

export default router;
