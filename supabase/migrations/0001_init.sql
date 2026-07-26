-- RepairLink: полная схема БД
-- Архитектура доступа: приложение ходит в БД через API-роуты Next.js с service_role
-- ключом (обходит RLS). RLS включён на всех таблицах как defense-in-depth и написан
-- в терминах auth.uid() — политики заработают как есть при переходе на Supabase Auth
-- (users.id = auth.users.id при phone sign-in). Прямой доступ anon-ключом закрыт.

create extension if not exists "pgcrypto";

-- ==========================================================================
-- ENUMS
-- ==========================================================================
create type user_role as enum ('CLIENT', 'MASTER', 'ADMIN');
create type order_status as enum (
  'WAITING', 'MATCHING', 'IN_PROGRESS', 'WAIT_CONFIRMATION',
  'COMPLETED', 'WARRANTY_ACTIVE', 'CANCELLED'
);
create type image_type as enum ('BEFORE', 'AFTER');

-- ==========================================================================
-- TABLES
-- ==========================================================================
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  role        user_role not null default 'CLIENT',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.client_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text
);

create table public.master_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references public.users(id) on delete cascade,
  full_name        text not null default '',
  description      text,
  avatar_url       text,
  document_url     text,
  trust_score      numeric(5,2) not null default 0,
  rating           numeric(3,2) not null default 0,
  reviews_count    integer not null default 0,
  completed_orders integer not null default 0,
  phone_verified   boolean not null default false,
  id_verified      boolean not null default false,
  is_online        boolean not null default false
);

