# RepairLink

«Яндекс Такси для ремонта»: мгновенный мэтчинг мастера по срочной заявке, зафиксированная цена до начала работы и цифровая гарантия качества с фото «до/после».

Специализации MVP: **Сантехник · Ремонтник · Плиточник**.

## Стек

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui + Lucide React (шрифт Inter)
- React Hook Form + Zod, TanStack Query
- Supabase: PostgreSQL, Storage, **Realtime** (мэтчинг срочных заявок и чат)
- Сессии: httpOnly cookie с JWT (jose), вход по телефону + SMS-код (dev-режим — фиксированный код)

## Запуск

Проект Supabase **repair.link** (`syoijnvepdigansmgpvs`, регион ap-northeast-1) уже создан и настроен:
все три миграции из `supabase/migrations/` применены (схема, индексы, RLS-политики,
RPC-функции, сид специализаций, storage-бакеты), `.env.local` заполнен URL и anon-ключом.

Остался один шаг — **вставить `service_role` секретный ключ** в `.env.local`
(по соображениям безопасности MCP-инструменты Supabase не отдают этот ключ никому,
даже агенту — только владелец проекта может его увидеть в дашборде):

1. Откройте https://supabase.com/dashboard/project/syoijnvepdigansmgpvs/settings/api-keys
2. Скопируйте секрет **service_role**
3. Вставьте его в `.env.local` в `SUPABASE_SERVICE_ROLE_KEY=`
4. `npm install && npm run dev`

Если создаёте проект с нуля (другой Supabase-аккаунт): создайте проект на
[supabase.com](https://supabase.com), примените миграции из `supabase/migrations/`
в SQL Editor по порядку (0001 → 0002 → 0003) и заполните `.env.local` по `.env.example`.

### Роли

- Клиент и мастер регистрируются сами на `/login` (роль выбирается при первом входе).
- Администратор назначается вручную:

```sql
update public.users set role = 'ADMIN' where phone = '+7XXXXXXXXXX';
```

## Как устроен «Аварийный вызов»

1. Мастер включает тумблер «На линии» (`master_profiles.is_online`).
2. Клиент отправляет `POST /api/orders/urgent` — заказ создаётся в статусе `MATCHING`,
   сервер публикует broadcast-событие в Realtime-канал `urgent:{specialization_id}`.
3. Все онлайн-мастера этой специализации подписаны на канал — у них всплывает карточка
   «Принять / Пропустить» (`MasterUrgentListener`, живёт в layout мастера).
4. `POST /api/orders/{id}/accept-urgent` вызывает RPC `accept_urgent_order`:
   атомарный `UPDATE ... WHERE status = 'MATCHING'` — побеждает первый, остальные получают 409.
5. Сервер рассылает `order_accepted` (клиенту — экран «Мастер найден») и `urgent_taken`
   (остальным мастерам — карточка исчезает).

## Статусы заказа

`WAITING → (срочные: MATCHING) → IN_PROGRESS → WAIT_CONFIRMATION → WARRANTY_ACTIVE`
(при подтверждении клиентом заказ сразу получает активную гарантию; `COMPLETED` зарезервирован
для завершения без гарантии, `CANCELLED` — отмена/soft delete).

## Trust Score

`40% рейтинг + 30% доля завершённых заказов + 20% подтверждённые документы + 10% объём заказов`
— пересчитывается RPC-функцией `recalc_master_stats` при новом отзыве, верификации и завершении заказа.
Отображается как «Доверие: N/100».

## Структура

```
src/
  app/(client)/   — главная с кнопкой «Аварийный вызов», заказы, гарантии, избранное, профиль
  app/(master)/   — кабинет с тумблером «На линии», лента, отклики, гарантии, рейтинг
  app/(admin)/    — дашборд, пользователи, заказы, отзывы, верификация мастеров
  app/api/        — REST-роуты, формат ответа { success, data, message }
  services/       — бизнес-логика (Auth, Profile, Order, Matching, Chat, Warranty, Review, Favorite, Admin, Storage)
  repositories/   — доступ к данным (Supabase service-role клиент)
  features/       — UI-модули по фичам
  lib/            — supabase-клиенты, realtime-хелперы, сессии, константы
```

Формат API-ответа: `{ "success": true, "data": {...}, "message": "..." }` /
`{ "success": false, "message": "Unauthorized" }`.

## Что сознательно не входит в MVP

Платёжный эскроу (но `WarrantyService.confirmCompletion` — готовая точка расширения),
карта/геолокация (адрес — текст), push-уведомления (только in-app), система споров.
