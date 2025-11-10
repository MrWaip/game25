# Архитектура проекта (конспект)

Это небольшая шпаргалка «как тут всё устроено», чтобы быстро войти в контекст в новых диалогах.

## TL;DR

- **Архитектура**: ECS (Entity–Component–System) поверх `World`.
- **Главный цикл**: `Engine.start()` → `requestAnimationFrame` → fixed timestep (`world.fixedUpdate(dt = 1 / simulationHz)` может вызываться несколько раз) → `world.update(frameDt)`.
- **Инициализация**: `createGame()` регистрирует компоненты/системы/ассеты, инициализирует RNG и собирает `Engine`.
- **Коммуникация систем**: `World.eventBus` (`EventBus<GameEvents>`) для `trigger/collision/death/audioPlay/coinCollected/countersUpdated`.
- **Рендер**: `RenderSystem` → `CanvasRenderer` (Canvas 2D) + camera transform, culling по AABB, слои `ORDERED_LAYERS`.
- **Физика**: broadphase через quadtree (`PhysicsWorld`) вокруг камеры + swept AABB/разрешение в `PhysicsSystem`.

## Точки входа и жизненный цикл

- **Старт приложения**: `src/main.ts`
  - выбирает стратегию ввода (touch/keyboard) и viewport (scaled для touch)
  - прокидывает `targetFps: 144`, `seed`/`debug` из query-параметров
  - вызывает `createGame({ ... })`
- **Сборка игры**: `src/export/index.ts`
  - создаёт `<canvas>` + (для touch) DOM-хинты управления
  - создаёт `World`, `PhysicsWorld`, `AssetsManager`, `CanvasRenderer`, `AudioPlayer`
  - `GlobalRandom.initialize(seed ?? "42")`
  - подписывает внешний `onEvent` через `eventBus.onAll` (async через `setTimeout`)
  - **регистрирует компоненты/системы** в `World` (порядок важен; см. `src/game/setup.ts`)
  - создаёт `Engine`, вызывает `engine.initialize()`, затем `engine.start()`; `simulationHz = targetFps ?? 60`
  - подписывается на `visibilitychange` чтобы ставить на паузу/возобновлять звук
- **Стартовая сцена**: `src/core/engine.ts`
  - добавляет базовые сущности: background, counter UI, fps, player, стартовая платформа (`kind: "default"`), камера, спавнер платформ, стены
  - стены: две боковые следуют за камерой по Y (`FollowCameraComponent`), верхняя — статична; размеры из `GAME_CONSTANTS`
  - грузит ассеты (`assetsManager.initialize()`)
  - инициализирует системы (`world.initialize()`)
  - запускает фоновой звук через `eventBus.emit("audioPlay", ...)`

## ECS: World / Entities / Components / Systems

### `World` (ядро ECS)

Файл: `src/core/world.ts`

- **Entity**: просто `number` (инкрементальный id).
- **Компоненты** хранятся как:
  - `Map<ComponentClass, Map<Entity, ComponentInstance>>`
  - компонент нужно **зарегистрировать** через `world.registerComponent(Ctor)` перед использованием.
- **Системы** (`ISystem`) регистрируются через `world.registerSystem(system)` и вызываются в `world.fixedUpdate(dt)` / `world.update(dt)` в порядке регистрации.
- **Запросы**:
  - `world.query(A, B, ...)` возвращает генератор по энтити, у которых есть все указанные компоненты
  - есть оптимизация «редчайшей мапы» для multi-component query
  - `world.queryByLayer(layer)` — отдельная индексация по `RenderLayers` для рендера
- **Debug**:
  - при `debug: true` создаётся специальная debug-сущность с `DebugRenderComponent`
  - `world.debugAABB(...)` / persistent AABB для визуализации коллизий/зон
- **Время игры**:
  - `world.getCurrentTime()` хранит миллисекунды; накапливается в `fixedUpdate(dt)` как `dt * 1000`

### Entities (фабрики)

Папка: `src/entities/`

Сущности создаются **функциями-фабриками** вида `createPlayer(...)`, `createPlatform(...)` и т.п., которые возвращают массив компонент.
`Engine` использует эти фабрики и добавляет их в `World`.

