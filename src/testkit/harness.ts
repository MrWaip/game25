import { World } from "../core/world";
import { registerGameComponents, registerGameSystems } from "../game/setup";
import type { Vec2 } from "../primitives/vec2-gl";
import { Vec2 as V } from "../primitives/vec2-gl";
import { Random } from "../primitives/random";
import { FakeInputStrategy } from "./fakeInputStrategy";
import { captureGameEvents } from "./events";
import { makeSpawners } from "./spawn";
import type { PlatformSpawnSystem } from "../systems/platformSpawnSystem";
import type { RocketBoosterSystem } from "../systems/rocketBoosterSystem";

export type HarnessOptions = {
  debug?: boolean;
  viewportSize?: Vec2;
  includeRender?: boolean;
  includeAudio?: boolean;
  seed?: string;
  /**
   * Детерминизм спавна платформ (пробрасывается в PlatformSpawnSystem).
   */
  platformRandom?: ConstructorParameters<typeof PlatformSpawnSystem>[0];
  platformRandomSize?: ConstructorParameters<typeof PlatformSpawnSystem>[1];
  platformRandomRocket?: ConstructorParameters<typeof PlatformSpawnSystem>[2];
  rocketBoosterRandom?: ConstructorParameters<typeof RocketBoosterSystem>[0];
};

export async function createHarness(options: HarnessOptions = {}) {
  const seed = options.seed ?? "test";

  const viewportSize = options.viewportSize ?? V.fromValues(800, 600);
  const world = new World({ debug: options.debug ?? false });

  registerGameComponents(world);

  const input = new FakeInputStrategy();
  const rnd = new Random(seed);
  const { physicsWorld } = registerGameSystems(world, {
    viewportSize,
    inputStrategy: input,
    includeAudio: options.includeAudio ?? false,
    includeRender: options.includeRender ?? false,
    platformRandom:
      options.platformRandom ?? rnd.child("platform-spawn-system-position"),
    platformRandomSize:
      options.platformRandomSize ?? rnd.child("platform-spawn-system-size"),
    platformRandomRocket:
      options.platformRandomRocket ?? rnd.child("platform-spawn-system-rocket"),
    rocketBoosterRandom:
      options.rocketBoosterRandom ?? rnd.child("rocket-booster-system"),
  });

  await world.initialize();

  const captured = captureGameEvents(world);
  const spawn = makeSpawners(world, { viewportSize });
  // Многие игровые системы (например, DeathSystem) ожидают, что камера всегда существует.
  // В тестовом harness создаём её по умолчанию, чтобы step() работал без дополнительных действий.
  spawn.camera();

  function step(frames = 1, dt = 1 / 60) {
    for (let i = 0; i < frames; i++) {
      world.fixedUpdate(dt);
      world.update(dt);
    }
  }

  function runFor(seconds: number, dt = 1 / 60) {
    const frames = Math.max(0, Math.ceil(seconds / dt));
    step(frames, dt);
  }

  return {
    world,
    viewportSize,
    physicsWorld,

    input,
    spawn,

    step,
    runFor,

    events: captured.eventsOf,
    allEvents: captured.events,
  };
}


