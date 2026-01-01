import { TransformComponent } from "../components/transformComponent";
import type { World } from "../core/world";
import { PlatformSpawner } from "../components/platformSpawnerComponent";
import { JumpComponent } from "../components/jumpComponent";
import { createPlatform } from "../entities/platform";
import { Vec2 } from "../primitives/vec2-gl";
import { PlayerComponent } from "../components/playerComponent";
import { AABB } from "../primitives/aabb";
import { ColliderComponent } from "../components/colliderComponent";
import { GlobalRandom, type Random } from "../primitives/random";
import { COIN_SIZE, createCoin } from "../entities/coin";
import {
	ROCKET_BOOSTER_SIZE,
	createRocketBooster,
} from "../entities/rocketBooster";
import type { Entity } from "../entities/entity";
import { type PlatformKind } from "../components/platformComponent";
import type { ISystem } from "./system";
import { GAME_CONSTANTS } from "../game/constants";

const PLATFORM_BASE = GAME_CONSTANTS.PLATFORM_BASE;
const MAX_JUMP_WIDTH = GAME_CONSTANTS.MAX_JUMP_WIDTH;
const MOVING_PLATFORM_CHANCE = 0.15;
const ICED_PLATFORM_CHANCE = 0.3;
const MIN_MOVING_RANGE = 120;
const MAX_MOVING_RANGE = 240;
const MOVING_PLATFORM_SPEED = 120;

type MovingPlatformOptions = {
	axis: "x" | "y";
	min: number;
	max: number;
	speed: number;
	direction?: 1 | -1;
};

type SpawnCtx = {
	lastPlatform: {
		size: Vec2;
		position: Vec2;
	};
	world: World;
	jumpHeight: number;
	spawner: PlatformSpawner;
};

export class PlatformSpawnSystem implements ISystem {
	#hardness: () => number;
	#random: Random;
	#randomSize: Random;
	#randomRocket: Random;

