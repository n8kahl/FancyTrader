import { NextFunction, Request, Response } from "express";

const isProduction = (): boolean => (process.env.NODE_ENV ?? "development") === "production";

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  if (!isProduction()) {
    next();
    return;
  }

  const configured = (process.env.ADMIN_KEY || "").trim();
  if (!configured) {
    res.status(503).json({ error: "Metrics disabled (missing ADMIN_KEY)" });
    return;
  }

  const headerKey = req.header("x-admin-key")?.trim();
  if (!headerKey || headerKey !== configured) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
