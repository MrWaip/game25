import { EventBus } from "@/systems/eventBus";
import { RenderLayerComponent } from "@/components/renderLayerComponent";
import { RenderLayers } from "@/render/layers";
import { describe, it, expect, beforeEach } from "vite-plus/test";
import { World } from "@/core/world";
import { Component } from "@/components/component";
import { TransformComponent } from "@/components/transformComponent";
import { Vec2 } from "@/primitives/vec2-gl";

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
			const entity2 = world.addEntity([
				new TransformComponent(Vec2.fromValues(10, 10)),
			]);
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

it("preserves live and disabled data when a component is registered again", () => {
	const world = new World({});
	world.registerComponent(TestComponent);
	const live = world.addEntity([new TestComponent(7)]);
	const disabled = world.addEntity([new TestComponent(9)]);
	world.disableComponent(disabled, TestComponent);
	world.registerComponent(TestComponent);
	expect(world.getComponent(live, TestComponent)?.value).toBe(7);
	world.enableComponent(disabled, TestComponent);
	expect(world.getComponent(disabled, TestComponent)?.value).toBe(9);
});

it("rejects writes to removed entities and rolls back incomplete creation", () => {
	const world = new World({});
	world.registerComponent(TestComponent);
	const entity = world.addEntity([new TestComponent(1)]);
	world.deleteEntity(entity);
	expect(() => world.updateComponent(entity, new TestComponent(2))).toThrow(
		/entity/i,
	);
	expect(() =>
		world.addEntity([
			new TestComponent(3),
			new TransformComponent(Vec2.create()),
		]),
	).toThrow(/registered/i);
	expect([...world.query(TestComponent)]).toEqual([]);
	expect([...world.query()]).toEqual([]);
});

it("does not resurrect removed or replaced disabled components", () => {
	const world = new World({});
	world.registerComponent(TestComponent);
	const entity = world.addEntity([new TestComponent(1)]);
	world.disableComponent(entity, TestComponent);
	world.removeComponent(entity, TestComponent);
	world.enableComponent(entity, TestComponent);
	expect(world.getComponent(entity, TestComponent)).toBeUndefined();
	world.updateComponent(entity, new TestComponent(2));
	world.disableComponent(entity, TestComponent);
	world.updateComponent(entity, new TestComponent(3));
	world.enableComponent(entity, TestComponent);
	expect(world.getComponent(entity, TestComponent)?.value).toBe(3);
});

it("keeps render queries consistent through disabling, replacement and removal", () => {
	const world = new World({});
	world.registerComponent(RenderLayerComponent);
	const entity = world.addEntity([
		new RenderLayerComponent(RenderLayers.Debug),
	]);
	world.disableComponent(entity, RenderLayerComponent);
	expect([...world.queryByLayer(RenderLayers.Debug)]).toEqual([]);
	world.enableComponent(entity, RenderLayerComponent);
	expect([...world.queryByLayer(RenderLayers.Debug)]).toEqual([entity]);
	world.removeComponent(entity, RenderLayerComponent);
	expect([...world.queryByLayer(RenderLayers.Debug)]).toEqual([]);
	world.enableComponent(entity, RenderLayerComponent);
	expect([...world.queryByLayer(RenderLayers.Debug)]).toEqual([]);
	world.updateComponent(entity, new RenderLayerComponent(RenderLayers.Debug));
	world.deleteEntity(entity);
	expect([...world.queryByLayer(RenderLayers.Debug)]).toEqual([]);
	expect([...world.getLayers()]).toEqual([]);
});

it("cleans every system and entity once even when cleanup fails", async () => {
	const world = new World({});
	const cleaned: string[] = [];
	const failure = new Error("cleanup failed");
	world.registerComponent(TestComponent);
	world.addEntity([new TestComponent(1)]);
	world.registerSystem({
		destroy: () => {
			cleaned.push("first");
		},
	});
	world.registerSystem({
		destroy: () => {
			cleaned.push("second");
			throw failure;
		},
	});
	const destruction = world.destroy();
	await expect(destruction).rejects.toThrow(AggregateError);
	await expect(world.destroy()).rejects.toThrow(AggregateError);
	expect(cleaned).toEqual(["second", "first"]);
	expect([...world.query(TestComponent)]).toEqual([]);
	expect([...world.query()]).toEqual([]);
	expect(() => world.addEntity()).toThrow(/destroy/i);
});

