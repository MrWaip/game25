import { CollidedComponent } from "../components/collidedComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { Gravity } from "../components/gravityComponent";
import { TransformComponent } from "../components/transformComponent";
import { VelocityComponent } from "../components/velocityComponent";
import type { World } from "../core/world";
import { AABB } from "../primitives/aabb";
import type { PhysicsWorld } from "./physicsWorld";
import type { ISystem } from "./system";
import { Vec2 } from "../primitives/vec2-gl";

export class PhysicsSystem implements ISystem {
  #physicsWorld: PhysicsWorld;
  #tempVec1 = Vec2.create();
  #tempVec2 = Vec2.create();
  #tempVec3 = Vec2.create();
  #tempVec4 = Vec2.create();
  #tempVec5 = Vec2.create();
  #tempVec6 = Vec2.create();
  #tempVec7 = Vec2.create();
  #tempPosWithOffset = Vec2.create();
  #tempPosition = Vec2.create();
  #tempRemaining = Vec2.create();

  constructor(physicsWorld: PhysicsWorld) {
    this.#physicsWorld = physicsWorld;
  }

  fixedUpdate(world: World, dt: number): void {
    const entities = world.query(
      TransformComponent,
      VelocityComponent,
      ColliderComponent,
    );

    for (const item of entities) {
      const [transform, velocity, collider] = item.components;

      if (!collider.enabled) continue;

      
      const gravity = world.getComponent(item.entity, Gravity);

      if (gravity) {
        Vec2.scale(this.#tempVec1, gravity.acceleration, dt);
        Vec2.add(velocity.value, velocity.value, this.#tempVec1);
      }

      
      Vec2.scale(this.#tempVec1, velocity.value, dt);
      const lenSq = Vec2.squaredLength(this.#tempVec1);
      const hasMovement = lenSq > 1e-6;

      
      Vec2.add(this.#tempPosWithOffset, transform.position, collider.offset);
      const aabb = AABB.fromCenter(
        this.#tempPosWithOffset,
        collider.size,
      );

      
      const hits = this.#physicsWorld.sweptAABB(
        item.entity,
        aabb,
        this.#tempVec1,
      );

      
      for (const h of hits) {
        if (h.isTrigger) {
          world.eventBus.emit("trigger", {
            initiator: item.entity,
            target: h.entity,
          });
        }
      }

      
      const solids = hits.filter(
        (h) => h.collision && !h.isTrigger && Vec2.squaredLength(h.normal) > 0,
      );

      
      if (solids.length > 0) {
        world.updateComponent(
          item.entity,
          new CollidedComponent(
            solids.map(({ entity, normal, time }) => {
              world.debug(() => {
                const collider = world.getComponent(entity, ColliderComponent)!;
                const tranform = world.getComponent(entity, TransformComponent)!;

                Vec2.add(this.#tempVec7, tranform.position, collider.offset);
                world.debugAABB(
                  AABB.fromCenter(
                    this.#tempVec7,
                    collider.size,
                  ),
                  "orange",
                );
              });

              return {
                entity,
                normal,
                time,
              };
            }),
          ),
        );

        for (const solid of solids) {
          world.eventBus.emit("collision", {
            initiator: item.entity,
            target: solid.entity,
            normal: solid.normal,
            time: solid.time,
          });
        }
      } else {
        world.removeComponent(item.entity, CollidedComponent);
      }

      
      if (solids.length > 0) {
        const onGround = solids.some((h) => h.normal[1] > 0);
        const hitCeiling = solids.some((h) => h.normal[1] < 0);
        const hitLeftWall = solids.some((h) => h.normal[0] > 0);
        const hitRightWall = solids.some((h) => h.normal[0] < 0);

        if (onGround && velocity.value[1] < 0) {
          Vec2.set(velocity.value, velocity.value[0], 0);
        }

        if (hitCeiling && velocity.value[1] > 0) {
          Vec2.set(velocity.value, velocity.value[0], 0);
        }

        if (
          (hitLeftWall && velocity.value[0] < 0) ||
          (hitRightWall && velocity.value[0] > 0)
        ) {
          Vec2.set(velocity.value, 0, velocity.value[1]);
        }
      }

      
      if (!hasMovement) {
        const overlap = solids.find((c) => c.time === 0);
        if (overlap) {
          Vec2.scale(this.#tempVec1, overlap.normal, 0.5);
          Vec2.add(this.#tempVec2, transform.position, this.#tempVec1);
          transform.move(this.#tempVec2);
        }
        continue;
      }

      
      if (solids.length === 0) {
        Vec2.add(this.#tempVec2, transform.position, this.#tempVec1);
        transform.move(this.#tempVec2);
        continue;
      }

      
      Vec2.copy(this.#tempPosition, transform.position);
      Vec2.copy(this.#tempRemaining, this.#tempVec1);

      for (const hit of solids) {
        Vec2.scale(this.#tempVec2, this.#tempRemaining, hit.time);
        Vec2.add(this.#tempPosition, this.#tempPosition, this.#tempVec2);
        Vec2.scale(this.#tempVec3, hit.normal, 0.001);
        Vec2.add(this.#tempPosition, this.#tempPosition, this.#tempVec3);

        Vec2.sub(this.#tempVec4, this.#tempRemaining, this.#tempVec2);
        const n = hit.normal;
        const dot = Vec2.dot(this.#tempVec4, n);
        Vec2.scale(this.#tempVec5, n, dot);
        Vec2.sub(this.#tempVec6, this.#tempVec4, this.#tempVec5);

        Vec2.scale(this.#tempRemaining, this.#tempVec6, 0.98);

        if (Vec2.squaredLength(this.#tempRemaining) < 0.001) break;
      }

      
      Vec2.add(this.#tempVec2, this.#tempPosition, this.#tempRemaining);
      transform.move(this.#tempVec2);
    }

    world.debug(() => {
      for (const {
        entity,
        components: [triggerTransform, triggerCollider],
      } of world.query(TransformComponent, ColliderComponent)) {
        if (!triggerCollider.isTrigger || !triggerCollider.enabled) {
          continue;
        }

        Vec2.add(this.#tempVec7, triggerTransform.position, triggerCollider.offset);
        world.debugPersistentAABB(
          `trigger-${entity}`,
          AABB.fromCenter(
            this.#tempVec7,
            triggerCollider.size,
          ),
          "green",
        );
      }
    });
  }
}
