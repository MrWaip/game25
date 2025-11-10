import { FollowCameraComponent } from "../components/followCameraComponent";
import { TransformComponent } from "../components/transformComponent";
import type { World } from "../core/world";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";

export class CameraSystem implements ISystem {
  #viewportSize: Vec2;

  constructor(viewportSize: Vec2) {
    this.#viewportSize = viewportSize;
  }

  fixedUpdate(world: World): void {
    const cameraEntity = world.getCamera();

    if (!cameraEntity) return;

    const [camera, transform] = cameraEntity.components;

    if (camera.followFor !== undefined) {
      const followTransform = world.getComponent(
        camera.followFor,
        TransformComponent,
      );

      if (followTransform) {
        if (camera.allowFollowDown) {
          Vec2.set(
            transform.position,
            this.#viewportSize[0] / 2,
            Math.max(followTransform.position[1], this.#viewportSize[1] / 2),
          );
        } else {
          Vec2.set(
            transform.position,
            this.#viewportSize[0] / 2,
            transform.position[1],
          );

          const targetY = followTransform.position[1];

          if (targetY > (camera.highestY ?? -Infinity)) {
            camera.highestY = targetY;
          }

          Vec2.set(transform.position, transform.position[0], camera.highestY);
        }
      }
    }

    const followEntities = world.query(
      TransformComponent,
      FollowCameraComponent,
    );

    for (const item of followEntities) {
      const [followTransform, follow] = item.components;

      if (follow.followX) {
        Vec2.set(
          followTransform.position,
          transform.position[0],
          followTransform.position[1],
        );
      }

      if (follow.followY) {
        Vec2.set(
          followTransform.position,
          followTransform.position[0],
          transform.position[1],
        );
      }
    }
  }
}
