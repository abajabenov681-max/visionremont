import { handleApi, ok, requireUser } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";

export const GET = handleApi(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const masters = await ProfileService.listMasters({
    specializationId: url.searchParams.get("specialization_id") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
  return ok(masters);
});
