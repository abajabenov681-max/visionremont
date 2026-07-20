import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { MasterPublic, MasterProfileRow, SpecializationRow } from "@/types/db";

export async function listFavorites(clientId: string): Promise<MasterPublic[]> {
  const { data, error } = await getAdminClient()
    .from("favorites")
    .select("master:master_profiles(*, master_specializations(specialization:specializations(*)))")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const master = row.master as unknown as MasterProfileRow & {
      master_specializations: { specialization: SpecializationRow }[];
    };
    const { master_specializations, ...rest } = master;
    return { ...rest, specializations: master_specializations.map((s) => s.specialization) };
  });
}

export async function listFavoriteIds(clientId: string): Promise<string[]> {
  const { data, error } = await getAdminClient()
    .from("favorites")
    .select("master_id")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []).map((r) => r.master_id);
}

export async function addFavorite(clientId: string, masterId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("favorites")
    .upsert({ client_id: clientId, master_id: masterId });
  if (error) throw error;
}

export async function removeFavorite(clientId: string, masterId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("favorites")
    .delete()
    .eq("client_id", clientId)
    .eq("master_id", masterId);
  if (error) throw error;
}
