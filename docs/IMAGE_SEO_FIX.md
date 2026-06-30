# Image SEO fields and Supabase fix

If the admin panel shows:

`column merch_images_1.alt_ru does not exist`

run this file in Supabase SQL Editor:

`/supabase/image-seo-migration.sql`

Then refresh `/admin.html`.

These columns store SEO fields for every image:

- `alt_ru`
- `alt_en`
- `title_ru`
- `title_en`

## How image SEO works

`alt` is the important field. It describes what is in the image for search engines and screen readers.

Good examples:

- `Черная футболка Yugen с белым lettering-принтом на груди`
- `Абстрактная blackwork-татуировка на предплечье`
- `Black Yugen T-shirt with white lettering print on the chest`

Bad examples:

- `tattoo, tattoo tbilisi, tattoo batumi, best tattoo, blackwork`
- `image 1`
- empty text

`title` is optional and shorter. Some browsers show it on hover.
