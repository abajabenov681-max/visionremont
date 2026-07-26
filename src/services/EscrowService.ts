import "server-only";
import { ESCROW_STATUSES, PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import * as escrow from "@/repositories/escrowRepository";
import type { EscrowTransactionRow } from "@/types/db";

/**
 * Escrow Module (TVEP: «управление безопасными сделками»).
 *
 * Жизненный цикл сделки:
 *   reserve()  — при выборе мастера / принятии срочного вызова средства
 *                резервируются (симуляция вызова платёжного провайдера);
 *   release()  — после подтверждения работы клиентом платёж переводится
 *                мастеру: комиссия F = O × 0.07, выплата M = O − F.
 *
 * Реального платёжного вызова внутри нет — модуль меняет состояние сделки
 * в БД. Точка интеграции провайдера (Kaspi Pay и т.п.) — тела reserve/release,
 * интерфейс сервиса при подключении не изменится.
 */

export function computeSplit(amount: number): { commission: number; master_amount: number } {
  const commission = Math.round(amount * PLATFORM_COMMISSION_RATE * 100) / 100;
  return { commission, master_amount: Math.round((amount - commission) * 100) / 100 };
}

/**
 * Резервирование средств по заказу. amount = null для срочных вызовов,
 * где цена фиксируется по завершении работы.
 */
export async function reserve(orderId: string, amount: number | null): Promise<EscrowTransactionRow> {
  const existing = await escrow.findByOrder(orderId);
  if (existing) return existing;
  return escrow.create({ order_id: orderId, amount, status: ESCROW_STATUSES.RESERVED });
}

/**
 * Выплата мастеру после подтверждения клиентом. Сумма: зарезервированная,
 * иначе fallbackAmount (цена из сертификата гарантии).
 */
export async function release(orderId: string, fallbackAmount: number): Promise<EscrowTransactionRow> {
  const existing = await escrow.findByOrder(orderId);
  const amount = Number(existing?.amount ?? fallbackAmount) || 0;
  const { commission, master_amount } = computeSplit(amount);
  const patch = {
    amount,
    commission,
    master_amount,
    status: ESCROW_STATUSES.RELEASED,
    released_at: new Date().toISOString(),
  };

  if (existing) {
    if (existing.status === ESCROW_STATUSES.RELEASED) return existing;
    return escrow.update(existing.id, patch);
  }
  // Заказ, стартовавший до включения эскроу: фиксируем выплату сразу
  const created = await escrow.create({ order_id: orderId, amount, status: ESCROW_STATUSES.RESERVED });
  return escrow.update(created.id, patch);
}

export async function getForOrder(orderId: string): Promise<EscrowTransactionRow | null> {
  return escrow.findByOrder(orderId);
}
