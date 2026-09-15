import { Run } from "@/games/defense/components/runComponent";
import {
	getProgress,
	observeProgress,
	type DefenseEventOptions,
} from "@/games/defense/events";
import type { createDefenseWorld } from "@/games/defense/setup";
import { snapshot } from "@/games/defense/snapshot";
import { save } from "@/games/defense/save";
import type { TowerKind, Upgrade, Starter } from "@/games/defense/config";

/** Internal assembly seam shared by loading a Run and preparing combat scenarios. */
export function createSessionRuntime(
	{
		world,
		commands,
		construction,
	}: Awaited<ReturnType<typeof createDefenseWorld>>,
	options: DefenseEventOptions = {},
) {
	const run = world.getFirstComponent(Run)!;
	const observe = observeProgress(run, options);
	let paused = false;
	let destroyed = false;
	let destruction: Promise<void> | undefined;
	const allowed = () => !paused && !destroyed;
	const command = (action: () => boolean) => {
		if (!allowed()) return false;
		const result = action();
		observe();
		return result;
	};
	return {
		sell: (cell: number) => allowed() && construction.sell(cell),
		replace: (cell: number, kind: TowerKind) =>
			allowed() && construction.build(cell, kind, true),
		restart: (seed: string = crypto.randomUUID()) =>
			command(() => commands.restart(seed)),
		chooseStarter: (starter: Starter) =>
			command(() => commands.chooseStarter(starter)),
		placeSnow: (cell: number) => allowed() && commands.placeSnow(cell),
		placePortal: (entrance: number, exit: number) =>
			allowed() && commands.placePortal(entrance, exit),
		build: (slot: number, kind: TowerKind) =>
			allowed() && construction.build(slot, kind),
		improve: (slot: number) => allowed() && construction.improve(slot),
		relocate: (from: number, to: number) =>
			allowed() && construction.relocate(from, to),
		startWave: () => command(() => commands.startWave()),
		choose: (choice: Upgrade) => command(() => commands.choose(choice)),
		getProgress: () => getProgress(run),
		snapshot: () => snapshot(world),
		save: () => save(world),
		pause() {
			paused = true;
		},
		resume() {
			if (!destroyed) paused = false;
		},
		step(frames = 1) {
			if (!Number.isSafeInteger(frames) || frames < 0)
				throw new Error("Invalid frame count");
			for (let i = 0; i < frames && allowed(); i++) {
				world.fixedUpdate(1 / 60);
				observe();
			}
		},
		destroy(): Promise<void> {
			destroyed = true;
			return (destruction ??= world.destroy());
		},
	};
}
