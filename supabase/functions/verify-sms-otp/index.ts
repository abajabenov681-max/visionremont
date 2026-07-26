// Supabase Edge Function: verify-sms-otp
// Проверяет код из otp_codes (TTL, максимум 3 попытки), при совпадении
// создаёт/подтверждает пользователя в Supabase Auth через admin API.

import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 3;

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

  const { phone: rawPhone, code } = await req.json().catch(() => ({}));
  if (!rawPhone || !code) return json({ error: "Укажите телефон и код" }, 400);

  const phone = normalizePhone(String(rawPhone));

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: otp } = await db
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return json({ error: "Сначала запросите код подтверждения" }, 400);
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return json({ error: "Код истёк. Запросите новый" }, 400);
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return json({ error: "Превышен лимит попыток. Запросите новый код" }, 429);
  }
  if (String(code) !== otp.code) {
    await db.from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    const left = MAX_ATTEMPTS - otp.attempts - 1;
    return json(
      { error: left > 0 ? `Неверный код. Осталось попыток: ${left}` : "Неверный код. Запросите новый" },
      400
    );
  }

  await db.from("otp_codes").delete().eq("phone", phone);

  // Пользователь подтвердил владение номером -> регистрируем в Supabase Auth
  const { data: created, error: createError } = await db.auth.admin.createUser({
    phone,
    phone_confirm: true,
  });

  // "already registered" — не ошибка, телефон уже в Auth
  const userId = created?.user?.id ?? null;
  if (createError && !/already/i.test(createError.message)) {
    return json({ verified: true, phone, auth_synced: false });
  }

  return json({ verified: true, phone, auth_synced: true, user_id: userId });
});
