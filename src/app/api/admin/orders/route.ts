import { handleApi, ok, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

export const GET = handleApi(async (req: Request) => {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  return ok(
    await AdminService.listAllOrders({
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    })
  );
});
