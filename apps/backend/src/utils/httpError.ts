export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (
  message = "Bad Request",
  code = "BAD_REQUEST",
  details?: unknown
): HttpError => new HttpError(400, message, code, details);

export const notFound = (
  message = "Not Found",
  code = "NOT_FOUND",
  details?: unknown
): HttpError => new HttpError(404, message, code, details);

export const tooManyRequests = (
  message = "Too Many Requests",
  code = "RATE_LIMITED",
  details?: unknown
): HttpError => new HttpError(429, message, code, details);

export const internalError = (
  message = "Internal Server Error",
  code = "UPSTREAM_ERROR",
  details?: unknown
): HttpError => new HttpError(500, message, code, details);
