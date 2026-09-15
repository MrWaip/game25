import type { SystemScope } from "@/systems/system";
import { ColliderComponent } from "@/games/jumper/components/colliderComponent";
import { PlatformComponent } from "@/games/jumper/components/platformComponent";
import { SpriteRenderComponent } from "@/components/spriteRenderComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { GameEvents } from "@/games/jumper/events";
import { Vec2 } from "@/primitives/vec2-gl";
import type { JumperSystem } from "@/games/jumper/world";

export class PlatformSystem implements JumperSystem {
	initialize(world: JumperWorld, scope: SystemScope): Promise<void> | void {
		scope.on(world.eventBus, "collision", (e) => this.onCollision(world, e));
	}

	fixedUpdate(world: JumperWorld): void {
		const now = world.getCurrentTime();

		for (const { components } of world.query(
			PlatformComponent,
			SpriteRenderComponent,
			ColliderComponent,
		)) {
			const [platform, render, collider] = components;

			if (platform.timeToDisappear && platform.timeToDisappear <= now) {
				platform.timeToRest = now + 1500;
				platform.timeToDisappear = undefined;
				render.alpha = 0.3;
				collider.disable();
			}

			if (platform.timeToRest && platform.timeToRest <= now) {
				platform.timeToRest = undefined;
				render.alpha = 1;
				render.spriteOffset = Vec2.create();
				collider.enable();
			}
		}
	}

	onCollision(world: JumperWorld, event: GameEvents["collision"]) {
		if (!world.hasComponent(event.target, PlatformComponent)) {
			return;
		}

		const platform = world.getComponent(event.target, PlatformComponent)!;
		const render = world.getComponent(event.target, SpriteRenderComponent)!;

		switch (platform.kind) {
			case "iced": {
				if (!platform.timeToDisappear) {
					platform.timeToDisappear = world.getCurrentTime() + 1000;
					render.spriteOffset = Vec2.fromValues(304, 0);
				}

				break;
			}
			default: {
			}
		}
	}
}
