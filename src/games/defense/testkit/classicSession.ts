import { classicMap } from "@/games/defense/board";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { createDefenseSession } from "@/games/defense/session";

/** Fixed geometry for existing mechanics scenarios; generated maps have their own session scenarios. */
export async function createClassicSession(
	options: { seed?: string; saved?: string } = {},
) {
	if (options.saved) return createDefenseSession(options);
	return createSessionRuntime(
		await createDefenseWorld(options.seed ?? "42", structuredClone(classicMap)),
	);
}
