-- bazookatattoo Supabase schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.merch_items (
  id text primary key default gen_random_uuid()::text,
  title_ru text not null,
  title_en text not null,
  category_ru text default 'Мерч',
  category_en text default 'Merch',
  collection_ru text default 'Мерч',
  collection_en text default 'Merch',
  description_ru text default '',
  description_en text default '',
  prices jsonb not null default '[]'::jsonb,
  in_stock boolean not null default true,
  is_published boolean not null default true,
  instagram text default 'https://www.instagram.com/yugenmagaz/',
  telegram text default 'https://t.me/bazookatattoo',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merch_images (
  id text primary key default gen_random_uuid()::text,
  item_id text not null references public.merch_items(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tattoo_works (
  id text primary key default gen_random_uuid()::text,
  description_ru text not null,
  description_en text not null,
  alt_ru text default '',
  alt_en text default '',
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tattoo_images (
  id text primary key default gen_random_uuid()::text,
  work_id text not null references public.tattoo_works(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists merch_items_touch_updated_at on public.merch_items;
create trigger merch_items_touch_updated_at
before update on public.merch_items
for each row execute function public.touch_updated_at();

drop trigger if exists tattoo_works_touch_updated_at on public.tattoo_works;
create trigger tattoo_works_touch_updated_at
before update on public.tattoo_works
for each row execute function public.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.merch_items enable row level security;
alter table public.merch_images enable row level security;
alter table public.tattoo_works enable row level security;
alter table public.tattoo_images enable row level security;

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

drop policy if exists "Admin users can read own admin row" on public.admin_users;
create policy "Admin users can read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can read published merch" on public.merch_items;
create policy "Public can read published merch"
on public.merch_items
for select
to anon, authenticated
using (is_published = true or public.is_cms_admin());

drop policy if exists "Admins can insert merch" on public.merch_items;
create policy "Admins can insert merch"
on public.merch_items
for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update merch" on public.merch_items;
create policy "Admins can update merch"
on public.merch_items
for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete merch" on public.merch_items;
create policy "Admins can delete merch"
on public.merch_items
for delete
to authenticated
using (public.is_cms_admin());

drop policy if exists "Public can read merch images" on public.merch_images;
create policy "Public can read merch images"
on public.merch_images
for select
to anon, authenticated
using (
  exists (
    select 1 from public.merch_items
    where merch_items.id = merch_images.item_id
    and (merch_items.is_published = true or public.is_cms_admin())
  )
);

drop policy if exists "Admins can insert merch images" on public.merch_images;
create policy "Admins can insert merch images"
on public.merch_images
for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update merch images" on public.merch_images;
create policy "Admins can update merch images"
on public.merch_images
for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete merch images" on public.merch_images;
create policy "Admins can delete merch images"
on public.merch_images
for delete
to authenticated
using (public.is_cms_admin());

drop policy if exists "Public can read published tattoo works" on public.tattoo_works;
create policy "Public can read published tattoo works"
on public.tattoo_works
for select
to anon, authenticated
using (is_published = true or public.is_cms_admin());

drop policy if exists "Admins can insert tattoo works" on public.tattoo_works;
create policy "Admins can insert tattoo works"
on public.tattoo_works
for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update tattoo works" on public.tattoo_works;
create policy "Admins can update tattoo works"
on public.tattoo_works
for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete tattoo works" on public.tattoo_works;
create policy "Admins can delete tattoo works"
on public.tattoo_works
for delete
to authenticated
using (public.is_cms_admin());

drop policy if exists "Public can read tattoo images" on public.tattoo_images;
create policy "Public can read tattoo images"
on public.tattoo_images
for select
to anon, authenticated
using (
  exists (
    select 1 from public.tattoo_works
    where tattoo_works.id = tattoo_images.work_id
    and (tattoo_works.is_published = true or public.is_cms_admin())
  )
);

drop policy if exists "Admins can insert tattoo images" on public.tattoo_images;
create policy "Admins can insert tattoo images"
on public.tattoo_images
for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update tattoo images" on public.tattoo_images;
create policy "Admins can update tattoo images"
on public.tattoo_images
for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete tattoo images" on public.tattoo_images;
create policy "Admins can delete tattoo images"
on public.tattoo_images
for delete
to authenticated
using (public.is_cms_admin());

insert into storage.buckets (id, name, public)
values ('cms-media', 'cms-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read cms media" on storage.objects;
create policy "Public can read cms media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cms-media');

drop policy if exists "Admins can upload cms media" on storage.objects;
create policy "Admins can upload cms media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cms-media' and public.is_cms_admin());

drop policy if exists "Admins can update cms media" on storage.objects;
create policy "Admins can update cms media"
on storage.objects
for update
to authenticated
using (bucket_id = 'cms-media' and public.is_cms_admin())
with check (bucket_id = 'cms-media' and public.is_cms_admin());

drop policy if exists "Admins can delete cms media" on storage.objects;
create policy "Admins can delete cms media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'cms-media' and public.is_cms_admin());
