import { handleApi, ok, requireRole } from "@/lib/api";
import * as OrderService from "@/services/OrderService";

/** Отклики текущего мастера. */
export const GET = handleApi(async () => {
  const session = await requireRole("MASTER");
  return ok(await OrderService.listMyApplications(session));
});
