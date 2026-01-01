import { ColliderComponent } from "../components/colliderComponent";
import { RocketBoosterComponent } from "../components/rocketBoosterComponent";
import type { Component } from "../components/component";
import { TransformComponent } from "../components/transformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";
import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "../components/animationComponent";

type Options = {
	position: Vec2;
};

type RocketBoosterAnimationState = "default";

export const ROCKET_BOOSTER_SIZE = Vec2.fromValues(74, 175);

export function createRocketBooster({ position }: Options): Component[] {
	const size = ROCKET_BOOSTER_SIZE;
	const offset = Vec2.fromValues(0, 0);

	const transform = new TransformComponent(position);

	const collider = new ColliderComponent({ size, isTrigger: true, offset });

	const animationState = new AnimationState<RocketBoosterAnimationState>({
		current: "default",
	});

	const animationTimer = new AnimationTimer();
	const animationTable = new AnimationTable<RocketBoosterAnimationState>({
		clips: {
			default: {
				frameTime: 1 / 16,
				frames: 16,
				size: Vec2.clone(ROCKET_BOOSTER_SIZE),
				spriteSize: Vec2.clone(ROCKET_BOOSTER_SIZE),
				loop: true,
				cols: 4,
				sheet: "rocketBooster",
				offset,
			},
		},
	});

	const layer = new RenderLayerComponent(RenderLayers.World);
	const rocketBooster = new RocketBoosterComponent();

	return [
		transform,
		collider,
		layer,
		rocketBooster,
		animationState,
		animationTimer,
		animationTable,
	];
}
