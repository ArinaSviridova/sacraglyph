# Bazookatattoo shop CRM - no-deploy test branch

> **Новый бесплатный вариант:** полностью локальная изолированная база на Windows через Docker, без создания облачного проекта и без деплоя. См. [SHOP_LOCAL_SETUP.md](SHOP_LOCAL_SETUP.md). Остальные шаги ниже описывают альтернативу с отдельным облачным тестовым проектом.

Branch: `experiment/merch-shop-paypal-georgia`. This experiment is **NOT** deployed and must use its own Supabase TEST project. Do not run migrations against production.

## Implemented in this branch

- Buyer storefront `/shop.html`, `/en/shop.html`: in-stock / made-to-order / sold-out, sorting by stock status, cart, and **custom shirt preorder explanation** with buttons **Understood, preorder** and **Contact the artist**.
- Existing `/merch.html` and `/en/merch.html`: product modal explains that each shirt is unique and links to the test checkout or product-specific conversation. Original product collection images/works and existing CMS preserved.
- Buyer account: Supabase email login, saved delivery address, order history with delivery status and tracking number, messages in dedicated conversation threads, optional product/order reference, new conversation flow.
- Admin `/shop-admin.html`: **Messages**, **Orders**, **Coupons**, **Reviews** panels; message replies, proactive first messages to customers with an existing order, readable history, payment vs fulfillment state, tracking number, coupon editing and moderation.
- Telegram **outgoing notifications** from local Netlify Functions: new customer message (with text), pending order, paid order (including webhook recovery), review submission. Test notification button in admin. Browser receives staff replies by polling around every 9 seconds.
- Promocodes: percent or USD fixed amount; per-promo minimum order, optional expiration, max paid uses, active state; server validates and prices order. Discount included in PayPal Sandbox amount breakdown.
- Reviews: rating from 1 to 5, text, optional JPG/PNG/WEBP photo up to 5 MB; only for product included in a **paid + delivered** order; one review per product per order; staff approval before publication. Approved reviews and customer photos appear under individual product cards and in reviews section.
- Supabase Row Level Security for buyer conversations and orders. Customer cannot directly insert messages, post reviews or modify order status or promo codes; server authenticates every action, confirms ownership and checks staff membership in `admin_users`.

## Files

- `supabase/shop-orders-migration.sql` - account and order tables (apply second)
- `supabase/shop-crm-migration.sql` - inbox, order fulfillment, promotions, reviews + private photo bucket (apply third)
- `netlify/lib/shop-crm-server.mjs` - test-only server helpers + Telegram Bot API
- `netlify/functions/shop-customer-action.mjs` - buyer writes and verified reviews
- `netlify/functions/shop-admin-action.mjs` - staff writes and test notification
- `assets/js/shop-crm-ui.js` - buyer messenger, reviews and preorder UI
- `assets/js/shop-admin-crm.js` - CRM panels
- `assets/css/shop-crm.css` - responsive styling
- `.env.example` - server-only environment variable names

## Setup to test locally

