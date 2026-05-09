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

const allowedOrigins = new Set<string>(
  [
    process.env.WEB_URL,
    "http://localhost:3000",
    "http://localhost:22333",
    "http://localhost:22334",
  ].filter(Boolean) as string[]
);

// Pre-compile preview wildcard (e.g. "https://*.vercel.app") into a regex once at startup
const previewOriginRegex = process.env.WEB_URL_PREVIEW
  ? new RegExp(
      "^" +
      process.env.WEB_URL_PREVIEW
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^.]+") +
      "$"
    )
  : null;

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  if (previewOriginRegex?.test(origin)) return true;
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile WebView direct requests, Postman, curl)
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    logger.warn({ msg: "CORS blocked", origin });
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
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
