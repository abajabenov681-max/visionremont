import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";

const schema = z.object({ is_online: z.boolean() });

export const PATCH = handleApi(async (req: Request) => {
  const session = await requireRole("MASTER");
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Некорректный статус");
  const result = await ProfileService.setOnlineStatus(session, body.data.is_online);
  return ok(result, result.is_online ? "Вы на линии" : "Вы не на линии");
});
