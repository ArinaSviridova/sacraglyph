# v9 админка: наличие, порядок, Etsy и SEO

## SQL перед использованием

Если в Supabase уже запускалась старая схема, запусти в SQL Editor:

```sql
alter table if exists public.merch_items add column if not exists stock_status text not null default 'in';
alter table if exists public.merch_items drop constraint if exists merch_items_stock_status_check;
alter table if exists public.merch_items add constraint merch_items_stock_status_check check (stock_status in ('in','out','preorder'));
update public.merch_items
set stock_status = case when in_stock = false then 'out' else coalesce(nullif(stock_status, ''), 'in') end
where stock_status is null or stock_status = '';
notify pgrst, 'reload schema';
```

Или запусти файл:

`/supabase/merch-stock-status-migration.sql`

## Как теперь работает наличие

В админке у товара есть три состояния:

- `В наличии`
- `Под заказ`
- `Нет в наличии`

На сайте товар без цены больше не показывает “цена по запросу”. Он показывает статус: “В наличии”, “Под заказ” или “Нет в наличии”. Если цена указана, сайт показывает цену и статус рядом.

## Как менять порядок

В админке у коллекций, товаров и работ есть ручка `☰`.

- перетащи коллекцию за `☰`, чтобы поменять порядок коллекций на странице мерча;
- перетащи товар внутри коллекции, чтобы поменять его порядок только в этой коллекции;
- перетащи работу в портфолио, чтобы поменять порядок работ.

После отпускания порядок сохраняется в Supabase автоматически.

## Массовое наличие

В мерче можно выделить несколько товаров галочками или выбрать все товары в коллекции, потом нажать:

- `В наличии`
- `Под заказ`
- `Нет в наличии`

## SEO фото

Новые SEO-поля остаются пустыми, пока ты сама их не заполнишь. Если старые автоматические SEO-подписи уже были записаны раньше, можно очистить их SQL-файлом:

`/supabase/clear-image-seo-fields.sql`

SEO-поля не видны как обычный текст на сайте. Они попадают внутрь HTML-картинок:

- `ALT` читают поисковики и скринридеры;
- `Title` может показываться при наведении мышкой.
