-- Обёртываем auth.uid()/current_app_role() в (select ...), чтобы Postgres вычислял их
-- один раз на запрос, а не на каждую строку (advisor: auth_rls_initplan).

drop policy users_select_own on public.users;
create policy users_select_own on public.users for select
  using (id = (select auth.uid()) or app_private.current_app_role() = 'ADMIN');

drop policy client_profiles_update on public.client_profiles;
create policy client_profiles_update on public.client_profiles for update
  using (user_id = (select auth.uid()) or app_private.current_app_role() = 'ADMIN');

drop policy master_profiles_update on public.master_profiles;
create policy master_profiles_update on public.master_profiles for update
  using (user_id = (select auth.uid()) or app_private.current_app_role() = 'ADMIN');

-- master_specializations: write-политика была "for all" и дублировала select-политику
-- (advisor: multiple_permissive_policies). Сужаем до insert/update/delete.
drop policy master_specializations_write on public.master_specializations;
create policy master_specializations_write on public.master_specializations for insert
  with check (master_id = app_private.current_master_profile_id()
              or app_private.current_app_role() = 'ADMIN');
create policy master_specializations_update on public.master_specializations for update
  using (master_id = app_private.current_master_profile_id()
         or app_private.current_app_role() = 'ADMIN');
create policy master_specializations_delete on public.master_specializations for delete
  using (master_id = app_private.current_master_profile_id()
         or app_private.current_app_role() = 'ADMIN');

drop policy orders_select on public.orders;
create policy orders_select on public.orders for select
  using (
    deleted_at is null and (
      client_id = (select auth.uid())
      or selected_master = app_private.current_master_profile_id()
      or (app_private.current_app_role() = 'MASTER' and status in ('WAITING', 'MATCHING'))
      or app_private.current_app_role() = 'ADMIN'
    )
  );
drop policy orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (client_id = (select auth.uid()));
drop policy orders_update on public.orders;
create policy orders_update on public.orders for update
  using (client_id = (select auth.uid()) or app_private.current_app_role() = 'ADMIN');

drop policy applications_select on public.applications;
create policy applications_select on public.applications for select
  using (
    master_id = app_private.current_master_profile_id()
    or exists (select 1 from public.orders o where o.id = order_id and o.client_id = (select auth.uid()))
    or app_private.current_app_role() = 'ADMIN'
  );

drop policy order_images_select on public.order_images;
create policy order_images_select on public.order_images for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.client_id = (select auth.uid())
              or o.selected_master = app_private.current_master_profile_id()
              or o.status in ('WAITING', 'MATCHING'))
    )
    or app_private.current_app_role() = 'ADMIN'
  );

drop policy chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.client_id = (select auth.uid())
              or o.selected_master = app_private.current_master_profile_id())
    )
    or app_private.current_app_role() = 'ADMIN'
  );
drop policy chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert
  with check (sender_id = (select auth.uid()));

drop policy reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (client_id = (select auth.uid()));

drop policy favorites_all on public.favorites;
create policy favorites_all on public.favorites for all
  using (client_id = (select auth.uid()));

drop policy warranties_select on public.warranties;
create policy warranties_select on public.warranties for select
  using (
    client_id = (select auth.uid())
    or master_id = app_private.current_master_profile_id()
    or app_private.current_app_role() = 'ADMIN'
  );

drop policy warranty_certificates_select on public.warranty_certificates;
create policy warranty_certificates_select on public.warranty_certificates for select
  using (
    exists (
      select 1 from public.warranties w
       where w.id = warranty_id
         and (w.client_id = (select auth.uid())
              or w.master_id = app_private.current_master_profile_id())
    )
    or app_private.current_app_role() = 'ADMIN'
  );

-- Добавляем покрывающие индексы для оставшихся без индекса FK (advisor: unindexed_foreign_keys)
create index if not exists idx_order_images_order on public.order_images (order_id);
create index if not exists idx_orders_specialization on public.orders (specialization_id);
create index if not exists idx_reviews_client on public.reviews (client_id);
create index if not exists idx_admin_logs_admin on public.admin_logs (admin_id);
create index if not exists idx_chat_messages_sender on public.chat_messages (sender_id);
create index if not exists idx_favorites_master on public.favorites (master_id);