### Components (данные)

Папка: `src/components/`

Компоненты — тонкие структуры данных (позиция/скорость/коллайдер/рендер/инпут/состояния).
Мутации обычно происходят прямо внутри систем (например, обновление `velocity.value`, `transform.move(...)`).

#### Мини-глоссарий ключевых компонентов

- **`Transform`** (`positionComponent.ts`): позиция в world-координатах (Vec2). Часто используется почти везде.
- **`VelocityComponent`**: скорость (Vec2), применяется физикой/движением.
- **`Gravity`**: ускорение (Vec2), `PhysicsSystem` добавляет к скорости.
- **`ColliderComponent`**: AABB-параметры (`size`, `offset`) + флаги `isTrigger` (не блокирует, но шлёт `trigger`) и `oneWay` (платформа “сверху”).
- **`CollidedComponent`**: результат столкновений на текущем кадре; даёт “синтетические” флаги (`isGrounded`, `hitCeiling`, `isAgainstWall`).
- **`InputComponent`**: “нажатия” (jump/left/right/…) от стратегии ввода; пишет `InputSystem`, читают movement/jump системы.
- **`Camera`**: параметры камеры (`viewportSize`, `zoom`, `followFor`, `highestY`).
- **`FollowCameraComponent`**: заставляет сущность следовать камере по X/Y (полезно для стен/фон/интерфейса).
- **`RenderLayerComponent`**: слой рендера (`RenderLayers`), чтобы попадать в `world.queryByLayer`.
- **`SpriteRenderComponent`**: отрисовка статичного/тайлового спрайта.
- **`AnimationState/AnimationTable/AnimationTimer`**: состояние анимации, набор клипов, текущий кадр.
- **`TextRenderComponent`**: рендер текста (в т.ч. `static: true` для UI).
- **`CounterComponent`**: счёт (coins/height/falls), обновляется системами.
- **`PlayerComponent`**: маркер игрока (для query).
- **`PlatformSpawner`**: хранит `minX/maxX/triggerRange`, `lastPlatform` для генерации новых платформ.
- **`PlatformComponent`**: тип/свойства платформы.
- **`FPSComponent`**: данные для FPS-виджета.
- **`DebugRenderComponent`**: буфер отладочной геометрии (AABB), используется через `world.debug*`.

### Systems (логика)

Папка: `src/systems/`

Интерфейс: `src/systems/system.ts`

Системы реализуют `update(world, dt)` и (опционально) `initialize/destroy`.
Критично: **порядок регистрации** систем в `createGame()` задаёт пайплайн кадра (`src/game/setup.ts`).

Текущий пайплайн (fixed-update, если не указано иначе):

- `InputSystem` (fixed): читает `InputStrategy`, пишет `InputComponent`, подсвечивает touch-hints.
- `MovementSystem` (fixed): ускорение/фрикцион скорости по вводу.
- `JumpSystem` (fixed): прыжок/вариативная высота; эмитит `audioPlay: jump`.
- `PhysicsWorld` (fixed): строит quadtree по коллайдерам внутри viewport камеры + padding.
- `CoinSystem`: слушает `trigger`, удаляет монеты, эмитит `audioPlay`/`coinCollected`.
- `PhysicsSystem` (fixed): гравитация, swept AABB, пишет `CollidedComponent`, эмитит `collision/trigger`, обрезает скорость.
- `FacingSystem` (update): направление персонажа по `VelocityComponent`.
- `CameraSystem` (fixed): центр по X, удерживает `highestY` игрока, двигает сущности с `FollowCameraComponent`.
- `DeathSystem` (fixed): смерть при падении ниже нижней границы камеры, `audioPlay: hurt`.
- `RestartSystem`: на `death` сбрасывает игрока и камеру к стартовым координатам.
- `PlatformSpawnSystem` (fixed): при достижении триггера генерирует пачку платформ/монет в безопасном AABB.
- `PlatformSystem` (fixed + события): управляет таймерами/состояниями платформ (iced → исчезновение/восстановление).
- `AnimatedSpriteSystem` (update): таймеры анимаций.
- `PlayerAnimationStateSystem` (update): выбор клипов игрока по скорости/grounded.
- `AudioSystem` (события): слушает `audioPlay`, пауза/резюм при `document.hidden`.
- `CounterSystem` (fixed): считает высоту/монеты/падения, обновляет UI и эмитит `countersUpdated`.
- `FPSSystem` (update): считает FPS, обновляет UI.
- `RenderSystem` (update): culling по AABB, рендер по слоям.

