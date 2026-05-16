SEO city pages update

Что заменить/добавить:
1. Заменить /index.html - страница Тбилиси.
2. Добавить или заменить /tattoo-master-batumi.html - страница Батуми.
3. Заменить /en/index.html - английская страница Tbilisi.
4. Добавить или заменить /en/tattoo-artist-batumi.html - английская страница Batumi.
5. Заменить /assets/js/main.js на main.js из архива.
6. Заменить /sitemap.xml.
7. Если используешь Netlify Functions, положить contact.js в /netlify/functions/contact.js.

Что изменено:
- На странице Тбилиси в верхнем меню есть переход на Батуми.
- На странице Батуми в верхнем меню есть переход на Тбилиси.
- Страницы Батуми сделаны на основе полных страниц Тбилиси: профиль, работы, отзывы, цены, FAQ, контакты и форма сохранены.
- Формы используют одинаковый id contactForm и отправку через /.netlify/functions/contact.
- В main.js добавлено автозаполнение: имя, телефон и email сохраняются в браузере и подставляются на всех городских страницах.
- В контактах есть InkPpl.

После загрузки:
- Проверь /, /tattoo-master-batumi.html, /en/, /en/tattoo-artist-batumi.html.
- Отправь sitemap.xml заново в Google Search Console и Яндекс Вебмастер.
