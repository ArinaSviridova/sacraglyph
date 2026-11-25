# Bazookatattoo merch shop experiment

> **Новый бесплатный вариант:** полностью локальная изолированная база на Windows через Docker, без создания облачного проекта и без деплоя. См. [SHOP_LOCAL_SETUP.md](SHOP_LOCAL_SETUP.md). Остальные шаги ниже описывают альтернативу с отдельным облачным тестовым проектом.

**Branch:** `experiment/merch-shop-paypal-georgia`  
**Status:** isolated prototype; no deploy, no live payments, no migrations executed.

## What was added

- `/shop-admin.html`: isolated copy of existing merch admin, uses TEST Supabase configuration only, so editing test stock will not change the live store.
- `/shop.html` and `/en/shop.html`: mobile + desktop storefront, catalog sourced from Supabase, availability-first sorting, size selection for clothing, local cart, customer login/registration, Georgian shipping address, order history.
- `/merch.html` and `/en/merch.html`: branch-only store links and initial Georgia-focused store metadata. Etsy remains.
- `/assets/js/shop.js`: authenticated customer UI and PayPal Sandbox checkout.
- `/supabase/shop-orders-migration.sql`: RLS-protected customer profiles and orders.
- `/netlify/functions/shop-config.mjs`: publishes only public sandbox client ID to the browser; checkout uses PayPal JavaScript SDK v6.
- `/netlify/functions/shop-create-order.mjs`: authenticates customer, reloads prices and availability from Supabase, computes USD total and configured delivery charge on server, creates pending order and PayPal Sandbox order.
- `/netlify/functions/shop-capture-order.mjs`: captures Sandbox payment and verifies amount/currency before marking order paid.
- `/netlify/functions/shop-paypal-webhook.mjs`: verifies PayPal webhook signature, reconciles completed captures.
- `/scripts/generate-merch-seo.mjs`: optional static RU/EN individual product pages, Product/Offer JSON-LD, canonical + reciprocal hreflang. Noindex by default.

### Why a separate test database?

The normal website uses the production Supabase project. The **shop pages intentionally override that URL** via `assets/js/shop-test-config.js`, initially set to placeholders. If you open the shop without configuring a separate test Supabase project, the shop will not connect. This protects the production orders, users, and catalog. Do not run `shop-orders-migration.sql` against the production project during the experiment. The original merch pages continue reading the existing live catalog as they did before.

## Setup (locally only)

