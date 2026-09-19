import { Random } from "@/primitives/random";
import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { createEnemy } from "@/games/defense/entities/enemy";
import { waveAt, waveDifficulty, bossRuleAt } from "@/games/defense/waves";
export class SpawnSystem implements ISystem {
	fixedUpdate(world: World, dt: number): void {
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "wave") return;
		run.spawnIn = Math.max(0, run.spawnIn - dt);
		if (run.remaining > 0 && run.spawnIn <= 0) {
			const plan = waveAt(run.wave);
			let kind = plan.enemies[plan.enemies.length - run.remaining];
			if (run.wave % 5 === 0 && kind === "normal")
				kind = bossRuleAt(run.wave).escort;
			const index = plan.enemies.length - run.remaining;
			const squad = Math.floor(index / 4);
			const random = new Random(run.seed).child(`squad:${run.wave}:${squad}`);
			const entrances = [...new Set(run.map.paths.map((route) => route[0].x))];
			const offset = new Random(run.seed)
				.child(`entrances:${run.wave}`)
				.int(0, entrances.length - 1);
			const entrance = entrances[(squad + offset) % entrances.length];
			const paths = run.map.paths
				.map((_, path) => path)
				.filter((path) => run.map.paths[path][0].x === entrance);
			const path = paths[random.int(0, paths.length - 1)];
			world.addEntity(createEnemy(kind, run.wave, run.map, path));
			run.remaining--;
			// Four companions share a route, then the next entrance sends a squad.
			run.spawnIn =
				(index + 1) % 4 === 0
					? waveDifficulty(run.wave).spawnInterval * 3
					: run.wave % 5 === 0
						? bossRuleAt(run.wave).spacing
						: 0.12;
		}
	}
}
