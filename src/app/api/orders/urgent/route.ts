import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as MatchingService from "@/services/MatchingService";

const schema = z.object({
  specialization_id: z.string().uuid(),
  description: z.string().min(5).max(1000),
  address: z.string().min(3).max(300),
});

/** «Аварийный вызов»: создаёт срочный заказ и рассылает его онлайн-мастерам через Realtime. */
export const POST = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Заполните описание проблемы и адрес");
  const result = await MatchingService.createUrgentOrder(session, body.data);
  return ok(result, "Ищем мастера", { status: 201 });
});
