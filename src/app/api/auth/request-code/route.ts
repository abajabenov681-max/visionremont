import { z } from "zod";
import { handleApi, ok, fail } from "@/lib/api";
import * as AuthService from "@/services/AuthService";

const schema = z.object({ phone: z.string().min(10) });

export const POST = handleApi(async (req: Request) => {
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Укажите номер телефона");
  const result = await AuthService.requestCode(body.data.phone);
  return ok(result, result.devCode ? `Demo-режим: код ${result.devCode}` : "Код отправлен по SMS");
});
