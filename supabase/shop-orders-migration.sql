-- TEST BRANCH ONLY. Run manually in a Supabase test project, never automatically in production.
create extension if not exists pgcrypto;

create table if not exists public.shop_customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text not null default '',
  address jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.shop_customer_profiles enable row level security;
drop policy if exists "Customers read own shop profile" on public.shop_customer_profiles;
create policy "Customers read own shop profile" on public.shop_customer_profiles
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers insert own shop profile" on public.shop_customer_profiles;
create policy "Customers insert own shop profile" on public.shop_customer_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Customers update own shop profile" on public.shop_customer_profiles;
create policy "Customers update own shop profile" on public.shop_customer_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.shop_customer_profiles to authenticated;

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  email text not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  currency text not null default 'USD' check (currency = 'USD'),
  subtotal_usd_cents integer not null check (subtotal_usd_cents >= 0),
  shipping_usd_cents integer not null check (shipping_usd_cents >= 0),
  total_usd_cents integer not null check (total_usd_cents > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  shipping_address jsonb not null,
  paypal_order_id text unique,
  paypal_capture_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shop_orders_user_created_idx on public.shop_orders(user_id, created_at desc);
alter table public.shop_orders enable row level security;
drop policy if exists "Customers read own shop orders" on public.shop_orders;
create policy "Customers read own shop orders" on public.shop_orders
  for select to authenticated using (auth.uid() = user_id);
-- No client-side INSERT/UPDATE policies: only trusted server functions (service_role) write orders.
grant select on public.shop_orders to authenticated;
notify pgrst, 'reload schema';
