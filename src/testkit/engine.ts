import { vi } from "vite-plus/test";
import { Engine } from "@/core/engine";

type EngineWorld = ConstructorParameters<typeof Engine>[0];
type EngineAssetsManager = ConstructorParameters<typeof Engine>[1];

export function createEngineWorldMock() {
	const fixedUpdate = vi.fn();
	const update = vi.fn();
	const initialize = vi.fn(async () => {});
	const destroy = vi.fn(async () => {});

	const world = {
		fixedUpdate,
		update,
		initialize,
		destroy,
	} satisfies EngineWorld;

	return {
		world,
		fixedUpdate,
		update,
		initialize,
		destroy,
	};
}

export function createEngineAssetsManagerMock(): EngineAssetsManager {
	return { initialize: vi.fn(async () => {}) } satisfies EngineAssetsManager;
}
