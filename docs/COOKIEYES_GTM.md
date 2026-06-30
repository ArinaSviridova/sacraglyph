# CookieYes через Google Tag Manager

Сайт уже содержит контейнер Google Tag Manager: `GTM-PJJQ6M2J`.
CookieYes по гайду ставится именно внутри GTM, а не отдельным скриптом в HTML.

## Website key

Из скриншота CookieYes:

```text
799f6782291222d2f454e007bc636b36
```

## Что сделать в GTM

1. Открыть Google Tag Manager и выбрать контейнер сайта.
2. Перейти в `Tags`.
3. Нажать `New`.
4. Назвать тег, например `CookieYes CMP`.
5. В `Tag Configuration` нажать `Discover more tag types in the Community Template Gallery`.
6. Найти `CookieYes CMP` от `cookieyeshq`.
7. Нажать `Add to workspace`.
8. В поле `Website Key` вставить:

```text
799f6782291222d2f454e007bc636b36
```

9. В `Default Consent Settings` добавить настройки по умолчанию для региона `All`:

```text
ad_storage = denied
analytics_storage = denied
ad_user_data = denied
ad_personalization = denied
functionality_storage = denied
personalization_storage = denied
security_storage = granted
```

10. В `Triggering` выбрать `Consent Initialization - All Pages`.
11. Нажать `Save`.
12. Открыть `Preview` и проверить сайт.
13. Нажать `Submit` и опубликовать GTM-контейнер.

## Важно про рекламные и аналитические теги

Google Ads, GA4, Meta Pixel и другие рекламные теги должны быть настроены с consent checks в GTM. Иначе баннер будет красивой моральной поддержкой, а не реальным consent mode.

Для Meta Pixel желательно запускать тег только после согласия на marketing cookies / ad_storage.