	constructor(random?: Random, randomSize?: Random, randomRocket?: Random) {
		this.#random =
			random ?? GlobalRandom.child("platform-spawn-system-position");
		this.#randomSize =
			randomSize ?? GlobalRandom.child("platform-spawn-system-size");
		this.#randomRocket =
			randomRocket ?? GlobalRandom.child("platform-spawn-system-rocket");
		this.#hardness = this.makeWeightedPicker(
			[1, 2, 3, 4],
			[0.2, 0.5, 0.2, 0.1],
		);
	}

	fixedUpdate(world: World): void {
		const playerEnt = world.getFirst(TransformComponent, PlayerComponent);
		const jumpEnt = world.getFirstEntityWith(JumpComponent);
		const spawnerEnt = world.getFirstEntityWith(PlatformSpawner);

		if (!playerEnt || !jumpEnt || !spawnerEnt) {
			return;
		}

		const [playerTransform] = playerEnt.components;
		const jump = jumpEnt.component;
		const spawner = spawnerEnt.component;

		const MAX_JUMP_HEIGHT = jump.jumpHeight;

		let lastPlatformSize = Vec2.fromValues(48 * 3, 48);
		let lastPlatformPosition = Vec2.clone(playerTransform.position);

		if (spawner.lastPlatform !== undefined) {
			const transform = world.getComponent(
				spawner.lastPlatform,
				TransformComponent,
			)!;
			const collider = world.getComponent(
				spawner.lastPlatform,
				ColliderComponent,
			)!;

			lastPlatformSize = Vec2.clone(collider.size);
			lastPlatformPosition = Vec2.clone(transform.position);
		}

		world.debug(() => {
			world.debugAABB(
				new AABB(
					Vec2.fromValues(0, lastPlatformPosition[1] - spawner.triggerRange),
					Vec2.fromValues(1280, lastPlatformPosition[1] - spawner.triggerRange),
				),
				"red",
			);
		});

		if (
			playerTransform.position[1] <
			lastPlatformPosition[1] - spawner.triggerRange
		) {
			return;
		}

		const ctx: SpawnCtx = {
			jumpHeight: MAX_JUMP_HEIGHT,
			lastPlatform: {
				position: Vec2.clone(lastPlatformPosition),
				size: Vec2.clone(lastPlatformSize),
			},
			spawner,
			world,
		};

		spawner.lastPlatform = this.spawnDefaultSet(ctx);
	}

	spawnDefaultSet(ctx: SpawnCtx): Entity {
		const jumpHeight = ctx.jumpHeight;
		const world = ctx.world;

		ctx.spawner.spawnCount++;
		const isRocketSpawnCycle = ctx.spawner.spawnCount % 3 === 0;
		const shouldSpawnRocket =
			isRocketSpawnCycle && this.#randomRocket.next() <= 0.33;

		let lastPlatform: Entity = -100;
		let lastPlatformSize = Vec2.clone(ctx.lastPlatform.size);
		let lastPlatformPosition = Vec2.clone(ctx.lastPlatform.position);
		let nextPlatformWidth = PLATFORM_BASE * this.#hardness();
		let firstPlatformPosition: Vec2 | null = null;
		const spawnedPlatforms: Array<{ position: Vec2; size: Vec2 }> = [];

		for (let i = 0; i < 5; i++) {
			const kindRoll = this.#random.next();
			const wantsMoving = kindRoll <= MOVING_PLATFORM_CHANCE;
			const kind: PlatformKind =
				wantsMoving && this.canSpawnMoving(ctx.spawner)
					? "moving"
					: kindRoll <= MOVING_PLATFORM_CHANCE + ICED_PLATFORM_CHANCE
						? "iced"
						: "default";
			const spawnAABB = this.getSafeSpawnAABB(
				jumpHeight,
				MAX_JUMP_WIDTH,
				ctx.spawner.minX,
				ctx.spawner.maxX,
				lastPlatformPosition,
				lastPlatformSize,
				nextPlatformWidth,
			);

			const platform = this.spawnRandomPlatform(
				world,
				spawnAABB,
				nextPlatformWidth,
				kind,
				ctx.spawner,
			);

			ctx.world.debugPersistentAABB(
				`platform spawn aabb: ${platform.entity}`,
				spawnAABB,
			);

			if (i === 0) {
				firstPlatformPosition = Vec2.clone(platform.position);
			}

			spawnedPlatforms.push({
				position: Vec2.clone(platform.position),
				size: Vec2.clone(platform.size),
			});

			world.addEntity(
				createCoin({
					position: Vec2.fromValues(
						platform.position[0],
						platform.position[1] + COIN_SIZE[1] + 10,
					),
				}),
			);

			lastPlatformPosition = Vec2.clone(platform.position);
			lastPlatformSize = Vec2.clone(platform.size);
			nextPlatformWidth = PLATFORM_BASE * this.#hardness();
			lastPlatform = platform.entity;
		}

		if (shouldSpawnRocket && firstPlatformPosition) {
			this.spawnBonusRocketPlatform(
				ctx,
				ctx.lastPlatform.position,
				firstPlatformPosition,
				spawnedPlatforms,
			);
		}

		return lastPlatform;
	}

	getSafeSpawnAABB(
		maxJumpHeight: number,
		maxJumpWidth: number,
		minX: number,
		maxX: number,
		lastPlatformCenter: Vec2,
		lastPlatformSize: Vec2,
		nextPlatformWidth: number,
	): AABB {
		const minJumpHeight = maxJumpHeight * 0.4;

		const nextPlatformHalfWidth = nextPlatformWidth / 2;
		const lastPlatformHalfWidth = lastPlatformSize[0] / 2;

		const leftCornerY = lastPlatformCenter[1] + minJumpHeight;
		const rightCornerY = lastPlatformCenter[1] + maxJumpHeight;

		const lastPlatformLeftCornerX =
			lastPlatformCenter[0] - lastPlatformHalfWidth;

		const lastPlatofromRightCornerX =
			lastPlatformCenter[0] + lastPlatformHalfWidth;

		const availableLeftDistance = minX + 10 + nextPlatformHalfWidth;
		const fullLeftDistance =
			lastPlatformLeftCornerX - maxJumpWidth - nextPlatformHalfWidth;

		const availableRightDistance = maxX - 10 - nextPlatformHalfWidth;
		const fullRightDistance =
			lastPlatofromRightCornerX + maxJumpWidth + nextPlatformHalfWidth;

		const leftCornerX = Math.max(availableLeftDistance, fullLeftDistance);
		const rightCornerX = Math.min(availableRightDistance, fullRightDistance);

		return new AABB(
			Vec2.fromValues(leftCornerX, leftCornerY),
			Vec2.fromValues(rightCornerX, rightCornerY),
		);
	}

	spawnRandomPlatform(
		world: World,
		aabb: AABB,
		width: number,
		kind: PlatformKind,
		spawner?: PlatformSpawner,
	) {
		const size = Vec2.fromValues(width, 48);
		const position = this.#random.randomInAABB(aabb);

		const movingOptions =
			kind === "moving"
				? this.createMovingPlatformOptions(position, size, spawner)
				: undefined;
		const resolvedKind: PlatformKind =
			kind === "moving" && !movingOptions ? "default" : kind;

		const entity = world.addEntity(
			createPlatform({
				position,
				size,
				kind: resolvedKind,
				moving: movingOptions,
			}),
		);

		const transform = world.getComponent(entity, TransformComponent)!;
		const collider = world.getComponent(entity, ColliderComponent)!;

		return {
			entity,
			size: Vec2.clone(collider.size),
			position: Vec2.clone(transform.position),
		};
	}

	spawnBonusRocketPlatform(
		ctx: SpawnCtx,
		lastPlatformPosition: Vec2,
		firstPlatformPosition: Vec2,
		spawnedPlatforms: Array<{ position: Vec2; size: Vec2 }>,
	): void {
		const jumpHeight = ctx.jumpHeight;
		const world = ctx.world;

		const bonusPlatformWidth = PLATFORM_BASE * 2;
		const bonusPlatformHalfWidth = bonusPlatformWidth / 2;
		const lastPlatformHalfWidth = ctx.lastPlatform.size[0] / 2;

		const bonusY = lastPlatformPosition[1] + jumpHeight * 0.9;

		const lastPlatformLeftCornerX =
			lastPlatformPosition[0] - lastPlatformHalfWidth;
		const lastPlatformRightCornerX =
			lastPlatformPosition[0] + lastPlatformHalfWidth;

		const leftAvailableMin = ctx.spawner.minX + 10 + bonusPlatformHalfWidth;
		const leftAvailableMax = lastPlatformLeftCornerX - bonusPlatformHalfWidth;
		const leftBoundaryMin = Math.max(
			leftAvailableMin,
			lastPlatformLeftCornerX - MAX_JUMP_WIDTH - bonusPlatformHalfWidth,
		);
		const leftAvailableDistance = Math.max(
			0,
			leftAvailableMax - leftBoundaryMin,
		);

		const rightAvailableMin = lastPlatformRightCornerX + bonusPlatformHalfWidth;
		const rightAvailableMax = ctx.spawner.maxX - 10 - bonusPlatformHalfWidth;
		const rightBoundaryMax = Math.min(
			rightAvailableMax,
			lastPlatformRightCornerX + MAX_JUMP_WIDTH + bonusPlatformHalfWidth,
		);
		const rightAvailableDistance = Math.max(
			0,
			rightBoundaryMax - rightAvailableMin,
		);

		const trySpawnOnSide = (
			boundaryMin: number,
			boundaryMax: number,
			maxAttempts: number = 3,
		): Vec2 | null => {
			if (boundaryMin >= boundaryMax) {
				return null;
			}

			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				const bonusX = this.#randomRocket.range(boundaryMin, boundaryMax);
				const bonusPosition = Vec2.fromValues(bonusX, bonusY);
				const bonusSize = Vec2.fromValues(bonusPlatformWidth, 48);
				const bonusAABB = AABB.fromCenter(bonusPosition, bonusSize);

				let hasCollision = false;
				for (const platform of spawnedPlatforms) {
					const platformAABB = AABB.fromCenter(
						platform.position,
						platform.size,
					);
					if (bonusAABB.intersects(platformAABB)) {
						hasCollision = true;
						break;
					}
				}

				if (!hasCollision) {
					return bonusPosition;
				}
			}

			return null;
		};

		let bonusPosition: Vec2 | null = null;

		if (leftAvailableDistance > rightAvailableDistance) {
			bonusPosition = trySpawnOnSide(leftBoundaryMin, leftAvailableMax);
			if (!bonusPosition) {
				bonusPosition = trySpawnOnSide(rightAvailableMin, rightBoundaryMax);
			}
		} else {
			bonusPosition = trySpawnOnSide(rightAvailableMin, rightBoundaryMax);
			if (!bonusPosition) {
				bonusPosition = trySpawnOnSide(leftBoundaryMin, leftAvailableMax);
			}
		}

		if (!bonusPosition) {
			return;
		}

		const bonusSize = Vec2.fromValues(bonusPlatformWidth, 48);
		const bonusEntity = world.addEntity(
			createPlatform({
				position: bonusPosition,
				size: bonusSize,
				kind: "default",
			}),
		);

		const bonusTransform = world.getComponent(bonusEntity, TransformComponent)!;

		world.addEntity(
			createRocketBooster({
				position: Vec2.fromValues(
					bonusTransform.position[0],
					bonusTransform.position[1] + ROCKET_BOOSTER_SIZE[1] / 2 - 20,
				),
			}),
		);
	}

	makeWeightedPicker<T>(values: T[], weights: number[]) {
		const totalWeight = weights.reduce((a, b) => a + b, 0);
		const cumulative: number[] = [];

		let acc = 0;

		for (const w of weights) {
			acc += w / totalWeight;
			cumulative.push(acc);
		}

		return () => {
			const r = this.#randomSize.next();
			for (let i = 0; i < cumulative.length; i++) {
				if (r <= cumulative[i]) return values[i];
			}
			return values[values.length - 1];
		};
	}

	private canSpawnMoving(spawner: PlatformSpawner) {
		return spawner.maxX - spawner.minX >= MIN_MOVING_RANGE;
	}

	private createMovingPlatformOptions(
		position: Vec2,
		size: Vec2,
		spawner?: PlatformSpawner,
	): MovingPlatformOptions | undefined {
		if (!spawner) return;

		const halfWidth = size[0] / 2;
		const minX = spawner.minX + halfWidth;
		const maxX = spawner.maxX - halfWidth;

		if (minX >= maxX) {
			return;
		}

		const availableRange = maxX - minX;
		const travel = Math.min(MAX_MOVING_RANGE, availableRange);

		if (travel < MIN_MOVING_RANGE) {
			return;
		}

		const start = Math.min(
			Math.max(position[0] - travel / 2, minX),
			maxX - travel,
		);
		const end = start + travel;

		if (end - start <= 0) {
			return;
		}

		return {
			axis: "x",
			min: start,
			max: end,
			speed: MOVING_PLATFORM_SPEED,
			direction: 1,
		};
	}
}
