import { BACKEND_CONFIG } from '../config/backend';
import { logger } from '../utils/logger';

export type WSMessageType = 
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'SETUP_UPDATE'
  | 'PRICE_UPDATE'
  | 'OPTIONS_UPDATE'
  | 'ERROR'
  | 'PING'
  | 'PONG';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  timestamp?: number;
}

type MessageHandler = (message: WSMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private isConnected = false;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('WebSocket already connected');
      return;
    }

    try {
      logger.info(`Connecting to WebSocket: ${BACKEND_CONFIG.wsUrl}`);
      this.ws = new WebSocket(BACKEND_CONFIG.wsUrl);

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start ping interval
        this.startPingInterval();
        
        // Resubscribe to symbols
        if (this.subscribedSymbols.size > 0) {
          this.subscribe(Array.from(this.subscribedSymbols));
        }
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => handler());
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        logger.warn('WebSocket disconnected');
        this.isConnected = false;
        this.stopPingInterval();
        
        // Notify disconnection handlers
        this.disconnectionHandlers.forEach(handler => handler());
        
        // Attempt reconnect
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        this.errorHandlers.forEach(handler => handler(error));
      };

    } catch (error) {
      logger.error('Failed to connect to WebSocket:', error);
      this.errorHandlers.forEach(handler => handler(error));
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.stopPingInterval();
      logger.info('WebSocket disconnected');
    }
  }

  /**
   * Subscribe to symbols
   */
  subscribe(symbols: string[]): void {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe: WebSocket not connected. Symbols will be subscribed on connect.');
      symbols.forEach(s => this.subscribedSymbols.add(s));
      return;
    }

    const message: WSMessage = {
      type: 'SUBSCRIBE',
      payload: { symbols }
    };

    this.send(message);
    symbols.forEach(s => this.subscribedSymbols.add(s));
    logger.info(`Subscribed to ${symbols.length} symbols`);
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]): void {
    if (!this.isConnected) {
      logger.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    const message: WSMessage = {
      type: 'UNSUBSCRIBE',
      payload: { symbols }
    };

    this.send(message);
    symbols.forEach(s => this.subscribedSymbols.delete(s));
    logger.info(`Unsubscribed from ${symbols.length} symbols`);
  }

  /**
   * Send message to server
   */
  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not open');
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WSMessage): void {
    // Handle PONG
    if (message.type === 'PONG') {
      return;
    }

    // Notify all message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    logger.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return unsubscribe function
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register connection handler
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Register disconnection handler
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
