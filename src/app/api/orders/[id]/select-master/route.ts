import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as OrderService from "@/services/OrderService";

const schema = z.object({ application_id: z.string().uuid() });

export const POST = handleApi(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("CLIENT");
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Не указан отклик");
  const order = await OrderService.selectMaster(session, id, body.data.application_id);
  return ok(order, "Мастер выбран, чат открыт");
});
