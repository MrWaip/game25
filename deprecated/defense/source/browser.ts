import type { DefenseEventOptions } from "@/games/defense/events";
import type { DefenseSession } from "@/games/defense/session";
export type {
	DefenseProgress,
	DefenseEvent,
	DefenseEventOptions,
} from "@/games/defense/events";
import { Engine } from "@/core/engine";
import { mountBrowserGame } from "@/core/browserGame";
import { Screen } from "@/core/screen";
import { Vec2 } from "@/primitives/vec2-gl";
import { createDefenseSession } from "@/games/defense/session";
import { RunScreen } from "@/games/defense/runScreen";
import { grid } from "@/games/defense/board";
import { element } from "@/games/defense/dom";

export async function mountDefense(
	node: HTMLElement,
	options: {
		seed?: string;
		saved?: string;
		onSave?: (saved: string) => void;
		onSaveError?: (error: unknown) => void;
	} & DefenseEventOptions = {},
) {
	const root = element("section", "defense");
	let session: DefenseSession;
	const lifecycle = await mountBrowserGame(root, async (defer) => {
		session = await createDefenseSession(options);
		const engine = new Engine(
			{
				initialize: async () => {},
				fixedUpdate: () => session.step(),
				update: (dt) => screen.advance(dt),
				destroy: () => session.destroy(),
			},
			{ initialize: async () => {} },
			new Screen(Vec2.fromValues(grid.width, grid.height), 1, grid.height / 2),
			60,
		);
		defer(() => engine.destroy());
		const screen = new RunScreen(root, session, options);
		defer(() => screen.destroy());
		node.append(root);
		return {
			engine,
			pagehide: () => screen.persist(),
			sync: (paused) => screen.sync(paused),
		};
	});
	return { ...lifecycle, getProgress: () => session.getProgress() };
}
