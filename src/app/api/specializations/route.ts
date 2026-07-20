import { handleApi, ok } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";

export const GET = handleApi(async () => {
  return ok(await ProfileService.listSpecializations());
});
