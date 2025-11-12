import "dotenv/config";
import express, { type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import configRouter from "./routes/config.js";
import { healthRouter } from "./routes/health.js";
import { setupRoutes } from "./routes/index.js";
import { snapshotsRouter } from "./routes/snapshots.js";
import metricsRouter from "./routes/metrics.js";
import { sleep, expoBackoffJitter } from "./utils/backoff.js";
import {
  incHttp,
  register,
  massiveWsConnected,
  massiveWsConnectsTotal,
  massiveWsDisconnectsTotal,
  massiveWsMessagesTotal,
  massiveWsErrorsTotal,
  massiveWsHeartbeatMissedTotal,
  massiveWsReconnectsTotal,
} from "./utils/metrics.js";
import { logger } from "./utils/logger.js";
import { SupabaseService } from "./services/supabaseService.js";
import { SupabaseSetupsService } from "./services/supabaseSetups.js";
import { StrategyDetectorService } from "./services/strategyDetector.js";
import { AlertRegistry } from "./alerts/registry.js";
import { defaultStrategyParams } from "./config/strategy.defaults.js";
import { errorHandler } from "./middleware/error.js";
import { alertLimiter, shareLimiter } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { serverEnv } from "@fancytrader/shared/server";
import { featureFlags } from "./config/features.js";
import pino from "pino";
import { Config } from "./config.js";

const log = pino({ name: "app" });
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

const allowedOrigins = Config.allowedOrigins;

const isOriginAllowed = (origin: string | undefined | null): boolean =>
  typeof origin === "string" && allowedOrigins.includes(origin);

const attachCorsHeaders = (res: Response, origin: string): void => {
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", corsAllowedMethods.join(", "));
  res.header("Access-Control-Allow-Headers", corsAllowedHeaders.join(", "));
  res.header("Access-Control-Expose-Headers", corsExposedHeaders.join(", "));
  res.header("Vary", "Origin");
};

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
      if (!origin) {
        callback(new Error("CORS blocked (origin missing)"), false);
        return;
      }
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS not allowed for this origin: ${origin}`), false);
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
    if (origin && isOriginAllowed(origin)) {
      attachCorsHeaders(res, origin);
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
  app.use(configRouter);
  app.use("/api", healthRouter);
  app.use("/api", metricsRouter);

  app.use("/api/alerts", alertLimiter);
  app.use("/api/share", shareLimiter);
  app.use("/api/snapshots", snapshotsRouter);
  setupRoutes(app, services);

  app.use(errorHandler);

  // --- Streaming flags & Massive-only streamer wiring ---
  const STREAMING_ENABLED = process.env.STREAMING_ENABLED === "true";
  const ENABLE_MASSIVE = featureFlags.enableMassiveStream;

  log.info({ STREAMING_ENABLED, ENABLE_MASSIVE }, "Streaming flags");

  let streaming: Streamer = {
    start: async () => {
      /* noop */
    },
    stop: async () => {
      /* noop */
    },
  };

  if (STREAMING_ENABLED && ENABLE_MASSIVE) {
    const key = serverEnv.MASSIVE_API_KEY;
    if (!key) {
      throw new Error("MASSIVE_API_KEY required when enableMassiveStream=true and STREAMING_ENABLED=true");
    }

    const { MassiveStreamingService } = await import("./services/massiveStreamingService.js");
    const massive = new MassiveStreamingService({
      baseUrl: serverEnv.MASSIVE_WS_BASE,
      cluster: serverEnv.MASSIVE_WS_CLUSTER ?? "options",
      apiKey: key,
      subscriptions: [],
      logger: (event: string, meta?: Record<string, unknown>) => {
        const payload = { event, ...(meta ?? {}) };
        const warnEvents = new Set([
          "ws_close",
          "ws_error",
          "ws_heartbeat_missed",
          "ws_message_parse_error",
          "ws_reconnect_scheduled",
        ]);
        if (event === "ws_message") {
          logger.debug("massive_ws", payload);
          return;
        }
        if (warnEvents.has(event)) {
          logger.warn("massive_ws", payload);
          return;
        }
        logger.info("massive_ws", payload);
      },
    });

    let lastMessageAt: number | null = null;
    let connected = false;
    let watchdogTimer: NodeJS.Timeout | null = null;
    let restartInFlight = false;
    let restartAttempt = 0;
    let streamStopped = false;

    const STALE_AFTER_MS = 90_000;
    const WATCHDOG_EVERY_MS = 20_000;
    const BACKOFF_MIN_MS = 1_000;
    const BACKOFF_MAX_MS = 30_000;

    const markConnected = () => {
      connected = true;
      massiveWsConnected.set(1);
      massiveWsConnectsTotal.inc();
      restartAttempt = 0;
      logger.info("Massive WS connected");
    };

    const markDisconnected = () => {
      connected = false;
      massiveWsConnected.set(0);
      massiveWsDisconnectsTotal.inc();
      logger.warn("Massive WS disconnected");
    };

    const setLastMsg = () => {
      lastMessageAt = Date.now();
      globalThis.__LAST_MSG_TS__ = lastMessageAt;
    };

    const startWatchdog = () => {
      if (watchdogTimer || streamStopped) return;
      watchdogTimer = setInterval(async () => {
        try {
          if (!connected) return;
          const age = lastMessageAt ? Date.now() - lastMessageAt : Infinity;
          if (age > STALE_AFTER_MS && !restartInFlight) {
            restartInFlight = true;
            restartAttempt += 1;
            const wait = expoBackoffJitter({
              attempt: restartAttempt,
              minMs: BACKOFF_MIN_MS,
              maxMs: BACKOFF_MAX_MS,
              factor: 2,
            });
            massiveWsReconnectsTotal.inc();
            logger.warn("massive_ws_watchdog_stale", { ageMs: age, attempt: restartAttempt, waitMs: wait });
            try {
              massive.stop();
              await sleep(wait);
              massive.start();
              logger.info("massive_ws_restarted", { attempt: restartAttempt });
            } catch (e) {
              logger.error("massive_ws_restart_error", { attempt: restartAttempt, error: e });
            } finally {
              restartInFlight = false;
            }
          }
        } catch (e) {
          logger.error("massive_ws_watchdog_error", { error: e });
        }
      }, WATCHDOG_EVERY_MS);
    };

    const stopWatchdog = () => {
      if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
      }
      restartInFlight = false;
    };

    massive.on("open", () => {
      markConnected();
      startWatchdog();
    });
    massive.on("close", (code?: number) => {
      markDisconnected();
      logger.warn("Massive WS closed", { code });
    });
    massive.on("heartbeat_missed", (meta?: Record<string, unknown>) => {
      massiveWsHeartbeatMissedTotal.inc();
      logger.warn("massive_ws_heartbeat_missed", meta ?? {});
    });

    massive.on("message", (msg: unknown) => {
      massiveWsMessagesTotal.inc();
      setLastMsg();
      logger.debug("massive_ws_message", { msg });
    });

    massive.on("error", (error: unknown) => {
      massiveWsErrorsTotal.inc();
      logger.error("massive_ws_error", { error });
    });

    streaming = {
      start: async () => {
        lastMessageAt = null;
        restartAttempt = 0;
        restartInFlight = false;
        streamStopped = false;
        massive.start();
        startWatchdog();
        globalThis.__WSS_READY__ = true;
        logger.info("Massive streaming enabled");
      },
      stop: async () => {
        globalThis.__WSS_READY__ = false;
        streamStopped = true;
        stopWatchdog();
        try {
          massive.stop();
        } finally {
          connected = false;
        }
      },
    };
  } else {
    logger.warn("Streaming disabled or massive flag off; no streamer constructed");
  }

  // keep returning these from createApp / init
  return { app, services, streaming };
}
