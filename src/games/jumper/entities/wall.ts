import type { SpriteName } from "@/games/jumper/assets";
import { ColliderComponent } from "@/games/jumper/components/colliderComponent";
import type { Component } from "@/components/component";
import { FollowCameraComponent } from "@/games/jumper/components/followCameraComponent";
import { RenderLayerComponent } from "@/components/renderLayerComponent";
import { TransformComponent } from "@/components/transformComponent";
import { SpriteRenderComponent } from "@/components/spriteRenderComponent";
import { Vec2 } from "@/primitives/vec2-gl";
import { RenderLayers } from "@/render/layers";

type Options = {
	position: Vec2;
	size: Vec2;
	followCameraY?: boolean;
};

export function createWall({
	position,
	size,
	followCameraY,
}: Options): Component[] {
	const transform = new TransformComponent(position);
	const collider = new ColliderComponent({ size });

	const render = new SpriteRenderComponent<SpriteName>({
		name: "terrain",
		sizing: "repeat",
		size,
		spriteOffset: Vec2.create(),
		spriteSize: Vec2.fromValues(48, 48),
	});

	const renderLayer = new RenderLayerComponent(RenderLayers.World);

	const components: Component[] = [transform, collider, render, renderLayer];

	if (followCameraY) {
		components.push(new FollowCameraComponent(false, true));
	}

	return components;
}
