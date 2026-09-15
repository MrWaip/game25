# game25

Несколько браузерных игр на общем TypeScript Canvas ECS: платформер и roguelike tower defense.

> Большая часть ассетов сгенерирована нейросетями (спрайты, картинки, музыка)

## Preview:

![Мобильная версия игры](docs/preview.mp4){width=400px}

## Tests

Запуск:

```bash
npm test
```

Для тестов платформера есть `src/games/jumper/testkit` — быстрый harness вокруг ECS:

- `createHarness()` создаёт `World` с зарегистрированными game-компонентами и системами (по умолчанию без рендера/аудио)
- `h.step(frames, dt)` / `h.runFor(seconds)`
- `h.input` — управляемый `FakeInputStrategy`
- `h.spawn.*` — фабрики сущностей (player/platform/coin/camera/spawner/wall)
- `h.events(name)` — собранные события `eventBus`

## Build

`npm run build:site`
`npm run build:lib`

## Arcade and tower defense

`npm run dev` opens the game selector. Use `?game=defense&seed=example`
for tower defense or `?game=jumper` for the original platformer.

Tower defense has five waves and begins with a full-screen choice of three builds:
winter, portals, or chained shots. New runs generate an 11×15 grid with two or
three entrances, winding roads, branches and one base. At least 60% of cells
remain available for construction. Build anywhere except the enemy
road. Either select a cell and then a tower, or select a tower and tap cells to
build repeatedly. No separate construction confirmation is needed.

The “Код забега” section shows the seed and lets you start a run with a chosen
code. The same code and actions reproduce the map, enemy paths and rewards in
the same rules version. “Заново” and “Новый забег” choose a fresh random seed.
Map generation and enemy path selection do not consume the reward random stream.
Saves keep the actual map, its size and each enemy's path; older saves retain the
original 7×10 map. Start a new run to get the expanded generated field.

Select a tower to upgrade, move/swap, replace or sell it. Moving onto an occupied
cell swaps the two towers for free. Selling refunds 50% of the tower's total cost,
including upgrades, rounded down. Replacement applies that refund and buys a new
level-one tower atomically; the menu shows the net price. These actions are only
available between waves. All four towers currently cost 30; upgrades cost 35
multiplied by the current level, up to level 3.

- Rapid: physical shots, 2-cell range; strips shield charges.
- Mortar: physical splash, 3.25-cell range; supports ice-shard combinations.
- Frost: magic and slowing, 1.5-cell range.
- Arcane: magic single-target damage, 2.5-cell range; counters physical armor.

Snow slows enemies by 40% and reduces allied firing speed by 20%. Eternal Frost
expands the area and removes the allied penalty. A portal links two road cells,
returns an enemy at least three cells along the route, then recharges for three
seconds. Each enemy can teleport once. World effects can be repositioned for free
between waves by tapping their build chips.

Non-final waves offer three full-screen rewards, including world effects and
combinable modifiers: brittle targets, ice shards, portal echo, chains and other
upgrades. The next wave's threats are shown before choosing. Enemies have physical
or magic resistance, hit-based shields, speed auras and a shield-restoring boss.
Badges display slow, armor, magic resistance, haste and portal vulnerability;
segments display remaining shield hits. Tower badges show snow penalties and buffs.

Kills award 2 coins and completed waves award 35. The base starts with 10 health;
a boss breach costs 5. Results include wave kills, leaks, teleports and shard
triggers. “Новый забег” also works in standalone TD without a launcher.

Pause, page visibility changes and leaving the game preserve the current TD
run. The launcher also saves every five seconds to local storage. If storage
is unavailable, the current session still runs but persistence across reloads
is unavailable. “Заново” starts a fresh run. Saves are versioned; incompatible
or corrupt saves start a new run with a notice. New saves use version 3 and omit
visual shot trails; version 2 saves still load with the same battle state.
Version 1 saves from the fixed-site prototype are incompatible. Save failures
show a notice and do not prevent switching games.

### Modules

- `src/core/engine.ts`: shared fixed-step loop and lifecycle; no game construction.
- `src/core/browserGame.ts`: shared browser pause, startup rollback and cleanup.
- `src/games/jumper/`: platformer construction and browser entry. Existing
  platformer systems, components and testkit remain in their original locations.
- `src/games/defense/definitions/`: tower attacks/ranges, enemy defenses/abilities,
  reward descriptions, requirements and numeric modifiers.
- `src/games/defense/effects/`: compiled build modifiers and concrete snow/portal
  behavior. Registered ECS systems execute these rules; render status selectors
  use the same rules.
- `src/games/defense/constructionRules.ts`: shared construction quotations,
  refunds and relocation eligibility for commands and UI.
- `src/games/defense/controller.ts`: selection and interaction transitions;
  DOM controls only present actions and dispatch player intent.
