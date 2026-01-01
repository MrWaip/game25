import type { SpriteName } from "../assets";
import { ColliderComponent } from "../components/colliderComponent";
import type { Component } from "../components/component";
import {
	PlatformComponent,
	type PlatformKind,
} from "../components/platformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { TransformComponent } from "../components/transformComponent";
import { SpriteRenderComponent } from "../components/spriteRenderComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

type Options = {
	size?: Vec2;
	position: Vec2;
	kind: PlatformKind;
};

export function createPlatform({
	position,
	size = Vec2.fromValues(48 * 3, 48),
	kind,
}: Options): Component[] {
	const clonedPosition = Vec2.clone(position);
	const clonedSize = Vec2.clone(size);
	const transform = new TransformComponent(clonedPosition);
	const offset = Vec2.fromValues(0, -clonedSize[1] / 2);

	const collider = new ColliderComponent({
		size: clonedSize,
		oneWay: true,
		offset,
	});

	const tag = new PlatformComponent(kind);

	let name: SpriteName;
	let spriteSize: Vec2;

	switch (kind) {
		case "iced":
			name = "icedPlatform";
			spriteSize = Vec2.fromValues(304, 163);
			break;
		default:
			name = "whitePlatform";
			spriteSize = Vec2.fromValues(303, 167);
			break;
	}

	const offsetWithY = Vec2.create();
	Vec2.set(offsetWithY, offset[0], offset[1] + 15);
	const render = new SpriteRenderComponent({
		name,
		size: clonedSize,
		spriteSize,
		offset: offsetWithY,
		fitToSize: true,
	});

	const renderLayer = new RenderLayerComponent(RenderLayers.World);

	return [transform, collider, render, renderLayer, tag];
}
