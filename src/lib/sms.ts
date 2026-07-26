import "server-only";

/**
 * Отправка SMS через Mobizon (mobizon.kz) — провайдер для казахстанских номеров.
 * API: https://help.mobizon.kz/help/api-docs/sms-api
 *
 * Если MOBIZON_API_KEY не задан, провайдер считается неактивным —
 * вызывающий код переходит в demo-режим (код 1234 без реальной отправки).
 */

const MOBIZON_API_URL = "https://api.mobizon.kz/service/message/sendsmsmessage";

export function isSmsProviderConfigured(): boolean {
  return Boolean(process.env.MOBIZON_API_KEY);
}

export async function sendSms(phone: string, text: string): Promise<void> {
  const apiKey = process.env.MOBIZON_API_KEY;
  if (!apiKey) throw new Error("SMS provider is not configured (MOBIZON_API_KEY)");

  const params = new URLSearchParams({
    apiKey,
    recipient: phone.replace(/^\+/, ""), // Mobizon принимает номер без "+"
    text,
  });

  const res = await fetch(`${MOBIZON_API_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) throw new Error(`SMS provider HTTP ${res.status}`);

  const body = (await res.json()) as { code: number; message?: string };
  // Mobizon: code 0 — успех, остальное — ошибка API
  if (body.code !== 0) throw new Error(`SMS provider error: ${body.message ?? body.code}`);
}
