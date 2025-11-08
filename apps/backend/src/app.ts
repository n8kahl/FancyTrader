import "dotenv/config";
import express, { type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { setupRoutes } from "./routes";
import { incHttp } from "./utils/metrics";
import { logger } from "./utils/logger";
import { SupabaseService } from "./services/supabaseService";
import { StrategyDetectorService } from "./services/strategyDetector";
import { PolygonStreamingService } from "./services/polygonStreamingService";
import { AlertRegistry } from "./alerts/registry";
import { defaultStrategyParams } from "./config/strategy.defaults";
import { errorHandler } from "./middleware/error";
import { alertLimiter, shareLimiter } from "./middleware/rateLimit";

const defaultAllowedOrigins = ["https://fancy-trader.vercel.app", "http://localhost:5173"];
const corsAllowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const corsAllowedHeaders = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-User-Id",
  "X-Admin-Key",
  "X-Idempotency-Key",
  "Idempotency-Key",
  "X-Request-Id",
];
const corsExposedHeaders = [
  "Access-Control-Allow-Origin",
  "Access-Control-Allow-Methods",
  "Access-Control-Allow-Headers",
];

const previewRegex = /^https:\/\/fancy-trader(-[a-z0-9-]+)?\.vercel\.app$/;

type MaybeRoutedRequest = Request & { route?: { path?: string }; originalUrl?: string };

function getRoutePath(req: Request): string {
  const maybe = req as MaybeRoutedRequest;
  if (typeof maybe.route?.path === "string") {
    return maybe.route.path;
  }
  if (typeof req.path === "string") {
    return req.path;
  }
  return typeof maybe.originalUrl === "string" ? maybe.originalUrl : "/";
}

function computeAllowedOrigins(): string[] {
  const envAllowedOrigins = (process.env.CORS_ALLOWLIST || process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([...envAllowedOrigins, ...defaultAllowedOrigins]));
}

function isPreviewOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname.endsWith(".vercel.app");
  } catch {
    return previewRegex.test(origin);
  }
}

function isOriginAllowed(origin: string | undefined | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }
  return allowedOrigins.includes(origin) || isPreviewOrigin(origin);
}

function resolveAllowedOrigin(origin: string | undefined | null, allowedOrigins: string[]): string {
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    return origin;
  }
  return allowedOrigins[0];
}

function attachCorsHeaders(
  res: Response,
  origin: string | undefined | null,
  allowedOrigins: string[]
): void {
  const allowedOrigin = resolveAllowedOrigin(origin, allowedOrigins);
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", corsAllowedMethods.join(", "));
  res.header("Access-Control-Allow-Headers", corsAllowedHeaders.join(", "));
  res.header("Access-Control-Expose-Headers", corsExposedHeaders.join(", "));
  res.header("Vary", "Origin");
}

export interface AppServices {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
  alertRegistry: AlertRegistry;
}

export interface CreateAppOptions {
  services?: Partial<AppServices>;
}

export interface CreateAppResult {
  app: express.Express;
  services: AppServices;
}

export function createApp(options: CreateAppOptions = {}): CreateAppResult {
  const allowedOrigins = computeAllowedOrigins();

  const strategyDetector =
    options.services?.strategyDetector ?? new StrategyDetectorService(defaultStrategyParams);
  const polygonService =
    options.services?.polygonService ?? new PolygonStreamingService(strategyDetector);
  const supabaseService = options.services?.supabaseService ?? new SupabaseService();
  const alertRegistry = options.services?.alertRegistry ?? new AlertRegistry();

  const services: AppServices = {
    supabaseService,
    strategyDetector,
    polygonService,
    alertRegistry,
  };

  const app = express();

  app.use(helmet());
  app.use(compression());

  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS not allowed for this origin: ${origin ?? "<unknown>"}`));
    },
    credentials: true,
    methods: corsAllowedMethods,
    allowedHeaders: corsAllowedHeaders,
    exposedHeaders: corsExposedHeaders,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || isOriginAllowed(origin, allowedOrigins)) {
      attachCorsHeaders(res, origin, allowedOrigins);
    }
    next();
  });

  const bodyLimit = process.env.REQUEST_BODY_LIMIT || "1mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  app.use((req, _res, next) => {
    const method = req.method ?? "GET";
    const routePath = getRoutePath(req);
    incHttp(method, routePath);
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: process.env.npm_package_version || "0.0.0" });
  });

  app.use(healthRouter);
  app.use("/api", healthRouter);
  app.use("/api/alerts", alertLimiter);
  app.use("/api/share", shareLimiter);
  setupRoutes(app, services);

  app.use(errorHandler);

  return { app, services };
}
