import "server-only";
import { ApiError } from "@/lib/api";
import { ORDER_STATUSES, ROLES, channels, REALTIME_EVENTS } from "@/lib/constants";
import { broadcast } from "@/lib/supabase/realtime";
import * as chat from "@/repositories/chatRepository";
import * as orders from "@/repositories/orderRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { ChatMessageRow, OrderWithRelations } from "@/types/db";

async function assertChatAccess(session: SessionUser, orderId: string): Promise<OrderWithRelations> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (session.role === ROLES.ADMIN) return order;
  if (session.role === ROLES.CLIENT) {
    if (order.client_id !== session.id) throw new ApiError("Нет доступа к чату", 403);
    return order;
  }
  const master = await profiles.getMasterProfile(session.id);
  if (!master || order.selected_master !== master.id) throw new ApiError("Нет доступа к чату", 403);
  return order;
}

export async function listMessages(session: SessionUser, orderId: string): Promise<ChatMessageRow[]> {
  await assertChatAccess(session, orderId);
  return chat.listMessages(orderId);
}

export async function sendMessage(
  session: SessionUser,
  orderId: string,
  message: string
): Promise<ChatMessageRow> {
  const order = await assertChatAccess(session, orderId);
  if (!order.selected_master) throw new ApiError("Чат откроется после выбора мастера");
  if (order.status === ORDER_STATUSES.CANCELLED) throw new ApiError("Заказ отменён");

  const row = await chat.createMessage({ order_id: orderId, sender_id: session.id, message });
  await broadcast(channels.chat(orderId), REALTIME_EVENTS.CHAT_MESSAGE, { message: row });
  return row;
}
