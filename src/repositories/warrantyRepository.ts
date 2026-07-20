import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { WarrantyWithRelations } from "@/types/db";

const WARRANTY_SELECT = `
  *,
  order:orders(*),
  master:master_profiles(*),
  certificate:warranty_certificates(*)
`;

type WarrantyJoined = Omit<WarrantyWithRelations, "client">;

async function attachClients(rows: WarrantyJoined[]): Promise<WarrantyWithRelations[]> {
  if (rows.length === 0) return [];
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  const { data, error } = await getAdminClient()
    .from("client_profiles")
    .select("*")
    .in("user_id", clientIds);
  if (error) throw error;
  const byUser = new Map((data ?? []).map((c) => [c.user_id, c]));
  return rows.map((r) => ({ ...r, client: byUser.get(r.client_id) ?? null }));
}

export async function getWarranty(id: string): Promise<WarrantyWithRelations | null> {
  const { data, error } = await getAdminClient()
    .from("warranties")
    .select(WARRANTY_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [row] = await attachClients([data as unknown as WarrantyJoined]);
  return row;
}

export async function findByOrder(orderId: string): Promise<WarrantyWithRelations | null> {
  const { data, error } = await getAdminClient()
    .from("warranties")
    .select(WARRANTY_SELECT)
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [row] = await attachClients([data as unknown as WarrantyJoined]);
  return row;
}

export async function listWarranties(params: {
  clientId?: string;
  masterId?: string;
}): Promise<WarrantyWithRelations[]> {
  let query = getAdminClient()
    .from("warranties")
    .select(WARRANTY_SELECT)
    .order("created_at", { ascending: false });
  if (params.clientId) query = query.eq("client_id", params.clientId);
  if (params.masterId) query = query.eq("master_id", params.masterId);
  const { data, error } = await query;
  if (error) throw error;
  return attachClients((data ?? []) as unknown as WarrantyJoined[]);
}

/** Runs the transactional confirm RPC: order -> WARRANTY_ACTIVE + warranty + certificate. */
export async function confirmCompletion(orderId: string, warrantyMonths: number): Promise<string> {
  const { data, error } = await getAdminClient().rpc("confirm_order_completion", {
    p_order_id: orderId,
    p_warranty_months: warrantyMonths,
  });
  if (error) throw error;
  return data as string;
}
