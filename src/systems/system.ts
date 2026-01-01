import type { World } from "../core/world";

export interface ISystem {
	fixedUpdate?(world: World, dt: number): void;

	update?(world: World, dt: number): void;

	initialize?(world: World): Promise<void> | void;

	destroy?(world: World): Promise<void> | void;
}
