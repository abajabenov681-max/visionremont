import "server-only";
import { ApiError } from "@/lib/api";
import { DEFAULT_WARRANTY_MONTHS, ORDER_STATUSES, ROLES } from "@/lib/constants";
import * as EscrowService from "@/services/EscrowService";
import * as warranties from "@/repositories/warrantyRepository";
import * as orders from "@/repositories/orderRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { EscrowTransactionRow, WarrantyWithRelations } from "@/types/db";

/**
 * Подтверждение завершения клиентом. Транзакционно (RPC в БД):
 * заказ -> WARRANTY_ACTIVE, создаётся Warranty + Certificate, обновляется
 * статистика мастера. Затем Escrow Module переводит платёж мастеру
 * (release: комиссия F = O × 0.07, выплата M = O − F).
 */
export async function confirmCompletion(
  session: SessionUser,
  orderId: string,
  warrantyMonths: number = DEFAULT_WARRANTY_MONTHS
): Promise<{ warranty: WarrantyWithRelations; escrow: EscrowTransactionRow }> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new ApiError("Заказ не найден", 404);
  if (order.client_id !== session.id) throw new ApiError("Нет доступа", 403);
  if (order.status !== ORDER_STATUSES.WAIT_CONFIRMATION) {
    throw new ApiError("Заказ не ожидает подтверждения");
  }

  const warrantyId = await warranties.confirmCompletion(orderId, warrantyMonths);
  const warranty = await warranties.getWarranty(warrantyId);
  if (!warranty) throw new ApiError("Гарантия не создана", 500);

  // Escrow release: сумма — из резерва, иначе цена работы из сертификата
  const escrow = await EscrowService.release(orderId, Number(warranty.certificate?.total_price ?? 0));

  return { warranty, escrow };
}

export async function listMyWarranties(session: SessionUser): Promise<WarrantyWithRelations[]> {
  if (session.role === ROLES.CLIENT) return warranties.listWarranties({ clientId: session.id });
  if (session.role === ROLES.MASTER) {
    const master = await profiles.getMasterProfile(session.id);
    if (!master) return [];
    return warranties.listWarranties({ masterId: master.id });
  }
  return warranties.listWarranties({});
}

export async function getWarrantyForUser(session: SessionUser, id: string): Promise<WarrantyWithRelations> {
  const warranty = await warranties.getWarranty(id);
  if (!warranty) throw new ApiError("Гарантия не найдена", 404);
  if (session.role === ROLES.ADMIN) return warranty;
  if (session.role === ROLES.CLIENT && warranty.client_id === session.id) return warranty;
  if (session.role === ROLES.MASTER) {
    const master = await profiles.getMasterProfile(session.id);
    if (master && warranty.master_id === master.id) return warranty;
  }
  throw new ApiError("Нет доступа", 403);
}
