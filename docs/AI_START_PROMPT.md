# Стартовый промпт для AI-агента (game-25)

Ниже — “brief” для быстрого входа в проект. Скопируй целиком в новый диалог с агентом перед задачами.

## Контекст проекта

Ты работаешь в репозитории `game-25`: 2D платформер на Canvas, архитектура ECS (Entity–Component–System).

- **Старт**: `src/main.ts` → `createGame()` (`src/export/index.ts`) → `Engine` (`src/core/engine.ts`)
- **Главный цикл**: `Engine.start()` → `requestAnimationFrame` → fixed timestep (`world.fixedUpdate(dt = 1 / simulationHz)` может выполняться несколько раз за кадр) → `world.update(frameDt)`; `simulationHz` задаётся `targetFps` (30 | 60 | 144, по умолчанию 60)
- **ECS ядро**: `src/core/world.ts`
  - entity = `number`
  - компоненты хранятся в `Map<ComponentClass, Map<Entity, Component>>`
  - компоненты нужно регистрировать заранее
  - системы вызываются в порядке регистрации
- **События**: `World.eventBus` (`EventBus<GameEvents>`, см. `src/primitives/gameEvents.ts`), в том числе `trigger/collision/death/audioPlay/coinCollected/countersUpdated`
- **Рендер**: `RenderSystem` → `CanvasRenderer` (`src/systems/renderSystem.ts`, `src/render/renderer.ts`)
- **Физика**: `PhysicsWorld` (quadtree broadphase) + `PhysicsSystem` (swept AABB) (`src/systems/physicsWorld.ts`, `src/systems/physicsSystem.ts`)
- **Координаты**: world-space \(Y\) растёт вверх; canvas-space \(Y\) растёт вниз (есть инверсия в renderer).
- **Рандом**: `GlobalRandom.initialize(seed)` в `createGame()`, платформы спавнятся через дочерние RNG в `PlatformSpawnSystem`.

## Пайплайн кадра (важно)

Ориентируйся на порядок систем в `src/game/setup.ts` (fixed-update, если не указано иначе):
- InputSystem (fixed): читает `InputStrategy`, подсвечивает touch-hints
- MovementSystem (fixed): ускорение/фрикцион для `VelocityComponent`
- JumpSystem (fixed): прыжок по `InputComponent` + `Gravity`, использует `world.getCurrentTime()`
- PhysicsWorld (fixed): строит quadtree вокруг камеры
- CoinSystem: слушает `trigger`, удаляет монеты
- PhysicsSystem (fixed): применяет гравитацию, swept AABB, пишет `CollidedComponent`, эмитит `trigger/collision`
- FacingSystem (update): направление спрайта по скорости
- CameraSystem (fixed): фиксирует камеру по X, тянет по Y за `followFor`, синхронизирует `FollowCameraComponent`
- DeathSystem (fixed): смерть игрока при уходе ниже камеры, эмитит `audioPlay`
- RestartSystem: на `death` ресетит игрока/камеру
- PlatformSpawnSystem (fixed): генерирует платформы/монеты в безопасной зоне
- PlatformSystem (fixed + события): управляет one-shot/iced платформами
- AnimatedSpriteSystem (update): считает таймеры анимаций
- PlayerAnimationStateSystem (update): переключает клипы игрока
- AudioSystem: слушает `audioPlay`
- CounterSystem (fixed): высота/монеты/падения + `countersUpdated`
- FPSSystem (update)
- RenderSystem (update): culling по AABB от спрайтов/анимаций/примитивов, рисует по слоям

## Как работать (правила для изменений)

- Сначала найди точку ответственности: **система** (логика), **компонент** (данные), **entity factory** (сборка набора компонент).
- Если добавляешь новый компонент: зарегистрируй его в `createGame()` **до** использования.
- Для взаимодействия между системами предпочитай `eventBus` (меньше связности).
- Для UI предпочитай `TextRenderComponent { static: true }` вместо “ручной” отрисовки вне ECS.
- `createGame()` поддерживает `targetFps?: 30 | 60 | 144` — частота симуляции, по умолчанию 60.
- Избегай тернарных операторов; ветвления пиши через явные `if` с ранними возвратами/`continue`, чтобы не прятать логику (early return preferred).
- **Не пишем комментарии в коде** (ни TODO, ни поясняющие блоки). Пояснения — в PR/описании задачи/доках, код держим самодокументируемым через имена и структуру.
- Пиши/правь тесты (`vitest`) рядом с системой/примитивом, если изменение алгоритмическое (физика/спавн/коллизии).
- Названия тестов/кейсов/describe пишем на русском.
- Не используем в коде `as unknown` и `any`.

## Как отвечать на задачи

На каждую задачу:
1) Коротко сформулируй гипотезу, где в коде менять.
2) Найди/покажи конкретные файлы и функции.
3) Предложи минимальный патч, объяснив влияние на пайплайн кадра и события.
4) Если есть риск регрессий — добавь/обнови тест.

## Быстрые ссылки

- Архитектурная шпаргалка: `ARCHITECTURE.md`
- Инициализация/сборка мира: `src/export/index.ts`, `src/core/engine.ts`
- ECS: `src/core/world.ts`
- Рендер: `src/systems/renderSystem.ts`, `src/render/renderer.ts`
- Физика: `src/systems/physicsWorld.ts`, `src/systems/physicsSystem.ts`
- События: `src/primitives/gameEvents.ts`, `src/systems/eventBus.ts`
