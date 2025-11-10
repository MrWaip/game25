import type { World } from "../core/world";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";
import { GAME_CONSTANTS } from "../game/constants";
import { GodModComponent } from "../components/godModComponent";

export class RestartSystem implements ISystem {
  #viewportSize: Vec2;
  #tempCameraPos = Vec2.create();
  #tempPlayerPos = Vec2.create();

  constructor(viewportSize: Vec2) {
    this.#viewportSize = viewportSize;
  }

  initialize(world: World): Promise<void> | void {
    world.eventBus.on("death", () => this.onDeath(world));
  }

  onDeath(world: World) {
    const player = world.getPlayer();
    const camera = world.getCamera();

    if (!player || !camera) return;

    if (world.hasComponent(player.entity, GodModComponent)) {
      return;
    }

    const [playerTransform] = player.components;
    const [cameraComponent, cameraTransform] = camera.components;

    Vec2.set(
      this.#tempPlayerPos,
      this.#viewportSize[0] / 2,
      GAME_CONSTANTS.PLAYER_START_Y,
    );
    playerTransform.move(this.#tempPlayerPos);
    cameraComponent.highestY = this.#viewportSize[1] / 2;
    Vec2.scale(this.#tempCameraPos, this.#viewportSize, 0.5);
    cameraTransform.move(this.#tempCameraPos);
  }
}
