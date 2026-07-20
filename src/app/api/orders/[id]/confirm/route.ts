import { handleApi, ok, requireRole } from "@/lib/api";
import * as WarrantyService from "@/services/WarrantyService";

/** Клиент подтверждает завершение -> WARRANTY_ACTIVE + Warranty + Certificate. */
export const POST = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("CLIENT");
  const { id } = await ctx.params;
  const warranty = await WarrantyService.confirmCompletion(session, id);
  return ok(warranty, "Работа подтверждена, гарантия активирована");
});
