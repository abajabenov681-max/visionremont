import { z } from "zod";
import { handleApi, ok, fail, requireUser } from "@/lib/api";
import * as ProfileService from "@/services/ProfileService";

export const GET = handleApi(async () => {
  const session = await requireUser();
  return ok(await ProfileService.getMyProfile(session));
});

const patchSchema = z.object({
  full_name: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  avatar_url: z.string().url().optional(),
  document_url: z.string().url().optional(),
  specialization_ids: z.array(z.string().uuid()).optional(),
});

export const PATCH = handleApi(async (req: Request) => {
  const session = await requireUser();
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return fail("Некорректные данные профиля");
  const profile = await ProfileService.updateMyProfile(session, body.data);
  return ok(profile, "Профиль обновлён");
});
