update public.merch_images
set alt_ru = '', alt_en = '', title_ru = '', title_en = '';

update public.tattoo_images
set alt_ru = '', alt_en = '', title_ru = '', title_en = '';

notify pgrst, 'reload schema';
