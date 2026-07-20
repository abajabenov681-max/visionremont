import { handleApi, ok, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

export const DELETE = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  const { id } = await ctx.params;
  await AdminService.deleteReview(session, id);
  return ok(null, "Отзыв удалён");
});
