import { z } from "zod";
import { handleApi, ok, fail, requireRole } from "@/lib/api";
import * as FavoriteService from "@/services/FavoriteService";

export const GET = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const url = new URL(req.url);
  if (url.searchParams.get("ids") === "true") {
    return ok(await FavoriteService.listMyFavoriteIds(session));
  }
  return ok(await FavoriteService.listMyFavorites(session));
});

const schema = z.object({ master_id: z.string().uuid() });

export const POST = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Не указан мастер");
  await FavoriteService.addFavorite(session, body.data.master_id);
  return ok(null, "Добавлено в избранное", { status: 201 });
});

export const DELETE = handleApi(async (req: Request) => {
  const session = await requireRole("CLIENT");
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("Не указан мастер");
  await FavoriteService.removeFavorite(session, body.data.master_id);
  return ok(null, "Удалено из избранного");
});