- `src/games/defense/systems/`: construction, run commands, attacks, movement,
  spawning, enemy abilities and wave completion.
- `src/games/defense/render/`, `statusView.ts`: board rendering and status badges.
- `src/games/defense/save/`: owns saved-run validation, representation and restoration;
  `save.ts` serializes/restores components.
- `src/launcher/`: game selection, loading, pause and storage integration.

`createGame` remains the platformer library entry. `mountDefense(node, options)`
mounts TD independently; `mountArcade(node, options)` includes the selector.
Import the package's `style.css` when embedding. TD options accept `seed`,
`saved` and `onSave`; the returned handle exposes `pause`, `resume`, and async
`destroy`. The host can call these lifecycle methods from its own WebView
navigation. Concrete native-app integration is outside this prototype.

### Verification

`npm run smoke` checks lint, types, all Vitest tests and the library build.
`npm run test:browser` exercises the mobile browser shell and both games.
Install a browser first with `npx playwright install chromium`, or use
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser` with installed Chrome.
Set `PLAYWRIGHT_PORT=3100` if another project occupies the default port 3000.
Both checks run in CI before Pages deployment and on pull requests.

TD tests use `createDefenseSession`: public commands, controlled fixed steps,
snapshots and saves. They cover construction, wave outcomes, seeded rewards,
effect combinations, sale/replacement accounting, swaps, pause/restore and invalid saves.
Browser tests cover both construction orders, world placement, full-screen rewards,
reload, pause and switching between games. The platformer's
`createHarness` and existing engine/physics tests remain regression coverage.
Browser emulation does not replace final acceptance on a physical device in
the destination native WebView.

Source imports use `@/` for `src/`. TypeScript paths and the shared `aliases.ts`
configuration keep the Vite+ build and test projects aligned.
Use package subpaths `/defense` or `/arcade` to embed without eagerly importing
the platformer assets.

Canvas UI: [typed widgets, lifecycle and examples](docs/canvas-ui.md).

### External progress API

```ts
import { mountDefense, type DefenseEvent } from "game-25/defense";
import "game-25/style.css";

const game = await mountDefense(document.querySelector("#game")!, {
	seed: "daily-challenge",
	onEvent: async (event: DefenseEvent) => {
		// leaderboard is supplied by the embedding application.
		if (event.type === "waveCompleted" || event.type === "runLost") {
			await leaderboard.upsert(event.id, event.progress);
		}
	},
	onEventError: (error, event) => console.error(event.id, error),
});

const progress = game.getProgress();
game.pause();
game.resume();
await game.destroy();
```

- `runStarted`: the player chooses an opening build. Mounting the draft alone
  does not count as starting. Restarting and choosing again creates a new run.
- `waveCompleted`: the wave finished; its payout and milestone healing are
  already included in the progress.
- `runLost`: fatal breach. Losing on wave 18 reports `currentWave: 18` and
  `completedWaves: 17`.
- Progress contains `runId`, `seed`, `phase`, `currentWave`, `completedWaves`,
  `kills`, `health`, `coins`, and `elapsedSeconds`. Time counts active combat
  across waves, excluding preparation and pauses. Legacy saves have no complete
  historical timer, so their `elapsedSeconds` remains `null`.
- `runId` survives saving/loading. New attempts with the same seed get different
  IDs. Legacy checkpoints receive a stable derived ID during migration.
- Loading a completed wave or lost run does not replay historical events. Read
  `getProgress()` to reconcile on load. Replaying an earlier checkpoint produces
  the same event IDs: use `event.id` as an idempotency key on the receiving side.
- Events are notifications, not a delivery queue. The host owns networking,
  retry/persistence of failed deliveries, player identity, and leaderboard rules.
  Listener exceptions/rejections are reported to `onEventError` (or the console)
  without interrupting gameplay. Async listeners are not awaited.
- `mountArcade` accepts the same TD callbacks; its `getProgress()` returns `null`
  when the platformer is selected or no game is mounted.

`npm run build:lib` builds the ESM library and TypeScript declarations in `dist/`.
Exports: `game-25`, `game-25/defense`, `game-25/arcade`, `game-25/style.css`.
The package currently has `private: true`; registry publication is a separate step.

## Toolchain

Vite+ owns dev, site/library builds, lint, formatting, and tests in
`vite.config.ts`. Run `npm ci` first; the npm scripts use the project-local
`vp`, so no global installation is required. `npm run check` checks source
formatting, lint and TypeScript; `npm run format` applies formatting.
`npm test` runs the unit project; `npm run test:stress` runs the stress project
with garbage collection enabled. Playwright remains the browser test runner.

Vite+ manages its internal tool versions without project-level overrides.
Vite+ 0.3.2 bundles Vite 8.3 and Vitest 4.1; the project uses TypeScript 7.
