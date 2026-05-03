import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getUserId, ensureUser } from "./users.js";

const router: IRouter = Router();

// GET /api/wallet — balance
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);

  const wallet = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);

  if (!wallet.length) {
    await db.insert(walletsTable).values({ userId, balance: 0 });
    res.json({ balance: 0, lastUpdated: new Date().toISOString() });
    return;
  }

  const w = wallet[0];
  res.json({
    balance: w.balance,
    lastUpdated: w.lastUpdated?.toISOString() ?? new Date().toISOString(),
  });
});

// GET /api/wallet/transactions — coin history
router.get("/transactions", async (req, res) => {
  const userId = getUserId(req);
  const limit = Math.min(100, parseInt(req.query["limit"] as string) || 50);

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  res.json(
    transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      referenceId: t.referenceId ?? null,
      createdAt: t.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

export default router;
