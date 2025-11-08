import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "X-Client-Name": "fancytrader-api" } },
      })
    : null;

export function supabaseForUser(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase URL/ANON key missing");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function assertAdminClient(): asserts supabaseAdmin is SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not available. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.");
  }
}
