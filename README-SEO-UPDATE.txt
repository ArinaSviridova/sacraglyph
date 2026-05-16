Что внутри

1. index.html переписан под главный SEO-запрос: тату мастер в Тбилиси.
2. Создана отдельная страница под Батуми: tattoo-master-batumi.html.
3. Создана английская главная: en/index.html под запрос tattoo artist in Tbilisi.
4. Создана английская страница под Батуми: en/tattoo-artist-batumi.html.
5. Обновлены sitemap.xml и sitemap-images.xml.
6. robots.txt оставлен рабочим, там уже подключены оба sitemap.
7. В HTML усилены OG/Twitter image и LocalBusiness/FAQ schema.

Как заливать

- Залей содержимое папки в корень проекта.
- main.js должен лежать на сайте как /assets/js/main.js.
- merch.js должен лежать как /assets/js/merch.js.
- contact.js положен также в netlify/functions/contact.js, чтобы Netlify Function работала из правильной папки.

После заливки

- В Google Search Console отправь sitemap.xml заново.
- Попроси переиндексацию страниц: /, /en/, /tattoo-master-batumi.html, /en/tattoo-artist-batumi.html.
- Если хочешь картинку справа в выдаче, добавь нормальную Google Business Profile карточку и регулярно загружай туда фото работ. Код помогает, но Google всё равно делает вид, что он загадочная лесная сущность.
