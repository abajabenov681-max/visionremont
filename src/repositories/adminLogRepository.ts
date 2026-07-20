import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AdminLogRow } from "@/types/db";

export async function log(adminId: string, action: string, entity: string, entityId?: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("admin_logs")
    .insert({ admin_id: adminId, action, entity, entity_id: entityId ?? null });
  if (error) throw error;
}

export async function listLogs(limit = 100): Promise<AdminLogRow[]> {
  const { data, error } = await getAdminClient()
    .from("admin_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
