import { z } from "zod";
import { supabaseAdmin, assertAdminClient } from "../lib/supabase";

export const TradeSide = z.enum(["BUY", "SELL"]);
export const TradeStatus = z.enum(["OPEN", "CLOSED", "CANCELLED"]);
export const TradeCreate = z.object({
  symbol: z.string().min(1),
  side: TradeSide,
  entry: z.number().finite(),
  qty: z.number().int().positive().default(1),
  stop: z.number().finite().optional(),
  targets: z.array(z.number().finite()).max(5).optional(),
  notes: z.string().max(1000).optional(),
});
export const TradeUpdate = z.object({
  status: TradeStatus.optional(),
  stop: z.number().finite().nullable().optional(),
  targets: z.array(z.number().finite()).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

type CreatePayload = z.infer<typeof TradeCreate>;
type UpdatePayload = z.infer<typeof TradeUpdate>;

const USE_MEMORY = (process.env.TRADES_MEMORY_STORE ?? "false").toLowerCase() === "true";

type TradeRecord = {
  id: string;
  owner: string;
  symbol: string;
  side: "BUY" | "SELL";
  entry: number;
  qty: number;
  stop?: number | null;
  targets?: number[];
  notes?: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  created_at: string;
  updated_at: string;
};

const mem: Record<string, TradeRecord[]> = {};
const uuid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now()}`;


const requireAdmin = () => {
  const client = supabaseAdmin;
  assertAdminClient(client);
  return client;
};
export async function listTrades(owner: string): Promise<TradeRecord[]> {
  if (USE_MEMORY || !supabaseAdmin) {
    return (mem[owner] ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("trades")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrade(owner: string, payload: CreatePayload): Promise<TradeRecord> {
  if (USE_MEMORY || !supabaseAdmin) {
    const rec: TradeRecord = {
      id: uuid(),
      owner,
      status: "OPEN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
    mem[owner] = mem[owner] ?? [];
    mem[owner].unshift(rec);
    return rec;
  }
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("trades")
    .insert([{ owner, status: "OPEN", ...payload }])
    .select()
    .single();
  if (error) throw error;
  return data as TradeRecord;
}

export async function getTrade(owner: string, id: string): Promise<TradeRecord | null> {
  if (USE_MEMORY || !supabaseAdmin) {
    return (mem[owner] ?? []).find((t) => t.id === id) ?? null;
  }
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("trades")
    .select("*")
    .eq("id", id)
    .eq("owner", owner)
    .single();
  if (error && (error as { code?: string }).code === "PGRST116") return null;
  if (error) throw error;
  return data as TradeRecord;
}

export async function updateTrade(
  owner: string,
  id: string,
  partial: UpdatePayload
): Promise<TradeRecord | null> {
  if (USE_MEMORY || !supabaseAdmin) {
    const list = mem[owner] ?? [];
    const i = list.findIndex((t) => t.id === id);
    if (i === -1) return null;
    const next = { ...list[i], ...partial, updated_at: new Date().toISOString() };
    list[i] = next;
    return next;
  }
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("trades")
    .update({ ...partial })
    .eq("id", id)
    .eq("owner", owner)
    .select()
    .single();
  if (error && (error as { code?: string }).code === "PGRST116") return null;
  if (error) throw error;
  return data as TradeRecord;
}

export async function deleteTrade(owner: string, id: string): Promise<boolean> {
  if (USE_MEMORY || !supabaseAdmin) {
    const list = mem[owner] ?? [];
    const i = list.findIndex((t) => t.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  }
  const admin = requireAdmin();
  const { error, count } = await admin
    .from("trades")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner", owner);
  if (error) throw error;
  return (count ?? 0) > 0;
}
