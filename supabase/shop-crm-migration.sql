-- CRM extension for the ISOLATED Supabase TEST project only.
-- Apply AFTER supabase/schema.sql and supabase/shop-orders-migration.sql.
-- Never execute against production from this experiment.
begin;

alter table public.shop_orders
  add column if not exists fulfillment_status text not null default 'new'
    check (fulfillment_status in ('new','accepted','making','packed','shipped','delivered','cancelled'));
alter table public.shop_orders
  add column if not exists tracking_number text;
alter table public.shop_orders
  add column if not exists delivered_at timestamptz;
alter table public.shop_orders
  add column if not exists promo_code text;
alter table public.shop_orders
  add column if not exists discount_usd_cents integer not null default 0
    check (discount_usd_cents >= 0);

create table if not exists public.shop_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.shop_orders(id) on delete set null,
  product_id text references public.merch_items(id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 160),
  last_message_at timestamptz not null default now(),
  customer_read_at timestamptz,
  staff_read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shop_threads_user_idx on public.shop_threads(user_id,last_message_at desc);
create index if not exists shop_threads_order_idx on public.shop_threads(order_id);
create table if not exists public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.shop_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','staff')),
  sender_user_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists shop_messages_thread_idx on public.shop_messages(thread_id,created_at);
create table if not exists public.shop_coupons (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  minimum_usd_cents integer not null default 0 check (minimum_usd_cents >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shop_coupon_percent_valid check (discount_type <> 'percent' or discount_value <= 100)
);
create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  order_id uuid not null references public.shop_orders(id),
  product_id text not null references public.merch_items(id),
  rating integer not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1500),
  photo_path text,
  moderation text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique(user_id,order_id,product_id),
  constraint shop_review_photo_path_valid check (photo_path is null or
    (photo_path like user_id::text || '/%' and photo_path !~ '[^a-zA-Z0-9_./-]'))
);
create index if not exists shop_reviews_product_idx on public.shop_reviews(product_id,moderation,created_at desc);

alter table public.shop_threads enable row level security;
alter table public.shop_messages enable row level security;
alter table public.shop_coupons enable row level security;
alter table public.shop_reviews enable row level security;

drop policy if exists "Thread owner or admin read" on public.shop_threads;
create policy "Thread owner or admin read" on public.shop_threads
 for select to authenticated using
 (user_id=auth.uid() or exists (select 1 from public.admin_users a where a.user_id=auth.uid()));

drop policy if exists "Thread messages visible to owner or admin" on public.shop_messages;
create policy "Thread messages visible to owner or admin" on public.shop_messages
 for select to authenticated using
 (exists (select 1 from public.shop_threads t where t.id=thread_id and
   (t.user_id=auth.uid() or exists (select 1 from public.admin_users a where a.user_id=auth.uid()))));
-- No client-side writes to chat. Server functions authenticate users and enforce thread ownership.

drop policy if exists "Coupons only visible to admin" on public.shop_coupons;
create policy "Coupons only visible to admin" on public.shop_coupons
 for select to authenticated using
 (exists (select 1 from public.admin_users a where a.user_id=auth.uid()));

drop policy if exists "Approved or own reviews visible" on public.shop_reviews;
create policy "Approved or own reviews visible" on public.shop_reviews
 for select to anon, authenticated using
 (moderation='approved' or (auth.uid() is not null and
   (user_id=auth.uid() or exists (select 1 from public.admin_users a where a.user_id=auth.uid()))));
-- No client INSERT/UPDATE/DELETE on reviews. Staff moderation and verified review creation run server-side.

drop policy if exists "Admin can view all shop orders" on public.shop_orders;
create policy "Admin can view all shop orders" on public.shop_orders
 for select to authenticated using
 (exists (select 1 from public.admin_users a where a.user_id=auth.uid()));

grant select on public.shop_threads,public.shop_messages,public.shop_coupons to authenticated;
grant select on public.shop_reviews to anon,authenticated;

-- Private review photo bucket. Files are not public until a verified, moderated review refers to them.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('shop-review-photos','shop-review-photos',false,5242880,
         array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
drop policy if exists "Users upload own review photos" on storage.objects;
create policy "Users upload own review photos" on storage.objects
 for insert to authenticated with check (
   bucket_id='shop-review-photos'
   and (storage.foldername(name))[1]=auth.uid()::text
   and (storage.extension(name)) in ('jpg','jpeg','png','webp')
 );
drop policy if exists "Read own or approved review photos" on storage.objects;
create policy "Read own or approved review photos" on storage.objects
 for select to anon,authenticated using (
   bucket_id='shop-review-photos'
   and (
     (auth.uid() is not null and (storage.foldername(name))[1]=auth.uid()::text)
     or exists (select 1 from public.admin_users a where a.user_id=auth.uid())
     or exists (select 1 from public.shop_reviews r where
        r.photo_path=storage.objects.name and r.moderation='approved')
   )
 );
commit;
notify pgrst, 'reload schema';
