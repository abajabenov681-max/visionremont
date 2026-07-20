import { z } from "zod";
import { handleApi, ok, fail, requireUser, requireRole } from "@/lib/api";
import * as ReviewService from "@/services/ReviewService";

export const GET = handleApi(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const masterId = url.searchParams.get("master_id");
  const orderId = url.searchParams.get("order_id");
  if (orderId) return ok(await ReviewService.findByOrder(orderId));
  if (!masterId) return fail("Укажите master_id или order_id");
  return ok(await ReviewService.listByMaster(masterId));
});

const schema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const POST = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Поставьте оценку от 1 до 5");
  const review = await ReviewService.createReview(session, body.data);
  return ok(review, "Спасибо за отзыв!", { status: 201 });
});
