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

const defaultAllowedOrigins = ["https://fancy-trader.vercel.app", "http://localhost:5173"];
const corsAllowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const corsAllowedHeaders = ["Content-Type", "Authorization", "X-Requested-With"];
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

function resolveAllowedOrigin(
  origin: string | undefined | null,
  allowedOrigins: string[]
): string {
  if (origin && (allowedOrigins.includes(origin) || previewRegex.test(origin))) {
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

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, resolveAllowedOrigin(null, allowedOrigins));
          return;
        }

        if (allowedOrigins.includes(origin) || previewRegex.test(origin)) {
          callback(null, origin);
          return;
        }

        callback(new Error(`CORS not allowed for this origin: ${origin}`));
      },
      credentials: true,
      methods: corsAllowedMethods,
      allowedHeaders: corsAllowedHeaders,
      exposedHeaders: corsExposedHeaders,
      optionsSuccessStatus: 204,
    })
  );

  app.options("*", (req, res) => {
    attachCorsHeaders(res, req.headers.origin, allowedOrigins);
    res.sendStatus(204);
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin) || previewRegex.test(origin)) {
      attachCorsHeaders(res, origin, allowedOrigins);
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
  setupRoutes(app, services);

  app.use(errorHandler);

  return { app, services };
}
