import type { World } from "../core/world";
import type { GameEvents } from "../primitives/gameEvents";

export type CapturedEvent<E extends keyof GameEvents = keyof GameEvents> = {
  name: E;
  payload: GameEvents[E];
};

export function captureGameEvents(world: World) {
  const events: CapturedEvent[] = [];

  const keys: (keyof GameEvents)[] = ["trigger", "collision", "death", "audioPlay"];

  for (const name of keys) {
    world.eventBus.on(name, (payload) => {
      events.push({ name, payload } as CapturedEvent);
    });
  }

  function eventsOf<K extends keyof GameEvents>(name: K): GameEvents[K][] {
    return events.filter((e) => e.name === name).map((e) => e.payload) as GameEvents[K][];
  }

  return { events, eventsOf };
}




