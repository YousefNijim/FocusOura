import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "focusoura-dev-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
      req.userId = payload.sub;
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
