import type { DefenseEventOptions } from "@/games/defense/events";
import { createDefenseWorld } from "@/games/defense/setup";
import { restore } from "@/games/defense/save";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";

export async function createDefenseSession(
	options: { seed?: string; saved?: string } & DefenseEventOptions = {},
) {
	const assembly = await createDefenseWorld(
		options.seed ?? crypto.randomUUID(),
	);
	try {
		if (options.saved) restore(assembly.world, options.saved);
		return createSessionRuntime(assembly, options);
	} catch (error) {
		await assembly.world.destroy();
		throw error;
	}
}
export type DefenseSession = Awaited<ReturnType<typeof createDefenseSession>>;
