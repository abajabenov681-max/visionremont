import { handleApi, ok, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

export const GET = handleApi(async () => {
  await requireRole("ADMIN");
  return ok(await AdminService.listAllReviews());
});
