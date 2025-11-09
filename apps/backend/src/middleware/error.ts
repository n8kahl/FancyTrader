import type { ErrorRequestHandler } from "express";
import { HttpError } from "../utils/httpError.js";


interface AppErrorLike {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

const toStatus = (s: unknown): number =>
  typeof s === "number" && Number.isFinite(s) ? s : 500;

const toMessage = (m: unknown): string =>
  typeof m === "string" && m.length > 0 ? m : "Internal Server Error";

const toCode = (c: unknown): string | undefined =>
  typeof c === "string" && c.length > 0 ? c : undefined;

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next;
  const normalized = err instanceof HttpError ? err : (err as AppErrorLike);
  const status = toStatus(normalized.status);
  const message = toMessage(normalized.message);
  const code = toCode(normalized.code);
  const details = normalized.details;

  res.status(status).json({
    error: {
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
  });
};
