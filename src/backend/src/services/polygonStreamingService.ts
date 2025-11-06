import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { StrategyDetectorService } from './strategyDetector';
import { Bar, Trade, Quote } from '../types';

interface PolygonMessage {
  ev: string; // Event type
  sym?: string; // Symbol
  v?: number; // Volume
  av?: number; // Accumulated volume
  op?: number; // Open price
  vw?: number; // VWAP
  o?: number; // Open
  c?: number; // Close
  h?: number; // High
  l?: number; // Low
  a?: number; // Aggregate (accumulated)
  s?: number; // Start timestamp
  e?: number; // End timestamp
  p?: number; // Price
  t?: number; // Timestamp
  bp?: number; // Bid price
  ap?: number; // Ask price
  bs?: number; // Bid size
  as?: number; // Ask size
}

export class PolygonStreamingService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private apiKey: string;
  private subscribedSymbols: Set<string> = new Set();
  private strategyDetector: StrategyDetectorService;
  private isAuthenticated = false;

  constructor(strategyDetector: StrategyDetectorService) {
    this.apiKey = process.env.POLYGON_API_KEY || '';
    this.strategyDetector = strategyDetector;
    
    if (!this.apiKey) {
      throw new Error('POLYGON_API_KEY is required for streaming');
    }
  }

  /**
   * Connect to Polygon WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('WebSocket already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://socket.polygon.io/stocks');

        this.ws.on('open', () => {
          logger.info('Connected to Polygon WebSocket');
          this.authenticate();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          logger.warn('Polygon WebSocket closed');
          this.isAuthenticated = false;
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          logger.error('Polygon WebSocket error:', error);
          reject(error);
        });

        // Resolve when authenticated
        const checkAuth = setInterval(() => {
          if (this.isAuthenticated) {
            clearInterval(checkAuth);
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkAuth);
          if (!this.isAuthenticated) {
            reject(new Error('Authentication timeout'));
          }
        }, 10000);

      } catch (error) {
        logger.error('Failed to connect to Polygon WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Authenticate with Polygon
   */
  private authenticate(): void {
    if (!this.ws) return;

    const authMessage = {
      action: 'auth',
      params: this.apiKey
    };

    this.ws.send(JSON.stringify(authMessage));
    logger.info('Sent authentication to Polygon');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const messages: PolygonMessage[] = JSON.parse(data);

      messages.forEach(msg => {
        switch (msg.ev) {
          case 'status':
            this.handleStatusMessage(msg);
            break;
          case 'AM': // Aggregate per minute
            this.handleAggregateMessage(msg);
            break;
          case 'A': // Aggregate per second
            this.handleAggregateMessage(msg);
            break;
          case 'T': // Trade
            this.handleTradeMessage(msg);
            break;
          case 'Q': // Quote
            this.handleQuoteMessage(msg);
            break;
          default:
            logger.debug('Unknown message type:', msg.ev);
        }
      });
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle status messages (authentication, etc.)
   */
  private handleStatusMessage(msg: any): void {
    logger.info('Status message:', msg.message);
    
    if (msg.status === 'auth_success') {
      this.isAuthenticated = true;
      this.reconnectAttempts = 0;
      
      // Resubscribe to symbols if reconnecting
      if (this.subscribedSymbols.size > 0) {
        this.resubscribeAll();
      }
    } else if (msg.status === 'auth_failed') {
      logger.error('Authentication failed');
      this.isAuthenticated = false;
    }
  }

  /**
   * Handle aggregate (bar) messages
   */
  private handleAggregateMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const bar: Bar = {
      symbol: msg.sym,
      timestamp: msg.s || Date.now(),
      open: msg.o || 0,
      high: msg.h || 0,
      low: msg.l || 0,
      close: msg.c || 0,
      volume: msg.v || 0,
      vwap: msg.vw
    };

    // Send to strategy detector
    this.strategyDetector.processBar(bar);
  }

  /**
   * Handle trade messages
   */
  private handleTradeMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const trade: Trade = {
      symbol: msg.sym,
      timestamp: msg.t || Date.now(),
      price: msg.p || 0,
      size: msg.s || 0
    };

    this.strategyDetector.processTrade(trade);
  }

  /**
   * Handle quote messages
   */
  private handleQuoteMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const quote: Quote = {
      symbol: msg.sym,
      timestamp: msg.t || Date.now(),
      bid: msg.bp || 0,
      ask: msg.ap || 0,
      bidSize: msg.bs || 0,
      askSize: msg.as || 0
    };

    this.strategyDetector.processQuote(quote);
  }

  /**
   * Subscribe to symbols
   */
  subscribe(symbols: string[]): void {
    if (!this.ws || !this.isAuthenticated) {
      logger.warn('Cannot subscribe: not connected or authenticated');
      symbols.forEach(s => this.subscribedSymbols.add(s));
      return;
    }

    const subscribeMessage = {
      action: 'subscribe',
      params: [
        ...symbols.map(s => `AM.${s}`), // Aggregate per minute
        ...symbols.map(s => `A.${s}`),  // Aggregate per second
        ...symbols.map(s => `T.${s}`),  // Trades
      ]
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    symbols.forEach(s => this.subscribedSymbols.add(s));
    
    logger.info(`Subscribed to ${symbols.length} symbols`);
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]): void {
    if (!this.ws || !this.isAuthenticated) {
      logger.warn('Cannot unsubscribe: not connected or authenticated');
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      params: [
        ...symbols.map(s => `AM.${s}`),
        ...symbols.map(s => `A.${s}`),
        ...symbols.map(s => `T.${s}`),
      ]
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    symbols.forEach(s => this.subscribedSymbols.delete(s));
    
    logger.info(`Unsubscribed from ${symbols.length} symbols`);
  }

  /**
   * Resubscribe to all symbols after reconnect
   */
  private resubscribeAll(): void {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length > 0) {
      this.subscribe(symbols);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(err => {
        logger.error('Reconnection failed:', err);
      });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
      this.subscribedSymbols.clear();
      logger.info('Disconnected from Polygon WebSocket');
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}
