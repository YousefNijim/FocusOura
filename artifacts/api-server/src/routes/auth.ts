import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, walletsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { createToken } from "../middleware/auth.js";

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
    console.error("Register error:", err);
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
    console.error("Login error:", err);
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
      console.error("Firebase token lookup error:", errData);
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
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
