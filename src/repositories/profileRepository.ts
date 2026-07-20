import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ClientProfileRow, MasterProfileRow, MasterPublic, SpecializationRow } from "@/types/db";

/* ---------- client profiles ---------- */

export async function getClientProfile(userId: string): Promise<ClientProfileRow | null> {
  const { data, error } = await getAdminClient()
    .from("client_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createClientProfile(userId: string, fullName = ""): Promise<ClientProfileRow> {
  const { data, error } = await getAdminClient()
    .from("client_profiles")
    .insert({ user_id: userId, full_name: fullName })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientProfile(
  userId: string,
  patch: Partial<Pick<ClientProfileRow, "full_name" | "avatar_url">>
): Promise<ClientProfileRow> {
  const { data, error } = await getAdminClient()
    .from("client_profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ---------- master profiles ---------- */

export async function getMasterProfile(userId: string): Promise<MasterProfileRow | null> {
  const { data, error } = await getAdminClient()
    .from("master_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMasterProfileById(id: string): Promise<MasterProfileRow | null> {
  const { data, error } = await getAdminClient()
    .from("master_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMasterProfile(userId: string, fullName = ""): Promise<MasterProfileRow> {
  const { data, error } = await getAdminClient()
    .from("master_profiles")
    .insert({ user_id: userId, full_name: fullName, phone_verified: true })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMasterProfile(
  userId: string,
  patch: Partial<
    Pick<
      MasterProfileRow,
      "full_name" | "description" | "avatar_url" | "document_url" | "is_online" | "id_verified" | "phone_verified"
    >
  >
): Promise<MasterProfileRow> {
  const { data, error } = await getAdminClient()
    .from("master_profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setMasterSpecializations(masterId: string, specializationIds: string[]): Promise<void> {
  const db = getAdminClient();
  const { error: delError } = await db.from("master_specializations").delete().eq("master_id", masterId);
  if (delError) throw delError;
  if (specializationIds.length === 0) return;
  const { error } = await db
    .from("master_specializations")
    .insert(specializationIds.map((sid) => ({ master_id: masterId, specialization_id: sid })));
  if (error) throw error;
}

export async function getMasterSpecializations(masterId: string): Promise<SpecializationRow[]> {
  const { data, error } = await getAdminClient()
    .from("master_specializations")
    .select("specialization:specializations(*)")
    .eq("master_id", masterId);
  if (error) throw error;
  return (data ?? []).map((r) => r.specialization as unknown as SpecializationRow);
}

export async function listSpecializations(): Promise<SpecializationRow[]> {
  const { data, error } = await getAdminClient().from("specializations").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getMasterPublic(masterId: string): Promise<MasterPublic | null> {
  const master = await getMasterProfileById(masterId);
  if (!master) return null;
  const specializations = await getMasterSpecializations(masterId);
  return { ...master, specializations };
}

/** Master profile ids of online masters with the given specialization (for urgent matching). */
export async function listOnlineMasterIds(specializationId: string): Promise<string[]> {
  const { data, error } = await getAdminClient()
    .from("master_specializations")
    .select("master_id, master:master_profiles!inner(id, is_online)")
    .eq("specialization_id", specializationId)
    .eq("master.is_online", true);
  if (error) throw error;
  return (data ?? []).map((r) => r.master_id);
}

export async function listMasters(params: {
  specializationId?: string;
  search?: string;
}): Promise<MasterPublic[]> {
  const db = getAdminClient();
  let masterIds: string[] | null = null;
  if (params.specializationId) {
    const { data, error } = await db
      .from("master_specializations")
      .select("master_id")
      .eq("specialization_id", params.specializationId);
    if (error) throw error;
    masterIds = (data ?? []).map((r) => r.master_id);
    if (masterIds.length === 0) return [];
  }

  let query = db
    .from("master_profiles")
    .select("*, master_specializations(specialization:specializations(*))")
    .order("trust_score", { ascending: false });
  if (masterIds) query = query.in("id", masterIds);
  if (params.search) query = query.ilike("full_name", `%${params.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { master_specializations, ...master } = row as MasterProfileRow & {
      master_specializations: { specialization: SpecializationRow }[];
    };
    return { ...master, specializations: master_specializations.map((s) => s.specialization) };
  });
}
