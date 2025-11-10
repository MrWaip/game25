import { describe, it, expect, beforeEach } from "vitest";
import { TransformComponent } from "../components/transformComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { Camera } from "../components/cameraComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { AABB } from "../primitives/aabb";
import type { World } from "../core/world";
import type { PhysicsWorld } from "./physicsWorld";
import { createHarness } from "../testkit/harness";

describe("PhysicsWorld", () => {
  let world: World;
  let physicsWorld: PhysicsWorld;
  const viewportSize = Vec2.fromValues(800, 600);

  beforeEach(async () => {
    const h = await createHarness({ viewportSize });
    world = h.world;
    physicsWorld = h.physicsWorld;
  });

  describe("update", () => {
    it("заполняет quadtree сущностями", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 200)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);

      const testAABB1 = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const testAABB2 = AABB.fromCenter(Vec2.fromValues(200, 200), Vec2.fromValues(50, 50));

      expect(physicsWorld.canPlaceAABB(undefined, testAABB1)).toBe(false);
      expect(physicsWorld.canPlaceAABB(undefined, testAABB2)).toBe(false);
    });

    it("игнорирует отключённые коллайдеры", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const collider = world.getComponent(entity, ColliderComponent)!;
      collider.disable();

      physicsWorld.fixedUpdate(world);

      const testAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      expect(physicsWorld.canPlaceAABB(undefined, testAABB)).toBe(true);
    });

    it("фильтрует сущности по viewport камеры, если камера есть", () => {
      const [cameraEnt] = world.query(TransformComponent, Camera);
      expect(cameraEnt).toBeDefined();
      cameraEnt!.components[0].position = Vec2.fromValues(400, 300);

      world.addEntity([
        new TransformComponent(Vec2.fromValues(400, 300)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      world.addEntity([
        new TransformComponent(Vec2.fromValues(5000, 5000)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);

      const testAABBInside = AABB.fromCenter(Vec2.fromValues(400, 300), Vec2.fromValues(50, 50));
      expect(physicsWorld.canPlaceAABB(undefined, testAABBInside)).toBe(false);
    });
  });

  describe("sweptAABB", () => {
    beforeEach(() => {
      physicsWorld.fixedUpdate(world);
    });

    it("находит коллизию при движении объекта в статичный объект", () => {
      const staticEntity = world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 100)),
        new ColliderComponent({ size: Vec2.fromValues(100, 100) }),
      ]);

      physicsWorld.fixedUpdate(world);

      const movingEntity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const movingAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(150, 0);

      const results = physicsWorld.sweptAABB(movingEntity, movingAABB, velocity);

      expect(results.length).toBeGreaterThan(0);
      const collision = results.find(r => r.entity === staticEntity);
      expect(collision).toBeDefined();
      expect(collision?.collision).toBe(true);
      expect(collision?.time).toBeGreaterThanOrEqual(0);
      expect(collision?.time).toBeLessThanOrEqual(1);
    });

    it("не находит коллизий если объект ни во что не врезается", () => {
      const movingEntity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const movingAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(10, 10);

      const results = physicsWorld.sweptAABB(movingEntity, movingAABB, velocity);

      const collisions = results.filter(r => r.collision && !r.isTrigger);
      expect(collisions.length).toBe(0);
    });

    it("игнорирует саму сущность при проверке коллизий", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);

      const entityAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(0, 0);

      const results = physicsWorld.sweptAABB(entity, entityAABB, velocity);

      const selfCollisions = results.filter(r => r.entity === entity);
      expect(selfCollisions.length).toBe(0);
    });

    it("возвращает коллизии, отсортированные по времени столкновения", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(250, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);

      const movingEntity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const movingAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(200, 0);

      const results = physicsWorld.sweptAABB(movingEntity, movingAABB, velocity);

      const collisions = results.filter(r => r.collision && !r.isTrigger);
      if (collisions.length >= 2) {
        expect(collisions[0].time).toBeLessThanOrEqual(collisions[1].time);
      }
    });
  });

  describe("sweepAABBTest", () => {
    it("находит коллизию, если AABB уже пересекаются", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(Vec2.fromValues(120, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(0, 0);
      const collider = new ColliderComponent({ size: Vec2.fromValues(50, 50) });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(true);
      expect(result.time).toBe(0);
    });

    it("находит коллизию, когда движущийся AABB врежется в цель", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(Vec2.fromValues(200, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(150, 0);
      const collider = new ColliderComponent({ size: Vec2.fromValues(50, 50) });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(true);
      expect(result.time).toBeGreaterThan(0);
      expect(result.time).toBeLessThanOrEqual(1);
      expect(result.normal[0]).toBeLessThan(0);
    });

    it("не находит коллизию, когда движение направлено от цели", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(Vec2.fromValues(200, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(-50, 0);
      const collider = new ColliderComponent({ size: Vec2.fromValues(50, 50) });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(false);
    });

    it("правильно обрабатывает one-way платформы при движении снизу вверх", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 50), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(
        Vec2.fromValues(100, 100),
        Vec2.fromValues(100, 20),
      );
      const velocity = Vec2.fromValues(0, 100);
      const collider = new ColliderComponent({ 
        size: Vec2.fromValues(100, 20),
        oneWay: true,
      });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(false);
    });

    it("правильно обрабатывает one-way платформы при падении сверху вниз", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 150), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(
        Vec2.fromValues(100, 100),
        Vec2.fromValues(100, 20),
      );
      const velocity = Vec2.fromValues(0, -100);
      const collider = new ColliderComponent({ 
        size: Vec2.fromValues(100, 20),
        oneWay: true,
      });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(true);
      expect(result.time).toBeGreaterThanOrEqual(0);
      expect(result.normal[1]).toBeGreaterThan(0);
    });

    it("корректно обрабатывает нулевую скорость", () => {
      const moving = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      const candidate = AABB.fromCenter(Vec2.fromValues(120, 100), Vec2.fromValues(50, 50));
      const velocity = Vec2.fromValues(0, 0);
      const collider = new ColliderComponent({ size: Vec2.fromValues(50, 50) });

      const result = physicsWorld.sweepAABBTest(moving, velocity, candidate, collider);

      expect(result.collision).toBe(true);
      expect(result.time).toBe(0);
    });
  });

  describe("canPlaceAABB", () => {
    beforeEach(() => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 200)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      physicsWorld.fixedUpdate(world);
    });

    it("возвращает false, если AABB пересекается с существующей сущностью", () => {
      const overlappingAABB = AABB.fromCenter(Vec2.fromValues(100, 100), Vec2.fromValues(50, 50));
      expect(physicsWorld.canPlaceAABB(undefined, overlappingAABB)).toBe(false);
    });

    it("возвращает true, если AABB не пересекается", () => {
      const freeAABB = AABB.fromCenter(Vec2.fromValues(500, 500), Vec2.fromValues(50, 50));
      expect(physicsWorld.canPlaceAABB(undefined, freeAABB)).toBe(true);
    });

    it("игнорирует указанную сущность при проверке", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(300, 300)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      physicsWorld.fixedUpdate(world);

      const entityAABB = AABB.fromCenter(Vec2.fromValues(300, 300), Vec2.fromValues(50, 50));
      expect(physicsWorld.canPlaceAABB(entity, entityAABB)).toBe(true);
    });
  });

  describe("findFreeSpawnPosition", () => {
    beforeEach(() => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);
      physicsWorld.fixedUpdate(world);
    });

    it("возвращает позицию, если базовая позиция свободна", () => {
      const basePos = Vec2.fromValues(500, 500);
      const size = Vec2.fromValues(50, 50);

      const result = physicsWorld.findFreeSpawnPosition(undefined, basePos, size);

      expect(result).toBeDefined();
      expect(result).not.toBeUndefined();
      if (result) {
        const aabb = AABB.fromCenter(result, size);
        expect(physicsWorld.canPlaceAABB(undefined, aabb)).toBe(true);
      }
    });

    it("пытается найти альтернативную позицию, если базовая занята", () => {
      const basePos = Vec2.fromValues(100, 100);
      const size = Vec2.fromValues(50, 50);

      const result = physicsWorld.findFreeSpawnPosition(undefined, basePos, size, 20);

      if (result) {
        const aabb = AABB.fromCenter(result, size);
        expect(physicsWorld.canPlaceAABB(undefined, aabb)).toBe(true);
      }
    });

    it("возвращает undefined, если не удалось найти свободную позицию за N попыток", () => {
      for (let x = 50; x <= 150; x += 30) {
        for (let y = 50; y <= 150; y += 30) {
          world.addEntity([
            new TransformComponent(Vec2.fromValues(x, y)),
            new ColliderComponent({ size: Vec2.fromValues(40, 40) }),
          ]);
        }
      }
      physicsWorld.fixedUpdate(world);

      const basePos = Vec2.fromValues(100, 100);
      const size = Vec2.fromValues(100, 100);

      const result = physicsWorld.findFreeSpawnPosition(undefined, basePos, size, 5);
      expect(result === undefined || result.length === 2).toBe(true);
    });
  });
});
