import type { DefenseMap } from "@/games/defense/board";
import { ConstructionSystem } from "@/games/defense/systems/constructionSystem";
import { CommandSystem } from "@/games/defense/systems/commandSystem";
import { World } from "@/core/world";
import { TransformComponent } from "@/components/transformComponent";
import { RenderLayerComponent } from "@/components/renderLayerComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { Tower } from "@/games/defense/components/towerComponent";
import { Run } from "@/games/defense/components/runComponent";
import { SpawnSystem } from "@/games/defense/systems/spawnSystem";
import { EnemyMovementSystem } from "@/games/defense/systems/enemyMovementSystem";
import { AttackSystem } from "@/games/defense/systems/attackSystem";
import { WaveSystem } from "@/games/defense/systems/waveSystem";
import { EnemySupportSystem } from "@/games/defense/systems/enemySupportSystem";

export async function createDefenseWorld(seed: string, map?: DefenseMap) {
	const world = new World({});
	world.registerComponent(TransformComponent);
	world.registerComponent(RenderLayerComponent);
	world.registerComponent(Enemy);
	world.registerComponent(Tower);
	world.registerComponent(Run);
	world.addEntity([new Run(seed, map)]);
	world.registerSystem(new SpawnSystem());
	world.registerSystem(new EnemySupportSystem());
	world.registerSystem(new EnemyMovementSystem());
	world.registerSystem(new AttackSystem());
	world.registerSystem(new WaveSystem());
	const commands = new CommandSystem();
	world.registerSystem(commands);
	const construction = new ConstructionSystem();
	world.registerSystem(construction);
	await world.initialize();
	return { world, commands, construction };
}
