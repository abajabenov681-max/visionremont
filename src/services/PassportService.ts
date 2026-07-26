import "server-only";
import { ApiError } from "@/lib/api";
import { ORDER_STATUSES, ROLES } from "@/lib/constants";
import * as orders from "@/repositories/orderRepository";
import * as warranties from "@/repositories/warrantyRepository";
import type { SessionUser } from "@/types/api";
import type { OrderWithRelations, WarrantyWithRelations } from "@/types/db";

/**
 * Паспорт ремонта квартиры — долгосрочная история ремонта (product moat из TVEP).
 * Группирует завершённые заказы с гарантиями по адресу. Нормализация адреса
 * на MVP — trim + схлопывание пробелов, сопоставление без учёта регистра.
 */

export interface PassportAddress {
  address: string;
  works_count: number;
  total_spent: number;
  active_warranties: number;
  last_work_at: string;
}

export interface PassportEntry {
  order: OrderWithRelations;
  warranty: WarrantyWithRelations | null;
  price: number;
  warranty_active: boolean;
}

export interface PassportDetail {
  address: string;
  entries: PassportEntry[];
  works_count: number;
  total_spent: number;
  active_warranties: number;
}

const DONE_STATUSES = [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.WARRANTY_ACTIVE];

export function normalizeAddress(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function addressKey(raw: string): string {
  return normalizeAddress(raw).toLowerCase();
}

async function loadCompleted(session: SessionUser): Promise<{
  done: OrderWithRelations[];
  warrantyByOrder: Map<string, WarrantyWithRelations>;
}> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Паспорт ремонта доступен клиентам", 403);
  const [done, myWarranties] = await Promise.all([
    orders.listOrders({ clientId: session.id, status: DONE_STATUSES }),
    warranties.listWarranties({ clientId: session.id }),
  ]);
  const warrantyByOrder = new Map(myWarranties.map((w) => [w.order_id, w]));
  return { done, warrantyByOrder };
}

function entryPrice(order: OrderWithRelations, warranty: WarrantyWithRelations | null): number {
  return Number(warranty?.certificate?.total_price ?? order.budget ?? 0);
}

export async function listAddresses(session: SessionUser): Promise<PassportAddress[]> {
  const { done, warrantyByOrder } = await loadCompleted(session);

  const groups = new Map<string, PassportAddress>();
  for (const order of done) {
    const key = addressKey(order.address);
    const warranty = warrantyByOrder.get(order.id) ?? null;
    const existing = groups.get(key);
    const price = entryPrice(order, warranty);
    const isActive = Boolean(warranty && new Date(warranty.expires_at).getTime() > Date.now());

    if (!existing) {
      groups.set(key, {
        address: normalizeAddress(order.address),
        works_count: 1,
        total_spent: price,
        active_warranties: isActive ? 1 : 0,
        last_work_at: order.created_at,
      });
    } else {
      existing.works_count += 1;
      existing.total_spent += price;
      if (isActive) existing.active_warranties += 1;
      if (order.created_at > existing.last_work_at) existing.last_work_at = order.created_at;
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.last_work_at.localeCompare(a.last_work_at));
}

export async function getPassport(session: SessionUser, rawAddress: string): Promise<PassportDetail> {
  const { done, warrantyByOrder } = await loadCompleted(session);
  const key = addressKey(rawAddress);

  const matched = done
    .filter((o) => addressKey(o.address) === key)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (matched.length === 0) throw new ApiError("По этому адресу нет завершённых работ", 404);

  const entries: PassportEntry[] = matched.map((order) => {
    const warranty = warrantyByOrder.get(order.id) ?? null;
    return {
      order,
      warranty,
      price: entryPrice(order, warranty),
      warranty_active: Boolean(warranty && new Date(warranty.expires_at).getTime() > Date.now()),
    };
  });

  return {
    address: normalizeAddress(matched[0].address),
    entries,
    works_count: entries.length,
    total_spent: entries.reduce((sum, e) => sum + e.price, 0),
    active_warranties: entries.filter((e) => e.warranty_active).length,
  };
}
