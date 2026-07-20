import "server-only";
import { ApiError } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { ROLES, type Role } from "@/lib/constants";
import * as users from "@/repositories/userRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";

/**
 * Dev-режим SMS: код не отправляется, принимается фиксированный DEV_SMS_CODE.
 * Точка расширения: подключить SMS-провайдера в requestCode и хранить коды
 * (например, в таблице otp_codes с TTL) — интерфейс сервиса не изменится.
 */
export async function requestCode(rawPhone: string): Promise<{ phone: string; devCode?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{10,15}$/.test(phone)) throw new ApiError("Некорректный номер телефона");
  const isDev = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_MODE === "true";
  return { phone, devCode: isDev ? process.env.DEV_SMS_CODE ?? "1234" : undefined };
}

export async function verifyCode(input: {
  phone: string;
  code: string;
  role?: Role;
}): Promise<{ user: SessionUser; isNew: boolean }> {
  const phone = normalizePhone(input.phone);
  const expected = process.env.DEV_SMS_CODE ?? "1234";
  if (input.code !== expected) throw new ApiError("Неверный код подтверждения");

  let user = await users.findByPhone(phone);
  let isNew = false;

  if (user?.deleted_at) throw new ApiError("Аккаунт заблокирован", 403);

  if (!user) {
    const role = input.role === ROLES.MASTER ? ROLES.MASTER : ROLES.CLIENT;
    user = await users.createUser(phone, role);
    if (role === ROLES.MASTER) await profiles.createMasterProfile(user.id);
    else await profiles.createClientProfile(user.id);
    isNew = true;
  }

  return { user: { id: user.id, phone: user.phone, role: user.role }, isNew };
}
