import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

const schema = z.object({ verified: z.boolean() });

export const POST = handleApi(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Некорректный запрос");
  await AdminService.verifyMaster(session, id, body.data.verified);
  return ok(null, body.data.verified ? "Документы подтверждены" : "Подтверждение снято");
});
