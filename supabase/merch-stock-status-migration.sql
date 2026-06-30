alter table if exists public.merch_items add column if not exists stock_status text not null default 'in';
alter table if exists public.merch_items drop constraint if exists merch_items_stock_status_check;
alter table if exists public.merch_items add constraint merch_items_stock_status_check check (stock_status in ('in','out','preorder'));
update public.merch_items
set stock_status = case when in_stock = false then 'out' else coalesce(nullif(stock_status, ''), 'in') end
where stock_status is null or stock_status = '';
notify pgrst, 'reload schema';