create table public.specializations (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table public.master_specializations (
  master_id         uuid not null references public.master_profiles(id) on delete cascade,
  specialization_id uuid not null references public.specializations(id) on delete cascade,
  primary key (master_id, specialization_id)
);

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.users(id),
  specialization_id uuid not null references public.specializations(id),
  title             text not null,
  description       text,
  budget            numeric(12,2),
  address           text not null,
  status            order_status not null default 'WAITING',
  is_urgent         boolean not null default false,
  selected_master   uuid references public.master_profiles(id),
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table public.applications (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  master_id      uuid not null references public.master_profiles(id) on delete cascade,
  price          numeric(12,2) not null,
  estimated_days integer not null default 1,
  comment        text,
  created_at     timestamptz not null default now(),
  unique (order_id, master_id)
);

create table public.order_images (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  image_url  text not null,
  type       image_type not null default 'BEFORE',
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  sender_id  uuid not null references public.users(id),
  message    text not null,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null unique references public.orders(id) on delete cascade,
  client_id  uuid not null references public.users(id),
  master_id  uuid not null references public.master_profiles(id),
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

create table public.favorites (
  client_id  uuid not null references public.users(id) on delete cascade,
  master_id  uuid not null references public.master_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, master_id)
);

create table public.warranties (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders(id),
  master_id       uuid not null references public.master_profiles(id),
  client_id       uuid not null references public.users(id),
  warranty_period integer not null default 6, -- месяцев
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create table public.warranty_certificates (
  id                 uuid primary key default gen_random_uuid(),
  warranty_id        uuid not null unique references public.warranties(id) on delete cascade,
  certificate_number text not null unique,
  work_title         text not null,
  total_price        numeric(12,2) not null default 0,
  before_photo       text,
  after_photo        text,
  created_at         timestamptz not null default now()
);

create table public.admin_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.users(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- INDEXES
-- ==========================================================================
create index idx_users_phone on public.users (phone);
create index idx_master_profiles_is_online on public.master_profiles (is_online) where is_online = true;
create index idx_orders_is_urgent on public.orders (is_urgent) where is_urgent = true;
create index idx_orders_status on public.orders (status);
create index idx_orders_client on public.orders (client_id);
create index idx_orders_selected_master on public.orders (selected_master);
create index idx_applications_master_order on public.applications (master_id, order_id);
create index idx_applications_order on public.applications (order_id);
create index idx_chat_messages_order on public.chat_messages (order_id, created_at);
create index idx_reviews_master on public.reviews (master_id);
create index idx_warranties_client on public.warranties (client_id);
create index idx_warranties_master on public.warranties (master_id);
create index idx_master_specializations_spec on public.master_specializations (specialization_id);

-- ==========================================================================
-- SEED: специализации
-- ==========================================================================
insert into public.specializations (name) values
  ('Сантехник'), ('Ремонтник'), ('Плиточник'), ('Мебельщик')
on conflict (name) do nothing;

-- ==========================================================================
-- HELPERS (private schema, не экспонируется через PostgREST)
-- ==========================================================================
create schema if not exists app_private;

create or replace function app_private.current_app_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid() and deleted_at is null;
$$;

create or replace function app_private.current_master_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.master_profiles where user_id = auth.uid();
$$;

-- ==========================================================================
-- АТОМАРНОЕ ПРИНЯТИЕ СРОЧНОГО ЗАКАЗА
-- Первый мастер, вызвавший функцию, забирает заказ; остальные получают false.
-- Условное обновление WHERE status = 'MATCHING' гарантирует атомарность.
-- ==========================================================================
create or replace function public.accept_urgent_order(p_order_id uuid, p_master_profile_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.orders
     set status = 'IN_PROGRESS',
         selected_master = p_master_profile_id
   where id = p_order_id
     and status = 'MATCHING'
     and is_urgent = true
     and deleted_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

-- ==========================================================================
-- ПОДТВЕРЖДЕНИЕ ЗАВЕРШЕНИЯ: заказ -> WARRANTY_ACTIVE + Warranty + Certificate
-- Вызывается сервером от имени клиента; транзакционно.
-- ==========================================================================
create or replace function public.confirm_order_completion(
  p_order_id uuid,
  p_warranty_months integer default 6
)
returns uuid  -- warranty id
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_warranty_id uuid;
  v_price numeric(12,2);
  v_before text;
  v_after text;
  v_cert_number text;
begin
  select * into v_order from public.orders
   where id = p_order_id and status = 'WAIT_CONFIRMATION' and deleted_at is null
   for update;
  if not found then
    raise exception 'ORDER_NOT_CONFIRMABLE';
  end if;

  update public.orders set status = 'WARRANTY_ACTIVE' where id = p_order_id;

  -- цена работы: принятый отклик выбранного мастера, иначе бюджет заказа
  select a.price into v_price
    from public.applications a
   where a.order_id = p_order_id and a.master_id = v_order.selected_master
   limit 1;
  v_price := coalesce(v_price, v_order.budget, 0);

  select image_url into v_before from public.order_images
   where order_id = p_order_id and type = 'BEFORE' order by created_at asc limit 1;
  select image_url into v_after from public.order_images
   where order_id = p_order_id and type = 'AFTER' order by created_at desc limit 1;

  insert into public.warranties (order_id, master_id, client_id, warranty_period, expires_at)
  values (p_order_id, v_order.selected_master, v_order.client_id,
          p_warranty_months, now() + make_interval(months => p_warranty_months))
  returning id into v_warranty_id;

  v_cert_number := 'RL-' || to_char(now(), 'YYYYMMDD') || '-' ||
                   upper(substring(replace(v_warranty_id::text, '-', '') from 1 for 8));

  insert into public.warranty_certificates
    (warranty_id, certificate_number, work_title, total_price, before_photo, after_photo)
  values (v_warranty_id, v_cert_number, v_order.title, v_price, v_before, v_after);

  update public.master_profiles
     set completed_orders = completed_orders + 1
   where id = v_order.selected_master;

  perform public.recalc_master_stats(v_order.selected_master);

  return v_warranty_id;
end;
$$;

-- ==========================================================================
-- TRUST SCORE: 40% рейтинг + 30% % завершённых + 20% документы + 10% кол-во заказов
-- ==========================================================================
create or replace function public.recalc_master_stats(p_master_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_rating numeric;
  v_reviews_count integer;
  v_completed integer;
  v_total_assigned integer;
  v_completion_pct numeric;
  v_docs_pct numeric;
  v_volume_pct numeric;
  v_phone_ok boolean;
  v_id_ok boolean;
  v_trust numeric;
begin
  select coalesce(avg(rating), 0), count(*) into v_rating, v_reviews_count
    from public.reviews where master_id = p_master_profile_id;

  select count(*) filter (where status in ('COMPLETED', 'WARRANTY_ACTIVE')),
         count(*)
    into v_completed, v_total_assigned
    from public.orders
   where selected_master = p_master_profile_id and deleted_at is null;

  select phone_verified, id_verified into v_phone_ok, v_id_ok
    from public.master_profiles where id = p_master_profile_id;

  v_completion_pct := case when v_total_assigned > 0
                           then v_completed::numeric / v_total_assigned * 100
                           else 0 end;
  v_docs_pct := (case when coalesce(v_phone_ok, false) then 50 else 0 end)
              + (case when coalesce(v_id_ok, false) then 50 else 0 end);
  -- объём: 50 завершённых заказов = максимум
  v_volume_pct := least(v_completed, 50)::numeric / 50 * 100;

  v_trust := 0.4 * (v_rating / 5 * 100)
           + 0.3 * v_completion_pct
           + 0.2 * v_docs_pct
           + 0.1 * v_volume_pct;

  update public.master_profiles
     set rating = round(v_rating, 2),
         reviews_count = v_reviews_count,
         completed_orders = v_completed,
         trust_score = round(v_trust, 2)
   where id = p_master_profile_id;
end;
$$;

-- Функции не должны вызываться напрямую anon/authenticated через PostgREST
revoke execute on function public.accept_urgent_order(uuid, uuid) from anon, authenticated;
revoke execute on function public.confirm_order_completion(uuid, integer) from anon, authenticated;
revoke execute on function public.recalc_master_stats(uuid) from anon, authenticated;

-- ==========================================================================
-- RLS: включаем на всех таблицах; политики в терминах auth.uid()
-- ==========================================================================
alter table public.users enable row level security;
alter table public.client_profiles enable row level security;
alter table public.master_profiles enable row level security;
alter table public.specializations enable row level security;
alter table public.master_specializations enable row level security;
alter table public.orders enable row level security;
alter table public.applications enable row level security;
alter table public.order_images enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.warranties enable row level security;
alter table public.warranty_certificates enable row level security;
alter table public.admin_logs enable row level security;

-- users: свой ряд; админ — всё
create policy users_select_own on public.users for select
  using (id = auth.uid() or app_private.current_app_role() = 'ADMIN');

-- профили: публичное чтение (карточки мастеров), запись — владелец/админ
create policy client_profiles_select on public.client_profiles for select using (true);
create policy client_profiles_update on public.client_profiles for update
  using (user_id = auth.uid() or app_private.current_app_role() = 'ADMIN');

create policy master_profiles_select on public.master_profiles for select using (true);
create policy master_profiles_update on public.master_profiles for update
  using (user_id = auth.uid() or app_private.current_app_role() = 'ADMIN');

create policy specializations_select on public.specializations for select using (true);
create policy master_specializations_select on public.master_specializations for select using (true);
create policy master_specializations_write on public.master_specializations for all
  using (master_id = app_private.current_master_profile_id()
         or app_private.current_app_role() = 'ADMIN');

-- заказы: клиент — свои; мастер — открытые (лента) и назначенные ему; админ — всё
create policy orders_select on public.orders for select
  using (
    deleted_at is null and (
      client_id = auth.uid()
      or selected_master = app_private.current_master_profile_id()
      or (app_private.current_app_role() = 'MASTER' and status in ('WAITING', 'MATCHING'))
      or app_private.current_app_role() = 'ADMIN'
    )
  );
create policy orders_insert on public.orders for insert
  with check (client_id = auth.uid());
create policy orders_update on public.orders for update
  using (client_id = auth.uid() or app_private.current_app_role() = 'ADMIN');

-- отклики: мастер — свои; клиент — отклики на свои заказы; админ — всё
create policy applications_select on public.applications for select
  using (
    master_id = app_private.current_master_profile_id()
    or exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
    or app_private.current_app_role() = 'ADMIN'
  );
create policy applications_insert on public.applications for insert
  with check (master_id = app_private.current_master_profile_id());
create policy applications_delete on public.applications for delete
  using (master_id = app_private.current_master_profile_id()
         or app_private.current_app_role() = 'ADMIN');

-- фото заказов: участники заказа + админ
create policy order_images_select on public.order_images for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.client_id = auth.uid()
              or o.selected_master = app_private.current_master_profile_id()
              or o.status in ('WAITING', 'MATCHING'))
    )
    or app_private.current_app_role() = 'ADMIN'
  );

-- чат: только участники заказа + админ
create policy chat_messages_select on public.chat_messages for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.client_id = auth.uid()
              or o.selected_master = app_private.current_master_profile_id())
    )
    or app_private.current_app_role() = 'ADMIN'
  );
