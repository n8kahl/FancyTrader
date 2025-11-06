import { useEffect, useState, useCallback } from 'react';
import { wsClient, WSMessage } from '../services/websocketClient';
import { apiClient } from '../services/apiClient';
import type { Trade } from '../components/TradeCard';
import { logger } from '../utils/logger';
import { toast } from 'sonner@2.0.3';

interface BackendConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  trades: Trade[];
  lastUpdate: number | null;
}

export function useBackendConnection(autoConnect: boolean = true) {
  logger.info('🔌 useBackendConnection initialized', { autoConnect });
  
  const [state, setState] = useState<BackendConnectionState>({
    isConnected: false,
    isLoading: true,
    error: null,
    trades: [],
    lastUpdate: null,
  });

  /**
   * Fetch initial setups from API
   */
  const fetchSetups = useCallback(async () => {
    try {
      logger.info('Fetching setups from backend...');
      const setups = await apiClient.getSetups();
      
      setState(prev => ({
        ...prev,
        trades: setups,
        lastUpdate: Date.now(),
        isLoading: false,
      }));

      logger.info(`Loaded ${setups.length} setups from backend`);
    } catch (error: any) {
      logger.error('Failed to fetch setups:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Handle WebSocket messages
   */
  const handleMessage = useCallback((message: WSMessage) => {
    logger.debug('WebSocket message received:', message.type);

    switch (message.type) {
      case 'SETUP_UPDATE':
        handleSetupUpdate(message.payload);
        break;

      case 'PRICE_UPDATE':
        handlePriceUpdate(message.payload);
        break;

      case 'ERROR':
        logger.error('WebSocket error:', message.payload?.error);
        toast.error('WebSocket Error', {
          description: message.payload?.error,
        });
        break;

      default:
        logger.debug('Unhandled message type:', message.type);
    }
  }, []);

  /**
   * Handle setup updates
   */
  const handleSetupUpdate = (payload: any) => {
    const { action, setup, setups } = payload;

    setState(prev => {
      let updatedTrades = [...prev.trades];

      switch (action) {
        case 'new':
          // Add new setup
          if (setup) {
            const trade = transformSetupToTrade(setup);
            updatedTrades = [trade, ...updatedTrades];
            
            toast.success('New Setup Detected!', {
              description: `${setup.symbol} - ${setup.setupType.replace(/_/g, ' ')}`,
            });
          }
          break;

        case 'update':
          // Update existing setup
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex(t => t.id === trade.id);
            
            if (index !== -1) {
              updatedTrades[index] = trade;
            }
          }
          break;

        case 'target_hit':
          // Target hit notification
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex(t => t.id === trade.id);
            
            if (index !== -1) {
              updatedTrades[index] = trade;
            }

            toast.success('Target Hit! 🎯', {
              description: `${setup.symbol} - Target ${payload.targetIndex + 1}`,
            });
          }
          break;

        case 'stop_loss':
          // Stop loss hit
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex(t => t.id === trade.id);
            
            if (index !== -1) {
              updatedTrades[index] = { ...trade, status: 'CLOSED' };
            }

            toast.error('Stop Loss Hit', {
              description: `${setup.symbol}`,
            });
          }
          break;

        default:
          // Bulk update (initial load)
          if (setups && Array.isArray(setups)) {
            updatedTrades = setups.map(transformSetupToTrade);
          }
      }

      return {
        ...prev,
        trades: updatedTrades,
        lastUpdate: Date.now(),
      };
    });
  };

  /**
   * Handle price updates
   */
  const handlePriceUpdate = (payload: any) => {
    const { symbol, price } = payload;

    setState(prev => {
      const updatedTrades = prev.trades.map(trade => {
        if (trade.symbol === symbol) {
          return {
            ...trade,
            currentPrice: price,
            // Recalculate P/L if trade is active
            ...(trade.entryPrice && {
              profitLoss: calculateProfitLoss(trade, price),
              profitLossPercent: calculateProfitLossPercent(trade, price),
            }),
          };
        }
        return trade;
      });

      return {
        ...prev,
        trades: updatedTrades,
        lastUpdate: Date.now(),
      };
    });
  };

  /**
   * Subscribe to symbols
   */
  const subscribeToSymbols = useCallback((symbols: string[]) => {
    if (state.isConnected && symbols.length > 0) {
      wsClient.subscribe(symbols);
      logger.info(`Subscribed to ${symbols.length} symbols`);
    }
  }, [state.isConnected]);

  /**
   * Unsubscribe from symbols
   */
  const unsubscribeFromSymbols = useCallback((symbols: string[]) => {
    if (state.isConnected && symbols.length > 0) {
      wsClient.unsubscribe(symbols);
      logger.info(`Unsubscribed from ${symbols.length} symbols`);
    }
  }, [state.isConnected]);

  /**
   * Initialize connection
   */
  useEffect(() => {
    if (!autoConnect) return;

    // Check backend health
    apiClient.checkHealth()
      .then(() => {
        logger.info('✅ Backend health check passed');
        
        // Connect WebSocket
        wsClient.connect();
        
        // Fetch initial data
        fetchSetups();
      })
      .catch((error) => {
        logger.warn('⚠️ Backend not available - using mock data mode');
        logger.info('💡 To connect to backend: Start backend server with "cd backend && npm run dev"');
        
        setState(prev => ({
          ...prev,
          error: 'Backend not available',
          isLoading: false,
        }));
        
        toast.info('Using Mock Data', {
          description: 'Backend not running. Click "Go Live" after starting backend.',
          duration: 4000,
        });
      });

    // Register WebSocket handlers
    const unsubscribeMessage = wsClient.onMessage(handleMessage);
    
    const unsubscribeConnect = wsClient.onConnect(() => {
      logger.info('WebSocket connected');
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      toast.success('Connected to Backend');
    });

    const unsubscribeDisconnect = wsClient.onDisconnect(() => {
      logger.warn('WebSocket disconnected');
      setState(prev => ({ ...prev, isConnected: false }));
      toast.warning('Backend Disconnected', {
        description: 'Attempting to reconnect...',
      });
    });

    const unsubscribeError = wsClient.onError((error) => {
      logger.error('WebSocket error:', error);
      setState(prev => ({ ...prev, error: error.message || 'WebSocket error' }));
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      wsClient.disconnect();
    };
  }, [autoConnect, handleMessage, fetchSetups]);

  return {
    ...state,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    refreshSetups: fetchSetups,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function transformSetupToTrade(setup: any): Trade {
  return {
    id: setup.id,
    symbol: setup.symbol,
    setup: setup.setupType?.replace(/_/g, ' + ') || 'Unknown Setup',
    status: setup.status || 'MONITORING',
    direction: setup.direction,
    entryPrice: setup.entryPrice,
    currentPrice: setup.currentPrice || setup.entryPrice,
    stopLoss: setup.stopLoss,
    targets: setup.targets || [],
    profitLoss: setup.profitLoss || 0,
    profitLossPercent: setup.profitLossPercent || 0,
    confluenceScore: setup.confluenceScore || 0,
    confluenceFactors: setup.confluenceFactors || [],
    timeframe: setup.timeframe || '5m',
    timestamp: setup.timestamp || Date.now(),
    indicators: setup.indicators || {},
    patientCandle: setup.patientCandle,
    tradeState: 'SETUP',
    alertHistory: [],
  };
}

function calculateProfitLoss(trade: Trade, currentPrice: number): number {
  if (!trade.entryPrice) return 0;
  
  const direction = trade.direction === 'LONG' ? 1 : -1;
  return (currentPrice - trade.entryPrice) * direction;
}

function calculateProfitLossPercent(trade: Trade, currentPrice: number): number {
  if (!trade.entryPrice) return 0;
  
  const pl = calculateProfitLoss(trade, currentPrice);
  return (pl / trade.entryPrice) * 100;
}
