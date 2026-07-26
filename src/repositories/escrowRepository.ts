import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { EscrowStatus } from "@/lib/constants";
import type { EscrowTransactionRow } from "@/types/db";

export async function findByOrder(orderId: string): Promise<EscrowTransactionRow | null> {
  const { data, error } = await getAdminClient()
    .from("escrow_transactions")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function create(input: {
  order_id: string;
  amount: number | null;
  status: EscrowStatus;
}): Promise<EscrowTransactionRow> {
  const { data, error } = await getAdminClient()
    .from("escrow_transactions")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  patch: Partial<Pick<EscrowTransactionRow, "amount" | "commission" | "master_amount" | "status" | "released_at">>
): Promise<EscrowTransactionRow> {
  const { data, error } = await getAdminClient()
    .from("escrow_transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
