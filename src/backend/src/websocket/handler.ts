import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage, WSMessageType, DetectedSetup } from '../types';
import { PolygonStreamingService } from '../services/polygonStreamingService';
import { StrategyDetectorService } from '../services/strategyDetector';
import { logger } from '../utils/logger';

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  subscribedSymbols?: Set<string>;
}

interface Services {
  polygonService: PolygonStreamingService;
  strategyDetector: StrategyDetectorService;
}

export function setupWebSocketHandler(wss: WebSocketServer, services: Services): void {
  const { polygonService, strategyDetector } = services;

  // Connect to Polygon on startup
  polygonService.connect().catch(err => {
    logger.error('Failed to connect to Polygon:', err);
  });

  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        logger.info('Terminating inactive WebSocket connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws: ExtendedWebSocket) => {
    logger.info('New WebSocket client connected');

    ws.isAlive = true;
    ws.subscribedSymbols = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleClientMessage(ws, message, services);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      
      // Unsubscribe from symbols
      if (ws.subscribedSymbols && ws.subscribedSymbols.size > 0) {
        const symbols = Array.from(ws.subscribedSymbols);
        
        // Check if any other clients are subscribed to these symbols
        const otherClientsSymbols = new Set<string>();
        wss.clients.forEach((client: ExtendedWebSocket) => {
          if (client !== ws && client.subscribedSymbols) {
            client.subscribedSymbols.forEach(s => otherClientsSymbols.add(s));
          }
        });

        // Unsubscribe only from symbols no other client is subscribed to
        const toUnsubscribe = symbols.filter(s => !otherClientsSymbols.has(s));
        if (toUnsubscribe.length > 0) {
          polygonService.unsubscribe(toUnsubscribe);
        }
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    // Send initial connection success message
    sendMessage(ws, {
      type: 'SETUP_UPDATE',
      payload: {
        status: 'connected',
        message: 'Connected to Fancy Trader backend'
      },
      timestamp: Date.now()
    });

    // Send current active setups
    const activeSetups = strategyDetector.getActiveSetups();
    if (activeSetups.length > 0) {
      sendMessage(ws, {
        type: 'SETUP_UPDATE',
        payload: { setups: activeSetups },
        timestamp: Date.now()
      });
    }
  });

  // Forward strategy detector events to all connected clients
  strategyDetector.on('setup-detected', (setup: DetectedSetup) => {
    broadcastToAll(wss, {
      type: 'SETUP_UPDATE',
      payload: { 
        action: 'new',
        setup 
      },
      timestamp: Date.now()
    });
  });

  strategyDetector.on('target-hit', (data: any) => {
    broadcastToAll(wss, {
      type: 'SETUP_UPDATE',
      payload: { 
        action: 'target_hit',
        ...data 
      },
      timestamp: Date.now()
    });
  });

  strategyDetector.on('stop-loss-hit', (data: any) => {
    broadcastToAll(wss, {
      type: 'SETUP_UPDATE',
      payload: { 
        action: 'stop_loss',
        ...data 
      },
      timestamp: Date.now()
    });
  });

  logger.info('WebSocket handler initialized');
}

/**
 * Handle messages from clients
 */
function handleClientMessage(
  ws: ExtendedWebSocket, 
  message: WSMessage, 
  services: Services
): void {
  const { polygonService, strategyDetector } = services;

  switch (message.type) {
    case 'SUBSCRIBE':
      handleSubscribe(ws, message.payload, polygonService);
      break;

    case 'UNSUBSCRIBE':
      handleUnsubscribe(ws, message.payload, polygonService);
      break;

    case 'PING':
      sendMessage(ws, { type: 'PONG', timestamp: Date.now() });
      break;

    default:
      sendError(ws, `Unknown message type: ${message.type}`);
  }
}

/**
 * Handle subscription to symbols
 */
function handleSubscribe(
  ws: ExtendedWebSocket, 
  payload: any, 
  polygonService: PolygonStreamingService
): void {
  if (!payload || !Array.isArray(payload.symbols)) {
    sendError(ws, 'Invalid subscribe payload. Expected: { symbols: string[] }');
    return;
  }

  const symbols: string[] = payload.symbols;

  // Add to client's subscribed symbols
  symbols.forEach(s => ws.subscribedSymbols?.add(s));

  // Subscribe to Polygon stream
  polygonService.subscribe(symbols);

  sendMessage(ws, {
    type: 'SETUP_UPDATE',
    payload: {
      status: 'subscribed',
      symbols
    },
    timestamp: Date.now()
  });

  logger.info(`Client subscribed to ${symbols.length} symbols`);
}

/**
 * Handle unsubscription from symbols
 */
function handleUnsubscribe(
  ws: ExtendedWebSocket, 
  payload: any, 
  polygonService: PolygonStreamingService
): void {
  if (!payload || !Array.isArray(payload.symbols)) {
    sendError(ws, 'Invalid unsubscribe payload. Expected: { symbols: string[] }');
    return;
  }

  const symbols: string[] = payload.symbols;

  // Remove from client's subscribed symbols
  symbols.forEach(s => ws.subscribedSymbols?.delete(s));

  sendMessage(ws, {
    type: 'SETUP_UPDATE',
    payload: {
      status: 'unsubscribed',
      symbols
    },
    timestamp: Date.now()
  });

  logger.info(`Client unsubscribed from ${symbols.length} symbols`);
}

/**
 * Send message to a single client
 */
function sendMessage(ws: WebSocket, message: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send error message to client
 */
function sendError(ws: WebSocket, error: string): void {
  sendMessage(ws, {
    type: 'ERROR',
    payload: { error },
    timestamp: Date.now()
  });
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(wss: WebSocketServer, message: WSMessage): void {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
