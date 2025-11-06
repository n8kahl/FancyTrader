import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { Bar, OptionsContract } from '../types';

export class PolygonClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('POLYGON_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        apiKey: this.apiKey
      },
      timeout: 10000
    });
  }

  /**
   * Get aggregated bars for a symbol
   */
  async getAggregates(
    symbol: string,
    multiplier: number = 1,
    timespan: 'minute' | 'hour' | 'day' = 'minute',
    from: string,
    to: string,
    limit: number = 50000
  ): Promise<Bar[]> {
    try {
      const response = await this.client.get(
        `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        { params: { adjusted: true, sort: 'asc', limit } }
      );

      if (response.data.results) {
        return response.data.results.map((bar: any) => ({
          symbol,
          timestamp: bar.t,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw
        }));
      }

      return [];
    } catch (error: any) {
      logger.error(`Error fetching aggregates for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get snapshot of current market data for a symbol
   */
  async getSnapshot(symbol: string): Promise<any> {
    try {
      const response = await this.client.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`);
      return response.data.ticker;
    } catch (error: any) {
      logger.error(`Error fetching snapshot for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get options contracts for an underlying symbol
   */
  async getOptionsContracts(
    underlying: string,
    expiration?: string,
    contractType?: 'call' | 'put',
    strikePrice?: number
  ): Promise<any[]> {
    try {
      const params: any = {
        underlying_ticker: underlying,
        limit: 250
      };

      if (expiration) params.expiration_date = expiration;
      if (contractType) params.contract_type = contractType;
      if (strikePrice) params.strike_price = strikePrice;

      const response = await this.client.get('/v3/reference/options/contracts', { params });
      
      return response.data.results || [];
    } catch (error: any) {
      logger.error(`Error fetching options contracts for ${underlying}:`, error.message);
      throw error;
    }
  }

  /**
   * Get options chain snapshot
   */
  async getOptionsSnapshot(underlyingSymbol: string, optionSymbol: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/v3/snapshot/options/${underlyingSymbol}/${optionSymbol}`
      );
      return response.data.results;
    } catch (error: any) {
      logger.error(`Error fetching options snapshot:`, error.message);
      throw error;
    }
  }

  /**
   * Get previous close for a symbol
   */
  async getPreviousClose(symbol: string): Promise<Bar | null> {
    try {
      const response = await this.client.get(`/v2/aggs/ticker/${symbol}/prev`);
      
      if (response.data.results && response.data.results.length > 0) {
        const bar = response.data.results[0];
        return {
          symbol,
          timestamp: bar.t,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw
        };
      }

      return null;
    } catch (error: any) {
      logger.error(`Error fetching previous close for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<any> {
    try {
      const response = await this.client.get('/v1/marketstatus/now');
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching market status:', error.message);
      throw error;
    }
  }
}
