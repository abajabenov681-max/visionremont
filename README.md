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

1. Создайте проект на [supabase.com](https://supabase.com) (или `supabase start` локально).
2. Примените миграцию: содержимое `supabase/migrations/0001_init.sql` выполните в SQL Editor
   (создаёт все таблицы, индексы, RLS-политики, RPC-функции, сид специализаций и storage-бакеты).
3. Скопируйте `.env.example` в `.env.local` и заполните:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — из Project Settings → API
   - `AUTH_JWT_SECRET` — любая длинная случайная строка
   - `DEV_SMS_CODE` — код, принимаемый вместо SMS (по умолчанию `1234`)
4. `npm install && npm run dev`

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
