import type { World } from "../core/world";
import type { Entity } from "../entities/entity";
import { createPlayer } from "../entities/player";
import { createPlatform } from "../entities/platform";
import { createCoin } from "../entities/coin";
import { createCamera } from "../entities/camera";
import { createPlatformSpawner } from "../entities/platformSpawner";
import { createWall } from "../entities/wall";
import { Vec2 } from "../primitives/vec2-gl";
import type { Vec2 as Vec2Type } from "../primitives/vec2-gl";

export function makeSpawners(world: World, deps: { viewportSize: Vec2Type }) {
  type SpawnPos = Vec2Type | [number, number] | { x: number; y: number };

  function toVec2(pos: SpawnPos): Vec2Type {
    if (Array.isArray(pos)) return Vec2.fromValues(pos[0], pos[1]);
    if ("x" in pos) return Vec2.fromValues(pos.x, pos.y);
    return pos;
  }

  return {
    player: (pos: SpawnPos = Vec2.fromValues(0, 0)) => {
      const p = toVec2(pos);
      return world.addEntity(createPlayer(p));
    },

    platform: (options: {
      x: number;
      y: number;
      kind: "default" | "iced";
      width?: number;
      height?: number;
    }) => {
      const size = options.width && options.height
        ? Vec2.fromValues(options.width, options.height)
        : undefined;
      return world.addEntity(
        createPlatform({
          position: Vec2.fromValues(options.x, options.y),
          kind: options.kind,
          ...(size ? { size } : {}),
        }),
      );
    },

    coin: (pos: SpawnPos) => {
      const p = toVec2(pos);
      return world.addEntity(createCoin({ position: p }));
    },

    camera: (options?: Partial<{
      followFor: Entity;
      x: number;
      y: number;
      zoom: number;
    }>) => {
      const followFor = options?.followFor ?? -1;
      const zoom = options?.zoom ?? 1;
      const x = options?.x ?? deps.viewportSize[0] / 2;
      const y = options?.y ?? deps.viewportSize[1] / 2;

      return world.addEntity(
        createCamera({
          followFor,
          viewportSize: deps.viewportSize,
          position: Vec2.fromValues(x, y),
          zoom,
        }),
      );
    },

    spawner: () => {
      return world.addEntity(createPlatformSpawner(deps.viewportSize));
    },

    wall: (options: {
      x: number;
      y: number;
      width: number;
      height: number;
      followCameraY?: boolean;
    }) => {
      return world.addEntity(
        createWall({
          size: Vec2.fromValues(options.width, options.height),
          position: Vec2.fromValues(options.x, options.y),
          followCameraY: options.followCameraY,
        }),
      );
    },
  };
}




