# Bazookatattoo: бесплатный полностью локальный тест магазина (Windows)

Ветка: `experiment/merch-shop-paypal-georgia`. Никакого деплоя. Этот режим не подключается к рабочему облачному Supabase, а создаёт отдельную базу, Auth, Storage и API на компьютере через Docker.

## Что уже есть в ветке
- `/shop.html`, `/en/shop.html`: каталог, предзаказ, корзина, регистрация, кабинет, сообщения, отзывы
- `/shop-admin.html`: товары, переписки, статусы заказов, промокоды, модерация отзывов
- Server-only Netlify Functions: сообщения, уведомления Telegram, PayPal Sandbox
- SQL: `supabase/schema.sql`, `supabase/shop-orders-migration.sql`, `supabase/shop-crm-migration.sql`
- `supabase/seed.sql`: три СИНТЕТИЧЕСКИХ товара с состояниями in / preorder / out; никаких существующих заказов и клиентов

## Установка без облака

Нужны Node.js 20+, Docker Desktop (должен быть запущен), PowerShell и доступ к интернету для загрузки CLI и Docker-образов.

1. Открой VS Code в репозитории Sacra Glyph, а не внутри вложенной случайной папки. В терминале:
   `git switch experiment/merch-shop-paypal-georgia`
   `git pull --ff-only`
2. Запусти в PowerShell из корня репозитория:
   `powershell -ExecutionPolicy Bypass -File .\scripts\setup-shop-local.ps1`
3. Скрипт проверит, что Supabase НЕ привязан к облаку, затем выполнит `supabase init`, создаст три миграции командой `supabase migration new`, запустит локальный Supabase, применит миграции и демо-seed, получит локальные ключи. Всё без `--remote` и без доступа к рабочей БД.
4. Автоматически создаст игнорируемый Git-файл `assets/js/shop-test-config.local.js` с **локальным публичным ключом** и локальный `.env` с **локальным серверным ключом** и предохранителями:
   `SHOP_CRM_TEST_MODE=1`, `SHOP_ALLOW_LOCAL_SUPABASE=1`, `SHOP_REQUIRE_LOCAL_DB=1`.
   Если `.env` существует и указывает на другую базу, скрипт остановится, не перезапишет файл.
5. В отдельном терминале:
   `npx --yes netlify-cli dev`
   Открой `http://localhost:8888/shop.html` и `http://localhost:8888/shop-admin.html`.
6. Локальная Supabase Studio: `http://127.0.0.1:54323`. Регистрационные письма обычно можно открыть через локальный Mailpit по адресу `http://127.0.0.1:54324` (посмотри вывод `npx supabase status`).

### Добавить администратора только в ЛОКАЛЬНЫЙ проект

Сначала зарегистрируй тестовый email через `/shop.html`. В локальной Studio открой SQL Editor и выполни (замени пример на email созданного пользователя):

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users
where email = 'admin-test@example.com'
on conflict (user_id) do nothing;
```

Перезайди этим пользователем в `/shop-admin.html`. Второй тестовый пользователь должен оставаться обычным покупателем: так можно проверить запрет доступа к чужим сообщениям и заказам.

### Проверка Telegram без деплоя

В локальном `.env` укажи токен **тестового бота** и ID тестового чата:
```dotenv
SHOP_TG_BOT_TOKEN=...
SHOP_TG_CHAT_ID=...
```
Перезапусти `npx --yes netlify-cli dev`, зайди в тестовую админку → «Сообщения» → «Проверить Telegram-уведомление». Затем отправь сообщение из тестового кабинета покупателя. Получение и ответы в админке работают локально, пока локальный сервер запущен. Входящие ответы **из Telegram в магазин** не реализованы.

### PayPal Sandbox без реальных списаний

В `.env` добавь SANDBOX Client ID / Client Secret из PayPal Developer Dashboard и перезапусти Netlify Dev:
```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
SHOP_SHIPPING_USD=0.00
```
Используй отдельный тестовый покупательский аккаунт Sandbox. У сайта `noindex`; никаких публичных платежей и SEO-индексации на этом этапе.

### Полезные команды

- `npx --yes supabase status`: состояние локальной базы
- `npx --yes supabase stop`: остановить локальный Supabase, данные сохраняются
- `powershell -ExecutionPolicy Bypass -File .\scripts\setup-shop-local.ps1 -Reset`: сбросить **только локальные** тестовые данные
- Не запускать `supabase db reset --remote`, `supabase db push` или `supabase link` в эксперименте

## Что не подтверждено

Это подготовленный запуск, но **не пройденный E2E тест**. В текущей среде нет вашего Windows/Docker Desktop и локальных Telegram/PayPal Sandbox credentials. Протестируй регистрацию, вход, все три состояния товара, отправку сообщений в обе стороны, заказ, обновление статуса, промокод, отзыв с фото, админские права и реальные Sandbox-уведомления. Выпуск в `main` возможен только после проверки.
