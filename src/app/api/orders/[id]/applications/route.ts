import { z } from "zod";
import { handleApi, ok, fail, requireUser, requireRole } from "@/lib/api";
import * as OrderService from "@/services/OrderService";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleApi(async (_req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  return ok(await OrderService.listApplications(session, id));
});

const applySchema = z.object({
  price: z.number().positive(),
  estimated_days: z.number().int().positive().max(365),
  comment: z.string().max(1000).optional(),
});

export const POST = handleApi(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("MASTER");
  const { id } = await ctx.params;
  const body = applySchema.safeParse(await req.json());
  if (!body.success) return fail("Укажите цену и срок");
  const applications = await OrderService.applyToOrder(session, id, body.data);
  return ok(applications, "Отклик отправлен", { status: 201 });
});
