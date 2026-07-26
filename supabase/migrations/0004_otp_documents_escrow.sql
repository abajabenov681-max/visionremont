-- ==========================================================================
-- Финал хакатона: SMS OTP, статусы проверки документов, Escrow Module
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. OTP-коды для SMS-аутентификации (TTL 5 минут, лимит попыток)
--    Доступ только для service_role (RLS включён, политик нет) — коды
--    никогда не читаются клиентом напрямую.
-- --------------------------------------------------------------------------
create table public.otp_codes (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  code       text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_otp_codes_phone on public.otp_codes (phone, created_at desc);

alter table public.otp_codes enable row level security;

-- --------------------------------------------------------------------------
-- 2. Статус проверки документов мастера администратором
--    NONE -> PENDING (после загрузки) -> VERIFIED | REJECTED (решение админа)
-- --------------------------------------------------------------------------
alter table public.master_profiles
  add column document_status text not null default 'NONE'
  check (document_status in ('NONE', 'PENDING', 'VERIFIED', 'REJECTED'));

-- Бэкфилл по текущим данным: подтверждённые -> VERIFIED,
-- с загруженным документом без решения -> PENDING
update public.master_profiles
   set document_status = case
     when id_verified then 'VERIFIED'
     when document_url is not null then 'PENDING'
     else 'NONE'
   end;

-- --------------------------------------------------------------------------
-- 3. Escrow Module: резервирование и выплата средств по заказу
--    Симуляция состояния сделки (без реального платёжного провайдера):
--    RESERVED  — средства зарезервированы при выборе/принятии мастера
--    RELEASED  — после подтверждения клиентом: commission = amount * 0.07,
--                master_amount = amount - commission
--    REFUNDED  — возврат при отмене (зарезервировано на будущее)
--    amount может быть null для срочных вызовов без заранее известной цены —
--    сумма фиксируется при выплате из сертификата гарантии.
-- --------------------------------------------------------------------------
create table public.escrow_transactions (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  amount        numeric(12,2),
  commission    numeric(12,2),
  master_amount numeric(12,2),
  status        text not null check (status in ('RESERVED', 'RELEASED', 'REFUNDED')),
  reserved_at   timestamptz not null default now(),
  released_at   timestamptz
);

alter table public.escrow_transactions enable row level security;

-- Участники заказа и админ могут видеть состояние сделки
create policy escrow_select on public.escrow_transactions for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.client_id = (select auth.uid())
              or o.selected_master = app_private.current_master_profile_id())
    )
    or app_private.current_app_role() = 'ADMIN'
  );
