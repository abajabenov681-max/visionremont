import { handleApi, ok, requireRole } from "@/lib/api";
import * as MatchingService from "@/services/MatchingService";

/** Клиент отменяет поиск мастера, пока заказ в статусе MATCHING. */
export const POST = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("CLIENT");
  const { id } = await ctx.params;
  await MatchingService.cancelUrgent(session, id);
  return ok(null, "Поиск отменён");
});
