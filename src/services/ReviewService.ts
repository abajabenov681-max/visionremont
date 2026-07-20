import "server-only";
import { ApiError } from "@/lib/api";
import { ORDER_STATUSES, ROLES } from "@/lib/constants";
import * as reviews from "@/repositories/reviewRepository";
import * as orders from "@/repositories/orderRepository";
import type { SessionUser } from "@/types/api";
import type { ReviewRow, ReviewWithRelations } from "@/types/db";

export async function createReview(
  session: SessionUser,
  input: { order_id: string; rating: number; comment?: string }
): Promise<ReviewRow> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Отзывы оставляют клиенты", 403);
  const order = await orders.getOrder(input.order_id);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id) throw new ApiError("Нет доступа", 403);
  if (!order.selected_master) throw new ApiError("По заказу не назначен мастер");
  if (order.status !== ORDER_STATUSES.COMPLETED && order.status !== ORDER_STATUSES.WARRANTY_ACTIVE) {
    throw new ApiError("Отзыв можно оставить после завершения работы");
  }
  const existing = await reviews.findByOrder(input.order_id);
  if (existing) throw new ApiError("Отзыв по этому заказу уже оставлен");

  const review = await reviews.createReview({
    order_id: input.order_id,
    client_id: session.id,
    master_id: order.selected_master,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  // Пересчёт рейтинга и Trust Score мастера
  await reviews.recalcMasterStats(order.selected_master);
  return review;
}

export async function listByMaster(masterId: string): Promise<ReviewWithRelations[]> {
  return reviews.listByMaster(masterId);
}

export async function findByOrder(orderId: string): Promise<ReviewRow | null> {
  return reviews.findByOrder(orderId);
}
