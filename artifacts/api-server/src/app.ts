import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { passwordResetTokensTable } from "@workspace/db";
import { lt } from "drizzle-orm";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─── Expired reset-token cleanup ───────────────────────────────────────────────
async function cleanupExpiredResetTokens() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(passwordResetTokensTable)
      .where(lt(passwordResetTokensTable.expiresAt, cutoff));
  } catch (err) {
    logger.error({
      msg: "Failed to clean up expired reset tokens",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Run on startup, then every 6 hours
cleanupExpiredResetTokens();
setInterval(cleanupExpiredResetTokens, 6 * 60 * 60 * 1000);

export default app;
