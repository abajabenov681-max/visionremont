import "server-only";
import { ApiError } from "@/lib/api";
import { ORDER_STATUSES, ROLES, channels, REALTIME_EVENTS } from "@/lib/constants";
import { broadcast } from "@/lib/supabase/realtime";
import * as EscrowService from "@/services/EscrowService";
import * as orders from "@/repositories/orderRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { OrderWithRelations } from "@/types/db";

/**
 * «Аварийный вызов»: создаёт заказ в статусе MATCHING и рассылает broadcast
 * всем онлайн-мастерам нужной специализации через Supabase Realtime.
 */
export async function createUrgentOrder(
  session: SessionUser,
  input: { specialization_id: string; description: string; address: string }
): Promise<{ order: OrderWithRelations; online_masters: number }> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Срочный вызов доступен только клиентам", 403);

  const spec = (await profiles.listSpecializations()).find((s) => s.id === input.specialization_id);
  if (!spec) throw new ApiError("Специализация не найдена", 404);

  const onlineMasters = await profiles.listOnlineMasterIds(input.specialization_id);

  const created = await orders.createOrder({
    client_id: session.id,
    specialization_id: input.specialization_id,
    title: `Аварийный вызов: ${spec.name.toLowerCase()}`,
    description: input.description,
    address: input.address,
    status: ORDER_STATUSES.MATCHING,
    is_urgent: true,
  });

  const order = (await orders.getOrder(created.id))!;

  // Канал специализации слушают все онлайн-мастера этой специализации
  await broadcast(channels.urgent(input.specialization_id), REALTIME_EVENTS.URGENT_NEW, {
    order: {
      id: order.id,
      title: order.title,
      description: order.description,
      address: order.address,
      specialization: spec.name,
      created_at: order.created_at,
    },
  });

  return { order, online_masters: onlineMasters.length };
}

/**
 * Атомарное принятие срочного заказа. Первый мастер побеждает:
 * UPDATE ... WHERE status = 'MATCHING' внутри функции БД гарантирует,
 * что конкурирующие запросы получат "уже принято".
 */
export async function acceptUrgent(session: SessionUser, orderId: string): Promise<OrderWithRelations> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Forbidden", 403);
  const master = await profiles.getMasterProfile(session.id);
  if (!master) throw new ApiError("Профиль мастера не найден", 404);

  const won = await orders.acceptUrgentAtomic(orderId, master.id);
  if (!won) throw new ApiError("Заказ уже принят другим мастером", 409);

  const order = (await orders.getOrder(orderId))!;

  // Escrow: резерв по срочному вызову (сумма фиксируется по бюджету, если задан)
  await EscrowService.reserve(orderId, order.budget != null ? Number(order.budget) : null);

  // 1) клиенту на экран «Ищем мастера…»
  await broadcast(channels.order(orderId), REALTIME_EVENTS.ORDER_ACCEPTED, {
    order_id: orderId,
    master: {
      id: master.id,
      full_name: master.full_name,
      rating: master.rating,
      trust_score: master.trust_score,
      avatar_url: master.avatar_url,
    },
  });
  // 2) остальным мастерам — скрыть карточку заявки
  await broadcast(channels.urgent(order.specialization_id), REALTIME_EVENTS.URGENT_TAKEN, {
    order_id: orderId,
  });

  return order;
}

/** Отмена срочного заказа клиентом, пока мастер не найден. */
export async function cancelUrgent(session: SessionUser, orderId: string): Promise<void> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id) throw new ApiError("Нет доступа", 403);
  if (order.status !== ORDER_STATUSES.MATCHING) throw new ApiError("Заказ уже принят мастером");
  await orders.updateOrder(orderId, {
    status: ORDER_STATUSES.CANCELLED,
    deleted_at: new Date().toISOString(),
  });
  await broadcast(channels.urgent(order.specialization_id), REALTIME_EVENTS.URGENT_TAKEN, {
    order_id: orderId,
  });
}

/** Активные (MATCHING) срочные заказы по специализациям мастера — для показа при входе в онлайн. */
export async function listActiveUrgent(session: SessionUser): Promise<OrderWithRelations[]> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Forbidden", 403);
  const master = await profiles.getMasterProfile(session.id);
  if (!master) return [];
  const specs = await profiles.getMasterSpecializations(master.id);
  if (specs.length === 0) return [];
  const all = await orders.listOrders({ status: ORDER_STATUSES.MATCHING, isUrgent: true });
  const specIds = new Set(specs.map((s) => s.id));
  return all.filter((o) => specIds.has(o.specialization_id));
}
