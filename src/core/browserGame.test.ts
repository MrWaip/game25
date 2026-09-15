import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { mountBrowserGame } from "@/core/browserGame";
import { Engine } from "@/core/engine";
import { Screen } from "@/core/screen";
import { Vec2 } from "@/primitives/vec2-gl";

beforeEach(() => {
	vi.spyOn(document, "hidden", "get").mockReturnValue(false);
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn(() => 1),
	);
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

function resources() {
	const root = document.createElement("section");
	document.body.append(root);
	const simulation = {
		initialize: vi.fn(async () => {}),
		fixedUpdate: vi.fn(),
		update: vi.fn(),
		destroy: vi.fn(async () => {}),
	};
	const engine = new Engine(
		simulation,
		{ initialize: async () => {} },
		new Screen(Vec2.fromValues(100, 100), 1, 50),
		60,
	);
	return { root, engine, simulation };
}

it("keeps manual pause across visibility changes and resumes only when visible", async () => {
	const { root, engine } = resources();
	const sync = vi.fn();
	const pagehide = vi.fn();
	const game = await mountBrowserGame(root, (defer) => {
		defer(() => engine.destroy());
		return { engine, sync, pagehide };
	});
	expect(sync).toHaveBeenLastCalledWith(false);
	expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
	game.pause();
	vi.spyOn(document, "hidden", "get").mockReturnValue(true);
	document.dispatchEvent(new Event("visibilitychange"));
	vi.spyOn(document, "hidden", "get").mockReturnValue(false);
	document.dispatchEvent(new Event("visibilitychange"));
	expect(sync).toHaveBeenCalledTimes(2);
	expect(sync).toHaveBeenLastCalledWith(true);
	expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
	game.resume();
	expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
	vi.spyOn(document, "hidden", "get").mockReturnValue(true);
	document.dispatchEvent(new Event("visibilitychange"));
	game.pause();
	game.resume();
	expect(sync).toHaveBeenLastCalledWith(true);
	expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
	vi.spyOn(document, "hidden", "get").mockReturnValue(false);
	document.dispatchEvent(new Event("visibilitychange"));
	expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
	window.dispatchEvent(new Event("pagehide"));
	expect(pagehide).toHaveBeenCalledTimes(1);
	await game.destroy();
	const calls = sync.mock.calls.length;
	game.resume();
	game.pause();
	document.dispatchEvent(new Event("visibilitychange"));
	window.dispatchEvent(new Event("pagehide"));
	expect(sync).toHaveBeenCalledTimes(calls);
	expect(pagehide).toHaveBeenCalledTimes(1);
	expect(root.isConnected).toBe(false);
});

it("starts a hidden game paused", async () => {
	vi.spyOn(document, "hidden", "get").mockReturnValue(true);
	const { root, engine } = resources();
	const sync = vi.fn();
	const game = await mountBrowserGame(root, (defer) => {
		defer(() => engine.destroy());
		return { engine, sync };
	});
	expect(sync).toHaveBeenCalledWith(true);
	expect(requestAnimationFrame).not.toHaveBeenCalled();
	await game.destroy();
});

it("shares pending destruction and cleans all resources despite save and cleanup failures", async () => {
	const { root, engine, simulation } = resources();
	let finish!: () => void;
	const work = new Promise<void>((resolve) => {
		finish = resolve;
	});
	simulation.destroy.mockImplementation(() => work);
	const save = vi.fn(() => {
		throw new Error("save failed");
	});
	const view = vi.fn(() => {
		throw new Error("view cleanup failed");
	});
	const sync = vi.fn();
	const game = await mountBrowserGame(root, (defer) => {
		defer(() => engine.destroy());
		defer(view);
		defer(save);
		return { engine, sync, pagehide: save };
	});
	const first = game.destroy();
	expect(game.destroy()).toBe(first);
	let completed = false;
	const outcome = first.catch((error: unknown) => {
		completed = true;
		return error;
	});
	await vi.waitFor(() => expect(simulation.destroy).toHaveBeenCalledTimes(1));
	expect(completed).toBe(false);
	window.dispatchEvent(new Event("pagehide"));
	game.resume();
	expect(save).toHaveBeenCalledTimes(1);
	expect(sync).toHaveBeenCalledTimes(1);
	finish();
	const error = await outcome;
	expect(error).toBeInstanceOf(AggregateError);
	expect((error as AggregateError).errors).toHaveLength(2);
	expect(view).toHaveBeenCalledTimes(1);
	expect(root.isConnected).toBe(false);
	expect(game.destroy()).toBe(first);
});

it("rolls back resources acquired before setup failed", async () => {
	const { root, engine, simulation } = resources();
	await expect(
		mountBrowserGame(root, (defer) => {
			defer(() => engine.destroy());
			throw new Error("canvas unavailable");
		}),
	).rejects.toThrow("canvas unavailable");
	expect(simulation.destroy).toHaveBeenCalledTimes(1);
	expect(root.isConnected).toBe(false);
});

it("rolls back listeners and the engine when the first display refresh fails", async () => {
	const { root, engine, simulation } = resources();
	const sync = vi.fn(() => {
		throw new Error("refresh failed");
	});
	const pagehide = vi.fn();
	await expect(
		mountBrowserGame(root, (defer) => {
			defer(() => engine.destroy());
			return { engine, sync, pagehide };
		}),
	).rejects.toThrow("refresh failed");
	document.dispatchEvent(new Event("visibilitychange"));
	window.dispatchEvent(new Event("pagehide"));
	expect(sync).toHaveBeenCalledTimes(1);
	expect(pagehide).not.toHaveBeenCalled();
	expect(simulation.destroy).toHaveBeenCalledTimes(1);
	expect(requestAnimationFrame).not.toHaveBeenCalled();
	expect(root.isConnected).toBe(false);
});
