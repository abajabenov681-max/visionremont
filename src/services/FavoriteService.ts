import "server-only";
import { ApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import * as favorites from "@/repositories/favoriteRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { MasterPublic } from "@/types/db";

export async function listMyFavorites(session: SessionUser): Promise<MasterPublic[]> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Forbidden", 403);
  return favorites.listFavorites(session.id);
}

export async function listMyFavoriteIds(session: SessionUser): Promise<string[]> {
  if (session.role !== ROLES.CLIENT) return [];
  return favorites.listFavoriteIds(session.id);
}

export async function addFavorite(session: SessionUser, masterId: string): Promise<void> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Forbidden", 403);
  const master = await profiles.getMasterProfileById(masterId);
  if (!master) throw new ApiError("Мастер не найден", 404);
  await favorites.addFavorite(session.id, masterId);
}

export async function removeFavorite(session: SessionUser, masterId: string): Promise<void> {
  if (session.role !== ROLES.CLIENT) throw new ApiError("Forbidden", 403);
  await favorites.removeFavorite(session.id, masterId);
}