1. Check out branch and disable branch builds/previews in Netlify if any automation is configured. A GitHub branch does not automatically mean a deploy did not run via CI; verify deployment settings.
2. Create a **separate test Supabase project**. Run, in order: `supabase/schema.sql`, `supabase/shop-orders-migration.sql`, `supabase/shop-crm-migration.sql`. Configure email/password authentication. Add two users: a customer and an admin (insert test admin UUID into `public.admin_users`). Add several test product collections/items (including statuses `in`, `preorder`, `out` and USD prices).
3. Edit **only the local file** `assets/js/shop-test-config.js` with test Supabase URL and publishable key. It must match `SHOP_SUPABASE_URL` in server environment. Never paste a service-role key into frontend files.
4. Copy `.env.example` to `.env` in local checkout. Set:
   - `SHOP_CRM_TEST_MODE=1` (required gate for CRM server endpoints)
   - `SHOP_SUPABASE_URL`, `SHOP_SUPABASE_SERVICE_ROLE_KEY` for the **same isolated test project**
   - `SHOP_TG_BOT_TOKEN`, `SHOP_TG_CHAT_ID` (and optional `SHOP_TG_TOPIC_ID` for Telegram forum topics)
   - `PAYPAL_MODE=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `SHOP_SHIPPING_USD` (only needed to test payment)
5. Open a private Telegram chat with your test bot and send it `/start`, or add the bot to a test group and give it permission to send messages. Use the correct Chat ID from the test bot's existing configuration/logs. This implementation only calls the outbound Telegram **sendMessage** method, so it does **not** change existing webhook / getUpdates polling of any other bot.
6. Start locally with Node 20+ and `npx netlify-cli dev`. Netlify Dev can read `.env`, host HTML and serve Functions locally. Open `http://localhost:8888/shop-admin.html` and `http://localhost:8888/shop.html`. Test the customer in an incognito session, admin in another browser.
7. Open admin **Messages** > **Test Telegram notification**. Confirm the message arrived in the chosen chat. Then from buyer account send a new message and confirm it appears in the bot **and** admin. Reply from admin; after short polling the buyer will see it.
8. For review testing, pay with PayPal Sandbox or run the guarded fixture **`supabase/shop-crm-demo-order.sql`** in the isolated test project after replacing test customer email and product ID. It seeds a fake **paid** order without charging money, only for UI tests. In admin mark that order **Delivered**; buyer can then rate its purchased item, upload photo and submit; admin approves and the review appears on the product card.

### Which inputs must NOT go into git

- Test/real Telegram bot tokens and private Chat ID, PayPal secret, Supabase service-role key, customer phone/address data.
- `.env` is gitignored. `assets/js/shop-test-config.js` must contain only public test Supabase URL and anon/publishable key.

## Current technical limitations (before a real store launch)

- **Not live-tested end-to-end**: real PayPal Sandbox keys, test Supabase project, Telegram bot credentials and network access are not available to the assistant. New files have code-level syntax checks, not a successful real E2E checkout/notification test.
- Telegram alert delivery requires the local dev server running. It cannot run later with your laptop off. Incoming replies *from Telegram into the site* are not implemented: answer from admin. Implementing inbound replies requires a dedicated webhook/tunnel or careful integration into an existing bot, and **must not** replace that bot's live webhook.
- The existing merchandise stock switch is **per product**, not per size. Production needs per-SKU stock/atomic reservation, fulfillment workflow, handling out-of-stock races and returns/refunds. Customer side can choose typical XS-XXL but sizes must be validated against actual per-product inventory before launch.
- Promocode max-uses calculation is not transactional under concurrent payments. Before launch add atomic coupon reservations and lifecycle handling in Postgres.
- Photo upload is restricted by bucket mime/size/prefix, private access and moderation, but needs file-abuse detection and orphan cleanup before public rollout.
- Threads and buyer order statuses use polling, not permanent websockets/typing presence. No literal "user is currently typing" event to Telegram; Telegram receives **sent messages**.
- Test shop keeps `noindex`. Product SEO needs review of unique copy, shipping/return policy, proper RU/EN/KA pages, valid prices and a deliberate published build.
- PayPal integration remains USD + Sandbox only; no real charge or refund, no local GEL bank checkout, no fiscal documents. Never present this as a live merchant system.

## Security QA

- Cross-account attempt to open/read/send another buyer's conversation must fail.
- Regular buyer calling admin action must get HTTP 403.
- Buyer cannot set an order's `paid` or `delivered` status.
- Review of unpaid / undelivered / unowned product must return 403; unapproved review invisible to other visitors.
- Price/discount comes from server DB; change request JSON price and verify it is ignored.
- Telegram bot token must never appear in HTML or browser network request. Observe only a server request to Telegram after a customer message.
- If PayPal is not configured, messenger and moderation continue working with CRM test mode enabled.
