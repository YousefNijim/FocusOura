import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isSessionInvalidated } from "../lib/sessionInvalidation.js";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. " +
    "Server cannot start without a secure secret."
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string; iat: number };
      req.userId = payload.sub;
      if (isSessionInvalidated(payload.sub, payload.iat)) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
  const xUserId = req.headers["x-user-id"] as string | undefined;
  if (xUserId) {
    req.userId = xUserId;
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
}

export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}
