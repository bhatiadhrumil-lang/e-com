import type { Request, Response, NextFunction } from "express";
import { extractBearerToken, verifyToken, type AuthUser } from "../lib/jwt.js";
import { unauthorized, forbidden } from "../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (req.user.role !== "ADMIN") {
    next(forbidden("Admin access required"));
    return;
  }
  next();
}
