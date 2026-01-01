import { afterEach, describe, expect, it, vi } from "vitest";
import { Engine } from "./engine";
import { Vec2 } from "../primitives/vec2-gl";
import { Screen } from "./screen";
import {
	createEngineAssetsManagerMock,
	createEngineWorldMock,
	createRafHarness,
} from "../testkit";

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

	it("caps simulation substeps per rendered frame", () => {
		const { requestAnimationFrame, step } = createRafHarness();

		const { world, fixedUpdate, update } = createEngineWorldMock();
		const assets = createEngineAssetsManagerMock();

		vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
		vi.spyOn(performance, "now").mockReturnValue(0);

		const screenSize = Vec2.fromValues(1280, 720);
		const orthographicSize = screenSize[1] / 2;
		const screen = new Screen(screenSize, 1, orthographicSize);
		const engine = new Engine(world, assets, screen, 60);

		engine.start();

		step(1000);

		expect(fixedUpdate).toHaveBeenCalledTimes(10);
		expect(update).toHaveBeenCalledTimes(1);
	});
});
