import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function requireAuthenticatedOperator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function actorFor(req: Request) {
  return getAuth(req).userId ?? "unknown-operator";
}