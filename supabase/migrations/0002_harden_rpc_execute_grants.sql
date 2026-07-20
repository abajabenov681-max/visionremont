-- Supabase автоматически выдаёт EXECUTE на новые функции anon/authenticated
-- (даже после revoke в той же миграции, где функция создана) — event trigger
-- на default privileges переигрывает наш revoke. Поэтому закрепляем права
-- отдельной миграцией: эти RPC вызывает только сервер (service_role) из
-- API-роутов Next.js, прямой вызов через PostgREST должен быть закрыт.
revoke execute on function public.accept_urgent_order(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.confirm_order_completion(uuid, integer) from anon, authenticated, public;
revoke execute on function public.recalc_master_stats(uuid) from anon, authenticated, public;

grant execute on function public.accept_urgent_order(uuid, uuid) to service_role;
grant execute on function public.confirm_order_completion(uuid, integer) to service_role;
grant execute on function public.recalc_master_stats(uuid) to service_role;
