# game25

Браузерные платформер и tower defense на общем TypeScript Canvas ECS.
Оборона — играбельный прототип по GDD: две главы, масло и горение,
две реликвии, Canvas UI и сохранение забега. Баланс пока проверочный.

- [Новый Game Design Document](GDD.md)
- [Сжатый архив прежних документов](old.md)
- [Предыдущая реализация обороны](deprecated/defense/README.md)
- [Правила работы с репозиторием](AGENTS.md)
- [Видео платформера](docs/preview.mp4)

## Запуск

```bash
npm ci
npm run dev
```

Оборона: `?game=defense&seed=example`. Платформер: `?game=jumper`.

## Проверки и сборка

`npm run smoke` — форматирование исходников, lint, типы, тесты и сборка библиотеки.
`npm run build:site` — сайт. `npm run test:browser` — Playwright;
нужен Chromium (`npx playwright install chromium`) либо установленный Chrome:
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser`.
Остальные команды — в package.json.

## Добавление контента обороны

Определения башен, врагов, реликвий, эффектов и волн: `src/games/defense/definitions/`.
Идентификаторы и данные: `model.ts`. Башня задаёт параметры атаки и список эффектов;
UI читает каталог. Новая комбинация существующих эффектов не требует менять ECS.
Новый тип поведения добавляется в `effects/` и проверяется через сессию.

Общие Canvas-панели и виджеты, обработчик жестов `PointerGesture` и превью
перетаскивания `DragPreview` находятся в `src/render/ui/`. Игры передают
содержимое, оформление и действия; правила покупки и обмена остаются в defense.

Графика: `src/games/defense/assets/medieval-atlas.png` — сгенерированный атлас;
исходный промпт лежит рядом. Прототип не использует внешние сетевые ассеты.
