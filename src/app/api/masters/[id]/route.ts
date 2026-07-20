import { handleApi, ok, requireUser } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";
import * as ReviewService from "@/services/ReviewService";

export const GET = handleApi(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const [master, reviews] = await Promise.all([
    ProfileService.getMasterPublic(id),
    ReviewService.listByMaster(id),
  ]);
  return ok({ master, reviews });
});
