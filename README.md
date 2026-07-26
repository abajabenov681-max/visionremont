# RepairLink

«Яндекс Такси для ремонта»: мгновенный мэтчинг мастера по срочной заявке, зафиксированная
цена до начала работы и цифровая гарантия качества с фото «до/после».

Специализации MVP: **Сантехник · Ремонтник · Плиточник**.

Продукт: [visionremont.vercel.app](https://visionremont.vercel.app)

---

## Содержание

- [Стек](#стек)
- [Архитектура](#архитектура)
- [Структура проекта](#структура-проекта)
- [Модель данных](#модель-данных)
- [Ключевые сценарии](#ключевые-сценарии)
- [Локальный запуск](#локальный-запуск)
- [Роли и доступ](#роли-и-доступ)
- [Формат API](#формат-api)
- [Что сознательно не входит в MVP](#что-сознательно-не-входит-в-mvp)

---

## Стек

**Frontend**

- [Next.js 15](https://nextjs.org) (App Router, Route Groups) + React 19 + TypeScript
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) (Radix UI) + Lucide React, шрифт Inter
- [Framer Motion](https://www.framer.com/motion/) — анимации (мэтчинг, списки, переходы между экранами)
- React Hook Form + Zod — формы и валидация
- TanStack Query — серверный стейт, кэш, инвалидация
- Sonner — тосты

**Backend**

- Next.js Route Handlers (`src/app/api/**`) — тонкий REST-слой над сервисами
- [Supabase](https://supabase.com): PostgreSQL, Storage (фото/документы), **Realtime** (broadcast-каналы
  для мэтчинга срочных заявок и чата)
- Аутентификация: **SMS OTP** — 4-значный код с TTL 5 минут (таблица `otp_codes`,
  лимиты: 1 отправка в 60 с, 3 попытки ввода), отправка через SMS-провайдера
  [Mobizon](https://mobizon.kz); пользователь регистрируется в Supabase Auth,
  сессия — JWT (`jose`) в httpOnly-cookie. Продублировано Supabase Edge Functions
  `send-sms-otp` / `verify-sms-otp` (`supabase/functions/`)
- **Escrow Module** (`EscrowService` + таблица `escrow_transactions`) — управление
  безопасными сделками: резерв средств при выборе мастера, после подтверждения работы —
  выплата мастеру с удержанием комиссии платформы `F = O × 0.07`, `M = O − F`
- PostgreSQL RPC-функции (`SECURITY DEFINER`) для атомарных операций: принятие срочного
  заказа «первый пришёл — первый забрал», подтверждение завершения работ + выдача гарантии,
  пересчёт Trust Score
- Row Level Security на всех таблицах (defense-in-depth; основной путь доступа — сервер
  через `service_role`, RLS готова под будущий переход на `supabase.auth`)

**Инфраструктура**

- Деплой: [Vercel](https://vercel.com)
- БД/бэкенд: Supabase (managed Postgres)
- Миграции: обычные `.sql`-файлы в `supabase/migrations/`, применяются вручную или через
  Supabase CLI/MCP

---

## Архитектура

Слоёная схема на backend-части, чтобы бизнес-логика не расползалась по API-роутам:

```
Route Handler (src/app/api/**)
        │  разбор запроса, requireUser/requireRole, ok()/fail()
        ▼
   Service (src/services/*.ts)
        │  бизнес-правила, оркестрация нескольких repository,
        │  вызов RPC, отправка Realtime-событий
        ▼
 Repository (src/repositories/*.ts)
        │  единственное место с Supabase-запросами (service-role клиент)
        ▼
     Supabase (Postgres + RLS + RPC + Storage + Realtime)
```

- **Route Handler** — не содержит бизнес-логики: аутентификация/авторизация,
  парсинг тела запроса, вызов сервиса, единый формат ответа.
- **Service** — вся бизнес-логика (`OrderService`, `MatchingService`, `WarrantyService`,
  `ReviewService`, `ChatService`, `AdminService`, `ProfileService`, `AuthService`,
  `FavoriteService`, `StorageService`).
- **Repository** — доступ к данным через Supabase `service_role`-клиент
  (`src/lib/supabase/admin.ts`), обходит RLS осознанно — сервер и есть доверенная сторона.
- **Realtime** — сервер публикует broadcast-события через HTTP (`src/lib/supabase/realtime.ts`),
  клиент подписывается анонимным ключом через хук `useRealtimeChannel`.

Frontend разложен по фича-модулям (`src/features/*`) и трём зонам приложения
(`src/app/(client)`, `(master)`, `(admin)`), у каждой зоны свой layout с нижней навигацией
и общей шапкой (`AppHeader`).

---

## Структура проекта

```
src/
  app/
    (client)/        клиентская зона: главная («Аварийный вызов»), заказы, гарантии,
                      паспорт ремонта (история работ по адресу), избранное, профиль,
                      карточка мастера
    (master)/         кабинет мастера: тумблер «На линии», лента заказов, отклики,
                      гарантии, рейтинг/Trust Score, профиль
    (admin)/          админка: дашборд, пользователи, заказы, отзывы, верификация мастеров
    login/            вход по телефону (SMS OTP)
    api/              REST-роуты (auth, users, masters, orders, orders/urgent, applications,
                      chat, reviews, warranties, passport, favorites, admin, specializations)
    globals.css       дизайн-токены (тёмная тема, фирменный оранжевый)
  components/         общие UI-компоненты (карточки заказа/мастера, бейджи, нижняя навигация,
                      шапка, motion-примитивы)
    ui/               shadcn/ui примитивы (button, card, dialog, input, ...)
  features/           UI по бизнес-фичам: auth, matching (мэтчинг/срочный вызов), orders,
                      chat, reviews, warranties, favorites, profile
  services/           бизнес-логика (см. «Архитектура»)
  repositories/       доступ к данным (Supabase)
  hooks/               useMe, useSpecializations, useRealtimeChannel
  lib/                supabase-клиенты (admin/browser), realtime, session (JWT), api-хелперы,
                      константы, форматирование
  types/              типы таблиц БД (db.ts) и API-контракты (api.ts)
supabase/
  migrations/         0001_init.sql (схема, индексы, RLS, RPC, сид специализаций, бакеты),
                      0002_harden_rpc_execute_grants.sql, 0003_optimize_rls_and_indexes.sql,
                      0004_otp_documents_escrow.sql (otp_codes, статусы документов,
                      escrow_transactions)
  functions/          Edge Functions: send-sms-otp, verify-sms-otp
```

---

## Модель данных

Основные таблицы (полная схема — `supabase/migrations/0001_init.sql`):

| Таблица | Назначение |
|---|---|
| `users` | учётка (телефон, роль: CLIENT / MASTER / ADMIN) |
| `client_profiles`, `master_profiles` | профили ролей, у мастера — `is_online`, `rating`, `trust_score` |
| `specializations`, `master_specializations` | 3 специализации MVP и связь мастер↔специализация |
| `orders` | заказ: обычный или срочный (`is_urgent`), статус, адрес, бюджет, `selected_master` |
| `order_images` | фото «до»/«после» |
| `applications` | отклики мастеров на обычные заказы (цена, срок, комментарий) |
| `chat_messages` | переписка по заказу |
| `reviews` | отзыв клиента после завершения работы |
| `warranties`, `warranty_certificates` | цифровая гарантия и сертификат с фото до/после |
| `favorites` | избранные мастера у клиента |
| `otp_codes` | SMS-коды подтверждения (TTL 5 мин, счётчик попыток) |
| `escrow_transactions` | безопасная сделка: резерв → выплата мастеру с комиссией платформы |
| `admin_logs` | журнал действий администратора |

Статусы заказа: `WAITING → (срочные уходят в MATCHING) → IN_PROGRESS → WAIT_CONFIRMATION
→ WARRANTY_ACTIVE` (гарантия активируется сразу при подтверждении клиентом); `COMPLETED` —
резерв для завершения без гарантии, `CANCELLED` — отмена/soft delete.

**Trust Score** (RPC `recalc_master_stats`, пересчитывается при отзыве, верификации,
завершении заказа):

```
40% рейтинг + 30% доля завершённых заказов + 20% подтверждённые документы + 10% объём заказов
```

---

## Ключевые сценарии

### «Аварийный вызов» (мэтчинг в реальном времени)

1. Мастер включает тумблер «На линии» (`master_profiles.is_online`).
2. Клиент отправляет `POST /api/orders/urgent` — заказ создаётся со статусом `MATCHING`,
   сервер публикует broadcast-событие в Realtime-канал `urgent:{specialization_id}`.
3. Все онлайн-мастера этой специализации подписаны на канал — у них всплывает карточка
   «Принять / Пропустить» (компонент `MasterUrgentListener`, живёт в layout мастера).
4. `POST /api/orders/{id}/accept-urgent` вызывает RPC `accept_urgent_order` —
   атомарный `UPDATE ... WHERE status = 'MATCHING'`: побеждает первый, остальные получают 409.
5. Сервер рассылает `order_accepted` (клиенту — переход в «Мастер найден!») и `urgent_taken`
   (остальным мастерам — карточка исчезает).

### Escrow: безопасная сделка

1. При выборе мастера (или принятии срочного вызова) `EscrowService.reserve` резервирует
   сумму сделки — заказ показывает «Средства зарезервированы 🔒».
2. После подтверждения клиентом `EscrowService.release` переводит платёж мастеру:
   комиссия `F = O × 0.07`, выплата `M = O − F` — разбивка показывается на экране
   подтверждения. Комиссия удерживается только после подтверждения работы.

### Завершение работы и гарантия

1. Мастер загружает фото «после» и отмечает заказ выполненным → статус `WAIT_CONFIRMATION`.
2. Клиент подтверждает (`POST /api/orders/{id}/confirm`) → RPC `confirm_order_completion`
   транзакционно переводит заказ в `WARRANTY_ACTIVE`, создаёт `warranty` и
   `warranty_certificate`, пересчитывает статистику мастера, затем Escrow Module
   фиксирует выплату мастеру.

### Паспорт ремонта квартиры

Все завершённые работы с гарантиями группируются по адресу (`/passport`):
хронологическая лента по каждой квартире — дата, специализация, мастер, фото до/после,
стоимость, статус гарантии. Долгосрочная история ремонта — product moat платформы.

### Проверка документов мастеров

Мастер загружает документ в профиле → статус `PENDING`. Администратор в
`/admin/masters` подтверждает или отклоняет (`VERIFIED` / `REJECTED`) — обновляется
`id_verified` и пересчитывается Trust Score.

---

## Локальный запуск

### 1. Требования

- Node.js 20+
- Аккаунт [Supabase](https://supabase.com) (бесплатного плана достаточно)

### 2. Установка зависимостей

```bash
git clone https://github.com/abajabenov681-max/visionremont.git
cd visionremont
npm install
```

### 3. Создание Supabase-проекта и применение миграций

1. Создайте новый проект на [supabase.com/dashboard](https://supabase.com/dashboard).
2. Откройте **SQL Editor** и выполните по очереди файлы из `supabase/migrations/`
   (важен порядок):
   - `0001_init.sql` — схема, индексы, RLS-политики, RPC-функции, сид специализаций,
     storage-бакеты
   - `0002_harden_rpc_execute_grants.sql` — ограничение прав на RPC (только `service_role`)
   - `0003_optimize_rls_and_indexes.sql` — оптимизация RLS и недостающие индексы

   Либо через Supabase CLI из корня проекта:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

### 4. Переменные окружения

```bash
cp .env.example .env.local
```

Заполните `.env.local` значениями из **Project Settings → API** вашего Supabase-проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>   # Settings → API Keys → service_role
AUTH_JWT_SECRET=<любая случайная строка ≥32 символов>
MOBIZON_API_KEY=            # ключ SMS-провайдера; пусто = demo-режим (код 1234 без SMS)
DEMO_PHONE_NUMBER=+77000000000   # демо-номер: всегда код 1234 без реальной отправки
DEV_SMS_CODE=1234
```

`SUPABASE_SERVICE_ROLE_KEY` — секретный ключ, доступен только владельцу проекта в дашборде
(Project Settings → API Keys → `service_role`), никогда не должен попадать в клиентский код
или в git.

### 5. Запуск

```bash
npm run dev
```

Приложение поднимется на [localhost:3000](http://localhost:3000). Вход — по номеру телефона
через SMS OTP. Если `MOBIZON_API_KEY` не задан, работает demo-режим: код `1234` без
реальной отправки SMS, подставляется в форму автоматически.

### 6. Другие команды

```bash
npm run build   # production-сборка
npm run start   # запуск собранного приложения
npm run lint    # ESLint
```

---

## Роли и доступ

- **Клиент** и **мастер** регистрируются самостоятельно на `/login` — роль выбирается
  при первом входе и дальше зафиксирована.
- **Администратор** назначается вручную через SQL Editor:

  ```sql
  update public.users set role = 'ADMIN' where phone = '+7XXXXXXXXXX';
  ```

- Next.js `middleware.ts` проверяет JWT-сессию и роль, редиректит на нужную зону
  (`/`, `/master`, `/admin`) и блокирует доступ в чужие разделы.

---

## Формат API

Все Route Handlers возвращают единый конверт (`src/lib/api.ts`):

```json
{ "success": true, "data": { "...": "..." }, "message": "Необязательное сообщение" }
```

```json
{ "success": false, "message": "Unauthorized" }
```

---

## Что сознательно не входит в MVP

- Реальный платёжный провайдер в эскроу — `EscrowService` полностью управляет жизненным
  циклом сделки (резерв → выплата с комиссией) в БД; вызов провайдера (Kaspi Pay и т.п.)
  подключается внутрь `reserve`/`release` без изменения интерфейса.
- Карта/геолокация — адрес хранится как текст.
- Push-уведомления — только in-app уведомления через Realtime и тосты.
- Формальная система споров/арбитража.
- Мобильное приложение — есть только адаптивный веб (mobile-first).
