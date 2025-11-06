import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { setupWebSocketHandler } from './websocket/handler';
import { setupRoutes } from './routes';
import { PolygonStreamingService } from './services/polygonStreamingService';
import { StrategyDetectorService } from './services/strategyDetector';
import { SupabaseService } from './services/supabaseService';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(compression());

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://fancy-trader.vercel.app',
];

const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  allowedOrigins.push(...defaultAllowedOrigins);
}

const corsAllowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const corsAllowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];

const previewRegex = /^https:\/\/fancy-trader(-[a-z0-9-]+)?\.vercel\.app$/;

const resolveAllowedOrigin = (origin?: string) => {
  if (origin && (allowedOrigins.includes(origin) || previewRegex.test(origin))) {
    return origin;
  }
  return allowedOrigins[0];
};

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || previewRegex.test(origin)) {
      callback(null, resolveAllowedOrigin(origin || undefined));
    } else {
      callback(new Error(`CORS not allowed for this origin: ${origin}`));
    }
  },
  credentials: true,
  methods: corsAllowedMethods,
  allowedHeaders: corsAllowedHeaders,
  optionsSuccessStatus: 204,
}));

app.options('*', (req, res) => {
  const allowedOrigin = resolveAllowedOrigin(req.headers.origin as string | undefined);
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', corsAllowedMethods.join(', '));
  res.header('Access-Control-Allow-Headers', corsAllowedHeaders.join(', '));
  res.sendStatus(204);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize services
const supabaseService = new SupabaseService();
const strategyDetector = new StrategyDetectorService();
const polygonService = new PolygonStreamingService(strategyDetector);

// Setup routes
setupRoutes(app, { supabaseService, strategyDetector, polygonService });

// Setup WebSocket handler
setupWebSocketHandler(wss, { polygonService, strategyDetector });

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Close WebSocket connections
  wss.clients.forEach(client => client.close());
  
  // Disconnect from Polygon
  await polygonService.disconnect();
  
  // Close HTTP server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Fancy Trader Backend running on port ${PORT}`);
  logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
