import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "../components/animationComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { CoinComponent } from "../components/coinComponent";
import type { Component } from "../components/component";
import { TransformComponent } from "../components/transformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

type Options = {
	position: Vec2;
};

type CoinAnimationState = "default";

export const COIN_SIZE = Vec2.fromValues(32, 32);

export function createCoin({ position }: Options): Component[] {
	const size = COIN_SIZE;
	const offset = Vec2.create();

	const transform = new TransformComponent(position);

	const collider = new ColliderComponent({ size, isTrigger: true, offset });

	const table = new AnimationTable<CoinAnimationState>({
		clips: {
			default: {
				size,
				spriteSize: Vec2.fromValues(131, 130),
				frameTime: 1 / 12,
				frames: 9,
				loop: true,
				sheet: "coin",
				offset,
			},
		},
	});
	const animationState = new AnimationState<CoinAnimationState>({
		current: "default",
	});
	const animationTimer = new AnimationTimer();
	const layer = new RenderLayerComponent(RenderLayers.World);
	const coin = new CoinComponent();

	return [
		transform,
		collider,
		animationTimer,
		animationState,
		table,
		layer,
		coin,
	];
}
