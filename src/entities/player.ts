import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "../components/animationComponent";
import { ColliderComponent } from "../components/colliderComponent";
import type { Component } from "../components/component";
import { FacingComponent } from "../components/facingComponent";
import { Gravity } from "../components/gravityComponent";
import { InputComponent } from "../components/inputComponent";
import { JumpComponent } from "../components/jumpComponent";
import { MovementComponent } from "../components/movementComponent";
import { PlayerComponent } from "../components/playerComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { TransformComponent } from "../components/transformComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

export type PlayerAnimationState =
	| "idle"
	| "run"
	| "jump"
	| "rocket-fly"
	| "flyingSleigh";

export function createPlayer(position: Vec2): Component[] {
	const size = Vec2.fromValues(80, 80);
	const offset = Vec2.fromValues(0, size[1] / 2);

	const player = new PlayerComponent();

	const transform = new TransformComponent(position);
	const velocity = new VelocityComponent(Vec2.create());
	const gravity = new Gravity({ acceleration: Vec2.fromValues(0, -2500) });

	const animationState = new AnimationState<PlayerAnimationState>({
		current: "idle",
	});

	const facing = new FacingComponent("right");
	const animationTimer = new AnimationTimer();
	const animationTable = new AnimationTable<PlayerAnimationState>({
		clips: {
			jump: {
				frameTime: 1 / 9,
				frames: 9,
				size,
				spriteSize: Vec2.fromValues(148, 148),
				loop: false,
				sheet: "cardJump",
				offset,
			},
			run: {
				frameTime: 1 / 16,
				frames: 16,
				size,
				spriteSize: Vec2.fromValues(133, 133),
				loop: true,
				sheet: "cardRun",
				offset,
			},
			idle: {
				frameTime: 1 / 9,
				frames: 9,
				size,
				spriteSize: Vec2.fromValues(133, 132),
				loop: true,
				sheet: "cardIdle",
				offset,
			},
			"rocket-fly": {
				frameTime: 1 / 16,
				frames: 16,
				size: Vec2.fromValues(122 * 0.8, 153 * 0.8),
				spriteSize: Vec2.fromValues(122, 153),
				loop: true,
				cols: 4,
				sheet: "rocketFly",
				offset,
			},
			flyingSleigh: {
				frameTime: 2 / 16,
				frames: 16,
				size: Vec2.fromValues(285 * 0.8, 187 * 0.8),
				spriteSize: Vec2.fromValues(285, 187),
				loop: true,
				cols: 4,
				sheet: "flyingSleighReindeerHarnessSnap",
				offset,
			},
		},
	});

	const collider = new ColliderComponent({ size, offset });

	const jump = new JumpComponent({
		jumpHeight: 250,
		minJumpFactor: 0.1,
	});
	const input = new InputComponent();

	const movement = new MovementComponent({
		maxSpeed: 400,
		acceleration: 150,
		friction: 0.9,
	});

	const layer = new RenderLayerComponent(RenderLayers.Player);

	return [
		transform,
		velocity,
		collider,
		player,
		gravity,
		jump,
		input,
		movement,
		animationState,
		animationTimer,
		animationTable,
		facing,
		layer,
	];
}
