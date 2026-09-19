import { Run } from "@/games/defense/components/runComponent";
import type { Tower } from "@/games/defense/components/towerComponent";
import {
	getProgress,
	observeProgress,
	type DefenseEventOptions,
} from "@/games/defense/events";
import type { createDefenseWorld } from "@/games/defense/setup";
import { snapshot } from "@/games/defense/snapshot";
import { save } from "@/games/defense/save";
import type { TowerKind, Upgrade, Starter } from "@/games/defense/config";
import type { DefenseCommand } from "@/games/defense/commands";

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
	const dispatch = (request: DefenseCommand): boolean => {
		switch (request.type) {
			case "run.restart":
				return command(() =>
					commands.restart(request.seed ?? crypto.randomUUID()),
				);
			case "run.chooseStarter":
				return command(() => commands.chooseStarter(request.starter));
			case "run.continue":
				return command(() => commands.continue());
			case "wave.start":
				return command(() => commands.startWave());
			case "reward.choose":
				return command(() => commands.choose(request.choice));
			case "world.placeSnow":
				return allowed() && commands.placeSnow(request.cell);
			case "world.placePortal":
				return (
					allowed() && commands.placePortal(request.entrance, request.exit)
				);
			case "tower.build":
				return allowed() && construction.build(request.cell, request.kind);
			case "tower.replace":
				return (
					allowed() && construction.build(request.cell, request.kind, true)
				);
			case "tower.improve":
				return allowed() && construction.improve(request.cell);
			case "tower.sell":
				return allowed() && construction.sell(request.cell);
			case "tower.relocate":
				return allowed() && construction.relocate(request.from, request.to);
			case "tower.specialize":
				return (
					allowed() && construction.specialize(request.cell, request.choice)
				);
			case "tower.overdrive":
				return allowed() && commands.overdrive(request.cell);
			case "tower.priority":
				return allowed() && commands.priority(request.cell, request.priority);
			case "shop.buy":
				return allowed() && commands.buy(request.upgrade);
			case "shop.sell":
				return allowed() && commands.sellJoker(request.upgrade);
			case "shop.reroll":
				return allowed() && commands.reroll();
			case "shop.hold":
				return allowed() && commands.hold(request.upgrade);
			case "progression.expand":
				return allowed() && commands.expand(request.choice);
		}
	};
	return {
		dispatch,
		specialize: (cell: number, choice: "focus" | "spread") =>
			allowed() && construction.specialize(cell, choice),
		continue: () => command(() => commands.continue()),
		buy: (key: Upgrade) => allowed() && commands.buy(key),
		sellJoker: (key: Upgrade) => allowed() && commands.sellJoker(key),
		reroll: () => allowed() && commands.reroll(),
		hold: (key: Upgrade) => allowed() && commands.hold(key),
		expand: (kind: "limit" | "income") => allowed() && commands.expand(kind),
		overdrive: (cell: number) => allowed() && commands.overdrive(cell),
		priority: (cell: number, priority: Tower["priority"]) =>
			allowed() && commands.priority(cell, priority),
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
