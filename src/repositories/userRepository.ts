import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { UserRow } from "@/types/db";
import type { Role } from "@/lib/constants";

export async function findByPhone(phone: string): Promise<UserRow | null> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser(phone: string, role: Role): Promise<UserRow> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ phone, role })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restore(id: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("users")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw error;
}
