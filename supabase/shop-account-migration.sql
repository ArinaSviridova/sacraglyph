begin;
alter table public.shop_orders alter column user_id drop not null;
alter table public.shop_orders add column order_number bigint generated always as identity (start with 10001) unique;
alter table public.shop_orders add column guest_key_hash text;
alter table public.shop_orders add column phone_digits text generated always as (regexp_replace(shipping_address->>'phone','[^0-9]','','g')) stored;

-- Preserve messages from every legacy topic before removing duplicate topics.
lock table public.shop_threads, public.shop_messages in share row exclusive mode;
create temporary table merged_threads on commit drop as
select id,first_value(id) over(partition by user_id order by created_at,id) as keeper from public.shop_threads;
update public.shop_messages m set thread_id=t.keeper from merged_threads t where m.thread_id=t.id and t.id<>t.keeper;
delete from public.shop_threads t using merged_threads m where t.id=m.id and m.id<>m.keeper;
update public.shop_threads t set last_message_at=coalesce((select max(created_at) from public.shop_messages where thread_id=t.id),t.created_at);
update public.shop_threads t set subject=left(u.email,160) from auth.users u where t.user_id=u.id and u.email is not null;
alter table public.shop_threads add unique(user_id);

create table public.shop_status_mail (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.shop_orders(id),
 state text not null, tracking text, sent_at timestamptz, claimed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.shop_status_mail enable row level security;
revoke all on public.shop_status_mail from public,anon,authenticated;
grant all on public.shop_status_mail to service_role;
create function public.shop_queue_status_mail() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.shop_status_mail(order_id,state,tracking) values(new.id,new.fulfillment_status,new.tracking_number);
 return new;
end
$$;
create trigger shop_status_changed after update of fulfillment_status on public.shop_orders for each row
when(old.fulfillment_status is distinct from new.fulfillment_status) execute function public.shop_queue_status_mail();
notify pgrst,'reload schema';
commit;