## События (Event Bus)

Файл: `src/systems/eventBus.ts` + типы: `src/primitives/gameEvents.ts`

- `World` содержит `eventBus: EventBus<GameEvents>`.
- Системы общаются через события, не создавая жёстких зависимостей.
  - пример: `PhysicsSystem` эмитит `"collision"` / `"trigger"`
  - пример: `Engine`/геймплей эмитит `"audioPlay"`, который слушает `AudioSystem`

### Таблица событий (`GameEvents`)

- **`trigger { initiator, target }`**
  - **emit**: `PhysicsSystem` (когда `ColliderComponent.isTrigger = true`)
  - **use-case**: подбор монет, зоны, триггеры логики
- **`collision { initiator, target, normal, time }`**
  - **emit**: `PhysicsSystem` (твёрдые столкновения)
  - **use-case**: реакции на контакт (например, приземление/удар), специфичная логика объектов
- **`death { entity }`**
  - **emit**: `DeathSystem` (когда игрок “упал” ниже нижней границы камеры)
  - **listen**: `RestartSystem` (сброс позиции игрока/камеры), `CounterSystem` (инкремент попыток)
- **`audioPlay { name, loop?, volume? }`**
  - **emit**: `Engine`, `DeathSystem`, `JumpSystem`, `CoinSystem`, геймплей
  - **listen**: `AudioSystem` → `AudioPlayer`
- **`coinCollected { coin, player }`**
  - **emit**: `CoinSystem` (при `trigger` игрока с монетой)
  - **listen**: `CounterSystem` (инкремент монет)
- **`countersUpdated { coins, height, falls }`**
  - **emit**: `CounterSystem` (при изменении любого счётчика)
  - **use-case**: наружные слушатели через `createGame({ onEvent })`

## Рендер (Canvas 2D)

- **Система**: `src/systems/renderSystem.ts`
  - находит текущую камеру (entity с `Camera` + `Transform`)
  - чистит кадр, выставляет камеру в renderer
  - делает **culling** по AABB, собранным из спрайта/анимации/примитива сущности (static-рендеры рисуются всегда)
  - рендерит по слоям (`ORDERED_LAYERS`, `RenderLayerComponent`, `world.queryByLayer`)
- **Рендерер**: `src/render/renderer.ts` (`CanvasRenderer`)
  - world → camera → canvas преобразования
  - умеет: sprite tiling/fit, animated spritesheet, primitives, debug AABB, текст
  - `setCamera()` нормализует zoom под фактический canvas size

## Физика и коллизии

- **Broadphase**: `src/systems/physicsWorld.ts` (`PhysicsWorld`)
  - строит quadtree (`@timohausmann/quadtree-ts`) по AABB коллайдеров
  - вставляет только коллайдеры, которые пересекаются с «расширенной зоной камеры» (viewport + padding)
- **Narrowphase + интеграция**: `src/systems/physicsSystem.ts`
  - применяет гравитацию (`Gravity`) к скорости
  - вычисляет swept AABB столкновения на векторе перемещения кадра
  - триггеры → `eventBus.emit("trigger", ...)`
  - твёрдые столкновения → `CollidedComponent` + `eventBus.emit("collision", ...)`
  - обнуляет скорость по осям при ударе (земля/потолок/стены)
  - обновляет позицию с «slide» по касательной
  - поддерживает one-way платформы (`ColliderComponent.oneWay`)

## Камера

- `CameraSystem` (`src/systems/cameraSystem.ts`):
  - фиксирует X по центру viewport
  - следит за игроком по Y, но только в сторону «вверх» (через `highestY`)
  - для сущностей с `FollowCameraComponent` синхронизирует `Transform` по X/Y с камерой (стены, фон, UI)

