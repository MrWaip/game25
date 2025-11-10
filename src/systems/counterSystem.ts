import { ColliderComponent } from "../components/colliderComponent";
import { CounterComponent } from "../components/counterComponent";
import { PlayerComponent } from "../components/playerComponent";
import { TransformComponent } from "../components/transformComponent";
import { TextRenderComponent } from "../components/textRenderComponent";
import type { World } from "../core/world";
import type { ISystem } from "./system";

export class CounterSystem implements ISystem {
  #lastText: string[][] | undefined;
  #lastHeight: number | undefined;

  initialize(world: World): Promise<void> | void {
    world.eventBus.on("death", () => this.onDeath(world));
    world.eventBus.on("coinCollected", () => this.onCoinCollected(world));
  }

  fixedUpdate(world: World): void {
    const playerEnt = world.query(
      TransformComponent,
      ColliderComponent,
      PlayerComponent,
    ).next().value;

    if (!playerEnt) return;

    const [playerTransform, playerCollider] = playerEnt.components;

    for (const {
      components: [counter, render],
    } of world.query(CounterComponent, TextRenderComponent)) {
      const max = Math.round(
        Math.max(
          counter.height,
          (playerTransform.position[1] - playerCollider.offset[1]) / 10,
        ),
      );

      const heightChanged = counter.height !== max;
      counter.height = max;
      const c = counter.coins;
      const h = counter.height;
      const f = counter.falls;

      const newText: string[][] = [
        ["СЧЕТ", "ВЫСОТА", "ПОПЫТКИ"],
        [c.toString(), h.toString(), f.toString()],
      ];

      if (
        !this.#lastText ||
        this.#lastText[1][0] !== newText[1][0] ||
        this.#lastText[1][1] !== newText[1][1] ||
        this.#lastText[1][2] !== newText[1][2]
      ) {
        render.text = newText;
        this.#lastText = newText;
      }

      if (heightChanged && this.#lastHeight !== h) {
        this.emitCountersUpdated(world, counter);
        this.#lastHeight = h;
      }
    }
  }

  onDeath(world: World) {
    const counter = world.getFirstComponent(CounterComponent);
    if (counter) {
      counter.falls++;
      this.emitCountersUpdated(world, counter);
    }
  }

  onCoinCollected(world: World) {
    const counter = world.getFirstComponent(CounterComponent);
    if (counter) {
      counter.coins++;
      this.emitCountersUpdated(world, counter);
    }
  }

  private emitCountersUpdated(world: World, counter: CounterComponent) {
    world.eventBus.emit("countersUpdated", {
      coins: counter.coins,
      height: counter.height,
      falls: counter.falls,
    });
  }
}
