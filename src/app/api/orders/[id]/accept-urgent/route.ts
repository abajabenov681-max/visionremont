import { handleApi, ok, requireRole } from "@/lib/api";
import * as MatchingService from "@/services/MatchingService";

/**
 * Атомарное принятие срочного заказа мастером.
 * Первый победивший получает заказ, остальные — 409 "уже принято".
 */
export const POST = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("MASTER");
  const { id } = await ctx.params;
  const order = await MatchingService.acceptUrgent(session, id);
  return ok(order, "Заказ принят! Свяжитесь с клиентом в чате.");
});
