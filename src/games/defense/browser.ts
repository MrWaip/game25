import { Engine } from "@/core/engine";
import { Screen } from "@/core/screen";
import { Vec2 } from "@/primitives/vec2-gl";
import { mountBrowserGame } from "@/core/browserGame";
import { createDefenseSession } from "./session";
import type { DefenseEventOptions } from "./events";
import { RunScreen, type Persistence } from "./runScreen";
import { loadAssets } from "./assets";
export type {
	DefenseEventOptions,
	DefenseEvent,
	DefenseProgress,
} from "./events";
export async function mountDefense(
	node: HTMLElement,
	options: { seed?: string; saved?: string } & DefenseEventOptions &
		Persistence = {},
) {
	const root = document.createElement("section");
	root.className = "defense";
	const session = await createDefenseSession(options);
	let manuallyPaused = false;
	let controls: { pause(): void; resume(): void } | undefined;
	const lifecycle = await mountBrowserGame(root, async (defer) => {
		defer(() => session.destroy());
		const assets = await loadAssets();
		const screen = new RunScreen(root, session, assets, options, () => {
			manuallyPaused = !manuallyPaused;
			if (manuallyPaused) controls?.pause();
			else controls?.resume();
		});
		defer(() => screen.destroy());
		const engine = new Engine(
			{
				initialize: async () => {},
				fixedUpdate: () => session.step(screen.speed),
				update: (dt) => screen.advance(dt),
				destroy: () => session.destroy(),
			},
			{ initialize: async () => {} },
			new Screen(Vec2.fromValues(390, 580), 1, 290),
			60,
		);
		defer(() => engine.destroy());
		node.append(root);
		return {
			engine,
			sync: (paused: boolean) => screen.sync(paused),
			pagehide: () => screen.persist(),
		};
	});
	controls = lifecycle;
	return { ...lifecycle, getProgress: () => session.getProgress() };
}
