import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ChatMessageRow } from "@/types/db";

export async function listMessages(orderId: string, limit = 200): Promise<ChatMessageRow[]> {
  const { data, error } = await getAdminClient()
    .from("chat_messages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createMessage(input: {
  order_id: string;
  sender_id: string;
  message: string;
}): Promise<ChatMessageRow> {
  const { data, error } = await getAdminClient().from("chat_messages").insert(input).select("*").single();
  if (error) throw error;
  return data;
}
