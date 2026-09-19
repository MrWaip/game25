import { worldPoint, screenPoint } from "@/render/projection";
import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "@/components/animationComponent";
import { Camera } from "@/components/cameraComponent";
import { DebugRenderComponent } from "@/components/debugRenderComponent";
import { FacingComponent } from "@/components/facingComponent";
import { TransformComponent } from "@/components/transformComponent";
import { PrimitiveRenderComponent } from "@/components/renderableComponent";
import { SpriteRenderComponent } from "@/components/spriteRenderComponent";
import { TextRenderComponent } from "@/components/textRenderComponent";
import type { World } from "@/core/world";
import type { Entity } from "@/entities/entity";
import { AABB } from "@/primitives/aabb";
import { ORDERED_LAYERS } from "@/render/layers";
import type { IRenderer, FrameRenderer } from "@/render/renderer";
import type { ISystem } from "@/systems/system";
import { Vec2 } from "@/primitives/vec2-gl";

export class RenderSystem implements ISystem {
	#renderer: IRenderer;
	#tempPosWithOffset = Vec2.create();

	constructor(renderer: IRenderer) {
		this.#renderer = renderer;
	}

	update(world: World): void {
		const { camera, transform: cameraTransform } = this.getCamera(world);

		this.#renderer.frame(
			{ position: cameraTransform.position, zoom: camera.zoom },
			(frame) => {
				for (const layer of ORDERED_LAYERS) {
					for (const entity of world.queryByLayer(layer, (entity) =>
						this.isEntityVisible(world, entity, frame.bounds),
					)) {
						this.renderEntity(world, entity, frame);
					}
				}
			},
		);
	}

	private isEntityVisible(
		world: World,
		entity: Entity,
		cameraAABB: AABB,
	): boolean {
		const transform = world.getComponent(entity, TransformComponent);
		if (!transform) return true;

		if (
			world.getComponent(entity, SpriteRenderComponent)?.static ||
			world.getComponent(entity, TextRenderComponent) ||
			world.getComponent(entity, DebugRenderComponent)
		)
			return true;
		let combined: AABB | undefined;

		for (const bounds of this.renderBounds(world, entity, transform)) {
			combined = combined ? combined.union(bounds) : bounds;

			if (combined.intersects(cameraAABB)) {
				return true;
			}
		}

		return combined === undefined;
	}

	private *renderBounds(
		world: World,
		entity: Entity,
		transform: TransformComponent,
	): Generator<AABB> {
		const sprite = world.getComponent(entity, SpriteRenderComponent);
		if (sprite?.enabled && !sprite.static) {
			Vec2.add(this.#tempPosWithOffset, transform.position, sprite.offset);
			yield AABB.fromCenter(this.#tempPosWithOffset, sprite.size);
		}

		const animation = world.getComponentsOrUndefined(
			entity,
			AnimationState,
			AnimationTable,
			AnimationTimer,
		);

		if (animation) {
			const [animationState, animationTable] = animation;
			const clip = animationTable.clips[animationState.current];

			if (clip) {
				Vec2.add(this.#tempPosWithOffset, transform.position, clip.offset);
				yield AABB.fromCenter(this.#tempPosWithOffset, clip.size);
			}
		}

		const primitive = world.getComponent(entity, PrimitiveRenderComponent);
		if (primitive) {
			Vec2.add(this.#tempPosWithOffset, transform.position, primitive.offset);
			yield AABB.fromCenter(this.#tempPosWithOffset, primitive.size);
		}
	}

	private renderEntity(world: World, entity: Entity, frame: FrameRenderer) {
		const transform = world.getComponent(entity, TransformComponent);

		if (!transform) return;

		const sprite = world.getComponent(entity, SpriteRenderComponent);

		if (sprite && sprite.enabled) {
			frame.renderSprite({
				imageName: sprite.name,
				position: (sprite.static ? screenPoint : worldPoint)(
					transform.position[0] + sprite.offset[0],
					transform.position[1] + sprite.offset[1],
				),
				size: sprite.size,
				spriteOffset: sprite.spriteOffset,
				spriteSize: sprite.spriteSize,
				sizing: sprite.sizing,
				alpha: sprite.alpha,
			});
		}

		const animation = world.getComponentsOrUndefined(
			entity,
			AnimationState,
			AnimationTable,
			AnimationTimer,
		);

		if (animation) {
			const [animationState, animationTable, animationTimer] = animation;

			const clip = animationTable.clips[animationState.current];

			if (clip) {
				const facing = world.getComponent(entity, FacingComponent);
				const direction = facing?.direction ?? "right";

				frame.renderAnimated({
					name: clip.sheet,
					frame: animationTimer.frame,
					direction,
					position: worldPoint(
						transform.position[0] + clip.offset[0],
						transform.position[1] + clip.offset[1],
					),
					size: clip.size,
					spriteSize: clip.spriteSize ?? clip.size,
					cols: clip.cols,
				});
			}
		}

		const primitive = world.getComponent(entity, PrimitiveRenderComponent);

		if (primitive) {
			frame.renderPrimitive({
				color: primitive.color,
				filled: primitive.filled,
				form: primitive.form,
				position: worldPoint(
					transform.position[0] + primitive.offset[0],
					transform.position[1] + primitive.offset[1],
				),
				size: primitive.size,
			});
		}

		const text = world.getComponent(entity, TextRenderComponent);

		if (text) {
			frame.renderText({
				position: (text.static ? screenPoint : worldPoint)(
					transform.position[0] + text.offset[0],
					transform.position[1] + text.offset[1],
				),
				text: text.text,
				color: text.color,
				fontSize: text.fontSize,
			});
		}

		const debug = world.getComponent(entity, DebugRenderComponent);

		if (debug) {
			for (const render of debug.flush()) {
				switch (render.type) {
					case "aabb":
						frame.debugAABB(render.aabb, render.color, undefined);
						break;
				}
			}

			for (const render of debug.persistent()) {
				switch (render.type) {
					case "aabb":
						frame.debugAABB(render.aabb, render.color, render.name);
						break;
				}
			}
		}
	}

	private getCamera(world: World) {
		const cameraEntity = world.getFirst(Camera, TransformComponent);

		if (!cameraEntity) {
			throw new Error("Camera is not set");
		}

		const [camera, transform] = cameraEntity.components;

		return { camera, transform };
	}
}
