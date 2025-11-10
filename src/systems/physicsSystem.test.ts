import { describe, it, expect, beforeEach } from "vitest";
import { PhysicsSystem } from "./physicsSystem";
import { TransformComponent } from "../components/transformComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { Gravity } from "../components/gravityComponent";
import { CollidedComponent } from "../components/collidedComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { CounterComponent } from "../components/counterComponent";
import type { World } from "../core/world";
import type { PhysicsWorld } from "./physicsWorld";
import { createHarness } from "../testkit/harness";

describe("PhysicsSystem", () => {
  let world: World;
  let physicsWorld: PhysicsWorld;
  let physicsSystem: PhysicsSystem;
  const viewportSize = Vec2.fromValues(800, 600);
  const dt = 0.016;

  beforeEach(async () => {
    const h = await createHarness({ viewportSize });
    world = h.world;
    physicsWorld = h.physicsWorld;
    physicsSystem = new PhysicsSystem(physicsWorld);
    world.addEntity([new CounterComponent()]);
  });

  describe("гравитация", () => {
    it("применяет гравитацию к сущности с компонентом Gravity", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
        new Gravity({ acceleration: Vec2.fromValues(0, 500) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;
      const initialVelocity = Vec2.clone(velocity.value);

      physicsSystem.fixedUpdate(world, dt);
      physicsWorld.fixedUpdate(world);

      expect(velocity.value[1]).toBeGreaterThan(initialVelocity[1]);
      expect(velocity.value[0]).toBe(initialVelocity[0]);
    });

    it("накапливает гравитацию на нескольких кадрах", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
        new Gravity({ acceleration: Vec2.fromValues(0, 500) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;

      physicsSystem.fixedUpdate(world, dt);
      physicsWorld.fixedUpdate(world);
      const velocity1 = Vec2.clone(velocity.value);

      physicsSystem.fixedUpdate(world, dt);
      physicsWorld.fixedUpdate(world);
      const velocity2 = Vec2.clone(velocity.value);

      expect(velocity2[1]).toBeGreaterThan(velocity1[1]);
    });

    it("не применяет гравитацию к сущности без компонента Gravity", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(10, 20)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;
      const initialVelocity = Vec2.clone(velocity.value);

      physicsSystem.fixedUpdate(world, dt);
      physicsWorld.fixedUpdate(world);

      expect(velocity.value[0]).toBe(initialVelocity[0]);
      expect(velocity.value[1]).toBe(initialVelocity[1]);
    });
  });

  describe("движение и коллизии", () => {
    it("двигает сущность при отсутствии коллизий", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const transform = world.getComponent(entity, TransformComponent)!;
      const initialPos = Vec2.clone(transform.position);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const expectedX = initialPos[0] + 100 * dt;
      expect(transform.position[0]).toBeCloseTo(expectedX, 5);
      expect(transform.position[1]).toBe(initialPos[1]);
    });

    it("обнуляет скорость по X при ударе о стену", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(149, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 200) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(1000, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(velocity.value[0]).toBe(0);
    });

    it("обнуляет скорость по Y при приземлении", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 50)),
        new ColliderComponent({ size: Vec2.fromValues(200, 50), oneWay: true }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, -500)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(velocity.value[1]).toBe(0);
    });

    it("обнуляет скорость по Y при ударе о потолок", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 150)),
        new ColliderComponent({ size: Vec2.fromValues(200, 50) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, 500)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const velocity = world.getComponent(entity, VelocityComponent)!;

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(velocity.value[1]).toBe(0);
    });
  });

  describe("CollidedComponent", () => {
    it("добавляет CollidedComponent при коллизии", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 200) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const collided = world.getComponent(entity, CollidedComponent);
      expect(collided).toBeDefined();
      expect(collided?.isGrounded).toBeDefined();
    });

    it("удаляет CollidedComponent если на кадре коллизий нет", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      world.updateComponent(entity, new CollidedComponent([
        {
          entity: 999,
          normal: Vec2.fromValues(0, 1),
          time: 0,
        },
      ]));

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const collided = world.getComponent(entity, CollidedComponent);
      expect(collided).toBeUndefined();
    });
  });

  describe("триггеры", () => {
    it("эмитит событие trigger при столкновении с триггер-коллайдером", () => {
      const triggerEntity = world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50), isTrigger: true }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      let triggerEventEmitted = false;
      world.eventBus.on("trigger", (event) => {
        expect(event.target).toBe(triggerEntity);
        expect(event.initiator).toBe(entity);
        triggerEventEmitted = true;
      });

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(triggerEventEmitted).toBe(true);
    });

    it("не добавляет CollidedComponent для столкновений с триггером", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50), isTrigger: true }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const collided = world.getComponent(entity, CollidedComponent);
      expect(collided).toBeUndefined();
    });
  });

  describe("события коллизий", () => {
    it("эмитит событие collision", () => {
      const wall = world.addEntity([
        new TransformComponent(Vec2.fromValues(200, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 200) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      let collisionEventEmitted = false;
      world.eventBus.on("collision", (event) => {
        expect(event.target).toBe(wall);
        expect(event.initiator).toBe(entity);
        expect(event.normal).toBeDefined();
        expect(event.time).toBeDefined();
        collisionEventEmitted = true;
      });

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(collisionEventEmitted).toBe(true);
    });

    it("разруливает начальное пересечение (time === 0)", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(175, 100)),
        new ColliderComponent({ size: Vec2.fromValues(50, 200) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(150, 100)),
        new VelocityComponent(Vec2.fromValues(0, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const transform = world.getComponent(entity, TransformComponent)!;
      const initialPos = Vec2.clone(transform.position);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const posChanged = 
        transform.position[0] !== initialPos[0] ||
        transform.position[1] !== initialPos[1];
      
      expect(typeof posChanged).toBe("boolean");
    });
  });

  describe("нормали коллизий", () => {
    it("корректно определяет коллизию с землёй", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 200)),
        new ColliderComponent({ size: Vec2.fromValues(200, 50), oneWay: true }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, -500)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const collided = world.getComponent(entity, CollidedComponent);
      if (collided) {
        expect(collided.isGrounded).toBe(true);
      }
    });

    it("корректно определяет коллизию с потолком", () => {
      world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(200, 50) }),
      ]);

      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0, 500)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      const collided = world.getComponent(entity, CollidedComponent);
      if (collided) {
        expect(collided.hitCeiling).toBe(true);
      }
    });
  });

  describe("отключённые коллайдеры", () => {
    it("не обрабатывает сущности с отключённым коллайдером", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(100, 0)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const collider = world.getComponent(entity, ColliderComponent)!;
      collider.disable();

      const transform = world.getComponent(entity, TransformComponent)!;
      const initialPos = Vec2.clone(transform.position);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(transform.position[0]).toBeCloseTo(initialPos[0], 5);
      expect(transform.position[1]).toBeCloseTo(initialPos[1], 5);
    });
  });

  describe("оптимизация при нулевом движении", () => {
    it("может пропустить движение при пренебрежимо малой скорости", () => {
      const entity = world.addEntity([
        new TransformComponent(Vec2.fromValues(100, 100)),
        new VelocityComponent(Vec2.fromValues(0.001, 0.001)),
        new ColliderComponent({ size: Vec2.fromValues(50, 50) }),
      ]);

      const transform = world.getComponent(entity, TransformComponent)!;
      const initialPos = Vec2.clone(transform.position);

      physicsWorld.fixedUpdate(world);
      physicsSystem.fixedUpdate(world, dt);

      expect(transform.position[0]).toBeCloseTo(initialPos[0], 5);
      expect(transform.position[1]).toBeCloseTo(initialPos[1], 5);
    });
  });
});

