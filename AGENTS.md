# Repository Guidelines

## Project Structure & Module Organization

This repository contains independent browser games on a shared TypeScript Canvas ECS engine.

- `src/core/`, `src/components/`, `src/entities/`, `src/systems/`: shared engine, rendering components, entity identity, and generic systems.
- `src/render/`, `src/primitives/`, `src/ui/`: Canvas rendering and UI, math, shared palette and UI roles.
- `src/games/jumper/`: platformer setup, gameplay systems/components, entity factories, input, assets, events, theme, and gameplay testkit.
- `src/games/defense/`: tower-defense session, systems/components, entity factories, construction controller, save format, rendering and theme.
- `src/launcher/`, `src/main.ts`, `src/export/`: application composition and public entry points.
- `src/testkit/`: shared engine/render mocks and architecture checks. Game-specific test helpers stay with the game.

Oxlint enforces dependency ownership, including relative and dynamic imports: shared modules cannot import games or application entry points; games cannot import one another or application entry points. Palette assignments belong in shared or game `theme.ts` files. When changing module ownership, read `docs/ARCHITECTURE.md`.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start Vite on port 3000.
- `npm run build:site`: build the browser application into `dist/`.
- `npm run build:lib`: build the ESM library and TypeScript declarations.
- `npm run preview`: serve the built site locally.
- `npm run lint` / `npm run check`: run Oxlint / formatting, lint, and TypeScript checks through Vite+.
- `npm run format`: apply Oxfmt formatting through Vite+.
- `npm test`: run the regular Vitest suite.
- `npm run test:stress`: run the separate stress suite with exposed garbage collection.
- `npm run smoke`: run lint, type checking, regular tests, and the library build.

## Coding Style & Naming Conventions

Use strict TypeScript, tabs, double quotes, and semicolons, following the formatter settings in `vite.config.ts`. Oxlint supplies lint rules. Use camelCase filenames such as `movementSystem.ts`, PascalCase classes such as `MovementSystem`, and explicit `import type` for type-only dependencies. Keep gameplay behavior in systems and register components/systems through the existing setup.

## Testing Guidelines

Use Vitest with `happy-dom`; name tests `*.test.ts` under `src/`. For platformer gameplay changes, use `createHarness()` from `src/games/jumper/testkit/` to control input, advance frames, spawn entities, and inspect events. Run a focused test with `npm test -- src/games/jumper/systems/movementSystem.test.ts`. For defense, use the real session scenarios beside `session.ts`. Architecture tests typecheck shared modules and the remaining game with either game directory removed from a temporary source copy. No coverage threshold is configured. Run `npm run smoke` before submitting code changes.

## Commit & Pull Request Guidelines

History uses short, informal subjects, including `moving platforms` and `better text`; no consistent Conventional Commits pattern appears. Write concise, descriptive subjects. PRs should explain the behavior change, list validation performed, link relevant issues, and include screenshots or recordings for visual/gameplay changes.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues. Before tracker operations,
read docs/agents/issue-tracker.md.

### Triage labels

Use the five canonical triage labels.
Before triage, read docs/agents/triage-labels.md.

### Domain docs

Single-context layout. Before codebase exploration,
read docs/agents/domain.md.
