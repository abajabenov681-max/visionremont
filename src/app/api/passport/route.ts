import { handleApi, ok, requireUser } from "@/lib/api";
import * as PassportService from "@/services/PassportService";

/** Список адресов клиента с агрегированной историей ремонта. */
export const GET = handleApi(async () => {
  const session = await requireUser();
  const addresses = await PassportService.listAddresses(session);
  return ok(addresses);
});
