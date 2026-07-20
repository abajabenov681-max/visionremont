import { handleApi, ok, requireUser } from "@/lib/api";
import * as WarrantyService from "@/services/WarrantyService";

export const GET = handleApi(async () => {
  const session = await requireUser();
  return ok(await WarrantyService.listMyWarranties(session));
});
