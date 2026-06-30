# Supabase setup for bazookatattoo CMS

## 1. Create project
Create a new project in Supabase.

## 2. Run SQL
Open SQL Editor and run:

`supabase/schema.sql`

It creates:
- admin_users
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

## 6. Move old tattoo works into Supabase
In admin, open the tab "Перенос старых работ" and click "Перенести старые тату-работы".

The old descriptions are already extracted into:

`assets/data/seed-content.js`

Old images use existing local site paths. New images uploaded from admin go to Supabase Storage.
