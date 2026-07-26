import { handleApi, ok, requireUser } from "@/lib/api";
import * as PassportService from "@/services/PassportService";

/** Хронология всех выполненных работ по адресу (паспорт ремонта). */
export const GET = handleApi(async (_req: Request, ctx: { params: Promise<{ address: string }> }) => {
  const session = await requireUser();
  const { address } = await ctx.params;
  const passport = await PassportService.getPassport(session, decodeURIComponent(address));
  return ok(passport);
});
