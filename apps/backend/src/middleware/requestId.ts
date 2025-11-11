import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestId(headerName = "x-request-id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(headerName);
    const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
    (req as any).requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
  };
}
