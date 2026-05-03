import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { motivationMessagesTable, usersTable, sessionsTable, walletsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { getUserId } from "./users.js";

const router: IRouter = Router();

// ─── Admin Guard ──────────────────────────────────────────────────────────────
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req);
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// ─── GET /api/admin/messages ──────────────────────────────────────────────────
// List all motivation messages (approved + pending)
router.get("/messages", requireAdmin, async (req, res) => {
  const status = req.query["status"] as string | undefined;

  let query = db.select().from(motivationMessagesTable).orderBy(desc(motivationMessagesTable.createdAt)).$dynamic();

  if (status === "pending") {
    query = query.where(eq(motivationMessagesTable.approved, false));
  } else if (status === "approved") {
    query = query.where(eq(motivationMessagesTable.approved, true));
  }

  const messages = await query.limit(100);
  res.json(messages.map((m) => ({
    id: m.id,
    content: m.content,
    approved: m.approved,
    sessionId: m.sessionId,
    createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
    isSeeded: m.id.startsWith("seed_msg_"),
  })));
});

// ─── PATCH /api/admin/messages/:id ───────────────────────────────────────────
// Approve or reject a message
router.patch("/messages/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body as { approved: boolean };

  if (typeof approved !== "boolean") {
    res.status(400).json({ error: "approved (boolean) required" });
    return;
  }

  const [msg] = await db.select().from(motivationMessagesTable).where(eq(motivationMessagesTable.id, id)).limit(1);
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db.update(motivationMessagesTable).set({ approved }).where(eq(motivationMessagesTable.id, id));
  res.json({ id, approved });
});

// ─── DELETE /api/admin/messages/:id ──────────────────────────────────────────
router.delete("/messages/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.delete(motivationMessagesTable).where(eq(motivationMessagesTable.id, id));
  res.json({ deleted: true });
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────
// List all users with stats
router.get("/users", requireAdmin, async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      role: usersTable.role,
      userCode: usersTable.userCode,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(200);

  // Attach wallet balances
  const wallets = await db.select().from(walletsTable);
  const walletMap = new Map(wallets.map((w) => [w.userId, w.balance]));

  // Session counts per user
  const sessionCounts = await db
    .select({ userId: sessionsTable.userId, count: count() })
    .from(sessionsTable)
    .groupBy(sessionsTable.userId);
  const sessionMap = new Map(sessionCounts.map((s) => [s.userId, s.count]));

  res.json(users.map((u) => ({
    ...u,
    createdAt: u.createdAt?.toISOString() ?? new Date().toISOString(),
    coinBalance: walletMap.get(u.id) ?? 0,
    sessionCount: sessionMap.get(u.id) ?? 0,
  })));
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
// Promote / demote a user's role
router.patch("/users/:id/role", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body as { role: string };

  if (!["student", "admin"].includes(role)) {
    res.status(400).json({ error: "role must be 'student' or 'admin'" });
    return;
  }

  await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));
  res.json({ id, role });
});

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
// High-level platform stats
router.get("/stats", requireAdmin, async (req, res) => {
  const [userCount] = await db.select({ n: count() }).from(usersTable);
  const [sessionCount] = await db.select({ n: count() }).from(sessionsTable);
  const [msgCount] = await db.select({ n: count() }).from(motivationMessagesTable);
  const [pendingMsgCount] = await db
    .select({ n: count() })
    .from(motivationMessagesTable)
    .where(eq(motivationMessagesTable.approved, false));

  res.json({
    totalUsers: userCount.n,
    totalSessions: sessionCount.n,
    totalMessages: msgCount.n,
    pendingMessages: pendingMsgCount.n,
  });
});

export default router;
