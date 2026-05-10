import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  usersTable, walletsTable, passwordResetTokensTable, emailVerificationTokensTable,
} from "@workspace/db";
import { eq, or, and, isNull, gte, sql } from "drizzle-orm";
import { createToken } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import { recordPasswordReset } from "../lib/sessionInvalidation.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";

// ─── In-memory rate limiter: max 3 forgot-password requests per email per hour ─
const forgotRateLimit = new Map<string, { count: number; windowEnd: number }>();
function checkForgotRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = forgotRateLimit.get(email);
  if (!entry || now > entry.windowEnd) {
    forgotRateLimit.set(email, { count: 1, windowEnd: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ─── Verification email helper ──────────────────────────────────────────────
async function sendVerificationTokenEmail(userId: string, email: string, displayName: string) {
  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokensTable).values({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    tokenHash,
    expiresAt,
  });

  await sendVerificationEmail(email, displayName, rawToken);
}

const router: IRouter = Router();

function generateId() {
  return "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

async function generateUniqueUserCode(): Promise<number> {
  const { sql } = await import("drizzle-orm");
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = 100000 + Math.floor(Math.random() * 900000);
    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(sql`${usersTable.userCode} = ${code}`).limit(1);
    if (existing.length === 0) return code;
  }
  return 100000 + Math.floor(Math.random() * 900000);
}

async function createUserWithWallet(data: {
  id: string;
  displayName: string;
  email: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  role?: string;
  authProvider?: string;
  providerId?: string | null;
  emailVerified?: boolean;
}) {
  const userCode = await generateUniqueUserCode();
  await db.insert(usersTable).values({
    id: data.id,
    userCode,
    displayName: data.displayName,
    email: data.email,
    passwordHash: data.passwordHash ?? null,
    avatarUrl: data.avatarUrl ?? null,
    role: data.role ?? "student",
    authProvider: data.authProvider ?? "email",
    providerId: data.providerId ?? null,
    studyMode: "light",
    notificationsEnabled: true,
    emailVerified: data.emailVerified ?? false,
  }).onConflictDoNothing();
  await db.insert(walletsTable).values({ userId: data.id, balance: 100 }).onConflictDoNothing();
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = generateId();
    await createUserWithWallet({
      id,
      displayName: displayName.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: role ?? "student",
      authProvider: "email",
    });
    const user = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    const token = createToken(id);

    // Fire verification email non-blocking — never delay or fail registration
    void sendVerificationTokenEmail(id, email.toLowerCase(), displayName.trim()).catch((err) =>
      logger.error({ msg: "Failed to send verification email after registration", error: err instanceof Error ? err.message : String(err) })
    );

    return res.status(201).json({
      token,
      user: {
        id: user[0].id,
        userCode: user[0].userCode,
        displayName: user[0].displayName,
        email: user[0].email,
        role: user[0].role,
        authProvider: user[0].authProvider,
        studyMode: user[0].studyMode,
        notificationsEnabled: user[0].notificationsEnabled,
        createdAt: user[0].createdAt?.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ msg: "Register error", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = users[0];
    if (!user.passwordHash) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please use that instead." });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = createToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        userCode: user.userCode,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        studyMode: user.studyMode,
        notificationsEnabled: user.notificationsEnabled,
        createdAt: user.createdAt?.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ msg: "Login error", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }
    const firebaseApiKey = process.env.GOOGLE_API_KEY;
    if (!firebaseApiKey) {
      return res.status(503).json({ error: "Google authentication is not configured" });
    }
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      }
    );
    if (!firebaseRes.ok) {
      const errData = await firebaseRes.json().catch(() => ({}));
      logger.error({ msg: "Firebase token lookup error", error: JSON.stringify(errData) });
      return res.status(401).json({ error: "Invalid Google credential" });
    }
    const firebaseData = (await firebaseRes.json()) as {
      users?: Array<{
        localId: string;
        email: string;
        displayName?: string;
        photoUrl?: string;
      }>;
    };
    const firebaseUser = firebaseData.users?.[0];
    if (!firebaseUser) {
      return res.status(401).json({ error: "Google account not found" });
    }
    const existing = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.providerId, firebaseUser.localId),
          eq(usersTable.email, firebaseUser.email.toLowerCase())
        )
      )
      .limit(1);
    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
      const updates: Record<string, unknown> = {};
      if (!existing[0].providerId) {
        updates.providerId = firebaseUser.localId;
        updates.authProvider = "google";
      }
      if (firebaseUser.photoUrl && !existing[0].avatarUrl) {
        updates.avatarUrl = firebaseUser.photoUrl;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
      }
    } else {
      userId = generateId();
      await createUserWithWallet({
        id: userId,
        displayName: firebaseUser.displayName ?? firebaseUser.email.split("@")[0],
        email: firebaseUser.email.toLowerCase(),
        authProvider: "google",
        providerId: firebaseUser.localId,
        avatarUrl: firebaseUser.photoUrl ?? null,
        emailVerified: true,
      });
    }
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const token = createToken(userId);
    return res.json({
      token,
      user: {
        id: user[0].id,
        userCode: user[0].userCode,
        displayName: user[0].displayName,
        email: user[0].email,
        avatarUrl: user[0].avatarUrl ?? null,
        role: user[0].role,
        authProvider: user[0].authProvider,
        studyMode: user[0].studyMode,
        notificationsEnabled: user[0].notificationsEnabled,
        createdAt: user[0].createdAt?.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ msg: "Google auth error", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  // Always return the same response — never reveal whether an email is registered
  const SAFE_RESPONSE = { message: "If this email exists, a reset link has been sent" };

  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") return res.json(SAFE_RESPONSE);

    const normalizedEmail = email.toLowerCase().trim();

    if (!checkForgotRateLimit(normalizedEmail)) {
      return res.json(SAFE_RESPONSE); // rate-limited; still return 200 to prevent enumeration
    }

    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user) return res.json(SAFE_RESPONSE);

    const rawToken   = crypto.randomBytes(32).toString("hex");
    const tokenHash  = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokensTable).values({
      id: `prt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, user.displayName, rawToken);

    return res.json(SAFE_RESPONSE);
  } catch (err) {
    logger.error({ msg: "Forgot password error", error: err instanceof Error ? err.message : String(err) });
    return res.json(SAFE_RESPONSE); // never expose server errors to caller
  }
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Reset link is invalid or has expired" });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now       = new Date();

    const [found] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.tokenHash, tokenHash),
          isNull(passwordResetTokensTable.usedAt),
        )
      )
      .limit(1);

    if (!found || found.expiresAt < now) {
      return res.status(400).json({ error: "Reset link is invalid or has expired" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, found.userId));

    // Mark this token used AND invalidate all other pending tokens for this user
    await db.update(passwordResetTokensTable)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokensTable.userId, found.userId),
          isNull(passwordResetTokensTable.usedAt),
        )
      );

    // Invalidate all existing JWT sessions for this user
    recordPasswordReset(found.userId);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    logger.error({ msg: "Reset password error", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

// ─── GET /auth/verify-email?token=<raw-token> ────────────────────────────────
router.get("/verify-email", async (req, res) => {
  const { token } = req.query as { token?: string };

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Verification link is invalid or has expired" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now       = new Date();

  const [found] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.tokenHash, tokenHash),
        isNull(emailVerificationTokensTable.usedAt),
      )
    )
    .limit(1);

  if (!found || found.expiresAt < now) {
    return res.status(400).json({ error: "Verification link is invalid or has expired" });
  }

  await db.update(usersTable)
    .set({ emailVerified: true, emailVerifiedAt: now })
    .where(eq(usersTable.id, found.userId));

  await db.update(emailVerificationTokensTable)
    .set({ usedAt: now })
    .where(eq(emailVerificationTokensTable.id, found.id));

  return res.json({ message: "Email verified successfully" });
});

// ─── POST /auth/resend-verification ──────────────────────────────────────────
router.post("/resend-verification", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [user] = await db
      .select({ email: usersTable.email, displayName: usersTable.displayName, emailVerified: usersTable.emailVerified })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Rate limit: max 3 resend requests per user per hour (checked against DB)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [{ recentCount }] = await db
      .select({ recentCount: sql<number>`count(*)::int` })
      .from(emailVerificationTokensTable)
      .where(
        and(
          eq(emailVerificationTokensTable.userId, userId),
          gte(emailVerificationTokensTable.createdAt, oneHourAgo),
        )
      );

    if (recentCount >= 3) {
      return res.status(429).json({ error: "Too many verification emails sent. Please wait before trying again." });
    }

    // Invalidate all previous unused tokens for this user
    await db.delete(emailVerificationTokensTable)
      .where(
        and(
          eq(emailVerificationTokensTable.userId, userId),
          isNull(emailVerificationTokensTable.usedAt),
        )
      );

    await sendVerificationTokenEmail(userId, user.email, user.displayName);

    return res.json({ message: "Verification email sent" });
  } catch (err) {
    logger.error({ msg: "Resend verification error", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Failed to send verification email. Please try again." });
  }
});

export default router;
