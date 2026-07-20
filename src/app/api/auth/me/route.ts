import { handleApi, ok, requireUser } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";

export const GET = handleApi(async () => {
  const session = await requireUser();
  const profile = await ProfileService.getMyProfile(session);
  return ok(profile);
});
