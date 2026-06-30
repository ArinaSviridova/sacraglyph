-- Quick fix if admin shows: column merch_images_1.alt_ru does not exist
-- Run this in Supabase SQL Editor, then refresh /admin.html.

alter table if exists public.merch_images add column if not exists alt_ru text default '';
alter table if exists public.merch_images add column if not exists alt_en text default '';
alter table if exists public.merch_images add column if not exists title_ru text default '';
alter table if exists public.merch_images add column if not exists title_en text default '';

alter table if exists public.tattoo_images add column if not exists alt_ru text default '';
alter table if exists public.tattoo_images add column if not exists alt_en text default '';
alter table if exists public.tattoo_images add column if not exists title_ru text default '';
alter table if exists public.tattoo_images add column if not exists title_en text default '';

notify pgrst, 'reload schema';
