import { handleApi, ok, requireRole } from "@/lib/api";
import * as MatchingService from "@/services/MatchingService";

/** Активные срочные заявки по специализациям мастера (для подхвата при входе в онлайн). */
export const GET = handleApi(async () => {
  const session = await requireRole("MASTER");
  return ok(await MatchingService.listActiveUrgent(session));
});
