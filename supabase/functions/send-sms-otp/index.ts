// Supabase Edge Function: send-sms-otp
// Генерирует 4-значный код, сохраняет в otp_codes (TTL 5 минут),
// отправляет SMS через Mobizon. Лимит: 1 отправка в 60 секунд на номер.
// Fallback: DEMO_PHONE_NUMBER или отсутствие MOBIZON_API_KEY -> код 1234 без SMS.

import { createClient } from "npm:@supabase/supabase-js@2";

const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const FALLBACK_CODE = "1234";
const MOBIZON_API_URL = "https://api.mobizon.kz/service/message/sendsmsmessage";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { phone: rawPhone } = await req.json().catch(() => ({}));
  if (!rawPhone) return json({ error: "Укажите номер телефона" }, 400);

  const phone = normalizePhone(String(rawPhone));
  if (!/^\+\d{10,15}$/.test(phone)) return json({ error: "Некорректный номер телефона" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Рейт-лимит: 1 отправка в 60 секунд
  const { data: last } = await db
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      return json({ error: `Код уже отправлен. Повторная отправка через ${wait} с` }, 429);
    }
  }

  const apiKey = Deno.env.get("MOBIZON_API_KEY");
  const demoPhone = Deno.env.get("DEMO_PHONE_NUMBER");
  const useFallback = (demoPhone && normalizePhone(demoPhone) === phone) || !apiKey;

  const code = useFallback ? FALLBACK_CODE : String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  await db.from("otp_codes").delete().eq("phone", phone);
  const { error: insertError } = await db.from("otp_codes").insert({ phone, code, expires_at: expiresAt });
  if (insertError) return json({ error: "Не удалось сохранить код" }, 500);

  if (!useFallback) {
    const params = new URLSearchParams({
      apiKey: apiKey!,
      recipient: phone.replace(/^\+/, ""),
      text: `RepairLink: код подтверждения ${code}. Действует ${OTP_TTL_MINUTES} минут.`,
    });
    const res = await fetch(`${MOBIZON_API_URL}?${params}`, { method: "POST" });
    const body = await res.json().catch(() => ({ code: -1 }));
    if (!res.ok || body.code !== 0) return json({ error: "Не удалось отправить SMS" }, 502);
    return json({ phone, sent: true });
  }

  return json({ phone, sent: true, devCode: code });
});
