import { z } from "zod";
import { handleApi, ok, fail, requireUser } from "@/lib/api";
import * as ChatService from "@/services/ChatService";

type Ctx = { params: Promise<{ orderId: string }> };

export const GET = handleApi(async (_req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { orderId } = await ctx.params;
  return ok(await ChatService.listMessages(session, orderId));
});

const schema = z.object({ message: z.string().min(1).max(2000) });

export const POST = handleApi(async (req: Request, ctx: Ctx) => {
  const session = await requireUser();
  const { orderId } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Пустое сообщение");
  const message = await ChatService.sendMessage(session, orderId, body.data.message);
  return ok(message, undefined, { status: 201 });
});