create policy chat_messages_insert on public.chat_messages for insert
  with check (sender_id = auth.uid());

-- отзывы: публичное чтение; писать — клиент своего заказа
create policy reviews_select on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert
  with check (client_id = auth.uid());
create policy reviews_delete on public.reviews for delete
  using (app_private.current_app_role() = 'ADMIN');

-- избранное: только владелец
create policy favorites_all on public.favorites for all
  using (client_id = auth.uid());

-- гарантии: клиент — свои, мастер — свои, админ — всё
create policy warranties_select on public.warranties for select
  using (
    client_id = auth.uid()
    or master_id = app_private.current_master_profile_id()
    or app_private.current_app_role() = 'ADMIN'
  );

create policy warranty_certificates_select on public.warranty_certificates for select
  using (
    exists (
      select 1 from public.warranties w
       where w.id = warranty_id
         and (w.client_id = auth.uid()
              or w.master_id = app_private.current_master_profile_id())
    )
    or app_private.current_app_role() = 'ADMIN'
  );

-- админ-логи: только админ
create policy admin_logs_select on public.admin_logs for select
  using (app_private.current_app_role() = 'ADMIN');

-- ==========================================================================
-- STORAGE: бакеты для аватаров, фото заказов, документов мастеров
-- Публичное чтение аватаров и фото работ; документы — приватные (через signed URL).
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true),
       ('order-images', 'order-images', true),
       ('documents', 'documents', false)
on conflict (id) do nothing;
