import { handleApi, ok, requireRole } from "@/lib/api";
import * as WarrantyService from "@/services/WarrantyService";

/**
 * Клиент подтверждает завершение -> WARRANTY_ACTIVE + Warranty + Certificate,
 * Escrow Module переводит платёж мастеру (release с формулами F = O × 0.07).
 */
export const POST = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("CLIENT");
  const { id } = await ctx.params;
  const result = await WarrantyService.confirmCompletion(session, id);
  return ok(result, "Работа подтверждена, гарантия активирована");
});
