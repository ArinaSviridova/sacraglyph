begin;
create function public.shop_valid_sizes(stock jsonb) returns boolean
language sql immutable strict set search_path='' as $$
 select case when jsonb_typeof(stock)<>'object' or stock='{}'::jsonb then false else not exists (
 select 1 from jsonb_each(stock) e where length(e.key)>32 or trim(e.key)<>e.key
 or jsonb_typeof(e.value)<>'number' or e.value::text !~ '^(0|[1-9][0-9]{0,5})$') end
$$;
alter table public.merch_items add column size_stock jsonb not null default '{"":1}' check(public.shop_valid_sizes(size_stock));
alter table public.shop_orders add column stock_held boolean not null default false;

create function public.shop_apply_stock() returns trigger language plpgsql set search_path='' as $$
declare
 line record;
 stock jsonb;
 available integer;
 restore boolean := false;
begin
 if tg_op='UPDATE' then
   if old.stock_held and new.fulfillment_status='cancelled' and old.fulfillment_status<>'cancelled' then
     if old.status='pending' then raise exception 'Capture awaiting reconciliation'; end if;
     restore:=true;
   elsif old.stock_held or old.status='paid' or old.fulfillment_status='cancelled' then return new;
   end if;
 end if;
 if not restore and not new.stock_held and new.status<>'paid' then return new; end if;
 for line in select i->>'id' as id,coalesce(i->>'size','') as size,sum((i->>'quantity')::integer)::integer as qty
   from jsonb_array_elements(new.items) i group by 1,2 order by 1,2 loop
   select size_stock into stock from public.merch_items where id=line.id
   and (restore or (in_stock and stock_status='in' and is_published)) for update;
   available:=(stock->>line.size)::integer;
   if not restore and (available is null or line.qty<1 or available<line.qty) then
     raise sqlstate 'PT409' using message='Selected size or quantity no longer available';
   end if;
   update public.merch_items set size_stock=jsonb_set(stock,array[line.size],
     to_jsonb(case when restore then coalesce(available,0)+line.qty else available-line.qty end))
     where id=line.id;
 end loop;
 update public.shop_orders set stock_held=not restore where id=new.id and stock_held is distinct from (not restore);
 return new;
end
$$;
-- AFTER INSERT only fires for rows actually inserted (including idempotent guest checkout).
create trigger shop_take_stock after insert or update of status,fulfillment_status,stock_held on public.shop_orders
 for each row when (pg_trigger_depth()=0) execute function public.shop_apply_stock();
notify pgrst,'reload schema';
commit;