it("coalesces initialization and rolls back failed startup without starting later systems", async () => {
	const world = new World({});
	const calls: string[] = [];
	const failure = new Error("startup failed");
	world.registerSystem({
		initialize: () => {
			calls.push("first");
		},
		destroy: () => {
			calls.push("dispose first");
		},
	});
	world.registerSystem({
		initialize: () => {
			throw failure;
		},
		destroy: () => {
			calls.push("dispose second");
		},
	});
	world.registerSystem({
		initialize: () => {
			calls.push("third");
		},
		destroy: () => {
			calls.push("dispose third");
		},
	});
	const first = world.initialize();
	const second = world.initialize();
	await Promise.all([
		expect(first).rejects.toBe(failure),
		expect(second).rejects.toBe(failure),
	]);
	expect(calls).toEqual([
		"first",
		"dispose third",
		"dispose second",
		"dispose first",
	]);
	await world.destroy();
	expect(calls).toHaveLength(4);
	await expect(world.initialize()).rejects.toThrow(/destroy/i);
});

it("waits for in-flight initialization before cleanup and skips later systems", async () => {
	const world = new World({});
	const entered = Promise.withResolvers<void>();
	const gate = Promise.withResolvers<void>();
	const calls: string[] = [];
	world.registerSystem({
		initialize: async () => {
			entered.resolve();
			await gate.promise;
			calls.push("acquired");
		},
		destroy: () => {
			calls.push("released");
		},
	});
	world.registerSystem({
		initialize: () => {
			calls.push("unexpected startup");
		},
	});
	const startup = world.initialize();
	const rejected = expect(startup).rejects.toThrow(/destroy/i);
	await entered.promise;
	const destruction = world.destroy();
	expect(calls).toEqual([]);
	gate.resolve();
	await Promise.all([rejected, destruction]);
	expect(calls).toEqual(["acquired", "released"]);
	world.fixedUpdate(1);
	expect(world.getCurrentTime()).toBe(0);
	expect(() => world.registerSystem({})).toThrow(/destroy/i);
});

it("owns system subscriptions and closes them before destroy hooks", async () => {
	const bus = new EventBus<{ score: number }>();
	const world = new World({});
	const received: number[] = [];
	world.registerSystem({
		initialize: (_world, scope) => {
			scope.on(bus, "score", (score) => received.push(score));
		},
		destroy: () => {
			bus.emit("score", 99);
		},
	});
	await world.initialize();
	bus.emit("score", 7);
	await world.destroy();
	bus.emit("score", 42);
	expect(received).toEqual([7]);
});

it("keeps scopes independent when systems share the same callback", async () => {
	const bus = new EventBus<{ score: number }>();
	const world = new World({});
	const received: number[] = [];
	const listener = (score: number) => {
		received.push(score);
	};
	world.registerSystem({
		initialize: (_world, scope) => {
			scope.on(bus, "score", listener);
		},
	});
	world.registerSystem({
		initialize: (_world, scope) => {
			scope.on(bus, "score", listener);
		},
		destroy: () => {
			bus.emit("score", 2);
		},
	});
	await world.initialize();
	bus.emit("score", 1);
	await world.destroy();
	bus.emit("score", 3);
	expect(received).toEqual([1, 1, 2]);
});

it("closes subscriptions on failed startup and rejects late subscription attempts", async () => {
	const bus = new EventBus<{ score: number }>();
	const world = new World({});
	const received: number[] = [];
	let subscribeLater = () => {};
	world.registerSystem({
		initialize: (_world, scope) => {
			scope.on(bus, "score", (score) => received.push(score));
			scope.onAll(bus, (_event, score) => received.push(score));
			subscribeLater = () => {
				scope.on(bus, "score", () => {});
			};
			throw new Error("startup failed");
		},
		destroy: () => {
			throw new Error("cleanup failed");
		},
	});
	await expect(world.initialize()).rejects.toThrow(AggregateError);
	bus.emit("score", 1);
	expect(received).toEqual([]);
	expect(subscribeLater).toThrow("System scope is closed");
});

it("allows early unsubscribe without closing the rest of the system scope", async () => {
	const bus = new EventBus<{ score: number }>();
	const world = new World({});
	const received: string[] = [];
	let stop = () => {};
	world.registerSystem({
		initialize: (_world, scope) => {
			stop = scope.on(bus, "score", (score) => received.push(`score:${score}`));
			scope.onAll(bus, (event, score) =>
				received.push(`${event}:all:${score}`),
			);
		},
	});
	await world.initialize();
	stop();
	stop();
	bus.emit("score", 1);
	await world.destroy();
	stop();
	bus.emit("score", 2);
	expect(received).toEqual(["score:all:1"]);
});
