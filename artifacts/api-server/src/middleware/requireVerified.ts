import { Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "./auth.js";

export async function requireVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // x-user-id bypass (demo / dev mode) skips verification check
  if (req.headers["x-user-id"]) {
    next();
    return;
  }

  const [user] = await db
    .select({
      emailVerified: usersTable.emailVerified,
      onboardingCompleted: usersTable.onboardingCompleted,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  // Users who haven't finished onboarding haven't had a chance to verify their
  // email yet — allow them through so onboarding steps can complete.
  if (!user?.onboardingCompleted) {
    next();
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: "Email verification required",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  next();
}
