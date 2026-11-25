-- MANUAL TEST-ONLY fixture for review and fulfillment UI, NOT a real payment.
-- Never run on the production Supabase project. No PayPal charge is made.
-- First run supabase/schema.sql, shop-orders-migration.sql and shop-crm-migration.sql.
-- Replace the customer email and item ID below with values from your ISOLATED TEST project.
-- Run in Supabase TEST SQL Editor as a privileged database owner.

do $test$
declare
  customer_id uuid;
  customer_email text := 'customer-test@example.com'; -- REPLACE
  product text := 'REPLACE_WITH_TEST_MERCH_ITEM_ID';  -- REPLACE
  price integer := 3000;
begin
  if customer_email='customer-test@example.com' or product='REPLACE_WITH_TEST_MERCH_ITEM_ID' then
    raise exception 'Replace both customer_email and product before running this TEST-only seed';
  end if;
  select id into customer_id from auth.users where lower(email)=lower(customer_email);
  if customer_id is null then raise exception 'Create test customer in Supabase Auth first'; end if;
  if not exists(select 1 from public.merch_items where id=product) then
    raise exception 'Create test merch item first';
  end if;
  insert into public.shop_orders(
    user_id,email,status,fulfillment_status,currency,
    subtotal_usd_cents,shipping_usd_cents,total_usd_cents,
    items,shipping_address,paid_at
  )values(
    customer_id,customer_email,'paid','accepted','USD',price,0,price,
    jsonb_build_array(jsonb_build_object(
      'id',product,'name','CRM Test T-Shirt','size','M','quantity',1,
      'unit_usd_cents',price,'preorder',true
    )),
    jsonb_build_object('name','Demo Buyer','phone','+995000000000',
      'city','Tbilisi','street','Test Only 1','postal','0101','country','GE'),
    now()
  );
end
$test$;

-- Now open shop-admin.html -> Orders, set delivery status to Delivered.
-- Log in as the test customer -> choose product from the review form.
