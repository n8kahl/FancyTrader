import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

export type SetupRecord = {
  id: string;
  owner: string;
  symbol: string;
  payload: unknown;
  detected_at: string;
};

const buildClient = (): SupabaseClient | null => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    logger.warn("Supabase setups service not configured - missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    return null;
  }

  return createClient(url, key, { auth: { persistSession: false } });
};

export class SupabaseSetupsService {
  private readonly client: SupabaseClient | null;

  constructor(client?: SupabaseClient | null) {
    this.client = typeof client !== "undefined" ? client : buildClient();
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error("Supabase setups service is not configured");
    }
    return this.client;
  }

  async listSetups(owner: string, limit = 100): Promise<SetupRecord[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("setups")
      .select("*")
      .eq("owner", owner)
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ error, owner }, "Failed to list setups");
      throw error;
    }

    return data ?? [];
  }

  async saveSetup(owner: string, symbol: string, payload: unknown): Promise<SetupRecord> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("setups")
      .insert({ owner, symbol, payload })
      .select("*")
      .single();

    if (error) {
      logger.error({ error, owner, symbol }, "Failed to save setup");
      throw error;
    }

    return data as SetupRecord;
  }

  async deleteSetup(id: string, owner?: string): Promise<void> {
    const supabase = this.getClient();
    const filters: Record<string, string> = { id };

    if (owner) {
      filters.owner = owner;
    }

    const { error } = await supabase.from("setups").delete().match(filters);

    if (error) {
      logger.error({ error, id, owner }, "Failed to delete setup");
      throw error;
    }
  }
}

const defaultService = new SupabaseSetupsService();

export const listSetups = (owner: string, limit?: number) => defaultService.listSetups(owner, limit);
export const saveSetup = (owner: string, symbol: string, payload: unknown) =>
  defaultService.saveSetup(owner, symbol, payload);
export const deleteSetup = (id: string, owner?: string) => defaultService.deleteSetup(id, owner);
