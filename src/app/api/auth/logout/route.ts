import { handleApi, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/session";

export const POST = handleApi(async () => {
  await clearSessionCookie();
  return ok(null, "Вы вышли из аккаунта");
});
