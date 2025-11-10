import { ColliderComponent } from "../components/colliderComponent";
import { PlatformComponent } from "../components/platformComponent";
import { SpriteRenderComponent } from "../components/spriteRenderComponent";
import type { World } from "../core/world";
import type { GameEvents } from "../primitives/gameEvents";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";

export class PlatformSystem implements ISystem {
  initialize(world: World): Promise<void> | void {
    world.eventBus.on("collision", (e) => this.onCollision(world, e));
  }

  fixedUpdate(world: World): void {
    const now = world.getCurrentTime();

    for (const { components } of world.query(
      PlatformComponent,
      SpriteRenderComponent,
      ColliderComponent,
    )) {
      const [platform, render, collider] = components;

      if (platform.timeToDisappear && platform.timeToDisappear <= now) {
        platform.timeToRest = now + 1500;
        platform.timeToDisappear = undefined;
        render.alpha = 0.3;
        collider.disable();
      }

      if (platform.timeToRest && platform.timeToRest <= now) {
        platform.timeToRest = undefined;
        render.alpha = 1;
        render.spriteOffset = Vec2.create();
        collider.enable();
      }
    }
  }

  onCollision(world: World, event: GameEvents["collision"]) {
    if (!world.hasComponent(event.target, PlatformComponent)) {
      return;
    }

    const platform = world.getComponent(event.target, PlatformComponent)!;
    const render = world.getComponent(event.target, SpriteRenderComponent)!;

    switch (platform.kind) {
      case "iced": {
        if (!platform.timeToDisappear) {
          platform.timeToDisappear = world.getCurrentTime() + 1000;
          render.spriteOffset = Vec2.fromValues(304, 0);
        }

        break;
      }
      default: {
        
      }
    }
  }
}
