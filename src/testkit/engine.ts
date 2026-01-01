import { vi } from "vitest";
import { Engine } from "../core/engine";

type EngineWorld = ConstructorParameters<typeof Engine>[0];
type EngineAssetsManager = ConstructorParameters<typeof Engine>[1];
type EngineEventBus = EngineWorld["eventBus"];

export function createEngineWorldMock() {
	const fixedUpdate = vi.fn();
	const update = vi.fn();
	const addEntity = vi.fn(() => 1);
	const initialize = vi.fn(async () => {});
	const destroy = vi.fn(async () => {});
	const eventBus: EngineEventBus = { emit: vi.fn() };

	const world = {
		addEntity,
		fixedUpdate,
		update,
		initialize,
		destroy,
		eventBus,
	} satisfies EngineWorld;

	return {
		world,
		fixedUpdate,
		update,
		addEntity,
		initialize,
		destroy,
		emit: eventBus.emit,
	};
}

export function createEngineAssetsManagerMock(): EngineAssetsManager {
	return { initialize: vi.fn(async () => {}) } satisfies EngineAssetsManager;
}
