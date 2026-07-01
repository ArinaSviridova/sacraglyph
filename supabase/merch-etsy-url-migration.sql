-- Add per-product Etsy URL for merch items
alter table if exists public.merch_items
add column if not exists etsy_url text default 'https://yugenmagazart.etsy.com';

update public.merch_items
set etsy_url = 'https://yugenmagazart.etsy.com'
where etsy_url is null or etsy_url = '';

notify pgrst, 'reload schema';
