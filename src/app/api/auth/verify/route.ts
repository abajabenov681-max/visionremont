import { z } from "zod";
import { handleApi, ok, fail } from "@/lib/api";
import { setSessionCookie } from "@/lib/session";
import * as AuthService from "@/services/AuthService";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().min(4).max(6),
  role: z.enum(["CLIENT", "MASTER"]).optional(),
});

export const POST = handleApi(async (req: Request) => {
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Проверьте телефон и код");
  const { user, isNew } = await AuthService.verifyCode(body.data);
  await setSessionCookie(user);
  return ok({ user, isNew }, isNew ? "Аккаунт создан" : "С возвращением!");
});
