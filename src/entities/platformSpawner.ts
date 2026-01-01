import type { Component } from "../components/component";
import { PlatformSpawner } from "../components/platformSpawnerComponent";
import type { Vec2 } from "../primitives/vec2-gl";

export function createPlatformSpawner(viewportSize: Vec2): Component[] {
	const spawner = new PlatformSpawner({
		triggerRange: viewportSize[1],
		minX: 0,
		maxX: viewportSize[0],
	});

	return [spawner];
}
