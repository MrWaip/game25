# fe-platformer (game 25)

2D платформер реализованный на Canvas, вдохновленный DoodleJump

> Большая часть ассетов сгенерирована нейросетями (спрайты, картинки, музыка)

## Preview:

![Мобильная версия игры](docs/preview.mp4){width=400px}

## Tests

Запуск:

```bash
npm test
```

Для тестов геймплея/систем есть `testkit` — быстрый harness вокруг ECS:

- `createHarness()` создаёт `World` с зарегистрированными game-компонентами и системами (по умолчанию без рендера/аудио)
- `h.step(frames, dt)` / `h.runFor(seconds)`
- `h.input` — управляемый `FakeInputStrategy`
- `h.spawn.*` — фабрики сущностей (player/platform/coin/camera/spawner/wall)
- `h.events(name)` — собранные события `eventBus`

## Build
`npm run build:site`
`npm run build:lib`
`npx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc`
`npx tauri build`
