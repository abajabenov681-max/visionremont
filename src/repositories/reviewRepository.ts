import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ReviewRow, ReviewWithRelations } from "@/types/db";

export async function createReview(input: {
  order_id: string;
  client_id: string;
  master_id: string;
  rating: number;
  comment?: string | null;
}): Promise<ReviewRow> {
  const { data, error } = await getAdminClient().from("reviews").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function findByOrder(orderId: string): Promise<ReviewRow | null> {
  const { data, error } = await getAdminClient()
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listByMaster(masterId: string): Promise<ReviewWithRelations[]> {
  const { data, error } = await getAdminClient()
    .from("reviews")
    .select("*, order:orders(*)")
    .eq("master_id", masterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (ReviewWithRelations & { client: null })[];
  // клиентские профили — отдельным запросом (FK на users, не на client_profiles)
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  if (clientIds.length === 0) return rows;
  const { data: clients, error: cErr } = await getAdminClient()
    .from("client_profiles")
    .select("*")
    .in("user_id", clientIds);
  if (cErr) throw cErr;
  const byUser = new Map((clients ?? []).map((c) => [c.user_id, c]));
  return rows.map((r) => ({ ...r, client: byUser.get(r.client_id) ?? null }));
}

export async function listAll(limit = 200): Promise<ReviewWithRelations[]> {
  const { data, error } = await getAdminClient()
    .from("reviews")
    .select("*, order:orders(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, client: null })) as unknown as ReviewWithRelations[];
}

export async function deleteReview(id: string): Promise<ReviewRow | null> {
  const { data, error } = await getAdminClient().from("reviews").delete().eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function recalcMasterStats(masterProfileId: string): Promise<void> {
  const { error } = await getAdminClient().rpc("recalc_master_stats", {
    p_master_profile_id: masterProfileId,
  });
  if (error) throw error;
}
