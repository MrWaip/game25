import { describe, it, expect, beforeEach } from "vitest";
import { PlatformSpawnSystem } from "./platformSpawnSystem";
import { TransformComponent } from "../components/transformComponent";
import { PlayerComponent } from "../components/playerComponent";
import { JumpComponent } from "../components/jumpComponent";
import { PlatformSpawner } from "../components/platformSpawnerComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { AABB } from "../primitives/aabb";
import { createPlatform } from "../entities/platform";
import { createHarness } from "../testkit/harness";
import { MockRandom } from "../testkit/mockRandom";
import type { World } from "../core/world";

describe("PlatformSpawnSystem", () => {
  let world: World;
  let system: PlatformSpawnSystem;
  let mockRandom: MockRandom;
  let mockRandomSize: MockRandom;
  let mockRandomRocket: MockRandom;

  beforeEach(async () => {
    mockRandom = new MockRandom("test", [0.5, 0.3, 0.7, 0.2, 0.4]);
    mockRandomSize = new MockRandom("test-size", [0.5, 0.3, 0.7, 0.2, 0.4]);
    mockRandomRocket = new MockRandom("test-rocket", [0.5, 0.3, 0.7, 0.2, 0.4]);
    const h = await createHarness({
      platformRandom: mockRandom,
      platformRandomSize: mockRandomSize,
      platformRandomRocket: mockRandomRocket,
    });
    world = h.world;
    system = new PlatformSpawnSystem(mockRandom, mockRandomSize, mockRandomRocket);
  });

  describe("getSafeSpawnAABB", () => {
    it("считает безопасный AABB для спавна в пределах досягаемости прыжка", () => {
      const maxJumpHeight = 100;
      const maxJumpWidth = 200;
      const minX = 0;
      const maxX = 1000;
      const lastPlatformCenter = Vec2.fromValues(500, 100);
      const lastPlatformSize = Vec2.fromValues(144, 48);
      const nextPlatformWidth = 96;

      const aabb = system.getSafeSpawnAABB(
        maxJumpHeight,
        maxJumpWidth,
        minX,
        maxX,
        lastPlatformCenter,
        lastPlatformSize,
        nextPlatformWidth,
      );

      expect(aabb).toBeInstanceOf(AABB);
      
      expect(aabb.min[0]).toBeGreaterThanOrEqual(0);
      expect(aabb.max[0]).toBeLessThanOrEqual(1000);
      expect(aabb.min[1]).toBeGreaterThan(lastPlatformCenter[1]);
    });

    it("учитывает границы minX/maxX", () => {
      const maxJumpHeight = 100;
      const maxJumpWidth = 200;
      const minX = 100;
      const maxX = 900;
      const lastPlatformCenter = Vec2.fromValues(500, 100);
      const lastPlatformSize = Vec2.fromValues(144, 48);
      const nextPlatformWidth = 96;

      const aabb = system.getSafeSpawnAABB(
        maxJumpHeight,
        maxJumpWidth,
        minX,
        maxX,
        lastPlatformCenter,
        lastPlatformSize,
        nextPlatformWidth,
      );

      expect(aabb.min[0]).toBeGreaterThanOrEqual(100 + 10 + 48);
      expect(aabb.max[0]).toBeLessThanOrEqual(900 - 10 - 48);
    });

    it("учитывает ограничения по высоте прыжка", () => {
      const maxJumpHeight = 150;
      const minJumpHeight = maxJumpHeight * 0.4;
      const lastPlatformCenter = Vec2.fromValues(500, 100);
      const lastPlatformSize = Vec2.fromValues(144, 48);
      const nextPlatformWidth = 96;

      const aabb = system.getSafeSpawnAABB(
        maxJumpHeight,
        200,
        0,
        1000,
        lastPlatformCenter,
        lastPlatformSize,
        nextPlatformWidth,
      );

      expect(aabb.min[1]).toBeCloseTo(lastPlatformCenter[1] + minJumpHeight, 1);
      expect(aabb.max[1]).toBeCloseTo(lastPlatformCenter[1] + maxJumpHeight, 1);
    });
  });

  describe("makeWeightedPicker", () => {
    it("корректно выбирает значения с учётом весов", () => {
      const testRandom = new MockRandom("test", [0.5]);
      const testRandomSize = new MockRandom("test-size", [0.4]);
      const testRandomRocket = new MockRandom("test-rocket", [0.5]);
      const testSystem = new PlatformSpawnSystem(testRandom, testRandomSize, testRandomRocket);
      
      const picker = testSystem.makeWeightedPicker([1, 2, 3], [0.5, 0.3, 0.2]);
      expect(typeof picker).toBe("function");
      
      testRandomSize.reset([0.4]);
      expect(picker()).toBe(1);
      
      testRandomSize.reset([0.6]);
      expect(picker()).toBe(2);
      
      testRandomSize.reset([0.9]);
      expect(picker()).toBe(3);
    });
  });

  describe("spawnRandomPlatform", () => {
    it("спавнит платформу в случайной позиции внутри AABB", () => {
      const aabb = new AABB(
        Vec2.fromValues(100, 200),
        Vec2.fromValues(300, 400)
      );
      const width = 96;
      const kind = "default" as const;

      mockRandom.reset([0.5, 0.5]);

      const result = system.spawnRandomPlatform(world, aabb, width, kind);

      expect(result.entity).toBeDefined();
      expect(result.size[0]).toBe(width);
      expect(result.size[1]).toBe(48);

      const halfWidth = width / 2;
      const halfHeight = 48 / 2;
      expect(result.position[0] - halfWidth).toBeGreaterThanOrEqual(aabb.min[0]);
      expect(result.position[0] + halfWidth).toBeLessThanOrEqual(aabb.max[0]);
      expect(result.position[1] - halfHeight).toBeGreaterThanOrEqual(aabb.min[1]);
      expect(result.position[1] + halfHeight).toBeLessThanOrEqual(aabb.max[1]);
    });

    it("создаёт entity платформы с корректными компонентами", () => {
      const aabb = new AABB(
        Vec2.fromValues(100, 200),
        Vec2.fromValues(300, 400)
      );
      mockRandom.reset([0.5, 0.5]);

      const result = system.spawnRandomPlatform(world, aabb, 96, "iced");

      const transform = world.getComponent(result.entity, TransformComponent);
      const collider = world.getComponent(result.entity, ColliderComponent);

      expect(transform).toBeDefined();
      expect(collider).toBeDefined();
      expect(collider?.size[0]).toBe(96);
      expect(collider?.size[1]).toBe(48);
    });
  });

  describe("spawnDefaultSet", () => {
    it("спавнит 5 платформ", () => {
      mockRandom.reset([
        0.5, 0.5, 0.2,
        0.5, 0.5, 0.2,
        0.5, 0.5, 0.2,
        0.5, 0.5, 0.2,
        0.5, 0.5, 0.2,
      ]);
      mockRandomSize.reset([0.5, 0.5, 0.5, 0.5, 0.5]);

      const ctx = {
        jumpHeight: 100,
        lastPlatform: {
          position: Vec2.fromValues(500, 0),
          size: Vec2.fromValues(144, 48),
        },
        spawner: new PlatformSpawner({
          triggerRange: 50,
          minX: 0,
          maxX: 1000,
        }),
        world,
      };

      const lastPlatform = system.spawnDefaultSet(ctx);

      expect(lastPlatform).toBeDefined();
      expect(lastPlatform).not.toBe(-100);

      const platforms = Array.from(world.query(TransformComponent, ColliderComponent));
      expect(platforms.length).toBeGreaterThanOrEqual(5);
    });

    it("спавнит платформы выше стартовой позиции по Y", () => {
      const startY = 0;
      const jumpHeight = 100;
      
      mockRandom.reset([
        0.5, 0.3, 0.2,
        0.5, 0.5, 0.2,
        0.5, 0.7, 0.2,
        0.5, 0.6, 0.2,
        0.5, 0.8, 0.2,
      ]);
      mockRandomSize.reset([0.5, 0.5, 0.5, 0.5, 0.5]);

      const ctx = {
        jumpHeight,
        lastPlatform: {
          position: Vec2.fromValues(500, startY),
          size: Vec2.fromValues(144, 48),
        },
        spawner: new PlatformSpawner({
          triggerRange: 50,
          minX: 0,
          maxX: 1000,
        }),
        world,
      };

      system.spawnDefaultSet(ctx);

      const platforms = Array.from(world.query(TransformComponent, ColliderComponent));
      const positions = platforms.map(p => {
        const transform = world.getComponent(p.entity, TransformComponent)!;
        return transform.position[1];
      });

      positions.forEach(pos => {
        expect(pos).toBeGreaterThan(startY);
      });
    });
  });

  describe("update", () => {
    it("спавнит платформы если игрок пересек trigger range", () => {
      const spawner = new PlatformSpawner({ triggerRange: 50, minX: 0, maxX: 1000 });

      world.addEntity([
        new TransformComponent(Vec2.fromValues(500, 0)),
        new PlayerComponent(),
      ]);
      world.addEntity([new JumpComponent({ jumpHeight: 100 })]);

      world.addEntity([spawner]);

      mockRandom.reset([0.5, 0.5, 0.2, 0.5, 0.5, 0.2, 0.5, 0.5, 0.2, 0.5, 0.5, 0.2, 0.5, 0.5, 0.2]);
      mockRandomSize.reset([0.5, 0.5, 0.5, 0.5, 0.5]);

      system.fixedUpdate(world);

      const [spawnerQuery] = world.query(PlatformSpawner);
      const updatedSpawner = spawnerQuery.components[0];
      expect(updatedSpawner.lastPlatform).toBeDefined();
    });

    it("не спавнит платформы если игрок не пересек trigger range", () => {
      const lastPlatformPos = Vec2.fromValues(500, 200);
      const platform = world.addEntity(createPlatform({
        position: lastPlatformPos,
        kind: "default",
      }));

      const playerPos = Vec2.fromValues(500, 50);
      world.addEntity([
        new TransformComponent(playerPos),
        new PlayerComponent(),
      ]);
      world.addEntity([new JumpComponent({ jumpHeight: 100 })]);

      world.addEntity([
        new PlatformSpawner({
          triggerRange: 50,
          minX: 0,
          maxX: 1000,
          lastPlatform: platform,
        }),
      ]);

      const initialPlatformCount = Array.from(world.query(TransformComponent, ColliderComponent)).length;

      system.fixedUpdate(world);

      const finalPlatformCount = Array.from(world.query(TransformComponent, ColliderComponent)).length;
      expect(finalPlatformCount).toBe(initialPlatformCount);
    });

    it("не спавнит платформы если игрок ниже trigger range", () => {
      const spawner = new PlatformSpawner({
        triggerRange: 50,
        minX: 0,
        maxX: 1000,
      });
      spawner.lastPlatform = world.addEntity(createPlatform({
        position: Vec2.fromValues(500, 0),
        kind: "default",
      }));

      world.addEntity([
        new TransformComponent(Vec2.fromValues(500, -100)),
        new PlayerComponent(),
      ]);
      world.addEntity([new JumpComponent({ jumpHeight: 100 })]);
      world.addEntity([spawner]);

      const initialPlatformCount = Array.from(world.query(TransformComponent, ColliderComponent)).length;

      system.fixedUpdate(world);

      const finalPlatformCount = Array.from(world.query(TransformComponent, ColliderComponent)).length;
      expect(finalPlatformCount).toBe(initialPlatformCount);
    });
  });
});
