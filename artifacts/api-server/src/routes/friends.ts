import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  friendshipsTable,
} from "@workspace/db";
import { eq, or, and, ilike, ne, sql, inArray } from "drizzle-orm";
import { sendPushNotification } from "../lib/push.js";
import { requireVerified } from "../middleware/requireVerified.js";

const router: IRouter = Router();

function getUserId(req: Request): string {
  return (req as any).userId ?? (req.headers["x-user-id"] as string) ?? "default-user";
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function genToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

router.get("/search", async (req, res) => {
  const userId = getUserId(req);
  const q = (req.query["q"] as string ?? "").trim();
  if (!q || q.length < 2) return res.json([]);

  const codeSearch = /^\d+$/.test(q) ? parseInt(q, 10) : null;

  const results = await db
    .select({ id: usersTable.id, userCode: usersTable.userCode, displayName: usersTable.displayName })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, userId),
        or(
          ilike(usersTable.displayName, `%${q}%`),
          codeSearch !== null ? sql`${usersTable.userCode} = ${codeSearch}` : sql`false`
        )
      )
    )
    .limit(20);

  const existingLinks = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.requesterId, userId),
        eq(friendshipsTable.receiverId, userId)
      )
    );

  const withStatus = results.map((u) => {
    const link = existingLinks.find(
      (f) => (f.requesterId === userId && f.receiverId === u.id) ||
              (f.receiverId === userId && f.requesterId === u.id)
    );
    return { ...u, friendshipStatus: link?.status ?? null, friendshipId: link?.id ?? null };
  });

  res.json(withStatus);
});

router.get("/", async (req, res) => {
  const userId = getUserId(req);

  const rows = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        or(
          eq(friendshipsTable.requesterId, userId),
          eq(friendshipsTable.receiverId, userId)
        ),
        eq(friendshipsTable.status, "accepted")
      )
    );

  const friendIds = rows.map((r) => (r.requesterId === userId ? r.receiverId : r.requesterId));
  if (friendIds.length === 0) return res.json([]);

  const friendUsers = await db
    .select({ id: usersTable.id, userCode: usersTable.userCode, displayName: usersTable.displayName })
    .from(usersTable)
    .where(inArray(usersTable.id, friendIds));

  const friends = friendUsers.map((u) => {
    const row = rows.find((r) => r.requesterId === u.id || r.receiverId === u.id)!;
    return { ...u, friendshipId: row.id, since: row.updatedAt };
  });

  res.json(friends);
});

router.get("/requests", async (req, res) => {
  const userId = getUserId(req);

  const incoming = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.receiverId, userId), eq(friendshipsTable.status, "pending")));

  const outgoing = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.status, "pending")));

  const requesterIds = incoming.map((f) => f.requesterId);
  const receiverIds  = outgoing.map((f) => f.receiverId);
  const allIds = [...new Set([...requesterIds, ...receiverIds])];
  const usersMap = allIds.length > 0
    ? await db
        .select({ id: usersTable.id, userCode: usersTable.userCode, displayName: usersTable.displayName })
        .from(usersTable)
        .where(inArray(usersTable.id, allIds))
        .then((rows) => new Map(rows.map((u) => [u.id, u])))
    : new Map<string, { id: string; userCode: number | null; displayName: string }>();

  const incomingWithUsers = incoming.map((f) => ({ ...f, from: usersMap.get(f.requesterId) }));
  const outgoingWithUsers = outgoing.map((f) => ({ ...f, to: usersMap.get(f.receiverId) }));

  res.json({ incoming: incomingWithUsers, outgoing: outgoingWithUsers });
});

router.post("/request", requireVerified, async (req, res) => {
  const userId = getUserId(req);
  const { receiverId } = req.body as { receiverId: string };
  if (!receiverId) return res.status(400).json({ error: "receiverId required" });
  if (receiverId === userId) return res.status(400).json({ error: "Cannot add yourself" });

  const existing = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.receiverId, receiverId)),
        and(eq(friendshipsTable.requesterId, receiverId), eq(friendshipsTable.receiverId, userId))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const f = existing[0];
    if (f.status === "accepted") return res.status(409).json({ error: "Already friends" });
    if (f.status === "pending") return res.status(409).json({ error: "Request already pending" });
    await db.update(friendshipsTable)
      .set({ status: "pending", requesterId: userId, receiverId, updatedAt: new Date() })
      .where(eq(friendshipsTable.id, f.id));
    return res.json({ success: true });
  }

  const [row] = await db
    .insert(friendshipsTable)
    .values({ id: genId("fr"), requesterId: userId, receiverId, status: "pending" })
    .returning();

  res.status(201).json(row);
});

router.put("/:id/accept", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const [row] = await db
    .update(friendshipsTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.receiverId, userId)))
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });

  res.json(row);

  const [accepter] = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  void sendPushNotification([row.requesterId], {
    title: "Friend request accepted! 🎉",
    body: `${accepter?.displayName ?? "Someone"} accepted your friend request`,
    data: { type: "friend_accepted", userId },
  });
});

router.put("/:id/decline", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const [row] = await db
    .update(friendshipsTable)
    .set({ status: "declined", updatedAt: new Date() })
    .where(
      and(
        eq(friendshipsTable.id, id),
        or(eq(friendshipsTable.receiverId, userId), eq(friendshipsTable.requesterId, userId))
      )
    )
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  await db
    .delete(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.id, id),
        or(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.receiverId, userId))
      )
    );

  res.json({ success: true });
});

router.get("/invite-link", async (req, res) => {
  const userId = getUserId(req);
  const token = genToken();
  const id = genId("fr");

  await db.insert(friendshipsTable).values({
    id,
    requesterId: userId,
    receiverId: "pending",
    status: "invite",
    inviteToken: token,
  });

  const baseUrl = process.env["APP_URL"] ?? `https://${process.env["REPLIT_DEV_DOMAIN"] ?? "localhost"}`;
  res.json({ token, url: `${baseUrl}/join/${token}` });
});

router.post("/join/:token", async (req, res) => {
  const userId = getUserId(req);
  const { token } = req.params;

  const [invite] = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.inviteToken, token), eq(friendshipsTable.status, "invite")))
    .limit(1);

  if (!invite) return res.status(404).json({ error: "Invalid or expired invite link" });
  if (invite.requesterId === userId) return res.status(400).json({ error: "Cannot add yourself" });

  const existing = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.receiverId, invite.requesterId)),
        and(eq(friendshipsTable.requesterId, invite.requesterId), eq(friendshipsTable.receiverId, userId))
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === "accepted") {
    return res.status(409).json({ error: "Already friends" });
  }

  await db.update(friendshipsTable)
    .set({ receiverId: userId, status: "accepted", updatedAt: new Date() })
    .where(eq(friendshipsTable.id, invite.id));

  res.json({ success: true, requesterId: invite.requesterId });
});

export default router;
