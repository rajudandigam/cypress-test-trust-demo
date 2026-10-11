import type { Request, Response, NextFunction } from "express";
import type { SessionService, SessionActor } from "../services/session-service.js";

export type AuthedRequest = Request & { actor?: SessionActor | null };

export function sessionMiddleware(sessions: SessionService, cookieName: string) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[cookieName] as string | undefined;
      req.actor = await sessions.resolve(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.actor) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
