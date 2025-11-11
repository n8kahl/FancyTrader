import "dotenv/config";
import express, { type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { setupRoutes } from "./routes/index.js";
import { snapshotsRouter } from "./routes/snapshots.js";
import { incHttp, register } from "./utils/metrics.js";
import { logger } from "./utils/logger.js";
import { SupabaseService } from "./services/supabaseService.js";
import { SupabaseSetupsService } from "./services/supabaseSetups.js";
import { StrategyDetectorService } from "./services/strategyDetector.js";
import { AlertRegistry } from "./alerts/registry.js";
import { defaultStrategyParams } from "./config/strategy.defaults.js";
import { errorHandler } from "./middleware/error.js";
import { alertLimiter, shareLimiter } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { serverEnv } from "@fancytrader/shared";
import { featureFlags } from "./config/features.js";
import pino from "pino";

const log = pino({ name: "app" });
const defaultAllowedOrigins =
  serverEnv.CORS_ALLOWLIST.split(",").map((value) => value.trim()).filter(Boolean);
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
  if (defaultAllowedOrigins.length > 0) {
    return defaultAllowedOrigins;
  }
  return ["https://fancy-trader.vercel.app", "http://localhost:5173"];
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
  supabaseSetups: SupabaseSetupsService;
  strategyDetector: StrategyDetectorService;
  alertRegistry: AlertRegistry;
}

export interface CreateAppOptions {
  services?: Partial<AppServices>;
}

export type Streamer = { start: () => Promise<void>; stop: () => Promise<void> } | null;

export interface CreateAppResult {
  app: express.Express;
  services: AppServices;
  streaming: Streamer;
}

export async function createApp(options: CreateAppOptions = {}): Promise<CreateAppResult> {
  const allowedOrigins = computeAllowedOrigins();

  const strategyDetector =
    options.services?.strategyDetector ?? new StrategyDetectorService(defaultStrategyParams);
  const supabaseService = options.services?.supabaseService ?? new SupabaseService();
  const supabaseSetups = options.services?.supabaseSetups ?? new SupabaseSetupsService();
  const alertRegistry = options.services?.alertRegistry ?? new AlertRegistry();

  const services: AppServices = {
    supabaseService,
    supabaseSetups,
    strategyDetector,
    alertRegistry,
  };

  const app = express();
  if (serverEnv.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(requestId());
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

  app.use(express.json({ limit: serverEnv.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: serverEnv.REQUEST_BODY_LIMIT }));

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  app.use((req, res, next) => {
    const method = req.method ?? "GET";
    const routePath = getRoutePath(req);
    res.on("finish", () => {
      incHttp(method, routePath, res.statusCode);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: process.env.npm_package_version || "0.0.0" });
  });

  app.use(healthRouter);
  app.get("/api/metrics", async (req, res) => {
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

    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });

  app.use("/api", healthRouter);

  app.use("/api/alerts", alertLimiter);
  app.use("/api/share", shareLimiter);
  app.use("/api/snapshots", snapshotsRouter);
  setupRoutes(app, services);

  app.use(errorHandler);

  const STREAMING_ENABLED = process.env.STREAMING_ENABLED === "true";
  const ENABLE_POLYGON = featureFlags.enablePolygonStream;
  const ENABLE_MASSIVE = featureFlags.enableMassiveStream;

  log.info({ STREAMING_ENABLED, ENABLE_POLYGON, ENABLE_MASSIVE }, "Streaming flags");

  let streaming: Streamer = null;

  if (STREAMING_ENABLED) {
    if (ENABLE_POLYGON) {
      const key = process.env.POLYGON_API_KEY;
      if (!key) {
        throw new Error("POLYGON_API_KEY required when FEATURE_ENABLE_POLYGON_STREAM=true");
      }
      const { PolygonStreamingService } = await import("./services/polygonStreamingService.js");
      const polygonService = new PolygonStreamingService(strategyDetector);
      streaming = {
        start: () => polygonService.connect(),
        stop: () => polygonService.disconnect(),
      };
      log.info("Polygon streaming enabled");
    } else if (ENABLE_MASSIVE) {
      const key = serverEnv.MASSIVE_API_KEY;
      if (!key) {
        throw new Error("MASSIVE_API_KEY required when FEATURE_ENABLE_MASSIVE_STREAM=true");
      }
      const { MassiveStreamingService } = await import("./services/massiveStreamingService.js");
      const massive = new MassiveStreamingService({
        baseUrl: serverEnv.MASSIVE_WS_BASE,
        cluster: serverEnv.MASSIVE_WS_CLUSTER,
        apiKey: key,
        subscriptions: [],
        logger: (event, meta) => logger.debug("massive_ws", { event, ...meta }),
      });
      massive.on("message", (msg) => logger.debug("massive_ws_message", { msg }));
      massive.on("error", (error) => logger.error("massive_ws_error", { error }));
      streaming = {
        start: async () => {
          massive.start();
        },
        stop: async () => {
          massive.stop();
        },
      };
      log.info("Massive streaming enabled");
    } else {
      log.warn(
        "STREAMING_ENABLED=true but no provider flag is set; skipping streamer construction"
      );
    }
  } else {
    log.warn("Streaming disabled via STREAMING_ENABLED");
  }

  return { app, services, streaming };
}
