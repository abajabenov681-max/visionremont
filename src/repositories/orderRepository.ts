import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { OrderRow, OrderWithRelations, OrderImageRow } from "@/types/db";
import type { ImageType, OrderStatus } from "@/lib/constants";

// PostgREST не знает FK orders.client_id -> client_profiles (FK указывает на users),
// поэтому клиентский профиль подтягиваем отдельным запросом.
const ORDER_SELECT_BASE = `
  *,
  specialization:specializations(*),
  master:master_profiles!orders_selected_master_fkey(*),
  images:order_images(*),
  escrow:escrow_transactions(*)
`;

type OrderJoined = OrderRow & {
  specialization: OrderWithRelations["specialization"];
  master: OrderWithRelations["master"];
  images: OrderImageRow[];
  escrow: OrderWithRelations["escrow"];
};

async function attachClients(rows: OrderJoined[]): Promise<OrderWithRelations[]> {
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

export async function createOrder(input: {
  client_id: string;
  specialization_id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  address: string;
  status: OrderStatus;
  is_urgent: boolean;
}): Promise<OrderRow> {
  const { data, error } = await getAdminClient().from("orders").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function getOrder(id: string): Promise<OrderWithRelations | null> {
  const { data, error } = await getAdminClient()
    .from("orders")
    .select(ORDER_SELECT_BASE)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withClient] = await attachClients([data as unknown as OrderJoined]);
  return withClient;
}

export async function listOrders(params: {
  clientId?: string;
  selectedMaster?: string;
  status?: OrderStatus | OrderStatus[];
  specializationId?: string;
  isUrgent?: boolean;
  includeDeleted?: boolean;
  search?: string;
  limit?: number;
}): Promise<OrderWithRelations[]> {
  let query = getAdminClient()
    .from("orders")
    .select(ORDER_SELECT_BASE)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (!params.includeDeleted) query = query.is("deleted_at", null);
  if (params.clientId) query = query.eq("client_id", params.clientId);
  if (params.selectedMaster) query = query.eq("selected_master", params.selectedMaster);
  if (params.specializationId) query = query.eq("specialization_id", params.specializationId);
  if (params.isUrgent !== undefined) query = query.eq("is_urgent", params.isUrgent);
  if (params.status) {
    if (Array.isArray(params.status)) query = query.in("status", params.status);
    else query = query.eq("status", params.status);
  }
  if (params.search) query = query.ilike("title", `%${params.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return attachClients((data ?? []) as unknown as OrderJoined[]);
}

export async function updateOrder(
  id: string,
  patch: Partial<
    Pick<OrderRow, "title" | "description" | "budget" | "address" | "status" | "selected_master" | "deleted_at">
  >
): Promise<OrderRow> {
  const { data, error } = await getAdminClient()
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Atomic accept of an urgent order — first master wins (WHERE status = 'MATCHING'). */
export async function acceptUrgentAtomic(orderId: string, masterProfileId: string): Promise<boolean> {
  const { data, error } = await getAdminClient().rpc("accept_urgent_order", {
    p_order_id: orderId,
    p_master_profile_id: masterProfileId,
  });
  if (error) throw error;
  return data === true;
}

export async function addOrderImage(orderId: string, imageUrl: string, type: ImageType): Promise<OrderImageRow> {
  const { data, error } = await getAdminClient()
    .from("order_images")
    .insert({ order_id: orderId, image_url: imageUrl, type })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function countOrders(params: { status?: OrderStatus; isUrgent?: boolean } = {}): Promise<number> {
  let query = getAdminClient().from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null);
  if (params.status) query = query.eq("status", params.status);
  if (params.isUrgent !== undefined) query = query.eq("is_urgent", params.isUrgent);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
