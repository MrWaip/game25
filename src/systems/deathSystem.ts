import type { World } from "../core/world";
import type { ISystem } from "./system";
import { Vec2 } from "../primitives/vec2-gl";

export class DeathSystem implements ISystem {
  #tempViewportHalf = Vec2.create();
  #tempCameraBottom = Vec2.create();

  fixedUpdate(world: World): void {
    const player = world.getPlayer();
    const camera = world.getCamera();

    if (!player || !camera) return;

    const [playerTransform] = player.components;
    const [cameraComponent, cameraTransform] = camera.components;

    Vec2.scale(this.#tempViewportHalf, cameraComponent.viewportSize, 0.5);
    Vec2.sub(this.#tempCameraBottom, cameraTransform.position, this.#tempViewportHalf);

    if (playerTransform.position[1] >= this.#tempCameraBottom[1]) {
      return;
    }

    world.eventBus.emit("death", {
      entity: player.entity,
    });

    world.eventBus.emit("audioPlay", { name: "hurt", volume: 0.01 });
  }
}
