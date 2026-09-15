import type { SystemScope } from "@/systems/systemScope";
export type { SystemScope } from "@/systems/systemScope";
import type { World } from "@/core/world";

export interface ISystem<W extends World = World> {
	fixedUpdate?(world: W, dt: number): void;

	update?(world: W, dt: number): void;

	initialize?(world: W, scope: SystemScope): Promise<void> | void;

	destroy?(world: W): Promise<void> | void;
}
