import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

function getUserId(req: Request): string {
  return (req as any).userId ?? (req.headers["x-user-id"] as string) ?? "default-user";
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /notifications/token — register or refresh a push token
router.post("/token", async (req, res) => {
  const userId = getUserId(req);
  const { token, deviceId, platform } = req.body as {
    token: string;
    deviceId?: string;
    platform?: "ios" | "android";
  };

  if (!token || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "Invalid Expo push token format" });
  }

  await db
    .insert(pushTokensTable)
    .values({
      id: genId("pt"),
      userId,
      token,
      deviceId: deviceId ?? null,
      platform: platform ?? null,
      lastUsed: new Date(),
    })
    .onConflictDoUpdate({
      target: [pushTokensTable.userId, pushTokensTable.token],
      set: { lastUsed: new Date() },
    });

  res.json({ message: "Token registered" });
});

// DELETE /notifications/token — remove a token on logout
router.delete("/token", async (req, res) => {
  const userId = getUserId(req);
  const { token } = req.body as { token: string };

  if (!token) {
    return res.status(400).json({ error: "token required" });
  }

  await db
    .delete(pushTokensTable)
    .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.token, token)));

  res.json({ message: "Token removed" });
});

export default router;
