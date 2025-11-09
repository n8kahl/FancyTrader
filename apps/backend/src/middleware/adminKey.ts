import { NextFunction, Request, Response } from "express";

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const configured = (process.env.ADMIN_KEY || "").trim();
  if (!configured) {
    res.status(503).json({ error: "Metrics disabled (missing ADMIN_KEY)" });
    return;
  }

  const headerKey = req.header("x-admin-key")?.trim();
  if (!headerKey || headerKey !== configured) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