## Инпут

- `InputSystem` (`src/systems/inputSystem.ts`) пишет состояние в `InputComponent` (jump/left/right/…)
- `InputStrategy` выбирается в `createGame()`:
  - `KeyboardInputStrategy`
  - `MultiTouchZonesInputStrategy` (touch)
- Для touch режимов в DOM добавляются «хинты» (кнопки-зоны), и `InputSystem` подсвечивает их CSS-классом.

## Ассеты и звук

- **AssetsManager**: `src/core/assetsManager.ts`
  - поднимает `AudioContext`
  - грузит спрайты как `ImageBitmap` через `fetch()` → `blob()` → `createImageBitmap`
  - грузит звук как `AudioBuffer` через `fetch()` → `arrayBuffer()` → `decodeAudioData`
- **AudioSystem**: `src/systems/audioSystem.ts`
  - подписывается на `eventBus.on("audioPlay", ...)`
  - делегирует проигрывание в `AudioPlayer`
  - пауза/резюм по `document.hidden` (см. также обработчик в `createGame()`)

## Рандом и воспроизводимость

- `GlobalRandom.initialize(seed)` в `createGame()` (`src/primitives/random.ts`)
- `PlatformSpawnSystem` получает дочерние RNG (`platformRandom`, `platformRandomSize`), можно подменять для детерминизма (см. test harness).
- Системы, которым нужен рандом (например `PlatformSpawnSystem`), используют `GlobalRandom.child("...")` для стабильных потоков.

## Координаты и системы отсчёта (важно для дебага)

- **World-space** (логика/физика):
  - используется в `Transform.position`
  - \(Y\) **растёт вверх** (прыжок увеличивает Y; смерть — когда игрок ниже низа камеры)
- **Canvas-space** (пиксели экрана):
  - `CanvasRenderer` конвертирует world → camera → canvas
  - в canvas \(Y\) **растёт вниз**, поэтому есть инверсия по Y при переводе координат
- **Следствие**: любые “экранные” UI-элементы лучше рендерить как `TextRenderComponent { static: true }` или держать отдельные правила преобразования.

## Смерть / рестарт / счёт (flow)

- **Смерть**: `DeathSystem`
  - вычисляет нижнюю границу камеры (центр − halfViewport)
  - если `player.y < cameraBottomY` → `eventBus.emit("death")` и `eventBus.emit("audioPlay", { name: "hurt" })`
- **Рестарт**: `RestartSystem` (подписка на `death`)
  - телепорт игрока в старт (`x = viewport/2`, `y = GAME_CONSTANTS.PLAYER_START_Y`)
  - сброс `camera.highestY` и позиции камеры в центр viewport
- **Счёт/попытки**: `CounterSystem`
  - в fixed-update пересчитывает высоту от нижней точки игрока (`Transform - collider.offset`) и делит на 10
  - на `death` увеличивает `falls`, на `coinCollected` — `coins`
  - шлёт `countersUpdated` при изменении `coins/height/falls`, текст UI обновляется только при изменении значений

## Тестовая инфраструктура (vitest + `src/testkit`)

Юнит/интеграционные тесты написаны на `vitest` и живут рядом с кодом (например, `*.test.ts` в `src/systems/`, `src/primitives/`).
Для “сборки мира в тестах” есть небольшой test harness в `src/testkit/`, который позволяет поднимать `World` с реальными системами игры и удобно управлять окружением.

### `createHarness()` — быстрый запуск мира для тестов

Файл: `src/testkit/harness.ts`

`createHarness(options?)` создаёт:

- `world: World` с зарегистрированными компонентами через `registerGameComponents(world)` (`src/game/setup.ts`)
- реальные игровые системы через `registerGameSystems(world, deps)` (`src/game/setup.ts`)
  - по умолчанию **не включает** render/audio (можно включить через `includeRender/includeAudio`)
  - позволяет прокинуть детерминированные источники рандома для `PlatformSpawnSystem` (`platformRandom`, `platformRandomSize`)
