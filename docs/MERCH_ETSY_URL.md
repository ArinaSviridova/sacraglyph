# Per-product Etsy links

Each merch item can now have its own Etsy URL.

In `/admin.html`, edit a merch item and fill the field:

`Ссылка Etsy для кнопки “Купить на Etsy”`

When a visitor opens that product card and clicks `Купить на Etsy`, the site opens this URL.

If the field is empty, the button falls back to the general shop:

`https://yugenmagazart.etsy.com`

Run `/supabase/merch-etsy-url-migration.sql` once in Supabase SQL Editor before using this field on an existing database.