1. Disable Netlify Branch Deploys for this branch and do not open a preview PR if previews are enabled. GitHub branch creation does not itself issue a deploy command.
2. Create a **separate Supabase test project**. Run the existing `supabase/schema.sql` in its SQL Editor to create the catalog, auth/admin policies and bucket. Then run `supabase/shop-orders-migration.sql`. Copy a few published test items / collections / their images into the test project (do not copy customer data). Configure email/password auth for testing. In Authentication > Users create the test shop admin user and add its UUID to the test project's `public.admin_users` table. Open `/shop-admin.html` on your local server to edit test stock, images and prices.
3. In your local checkout ONLY, edit `assets/js/shop-test-config.js`: set its `url` and **publishable/anon** key of the test project. These values are public; do not insert a `service_role` key.
4. Create a PayPal Business account with checkout eligibility for your merchant country and verify settlement/withdrawal. In [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox) create a **Sandbox REST app**, which provides **Client ID** (public) and **Secret** (server-only). Create a separate sandbox buyer account.
5. Copy `.env.example` to local `.env` (gitignored) and enter all sandbox values. `SHOP_SUPABASE_URL` must be the **test** project. `SHOP_SUPABASE_SERVICE_ROLE_KEY` must only exist on the server, never in JS served to customers.
6. In the existing admin of the **test** project, set an actual **USD** price on every item you want to test; GEL-only items deliberately cannot be paid via this PayPal prototype. Availability must be **In stock**. Configuring `SHOP_SHIPPING_USD=0.00` is valid **only for sandbox tests**; set a real delivery rule before live launch.
7. Use Node 20+ and [Netlify CLI](https://docs.netlify.com/cli/get-started/), run `npx netlify-cli dev` from the project root. Open the local URL, for example `http://localhost:8888/shop.html`. Pages opened directly from disk cannot call Netlify Functions.
8. For event reconciliation in Sandbox, set up a webhook in the PayPal Developer app targeting `https://<your-test-host>/.netlify/functions/shop-paypal-webhook`, subscribe to `PAYMENT.CAPTURE.COMPLETED`, and set `PAYPAL_WEBHOOK_ID`. For purely local testing of events, use a documented webhook tunnel/simulator and verify the environment never points to production.

### Manual tests

- Sign up / verify email / sign in / sign out.
- Save and reload address; verify another customer cannot read it or orders (RLS).
- Stock OFF and preorder items must not be purchasable; order prices must always come from the DB, not browser HTML or POST amounts.
- Add clothing with a size, add multiple items, modify quantities and refresh (local cart persists).
- Complete Sandbox payment and confirm exactly one order is marked paid. Cancel payment and ensure no paid status.
- Reject missing USD price, forged product ID, changed client price, duplicate lines, altered PayPal order ID.
- Run PayPal webhook replay tests and verify idempotence. Validate network interruption immediately after capture: order must reconcile via webhook.
- Confirm existing merch photos, tattoo work, site navigation, RU/EN language and existing admin behavior have not regressed.

## PayPal caveat for Georgia

PayPal lists Georgia as a country with send, receive and withdraw capabilities. Its official payouts country table does **not** apply a cross-border-only footnote to Georgia. However, the exact domestic checkout, card acceptance and settlement capabilities of a particular Georgian Business account must be confirmed in the live merchant dashboard. PayPal Orders REST currencies include USD but not GEL, therefore this Sandbox implementation uses USD prices. For convenient **domestic Georgian** card checkout in GEL, consider a second gateway such as TBC E-Commerce or Bank of Georgia iPay. Confirm account approval, commissions, supported methods, currencies, legal entity and settlement method with each provider.

- PayPal country features: https://developer.paypal.com/payouts/supported-features
- PayPal Orders v2: https://developer.paypal.com/api/orders/v2
- PayPal integration: https://developer.paypal.com/api/rest/integration/orders-api
- TBC E-Commerce API: https://developers.tbcbank.ge/docs/checkout-overview

## SEO plan for Google Georgia

**Already in branch:** merch titles/descriptions mention Tbilisi/Georgia naturally; OnlineStore structured data, unchanged canonical and RU/EN alternate URLs. Test shop itself is deliberately marked `noindex`, and was NOT added to sitemap.

**Product detail pages (generation only):** run locally after setting test/public Supabase read credentials:
```bash
SHOP_SUPABASE_URL=https://YOUR-TEST.supabase.co \
SHOP_SUPABASE_ANON_KEY=YOUR_TEST_ANON_KEY \
node scripts/generate-merch-seo.mjs
```
By default generated RU/EN product pages have `noindex` and `sitemap-products.xml` has no product URLs. When product prices, descriptions, stock, shipping, returns, canonical URLs and all pages have been reviewed for a real public launch, set `SHOP_SEO_LIVE=true` and regenerate. Then **review and deploy** the generated pages and include `sitemap-products.xml` in the sitemap index / Search Console, only after merging the release.

**Still needed before promising SEO performance:**
- Unique real copy/photos and distinct product URLs for every item; accurate alt text; stock and prices synchronized between site, JSON-LD and database; checkout accessible.
- Proper **Georgian-language** (ka-GE) landing/category/product content and reciprocal RU/EN/KA hreflang once translations exist. Do not machine-fill fake product details.
- Shipping geography/fees, real return policy, refund and contact pages, merchant identity, privacy policy and payment terms.
- Verify Search Console, analyze relevant Georgia queries (e.g., handmade clothing Tbilisi / Georgian designer merch), mobile Core Web Vitals, submit sitemaps.
- Set up Google Merchant Center/free listings if this merchant and market are eligible; synchronize feed and stock. Validate Product JSON-LD using Rich Results Test.
- Ranking is not guaranteed, and no branch-only non-deployed page can rank in public Search.

## Not production-ready

This is an initial **functional Sandbox prototype**, not a finished shop. Before real money:
- Add inventory **per size/SKU with atomic reservation**, quantities, oversell protection and dedicated admin order management.
- Add local TBC/BOG gateway, verified domestic fees, tax/invoices, shipping rules, coupons if needed, cancellations, refunds, order email notifications.
- Enforce rate limits, antifraud controls, sandbox-to-live credential transition, alerting and audit logging. Verify webhook handling and recoverability under failure.
- Add accessible account recovery, address editing/deletion, GDPR/privacy handling, support processes.
- Real PayPal Business account approval, payout currency, eligibility and transaction fee confirmation are prerequisites.

## What a full buyer account should include after the prototype

- **MVP (present in test):** email account, password sign-in, shipping address in Georgia, cart, order history, PayPal Sandbox status.
- **Before launch:** password reset/verification UI, addresses book, per-SKU clothing sizes and stock, shipment tracking and status emails, order cancellation and returns workflow, delete account/export data, customer support page, order receipts.
- **Merchant/admin:** paid/pending/refunded order queue, packing/shipping statuses, fulfilment and tracking, return/refund actions, invoices and reporting, anti-overselling stock management. Existing merch admin already has per-product availability toggle, but not real per-size inventory.
