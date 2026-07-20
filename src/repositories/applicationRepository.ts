import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ApplicationRow, ApplicationWithRelations } from "@/types/db";

export async function createApplication(input: {
  order_id: string;
  master_id: string;
  price: number;
  estimated_days: number;
  comment?: string | null;
}): Promise<ApplicationRow> {
  const { data, error } = await getAdminClient().from("applications").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function listByOrder(orderId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await getAdminClient()
    .from("applications")
    .select("*, master:master_profiles(*)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ApplicationWithRelations[];
}

export async function listByMaster(masterId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await getAdminClient()
    .from("applications")
    .select("*, order:orders(*)")
    .eq("master_id", masterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ApplicationWithRelations[];
}

export async function findByOrderAndMaster(orderId: string, masterId: string): Promise<ApplicationRow | null> {
  const { data, error } = await getAdminClient()
    .from("applications")
    .select("*")
    .eq("order_id", orderId)
    .eq("master_id", masterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await getAdminClient().from("applications").delete().eq("id", id);
  if (error) throw error;
}
