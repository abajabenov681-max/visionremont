import "server-only";
import { ApiError } from "@/lib/api";
import { DOCUMENT_STATUSES, ROLES } from "@/lib/constants";
import * as users from "@/repositories/userRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { ClientProfileRow, MasterPublic, SpecializationRow } from "@/types/db";

export interface MyProfile {
  user: { id: string; phone: string; role: string };
  client: ClientProfileRow | null;
  master: MasterPublic | null;
}

export async function getMyProfile(session: SessionUser): Promise<MyProfile> {
  const user = await users.findById(session.id);
  if (!user || user.deleted_at) throw new ApiError("Unauthorized", 401);

  if (user.role === ROLES.MASTER) {
    let master = await profiles.getMasterProfile(user.id);
    if (!master) master = await profiles.createMasterProfile(user.id);
    const specializations = await profiles.getMasterSpecializations(master.id);
    return {
      user: { id: user.id, phone: user.phone, role: user.role },
      client: null,
      master: { ...master, specializations },
    };
  }

  let client = await profiles.getClientProfile(user.id);
  if (!client && user.role === ROLES.CLIENT) client = await profiles.createClientProfile(user.id);
  return { user: { id: user.id, phone: user.phone, role: user.role }, client, master: null };
}

export async function updateMyProfile(
  session: SessionUser,
  patch: {
    full_name?: string;
    description?: string;
    avatar_url?: string;
    document_url?: string;
    specialization_ids?: string[];
  }
): Promise<MyProfile> {
  if (session.role === ROLES.MASTER) {
    const master = await profiles.getMasterProfile(session.id);
    if (!master) throw new ApiError("Профиль мастера не найден", 404);
    await profiles.updateMasterProfile(session.id, {
      ...(patch.full_name !== undefined && { full_name: patch.full_name }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.avatar_url !== undefined && { avatar_url: patch.avatar_url }),
      // новый/заменённый документ уходит на проверку администратору
      ...(patch.document_url !== undefined && {
        document_url: patch.document_url,
        document_status: DOCUMENT_STATUSES.PENDING,
        id_verified: false,
      }),
    });
    if (patch.specialization_ids) {
      await profiles.setMasterSpecializations(master.id, patch.specialization_ids);
    }
  } else {
    await profiles.updateClientProfile(session.id, {
      ...(patch.full_name !== undefined && { full_name: patch.full_name }),
      ...(patch.avatar_url !== undefined && { avatar_url: patch.avatar_url }),
    });
  }
  return getMyProfile(session);
}

export async function setOnlineStatus(session: SessionUser, isOnline: boolean): Promise<{ is_online: boolean }> {
  if (session.role !== ROLES.MASTER) throw new ApiError("Forbidden", 403);
  const updated = await profiles.updateMasterProfile(session.id, { is_online: isOnline });
  return { is_online: updated.is_online };
}

export async function listSpecializations(): Promise<SpecializationRow[]> {
  return profiles.listSpecializations();
}

export async function getMasterPublic(masterId: string): Promise<MasterPublic> {
  const master = await profiles.getMasterPublic(masterId);
  if (!master) throw new ApiError("Мастер не найден", 404);
  return master;
}

export async function listMasters(params: { specializationId?: string; search?: string }): Promise<MasterPublic[]> {
  return profiles.listMasters(params);
}