- `input: FakeInputStrategy` (см. ниже) — подмена `InputStrategy` в `InputSystem`
- `spawn: { player/platform/coin/camera/spawner/wall }` — набор спавнеров, см. `src/testkit/spawn.ts`
- `events/allEvents` — захват событий `eventBus`, см. `src/testkit/events.ts`
- `step(frames = 1, dt = 1/60)` и `runFor(seconds, dt = 1/60)` для симуляции времени

Важно: harness **создаёт камеру по умолчанию** (`spawn.camera()`), потому что многие системы (и рендер) ожидают, что камера всегда существует.

Пример использования есть в `src/testkit/harness.smoke.test.ts`.

### `spawn.*` — фабрики сущностей для тестов

Файл: `src/testkit/spawn.ts`

`makeSpawners(world, { viewportSize })` возвращает удобные функции, которые вызывают “боевые” фабрики сущностей из `src/entities/*`:

- `spawn.player(pos)` → `createPlayer(...)`
- `spawn.platform({ x, y, kind, width?, height? })` → `createPlatform(...)`
- `spawn.coin(pos)` → `createCoin(...)`
- `spawn.camera({ followFor?, x?, y?, zoom? })` → `createCamera(...)`
- `spawn.spawner()` → `createPlatformSpawner(...)`
- `spawn.wall({ x, y, width, height, followCameraY? })` → `createWall(...)`

Это помогает в тестах фокусироваться на логике систем, а не на ручной сборке компонент.

### `FakeInputStrategy` — управление “нажатиями” в тестах

Файл: `src/testkit/fakeInputStrategy.ts`

Реализует `InputStrategy` и позволяет вручную управлять состоянием кнопок, которые читает `InputSystem`:

- `input.down("left", "jump", ...)` / `input.up(...)`
- `input.set({ left: true, jump: false, ... })`
- `input.reset()`

### `captureGameEvents()` — ассерты по событиям

Файл: `src/testkit/events.ts`

`captureGameEvents(world)` подписывается на `world.eventBus` и собирает события в массив.
Сейчас захватываются: `"trigger"`, `"collision"`, `"death"`, `"audioPlay"`.

Утилита возвращает:

- `events: Array<{ name, payload }>` — все события по порядку
- `eventsOf(name)` — только payload’ы конкретного типа события (удобно для `expect(...)`)

## Инварианты и контракты (чтобы не стрелять себе в ногу)

- **Регистрация компонентов обязательна**: любой компонент должен быть зарегистрирован через `world.registerComponent()` до `addEntity/updateComponent`, иначе будет runtime error.
- **Порядок систем — часть логики**: изменение порядка в `createGame()` меняет поведение (особенно input → movement/jump → physics → gameplay → render).
- **Камера должна существовать**: `RenderSystem` ожидает entity с `Camera` + `Transform` и бросает ошибку, если камеры нет.
- **Layer индекс работает через `RenderLayerComponent`**: чтобы сущность рисовалась в `RenderSystem`, ей нужен корректный `RenderLayerComponent` (иначе не попадёт в `queryByLayer`).
- **PhysicsWorld зависит от камеры**: broadphase строится по зоне вокруг камеры (без камеры — индексируется “всё”).
- **Debug-геометрия условная**: `world.debug*` работает только при `debug: true`.
- **Комментарии в коде не пишем**: избегаем `//`, `/* */`, `TODO` и т.п. Поясняем решения в документации/описании задачи, а в коде полагаемся на хорошие имена и структуру.

## Где что искать (быстрые ссылки)

- **ECS ядро**: `src/core/world.ts`, `src/systems/system.ts`
- **Инициализация игры**: `src/main.ts`, `src/export/index.ts`, `src/core/engine.ts`
- **Рендер**: `src/systems/renderSystem.ts`, `src/render/renderer.ts`, `src/render/layers.ts`
- **Физика**: `src/systems/physicsWorld.ts`, `src/systems/physicsSystem.ts`, компоненты `src/components/colliderComponent.ts`
- **Инпут**: `src/systems/inputSystem.ts`, `src/input/*`
- **Спавн платформ/коинов**: `src/systems/platformSpawnSystem.ts`, `src/entities/platform.ts`, `src/entities/coin.ts`
