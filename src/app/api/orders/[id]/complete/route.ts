import { handleApi, ok, requireRole } from "@/lib/api";
import * as OrderService from "@/services/OrderService";

/** Мастер отмечает работу выполненной -> WAIT_CONFIRMATION. */
export const POST = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("MASTER");
  const { id } = await ctx.params;
  const order = await OrderService.markCompleted(session, id);
  return ok(order, "Работа отправлена на подтверждение клиенту");
});
