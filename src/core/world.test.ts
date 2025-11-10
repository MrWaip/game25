import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./world";
import { Component } from "../components/component";
import { TransformComponent } from "../components/transformComponent";
import { Vec2 } from "../primitives/vec2-gl";

class TestComponent extends Component {
  public value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }
}

describe("World", () => {
  let world: World;

  beforeEach(() => {
    world = new World({});
  });

  describe("entity management", () => {
    it("should create entity", () => {
      const entity = world.addEntity();
      expect(typeof entity).toBe("number");
    });

    it("should create entity with components", () => {
      const transform = new TransformComponent(Vec2.fromValues(10, 20));
      world.registerComponent(TransformComponent);
      const entity = world.addEntity([transform]);

      const retrieved = world.getComponent(entity, TransformComponent);
      expect(retrieved).toBeDefined();
      expect(retrieved?.position[0]).toBe(10);
      expect(retrieved?.position[1]).toBe(20);
    });

    it("should delete entity", () => {
      world.registerComponent(TransformComponent);
      const entity = world.addEntity([new TransformComponent(Vec2.create())]);

      world.deleteEntity(entity);

      const component = world.getComponent(entity, TransformComponent);
      expect(component).toBeUndefined();
    });
  });

  describe("component management", () => {
    beforeEach(() => {
      world.registerComponent(TransformComponent);
      world.registerComponent(TestComponent);
    });

    it("should register component", () => {
      world.registerComponent(TransformComponent);
      const entity = world.addEntity();
      const transform = new TransformComponent(Vec2.create());
      world.updateComponent(entity, transform);

      const retrieved = world.getComponent(entity, TransformComponent);
      expect(retrieved).toBe(transform);
    });

    it("should update component", () => {
      const entity = world.addEntity();
      const transform1 = new TransformComponent(Vec2.create());
      const transform2 = new TransformComponent(Vec2.fromValues(10, 20));

      world.updateComponent(entity, transform1);
      world.updateComponent(entity, transform2);

      const retrieved = world.getComponent(entity, TransformComponent);
      expect(retrieved).toBe(transform2);
    });

    it("should check if entity has component", () => {
      const entity = world.addEntity();
      expect(world.hasComponent(entity, TransformComponent)).toBe(false);

      world.updateComponent(entity, new TransformComponent(Vec2.create()));
      expect(world.hasComponent(entity, TransformComponent)).toBe(true);
    });

    it("should remove component", () => {
      const entity = world.addEntity();
      world.updateComponent(entity, new TransformComponent(Vec2.create()));

      world.removeComponent(entity, TransformComponent);

      expect(world.hasComponent(entity, TransformComponent)).toBe(false);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      world.registerComponent(TransformComponent);
      world.registerComponent(TestComponent);
    });

    it("should query entities with single component", () => {
      const entity1 = world.addEntity([new TransformComponent(Vec2.create())]);
      const entity2 = world.addEntity([new TransformComponent(Vec2.fromValues(10, 10))]);
      world.addEntity([new TestComponent(42)]);

      const results = Array.from(world.query(TransformComponent));
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.entity)).toContain(entity1);
      expect(results.map((r) => r.entity)).toContain(entity2);
    });

    it("should query entities with multiple components", () => {
      const entity1 = world.addEntity([
        new TransformComponent(Vec2.create()),
        new TestComponent(1),
      ]);
      world.addEntity([new TransformComponent(Vec2.fromValues(10, 10))]);
      world.addEntity([new TestComponent(2)]);

      const results = Array.from(
        world.query(TransformComponent, TestComponent),
      );
      expect(results).toHaveLength(1);
      expect(results[0].entity).toBe(entity1);
    });

    it("should return empty result when no entities match", () => {
      world.addEntity([new TransformComponent(Vec2.create())]);

      const results = Array.from(
        world.query(TransformComponent, TestComponent),
      );
      expect(results).toHaveLength(0);
    });
  });

  describe("gameTime", () => {
    it("should start at zero", () => {
      expect(world.getCurrentTime()).toBe(0);
    });

    it("should update time on fixedUpdate", () => {
      world.fixedUpdate(0.016);
      expect(world.getCurrentTime()).toBeCloseTo(16, 1);

      world.fixedUpdate(0.016);
      expect(world.getCurrentTime()).toBeCloseTo(32, 1);
    });

    it("should not update time when dt is zero", () => {
      world.fixedUpdate(0.016);
      const time1 = world.getCurrentTime();
      world.fixedUpdate(0);
      const time2 = world.getCurrentTime();
      expect(time1).toBe(time2);
    });
  });
});

