import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as AdminService from "@/services/AdminService";

const schema = z.object({ status: z.enum(["VERIFIED", "REJECTED", "PENDING"]) });

const MESSAGES = {
  VERIFIED: "Документы подтверждены",
  REJECTED: "Документы отклонены",
  PENDING: "Документы возвращены на проверку",
} as const;

export const POST = handleApi(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Некорректный запрос");
  await AdminService.setDocumentStatus(session, id, body.data.status);
  return ok(null, MESSAGES[body.data.status]);
});
