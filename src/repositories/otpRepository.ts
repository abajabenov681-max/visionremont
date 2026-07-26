import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { OtpCodeRow } from "@/types/db";

/** Последний выданный код для номера (для рейт-лимита и проверки). */
export async function findLatestByPhone(phone: string): Promise<OtpCodeRow | null> {
  const { data, error } = await getAdminClient()
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCode(phone: string, code: string, ttlMinutes: number): Promise<OtpCodeRow> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { data, error } = await getAdminClient()
    .from("otp_codes")
    .insert({ phone, code, expires_at: expiresAt })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function incrementAttempts(id: string, current: number): Promise<void> {
  const { error } = await getAdminClient()
    .from("otp_codes")
    .update({ attempts: current + 1 })
    .eq("id", id);
  if (error) throw error;
}

/** Удаляет все коды номера — после успешного входа или выдачи нового кода. */
export async function deleteByPhone(phone: string): Promise<void> {
  const { error } = await getAdminClient().from("otp_codes").delete().eq("phone", phone);
  if (error) throw error;
}
