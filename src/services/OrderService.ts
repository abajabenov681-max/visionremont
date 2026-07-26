import "server-only";
import { ApiError } from "@/lib/api";
import {
  ORDER_STATUSES,
  ROLES,
  channels,
  REALTIME_EVENTS,
  type ImageType,
  type OrderStatus,
} from "@/lib/constants";
import { broadcast } from "@/lib/supabase/realtime";
import * as EscrowService from "@/services/EscrowService";
import * as orders from "@/repositories/orderRepository";
import * as applicationsRepo from "@/repositories/applicationRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { ApplicationWithRelations, OrderWithRelations } from "@/types/db";

export async function createOrder(
  session: SessionUser,
  input: {
    specialization_id: string;
    title: string;
    description?: string;
    budget?: number;
    address: string;
  }
): Promise<OrderWithRelations> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Создавать заказы может только клиент", 403);
  const order = await orders.createOrder({
    client_id: session.id,
    ...input,
    status: ORDER_STATUSES.WAITING,
    is_urgent: false,
  });
  return (await orders.getOrder(order.id))!;
}

export async function getOrderForUser(session: SessionUser, orderId: string): Promise<OrderWithRelations> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  await assertOrderAccess(session, order);
  return order;
}

async function assertOrderAccess(session: SessionUser, order: OrderWithRelations): Promise<void> {
  if (session.role === ROLES.ADMIN) return;
  if (session.role === ROLES.CLIENT) {
    if (order.client_id !== session.id) throw new ApiError("Нет доступа к заказу", 403);
    return;
  }
  // мастер: свои назначенные + открытая лента
  const master = await profiles.getMasterProfile(session.id);
  const isMine = master && order.selected_master === master.id;
  const isOpen = order.status === ORDER_STATUSES.WAITING || order.status === ORDER_STATUSES.MATCHING;
  if (!isMine && !isOpen) throw new ApiError("Нет доступа к заказу", 403);
}

export async function listMyOrders(session: SessionUser, status?: OrderStatus): Promise<OrderWithRelations[]> {
  if (session.role === ROLES.CLIENT) {
    return orders.listOrders({ clientId: session.id, status });
  }
  if (session.role === ROLES.MASTER) {
    const master = await profiles.getMasterProfile(session.id);
    if (!master) return [];
    return orders.listOrders({ selectedMaster: master.id, status });
  }
  return orders.listOrders({ status });
}

/** Публичная лента для мастеров: открытые несрочные заказы, с фильтрами. */
export async function listFeed(params: {
  specializationId?: string;
  search?: string;
}): Promise<OrderWithRelations[]> {
  return orders.listOrders({
    status: ORDER_STATUSES.WAITING,
    isUrgent: false,
    specializationId: params.specializationId,
    search: params.search,
  });
}

export async function updateOrder(
  session: SessionUser,
  orderId: string,
  patch: { title?: string; description?: string; budget?: number; address?: string }
): Promise<OrderWithRelations> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id && session.role !== ROLES.ADMIN) throw new ApiError("Нет доступа", 403);
  if (order.status !== ORDER_STATUSES.WAITING && session.role !== ROLES.ADMIN) {
    throw new ApiError("Редактировать можно только заказ в ожидании откликов");
  }
  await orders.updateOrder(orderId, patch);
  return (await orders.getOrder(orderId))!;
}

export async function softDeleteOrder(session: SessionUser, orderId: string): Promise<void> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id && session.role !== ROLES.ADMIN) throw new ApiError("Нет доступа", 403);
  if (
    order.status !== ORDER_STATUSES.WAITING &&
    order.status !== ORDER_STATUSES.MATCHING &&
    session.role !== ROLES.ADMIN
  ) {
    throw new ApiError("Нельзя удалить заказ в работе");
  }
  await orders.updateOrder(orderId, {
    deleted_at: new Date().toISOString(),
    status: ORDER_STATUSES.CANCELLED,
  });
}

/* ---------- отклики ---------- */

export async function applyToOrder(
  session: SessionUser,
  orderId: string,
  input: { price: number; estimated_days: number; comment?: string }
): Promise<ApplicationWithRelations[]> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Откликаться могут только мастера", 403);
  const master = await profiles.getMasterProfile(session.id);
  if (!master) throw new ApiError("Профиль мастера не найден", 404);

  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.status !== ORDER_STATUSES.WAITING || order.is_urgent) {
    throw new ApiError("Заказ не принимает отклики");
  }
  const existing = await applicationsRepo.findByOrderAndMaster(orderId, master.id);
  if (existing) throw new ApiError("Вы уже откликнулись на этот заказ");

  await applicationsRepo.createApplication({
    order_id: orderId,
    master_id: master.id,
    price: input.price,
    estimated_days: input.estimated_days,
    comment: input.comment ?? null,
  });
  return applicationsRepo.listByOrder(orderId);
}

export async function listApplications(session: SessionUser, orderId: string): Promise<ApplicationWithRelations[]> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  await assertOrderAccess(session, order);
  return applicationsRepo.listByOrder(orderId);
}

export async function listMyApplications(session: SessionUser): Promise<ApplicationWithRelations[]> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Forbidden", 403);
  const master = await profiles.getMasterProfile(session.id);
  if (!master) return [];
  return applicationsRepo.listByMaster(master.id);
}

export async function selectMaster(
  session: SessionUser,
  orderId: string,
  applicationId: string
): Promise<OrderWithRelations> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id) throw new ApiError("Нет доступа", 403);
  if (order.status !== ORDER_STATUSES.WAITING) throw new ApiError("Мастер уже выбран");

  const apps = await applicationsRepo.listByOrder(orderId);
  const app = apps.find((a) => a.id === applicationId);
  if (!app) throw new ApiError("Отклик не найден", 404);

  await orders.updateOrder(orderId, {
    status: ORDER_STATUSES.IN_PROGRESS,
    selected_master: app.master_id,
  });
  // Escrow: резервируем сумму принятого отклика до подтверждения работы
  await EscrowService.reserve(orderId, Number(app.price));
  // уведомляем участников заказа (мастер увидит, что его выбрали)
  await broadcast(channels.order(orderId), REALTIME_EVENTS.ORDER_ACCEPTED, {
    order_id: orderId,
    master_id: app.master_id,
  });
  return (await orders.getOrder(orderId))!;
}

/* ---------- завершение работы ---------- */

export async function addImage(
  session: SessionUser,
  orderId: string,
  imageUrl: string,
  type: ImageType
): Promise<void> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  await assertOrderAccess(session, order);
  await orders.addOrderImage(orderId, imageUrl, type);
}

/** Мастер отмечает работу выполненной (фото «после» уже загружены) -> WAIT_CONFIRMATION. */
export async function markCompleted(session: SessionUser, orderId: string): Promise<OrderWithRelations> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Forbidden", 403);
  const master = await profiles.getMasterProfile(session.id);
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (!master || order.selected_master !== master.id) throw new ApiError("Нет доступа", 403);
  if (order.status !== ORDER_STATUSES.IN_PROGRESS) throw new ApiError("Заказ не в работе");
  const hasAfterPhoto = order.images.some((i) => i.type === "AFTER");
  if (!hasAfterPhoto) throw new ApiError("Сначала загрузите фото выполненной работы");

  await orders.updateOrder(orderId, { status: ORDER_STATUSES.WAIT_CONFIRMATION });
  return (await orders.getOrder(orderId))!;
}
