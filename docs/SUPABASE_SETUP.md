# Supabase setup for bazookatattoo CMS

## 1. Create project
Create a new project in Supabase.

## 2. Run SQL
Open SQL Editor and run:

`supabase/schema.sql`

It creates:
- admin_users
- merch_collections
- merch_items
- merch_images
- tattoo_works
- tattoo_images
- cms-media Storage bucket
- RLS policies

## 3. Create admin login
Go to Authentication -> Users -> Add user.
Create a user with your email and password.

Copy the user's UUID.

Then in SQL Editor run:

```sql
insert into public.admin_users (user_id, email)
values ('PASTE_USER_UUID_HERE', 'YOUR_EMAIL_HERE');
```

## 4. Add frontend keys
Open Project Settings -> API.
Copy:
- Project URL
- anon/public key

Paste them into:

`assets/js/supabase-config.js`

Never paste service_role key into frontend files.

## 5. Deploy
Push to GitHub and deploy on Netlify.
Open:

`/admin.html`

Log in with the Supabase Auth user.

## 6. Move old content into Supabase
In admin, open the tab "Перенос старого контента".

Click:
- "Перенести старые тату-работы"
- "Перенести старый мерч"

The old tattoo works and merch are already extracted into. Existing merch collections are created automatically during import:

`assets/data/seed-content.js`

The transfer buttons fetch old local images from `/assets/img/works` and `/assets/img/merch`, upload them to Supabase Storage, and save the new public Storage URLs in the database.

For all new uploads use `.webp` only. The admin form blocks non-webp images.

In admin you can set:
- collection display order with `Номер коллекции на сайте`
- merch item display order with `Номер товара внутри коллекции`
- tattoo work display order with `Номер работы на сайте`

## 7. Can old image folders be deleted?
Only after the transfer buttons finish successfully and you check the deployed site.

After verification, you can remove:
- `assets/img/works/*`
- `assets/img/merch/*`

Do not delete background, hero, favicon, review, SEO, or other image folders unless you confirm they are no longer referenced.

## Как добавить ещё одного админа

Одного создания пользователя в `Authentication -> Users` недостаточно. Это только логин. Чтобы человек мог зайти именно в админку сайта, его UUID надо добавить в таблицу `admin_users`.

1. Supabase -> Authentication -> Users.
2. Открой нового пользователя.
3. Скопируй его `User UID`.
4. SQL Editor -> New query.
5. Выполни:

```sql
insert into public.admin_users (user_id, email)
values ('PASTE_USER_UUID_HERE', 'email@example.com')
on conflict (user_id) do update set email = excluded.email;
```

После этого пользователь сможет войти в `/admin.html` своим email и паролем.
