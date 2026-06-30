# Почему могла пропасть первая фотография в портфолио

Публичная страница сначала берёт работы из Supabase. Если у первой работы в базе нет строки в `tattoo_images` или фото в Storage не загрузилось, сайт больше не должен показывать пустую карточку.

В этой версии добавлен fallback для старых работ с id вида `legacy-work-12`: сайт автоматически подставляет старое локальное фото `/assets/img/works/work-12-900.webp`, если ссылка из Supabase отсутствует или не открывается.

Что проверить в Supabase:

```sql
select id, sort_order, description_ru
from public.tattoo_works
order by sort_order asc;

select work_id, image_url, sort_order
from public.tattoo_images
order by work_id, sort_order asc;
```

У работы с первым номером должна быть хотя бы одна строка в `tattoo_images`. Если её нет, открой работу в админке, добавь .webp-фото и сохрани.
