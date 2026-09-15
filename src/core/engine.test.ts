import { AssetsManager } from "@/core/assetsManager";
import { createMockImageBitmap } from "@/testkit/renderer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { World } from "@/core/world";
import { Engine } from "@/core/engine";
import { Vec2 } from "@/primitives/vec2-gl";
import { Screen } from "@/core/screen";
import {
	createEngineAssetsManagerMock,
	createEngineWorldMock,
	createRafHarness,
} from "@/testkit";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Engine fixed timestep", () => {
	it("advances world in fixed steps even if render frames are at 30fps", async () => {
		const { requestAnimationFrame, step } = createRafHarness();

		const { world, fixedUpdate, update, destroy } = createEngineWorldMock();
		const assets = createEngineAssetsManagerMock();

		vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
		vi.spyOn(performance, "now").mockReturnValue(0);

		const screenSize = Vec2.fromValues(1280, 720);
		const orthographicSize = screenSize[1] / 2;
		const screen = new Screen(screenSize, 1, orthographicSize);
		const engine = new Engine(world, assets, screen, 60);

		await engine.initialize();
		engine.start();

		step(1000 / 30);

		expect(fixedUpdate).toHaveBeenCalledTimes(2);
		const fixedDts = fixedUpdate.mock.calls.map((c) => c[0] as number);
		expect(fixedDts.every((dt) => Math.abs(dt - 1 / 60) < 1e-9)).toBe(true);

		expect(update).toHaveBeenCalledTimes(1);
		expect(update.mock.calls[0][0]).toBeCloseTo(1 / 30, 6);

		await engine.destroy();
		expect(destroy).toHaveBeenCalledTimes(1);
	});

	it("caps simulation substeps per rendered frame", async () => {
		const { requestAnimationFrame, step } = createRafHarness();

		const { world, fixedUpdate, update } = createEngineWorldMock();
		const assets = createEngineAssetsManagerMock();

		vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
		vi.spyOn(performance, "now").mockReturnValue(0);

		const screenSize = Vec2.fromValues(1280, 720);
		const orthographicSize = screenSize[1] / 2;
		const screen = new Screen(screenSize, 1, orthographicSize);
		const engine = new Engine(world, assets, screen, 60);

		await engine.initialize();
		engine.start();

		step(1000);

		expect(fixedUpdate).toHaveBeenCalledTimes(10);
		expect(update).toHaveBeenCalledTimes(1);
	});
});

describe("Engine session lifecycle", () => {
	it("pauses simulation and resumes without catching up hidden time", async () => {
		const world = new World({});
		const raf = createRafHarness();
		vi.stubGlobal("requestAnimationFrame", raf.requestAnimationFrame);
		vi.spyOn(performance, "now").mockReturnValue(0);
		const engine = new Engine(
			world,
			{ initialize: async () => {} },
			new Screen(Vec2.fromValues(300, 600), 1, 300),
			60,
		);
		await engine.initialize();
		engine.start();
		raf.step(20);
		const before = world.getCurrentTime();
		engine.pause();
		raf.step(1000);
		expect(world.getCurrentTime()).toBe(before);
		vi.spyOn(performance, "now").mockReturnValue(1000);
		await engine.initialize();
		engine.start();
		raf.step(1020);
		expect(world.getCurrentTime()).toBeCloseTo(before + 1000 / 60);
		await engine.destroy();
	});
});

