# ORBIELLA — сайт

Одностраничный сайт набора в удалённую работу (видеочат), RU/EN, светлая и тёмная темы. Без сервера: заявка собирается в браузере и открывается в Telegram.

## Структура
- `site/index.html` — версия, которая сейчас на https://orbiella.vercel.app (полная, с подписью под телефоном)
- `site/index.full-no-caption.html` — та же полная версия без подписи под телефоном (черновик)
- `site/index.short.html` — короткая версия (≈540 слов), черновик
- `src-full/` — исходники полной версии (с правками по аудиту)
- `src-short/` — исходники короткой версии
- `tools/` — скрипты сборки (PowerShell) и перевода; пути внутри указывают на рабочую папку автора, перед запуском поправьте `$p`
- `tests/` — Playwright-тесты (`playwright-full.js`, `playwright-short.js`); запуск: `SITE_URL=file:///.../index.html SHOTS_DIR=./shots node tests/playwright-short.js`

## Как устроена сборка
`body.html` + `style.css` + `app.js` + `engine.js` + `head.html` собираются в один `index.html`. Русский — основной язык, английский — словарь `dict.json`, который собирается из `en.txt` и `en-extra.txt`.

## Деплой
Статическая папка `site/` на Vercel (`vercel deploy --prod`).