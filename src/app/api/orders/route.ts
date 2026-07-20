import { z } from "zod";
import { handleApi, ok, fail, requireUser, requireRole } from "@/lib/api";
import * as OrderService from "@/services/OrderService";
import type { OrderStatus } from "@/lib/constants";

/**
 * GET /api/orders
 *  - scope=my (default): заказы текущего пользователя (клиент — свои, мастер — назначенные ему)
 *  - scope=feed: открытая лента для мастеров (фильтры specialization_id, search)
 */
export const GET = handleApi(async (req: Request) => {
  const session = await requireUser();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "my";

  if (scope === "feed") {
    if (session.role !== "MASTER" && session.role !== "ADMIN") return fail("Forbidden", 403);
    const orders = await OrderService.listFeed({
      specializationId: url.searchParams.get("specialization_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    return ok(orders);
  }

  const status = (url.searchParams.get("status") as OrderStatus | null) ?? undefined;
  const orders = await OrderService.listMyOrders(session, status);
  return ok(orders);
});

const createSchema = z.object({
  specialization_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(3000).optional(),
  budget: z.number().positive().optional(),
  address: z.string().min(3).max(300),
});

export const POST = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return fail("Проверьте поля заказа");
  const order = await OrderService.createOrder(session, body.data);
  return ok(order, "Заказ создан", { status: 201 });
});
