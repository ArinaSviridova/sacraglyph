-- LOCAL DEVELOPMENT ONLY. Synthetic demo merchandise; no customer data.
-- Do not push this seed into a production database.
insert into public.merch_collections
  (id,title_ru,title_en,text_ru,text_en,is_published,sort_order)
values
  ('shop-demo','Тестовая коллекция','Demo collection',
   'Демонстрационные товары для безопасной проверки магазина.',
   'Demo products for safe local shop testing.',true,0)
on conflict (id) do nothing;

insert into public.merch_items
  (id,collection_id,title_ru,title_en,category_ru,category_en,
   collection_ru,collection_en,description_ru,description_en,
   prices,in_stock,stock_status,is_published,sort_order)
values
  ('shop-demo-in','shop-demo','Футболка Black 1 (тест)','Black 1 T-shirt (demo)',
   'Футболка','T-shirt','Тестовая коллекция','Demo collection',
   'В наличии. Тестовая карточка, не реальный остаток.',
   'In stock. Demo listing, not real inventory.',
   '[{"currency":"USD","amount":"29.00"},{"currency":"GEL","amount":"79.00"}]'::jsonb,
   true,'in',true,1),
  ('shop-demo-preorder','shop-demo','Футболка Black 2 (предзаказ)','Black 2 T-shirt (preorder demo)',
   'Футболка','T-shirt','Тестовая коллекция','Demo collection',
   'Каждое изделие индивидуально и может отличаться от фотографии.',
   'Each piece is unique and may differ from the photo.',
   '[{"currency":"USD","amount":"35.00"},{"currency":"GEL","amount":"95.00"}]'::jsonb,
   true,'preorder',true,2),
  ('shop-demo-out','shop-demo','Футболка Black 3 (нет в наличии)','Black 3 T-shirt (sold out demo)',
   'Футболка','T-shirt','Тестовая коллекция','Demo collection',
   'Демонстрация товара без возможности покупки.',
   'Demo sold-out product.',
   '[{"currency":"USD","amount":"31.00"},{"currency":"GEL","amount":"85.00"}]'::jsonb,
   false,'out',true,3)
on conflict (id) do nothing;

insert into public.merch_images(id,item_id,image_url,sort_order)
values
  ('shop-demo-img-1','shop-demo-in','/assets/img/price-placeholder.jpg',0),
  ('shop-demo-img-2','shop-demo-preorder','/assets/img/price-placeholder.jpg',0),
  ('shop-demo-img-3','shop-demo-out','/assets/img/price-placeholder.jpg',0)
on conflict (id) do nothing;
