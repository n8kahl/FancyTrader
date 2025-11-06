import { API_ENDPOINTS } from '../config/backend';
import { logger } from '../utils/logger';
import type { Trade } from '../components/TradeCard';
import type { WatchlistSymbol } from '../config/watchlist';

/**
 * API Client for backend communication
 */
class ApiClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      // Only log as debug if it's a connection error (backend not running)
      if (error.message?.includes('fetch') || error.name === 'TypeError') {
        logger.debug(`Backend not reachable: ${url}`);
      } else {
        logger.error(`API request failed: ${url}`, error);
      }
      throw error;
    }
  }

  // ============================================
  // SETUPS
  // ============================================

  /**
   * Get all active setups
   */
  async getSetups(): Promise<Trade[]> {
    const response = await this.fetch<{ setups: any[] }>(API_ENDPOINTS.getSetups());
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Get setups for a specific symbol
   */
  async getSetupsBySymbol(symbol: string): Promise<Trade[]> {
    const response = await this.fetch<{ setups: any[] }>(API_ENDPOINTS.getSetupsBySymbol(symbol));
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Get setup history for a user
   */
  async getSetupsHistory(userId: string): Promise<Trade[]> {
    const response = await this.fetch<{ setups: any[] }>(API_ENDPOINTS.getSetupsHistory(userId));
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Delete a setup
   */
  async deleteSetup(setupId: string): Promise<void> {
    await this.fetch(API_ENDPOINTS.deleteSetup(setupId), {
      method: 'DELETE',
    });
  }

  // ============================================
  // MARKET DATA
  // ============================================

  /**
   * Get current market snapshot for a symbol
   */
  async getSnapshot(symbol: string): Promise<any> {
    const response = await this.fetch<{ data: any }>(API_ENDPOINTS.getSnapshot(symbol));
    return response.data;
  }

  /**
   * Get historical bars for a symbol
   */
  async getBars(
    symbol: string,
    params: {
      multiplier?: number;
      timespan?: 'minute' | 'hour' | 'day';
      from: string; // YYYY-MM-DD
      to: string; // YYYY-MM-DD
      limit?: number;
    }
  ): Promise<any[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      ...(params.multiplier && { multiplier: params.multiplier.toString() }),
      ...(params.timespan && { timespan: params.timespan }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    const response = await this.fetch<{ bars: any[] }>(
      `${API_ENDPOINTS.getBars(symbol)}?${queryParams}`
    );
    return response.bars;
  }

  /**
   * Get previous close for a symbol
   */
  async getPreviousClose(symbol: string): Promise<any> {
    const response = await this.fetch<{ data: any }>(API_ENDPOINTS.getPreviousClose(symbol));
    return response.data;
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<any> {
    return this.fetch(API_ENDPOINTS.getMarketStatus());
  }

  // ============================================
  // OPTIONS
  // ============================================

  /**
   * Get options contracts for an underlying
   */
  async getOptionsContracts(
    underlying: string,
    params?: {
      expiration?: string;
      type?: 'call' | 'put';
      strike?: number;
    }
  ): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.expiration) queryParams.set('expiration', params.expiration);
    if (params?.type) queryParams.set('type', params.type);
    if (params?.strike) queryParams.set('strike', params.strike.toString());

    const url = `${API_ENDPOINTS.getOptionsContracts(underlying)}${
      queryParams.toString() ? `?${queryParams}` : ''
    }`;

    const response = await this.fetch<{ contracts: any[] }>(url);
    return response.contracts;
  }

  /**
   * Get options snapshot
   */
  async getOptionsSnapshot(underlying: string, optionSymbol: string): Promise<any> {
    const response = await this.fetch<{ data: any }>(
      API_ENDPOINTS.getOptionsSnapshot(underlying, optionSymbol)
    );
    return response.data;
  }

  /**
   * Get full options chain
   */
  async getOptionsChain(underlying: string, expiration: string): Promise<{ calls: any[]; puts: any[] }> {
    const response = await this.fetch<{ calls: any[]; puts: any[] }>(
      `${API_ENDPOINTS.getOptionsChain(underlying)}?expiration=${expiration}`
    );
    return response;
  }

  // ============================================
  // WATCHLIST
  // ============================================

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string): Promise<WatchlistSymbol[]> {
    const response = await this.fetch<{ watchlist: WatchlistSymbol[] }>(
      API_ENDPOINTS.getWatchlist(userId)
    );
    return response.watchlist;
  }

  /**
   * Save user's watchlist
   */
  async saveWatchlist(userId: string, watchlist: WatchlistSymbol[]): Promise<void> {
    await this.fetch(API_ENDPOINTS.saveWatchlist(userId), {
      method: 'POST',
      body: JSON.stringify({ watchlist }),
    });
  }

  /**
   * Add symbols to watchlist
   */
  async addToWatchlist(userId: string, symbols: WatchlistSymbol[]): Promise<WatchlistSymbol[]> {
    const response = await this.fetch<{ watchlist: WatchlistSymbol[] }>(
      API_ENDPOINTS.addToWatchlist(userId),
      {
        method: 'PUT',
        body: JSON.stringify({ symbols }),
      }
    );
    return response.watchlist;
  }

  /**
   * Remove symbol from watchlist
   */
  async removeFromWatchlist(userId: string, symbol: string): Promise<WatchlistSymbol[]> {
    const response = await this.fetch<{ watchlist: WatchlistSymbol[] }>(
      API_ENDPOINTS.removeFromWatchlist(userId, symbol),
      {
        method: 'DELETE',
      }
    );
    return response.watchlist;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check backend health
   */
  async checkHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.fetch(API_ENDPOINTS.health());
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Transform backend setup format to frontend Trade format
   */
  private transformSetupsToTrades(setups: any[]): Trade[] {
    return setups.map(setup => ({
      id: setup.id,
      symbol: setup.symbol,
      setup: setup.setupType?.replace(/_/g, ' + ') || 'Unknown Setup',
      status: this.mapSetupStatus(setup.status),
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
    }));
  }

  /**
   * Map backend setup status to frontend status
   */
  private mapSetupStatus(backendStatus: string): Trade['status'] {
    const statusMap: Record<string, Trade['status']> = {
      'SETUP_FORMING': 'SETUP_FORMING',
      'SETUP_READY': 'SETUP_READY',
      'MONITORING': 'MONITORING',
      'ACTIVE': 'ACTIVE',
      'PARTIAL_EXIT': 'PARTIAL_EXIT',
      'CLOSED': 'CLOSED',
      'DISMISSED': 'DISMISSED',
    };

    return statusMap[backendStatus] || 'MONITORING';
  }
}

// Singleton instance
export const apiClient = new ApiClient();
