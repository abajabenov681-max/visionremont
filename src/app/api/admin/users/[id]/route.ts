import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

const schema = z.object({ blocked: z.boolean() });

export const PATCH = handleApi(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Некорректный запрос");
  await AdminService.setUserBlocked(session, id, body.data.blocked);
  return ok(null, body.data.blocked ? "Пользователь заблокирован" : "Пользователь разблокирован");
});
