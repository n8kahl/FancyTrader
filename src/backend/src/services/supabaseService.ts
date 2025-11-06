import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DetectedSetup, WatchlistSymbol, StrategyConfig } from '../types';
import { logger } from '../utils/logger';

export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private enabled: boolean;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    this.enabled = !!(supabaseUrl && supabaseKey);

    if (this.enabled) {
      this.supabase = createClient(supabaseUrl!, supabaseKey!);
      logger.info('Supabase service initialized');
    } else {
      logger.warn('Supabase not configured. Data persistence disabled.');
    }
  }

  /**
   * Save a detected setup to database
   */
  async saveSetup(setup: DetectedSetup): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('kv_store_c59dbecd')
        .upsert({
          key: `setup:${setup.id}`,
          value: JSON.stringify(setup)
        });

      if (error) {
        logger.error('Error saving setup to Supabase:', error);
      }
    } catch (error: any) {
      logger.error('Failed to save setup:', error.message);
    }
  }

  /**
   * Get all setups from database
   */
  async getSetups(): Promise<DetectedSetup[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('kv_store_c59dbecd')
        .select('*')
        .like('key', 'setup:%');

      if (error) {
        logger.error('Error fetching setups from Supabase:', error);
        return [];
      }

      return data?.map(row => JSON.parse(row.value)) || [];
    } catch (error: any) {
      logger.error('Failed to fetch setups:', error.message);
      return [];
    }
  }

  /**
   * Save watchlist
   */
  async saveWatchlist(userId: string, watchlist: WatchlistSymbol[]): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('kv_store_c59dbecd')
        .upsert({
          key: `watchlist:${userId}`,
          value: JSON.stringify(watchlist)
        });

      if (error) {
        logger.error('Error saving watchlist to Supabase:', error);
      }
    } catch (error: any) {
      logger.error('Failed to save watchlist:', error.message);
    }
  }

  /**
   * Get watchlist
   */
  async getWatchlist(userId: string): Promise<WatchlistSymbol[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('kv_store_c59dbecd')
        .select('value')
        .eq('key', `watchlist:${userId}`)
        .single();

      if (error || !data) {
        return [];
      }

      return JSON.parse(data.value);
    } catch (error: any) {
      logger.error('Failed to fetch watchlist:', error.message);
      return [];
    }
  }

  /**
   * Save strategy configuration
   */
  async saveStrategyConfig(userId: string, configs: StrategyConfig[]): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('kv_store_c59dbecd')
        .upsert({
          key: `strategies:${userId}`,
          value: JSON.stringify(configs)
        });

      if (error) {
        logger.error('Error saving strategy config to Supabase:', error);
      }
    } catch (error: any) {
      logger.error('Failed to save strategy config:', error.message);
    }
  }

  /**
   * Get strategy configuration
   */
  async getStrategyConfig(userId: string): Promise<StrategyConfig[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('kv_store_c59dbecd')
        .select('value')
        .eq('key', `strategies:${userId}`)
        .single();

      if (error || !data) {
        return [];
      }

      return JSON.parse(data.value);
    } catch (error: any) {
      logger.error('Failed to fetch strategy config:', error.message);
      return [];
    }
  }

  /**
   * Delete a setup
   */
  async deleteSetup(setupId: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('kv_store_c59dbecd')
        .delete()
        .eq('key', `setup:${setupId}`);

      if (error) {
        logger.error('Error deleting setup from Supabase:', error);
      }
    } catch (error: any) {
      logger.error('Failed to delete setup:', error.message);
    }
  }
}
