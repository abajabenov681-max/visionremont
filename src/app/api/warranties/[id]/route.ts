import { handleApi, ok, requireUser } from "@/lib/api";
import * as WarrantyService from "@/services/WarrantyService";

export const GET = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  return ok(await WarrantyService.getWarrantyForUser(session, id));
});
