import "server-only";
import { ApiError } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { sendSms, isSmsProviderConfigured } from "@/lib/sms";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  ROLES,
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  type Role,
} from "@/lib/constants";
import * as otpCodes from "@/repositories/otpRepository";
import * as users from "@/repositories/userRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";

/**
 * SMS OTP аутентификация: 4-значный код с TTL 5 минут (таблица otp_codes),
 * отправка через Mobizon, лимиты: 1 отправка в 60 секунд, 3 попытки ввода.
 *
 * Fallback для демо-надёжности: если номер равен DEMO_PHONE_NUMBER или
 * SMS-провайдер не сконфигурирован, используется фиксированный код 1234
 * без реальной отправки — страховка от проблем мобильной сети на демо.
 */

const FALLBACK_CODE = process.env.DEV_SMS_CODE ?? "1234";

function isDemoPhone(phone: string): boolean {
  const demo = process.env.DEMO_PHONE_NUMBER;
  return Boolean(demo && normalizePhone(demo) === phone);
}

export async function requestCode(rawPhone: string): Promise<{ phone: string; devCode?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{10,15}$/.test(phone)) throw new ApiError("Некорректный номер телефона");

  // Рейт-лимит: не чаще 1 отправки в 60 секунд на номер
  const last = await otpCodes.findLatestByPhone(phone);
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed);
      throw new ApiError(`Код уже отправлен. Повторная отправка через ${wait} с`, 429);
    }
  }

  const useFallback = isDemoPhone(phone) || !isSmsProviderConfigured();
  const code = useFallback ? FALLBACK_CODE : String(Math.floor(1000 + Math.random() * 9000));

  await otpCodes.deleteByPhone(phone);
  await otpCodes.createCode(phone, code, OTP_TTL_MINUTES);

  if (!useFallback) {
    await sendSms(phone, `RepairLink: код подтверждения ${code}. Действует ${OTP_TTL_MINUTES} минут.`);
    return { phone };
  }

  // Demo-режим: код не отправляется по SMS, возвращаем его для автоподстановки
  return { phone, devCode: code };
}

export async function verifyCode(input: {
  phone: string;
  code: string;
  role?: Role;
}): Promise<{ user: SessionUser; isNew: boolean }> {
  const phone = normalizePhone(input.phone);

  const otp = await otpCodes.findLatestByPhone(phone);
  if (!otp) throw new ApiError("Сначала запросите код подтверждения");
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    throw new ApiError("Код истёк. Запросите новый");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError("Превышен лимит попыток. Запросите новый код", 429);
  }
  if (input.code !== otp.code) {
    await otpCodes.incrementAttempts(otp.id, otp.attempts);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw new ApiError(left > 0 ? `Неверный код. Осталось попыток: ${left}` : "Неверный код. Запросите новый");
  }

  await otpCodes.deleteByPhone(phone);

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

  // Регистрируем пользователя в Supabase Auth (телефон подтверждён по OTP).
  // Best-effort: сессия приложения выдаётся своим JWT, реестр — в Supabase Auth.
  await ensureSupabaseAuthUser(phone);

  return { user: { id: user.id, phone: user.phone, role: user.role }, isNew };
}

async function ensureSupabaseAuthUser(phone: string): Promise<void> {
  try {
    await getAdminClient().auth.admin.createUser({ phone, phone_confirm: true });
  } catch {
    // пользователь уже существует или Auth недоступен — не блокируем вход
  }
}
