import type { Run } from "@/games/defense/components/runComponent";
import type { Enemy } from "@/games/defense/components/enemyComponent";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
export type Point = { x: number; y: number };
export type WorldEffect = {
	movementFactor?: (run: Run, position: Point, build: BuildModifiers) => number;
	attackDelay?: (run: Run, position: Point, build: BuildModifiers) => number;
	chills?: (run: Run, position: Point, build: BuildModifiers) => boolean;
	tick?: (run: Run, dt: number) => void;
	crossing?: (
		run: Run,
		enemy: Enemy,
		previousProgress: number,
		build: BuildModifiers,
	) => void;
};
