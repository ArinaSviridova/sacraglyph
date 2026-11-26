-- Local shop upgrade. Preserve previous orders and treat custom-order stock as unavailable.
update public.merch_items set stock_status='out', in_stock=false where stock_status='preorder';
update public.merch_items set title_ru='Футболка Black 2 (тест)',title_en='Black 2 T-shirt (demo)'
where id='shop-demo-preorder' and collection_id='shop-demo';
alter table public.merch_items drop constraint if exists merch_items_stock_status_check;
alter table public.merch_items add constraint merch_items_stock_status_check check(stock_status in ('in','out'));
alter table public.shop_orders add column if not exists receipt_sent_at timestamptz;
alter table public.shop_orders add column if not exists receipt_attempt_at timestamptz;
alter table public.shop_orders add column if not exists checkout_language text not null default 'ru';
notify pgrst,'reload schema';
