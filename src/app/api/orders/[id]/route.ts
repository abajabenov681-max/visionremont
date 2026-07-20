import { z } from "zod";
import { handleApi, ok, fail, requireUser } from "@/lib/api";
import * as OrderService from "@/services/OrderService";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleApi(async (_req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  return ok(await OrderService.getOrderForUser(session, id));
});

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(3000).optional(),
  budget: z.number().positive().optional(),
  address: z.string().min(3).max(300).optional(),
});

export const PATCH = handleApi(async (req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return fail("Некорректные данные");
  return ok(await OrderService.updateOrder(session, id, body.data), "Заказ обновлён");
});

export const DELETE = handleApi(async (_req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  await OrderService.softDeleteOrder(session, id);
  return ok(null, "Заказ удалён");
});