it("requires completed initialization and shares repeated startup work", async () => {
	const { world, initialize } = createEngineWorldMock();
	const gate = Promise.withResolvers<void>();
	const assets = { initialize: vi.fn(() => gate.promise) };
	const engine = new Engine(
		world,
		assets,
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	expect(() => engine.start()).toThrow(/initializ/i);
	const first = engine.initialize();
	const second = engine.initialize();
	expect(() => engine.start()).toThrow(/initializ/i);
	gate.resolve();
	await Promise.all([first, second]);
	expect(assets.initialize).toHaveBeenCalledTimes(1);
	expect(initialize).toHaveBeenCalledTimes(1);
	await engine.destroy();
});

it("stops the current frame immediately when a simulation step pauses the engine", async () => {
	const raf = createRafHarness();
	vi.stubGlobal("requestAnimationFrame", raf.requestAnimationFrame);
	vi.spyOn(performance, "now").mockReturnValue(0);
	const { world, fixedUpdate, update } = createEngineWorldMock();
	const engine = new Engine(
		world,
		createEngineAssetsManagerMock(),
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	fixedUpdate.mockImplementation(() => engine.pause());
	await engine.initialize();
	engine.start();
	raf.step(100);
	expect(fixedUpdate).toHaveBeenCalledTimes(1);
	expect(update).not.toHaveBeenCalled();
	expect(raf.requestAnimationFrame).toHaveBeenCalledTimes(1);
	await engine.destroy();
});

it("cancels startup during asset loading and disposes resources once after loading settles", async () => {
	const { world, initialize, destroy } = createEngineWorldMock();
	const gate = Promise.withResolvers<void>();
	const entered = Promise.withResolvers<void>();
	const assets = {
		initialize: () => {
			entered.resolve();
			return gate.promise;
		},
		destroy: vi.fn(async () => {}),
	};
	const engine = new Engine(
		world,
		assets,
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	const startup = engine.initialize();
	const rejected = expect(startup).rejects.toThrow(/destroy/i);
	await entered.promise;
	const first = engine.destroy();
	const second = engine.destroy();
	const earlyDisposals = destroy.mock.calls.length;
	gate.resolve();
	await Promise.all([first, second, rejected]);
	expect(earlyDisposals).toBe(0);
	expect(initialize).not.toHaveBeenCalled();
	expect(destroy).toHaveBeenCalledTimes(1);
	expect(assets.destroy).toHaveBeenCalledTimes(1);
	await expect(engine.initialize()).rejects.toThrow(/destroy/i);
});

it("leaves the loop paused after a frame error so it can be explicitly restarted", async () => {
	const raf = createRafHarness();
	vi.stubGlobal("requestAnimationFrame", raf.requestAnimationFrame);
	vi.spyOn(performance, "now").mockReturnValue(0);
	const { world, update } = createEngineWorldMock();
	const engine = new Engine(
		world,
		createEngineAssetsManagerMock(),
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	update.mockImplementationOnce(() => {
		throw new Error("render failed");
	});
	await engine.initialize();
	engine.start();
	expect(() => raf.step(20)).toThrow("render failed");
	engine.start();
	expect(raf.requestAnimationFrame).toHaveBeenCalledTimes(2);
	raf.step(40);
	expect(update).toHaveBeenCalledTimes(2);
	await engine.destroy();
});

it("releases assets that finish loading after another asset has failed", async () => {
	const entered = Promise.withResolvers<void>();
	const lateResponse = Promise.withResolvers<Response>();
	const decoded = Promise.withResolvers<void>();
	const bitmap = createMockImageBitmap();
	const failure = new Error("asset failed");
	vi.stubGlobal("fetch", (url: string) => {
		if (url === "bad") return Promise.reject(failure);
		entered.resolve();
		return lateResponse.promise;
	});
	vi.stubGlobal("createImageBitmap", async () => {
		decoded.resolve();
		return bitmap;
	});
	const assets = new AssetsManager<"bad" | "late">();
	assets.addSprites({ bad: "bad", late: "late" });
	const { world } = createEngineWorldMock();
	const engine = new Engine(
		world,
		assets,
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	const startup = engine.initialize();
	const rejected = expect(startup).rejects.toThrow();
	await entered.promise;
	await new Promise((resolve) => setTimeout(resolve, 0));
	lateResponse.resolve(new Response(new Blob(["image"])));
	await Promise.all([rejected, decoded.promise]);
	expect(bitmap.close).toHaveBeenCalledTimes(1);
});

it("propagates destruction into a world that is still initializing", async () => {
	const world = new World({});
	const entered = Promise.withResolvers<void>();
	const gate = Promise.withResolvers<void>();
	const calls: string[] = [];
	world.registerSystem({
		initialize: async () => {
			entered.resolve();
			await gate.promise;
			calls.push("first ready");
		},
	});
	world.registerSystem({
		initialize: () => {
			calls.push("second ready");
		},
	});
	const engine = new Engine(
		world,
		createEngineAssetsManagerMock(),
		new Screen(Vec2.fromValues(300, 600), 1, 300),
		60,
	);
	const startup = engine.initialize();
	const rejected = expect(startup).rejects.toThrow(/destroy/i);
	await entered.promise;
	const destruction = engine.destroy();
	gate.resolve();
	await Promise.all([rejected, destruction]);
	expect(calls).toEqual(["first ready"]);
});
