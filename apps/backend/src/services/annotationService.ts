import { randomUUID } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin, assertAdminClient } from "../lib/supabase";

export const AnnotationCreateSchema = z.object({
  symbol: z.string().min(1),
  entry: z.number().finite(),
  stop: z.number().finite().nullable().optional(),
  targets: z.array(z.number().finite()).max(8).optional(),
  notes: z.string().max(2000).optional(),
});

export const AnnotationUpdateSchema = z
  .object({
    entry: z.number().finite().optional(),
    stop: z.number().finite().nullable().optional(),
    targets: z.array(z.number().finite()).max(8).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type AnnotationCreate = z.infer<typeof AnnotationCreateSchema>;
export type AnnotationUpdate = z.infer<typeof AnnotationUpdateSchema>;

export interface AnnotationRecord {
  id: string;
  owner: string;
  symbol: string;
  entry: number;
  stop?: number | null;
  targets: number[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

const USE_MEMORY =
  (process.env.ANNOTATIONS_MEMORY_STORE ?? "").toLowerCase() === "true";

const store: Record<string, AnnotationRecord[]> = {};

const getAdmin = () => {
  const client = supabaseAdmin;
  assertAdminClient(client);
  return client;
};

const nowIso = () => new Date().toISOString();

export async function listAnnotations(
  owner: string,
  symbol?: string
): Promise<AnnotationRecord[]> {
  if (USE_MEMORY || !supabaseAdmin) {
    const records = store[owner] ?? [];
    const filtered = symbol
      ? records.filter((rec) => rec.symbol === symbol.toUpperCase())
      : records;
    return filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  const admin = getAdmin();
  let query = admin
    .from("chart_annotations")
    .select("*")
    .eq("owner", owner)
    .order("updated_at", { ascending: false });

  if (symbol) {
    query = query.eq("symbol", symbol.toUpperCase());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeRecord);
}

export async function createAnnotation(
  owner: string,
  payload: AnnotationCreate
): Promise<AnnotationRecord> {
  const normalized = normalizePayload(payload);

  if (USE_MEMORY || !supabaseAdmin) {
    const record: AnnotationRecord = {
      id: randomUUID(),
      owner,
      targets: normalized.targets ?? [],
      created_at: nowIso(),
      updated_at: nowIso(),
      ...normalized,
    };
    store[owner] = store[owner] ?? [];
    store[owner].unshift(record);
    return record;
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("chart_annotations")
    .insert([{ owner, ...normalized }])
    .select()
    .single();
  if (error) throw error;
  return normalizeRecord(data);
}

export async function updateAnnotation(
  owner: string,
  id: string,
  payload: AnnotationUpdate
): Promise<AnnotationRecord | null> {
  const normalized = normalizePayload(payload);

  if (USE_MEMORY || !supabaseAdmin) {
    const list = store[owner] ?? [];
    const index = list.findIndex((rec) => rec.id === id);
    if (index === -1) return null;
    const next: AnnotationRecord = {
      ...list[index],
      ...normalized,
      updated_at: nowIso(),
    };
    list[index] = next;
    return next;
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("chart_annotations")
    .update({ ...normalized })
    .eq("id", id)
    .eq("owner", owner)
    .select()
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data ? normalizeRecord(data) : null;
}

export async function deleteAnnotation(
  owner: string,
  id: string
): Promise<boolean> {
  if (USE_MEMORY || !supabaseAdmin) {
    const list = store[owner] ?? [];
    const before = list.length;
    store[owner] = list.filter((rec) => rec.id !== id);
    return before !== store[owner].length;
  }

  const admin = getAdmin();
  const { count, error } = await admin
    .from("chart_annotations")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner", owner);
  if (error) throw error;
  return (count ?? 0) > 0;
}

function normalizePayload<T extends AnnotationCreate | AnnotationUpdate>(
  payload: T
): T {
  const base: Record<string, unknown> = {
    ...payload,
  };
  if ("symbol" in base && typeof base.symbol === "string") {
    base.symbol = base.symbol.toUpperCase();
  }
  if ("entry" in base && typeof base.entry === "number") {
    base.entry = Number(base.entry);
  }
  if ("targets" in base) {
    base.targets = (base.targets as number[] | undefined)?.map((value) =>
      Number(value)
    );
  }
  if ("stop" in base) {
    if (base.stop === undefined) {
      base.stop = null;
    } else if (typeof base.stop === "number") {
      base.stop = Number(base.stop);
    }
  }
  return base as T;
}

function normalizeRecord(input: any): AnnotationRecord {
  return {
    id: input.id,
    owner: input.owner,
    symbol: input.symbol,
    entry: Number(input.entry),
    stop:
      typeof input.stop === "number" || input.stop === null ? input.stop : null,
    targets: Array.isArray(input.targets)
      ? input.targets.map((value: unknown) => Number(value))
      : [],
    notes: input.notes ?? null,
    created_at: input.created_at,
    updated_at: input.updated_at,
  };
}
