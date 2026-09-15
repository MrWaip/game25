import type { SystemScope } from "@/systems/system";
import { RocketBoosterComponent } from "@/games/jumper/components/rocketBoosterComponent";
import { RocketFlightComponent } from "@/games/jumper/components/rocketFlightComponent";
import { Gravity } from "@/games/jumper/components/gravityComponent";
import { AnimationState } from "@/components/animationComponent";
import { TransformComponent } from "@/components/transformComponent";
import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { GameEvents } from "@/games/jumper/events";
import type { JumperSystem } from "@/games/jumper/world";
import { GlobalRandom, type Random } from "@/primitives/random";
import { createRocketBooster } from "@/games/jumper/entities/rocketBooster";
import { Vec2 } from "@/primitives/vec2-gl";
import type { PlayerAnimationState } from "@/games/jumper/entities/player";

type RespawnInfo = {
	position: Vec2;
	respawnTime: number;
};

export class RocketBoosterSystem implements JumperSystem {
	#respawns: RespawnInfo[] = [];
	#random: Random;

	constructor(random?: Random) {
		this.#random = random ?? GlobalRandom.child("rocket-booster-system");
	}

	initialize(world: JumperWorld, scope: SystemScope): void {
		scope.on(world.eventBus, "trigger", (e) => this.onTrigger(world, e));
	}

	update(world: JumperWorld): void {
		const currentTime = world.getCurrentTime() / 1000;

		for (let i = this.#respawns.length - 1; i >= 0; i--) {
			const respawn = this.#respawns[i];

			if (currentTime >= respawn.respawnTime) {
				world.addEntity(createRocketBooster({ position: respawn.position }));
				this.#respawns.splice(i, 1);
			}
		}
	}

	onTrigger(world: JumperWorld, { initiator, target }: GameEvents["trigger"]) {
		if (!world.hasComponent(target, RocketBoosterComponent)) {
			return;
		}

		const playerEnt = world.getFirst(TransformComponent, PlayerComponent);

		if (!playerEnt || playerEnt.entity !== initiator) {
			return;
		}

		const [playerTransform] = playerEnt.components;
		const boosterTransform = world.getComponent(target, TransformComponent);

		if (!boosterTransform) {
			return;
		}

		const startY = playerTransform.position[1];
		const flightDistance = this.#random.range(2000, 5000);
		const targetY = startY + flightDistance;
		const startTime = world.getCurrentTime() / 1000;

		if (!world.hasComponent(initiator, Gravity)) {
			return;
		}

		world.deleteEntity(target);

		world.disableComponent(initiator, Gravity);
		world.updateComponent(
			initiator,
			new RocketFlightComponent(startY, targetY, startTime),
		);

		const animationState = world.getComponent(
			initiator,
			AnimationState<PlayerAnimationState>,
		);
		if (animationState) {
			animationState.set("rocket-fly", true);
		}

		const respawnTime = startTime + 3;
		this.#respawns.push({
			position: Vec2.clone(boosterTransform.position),
			respawnTime,
		});
	}
}
