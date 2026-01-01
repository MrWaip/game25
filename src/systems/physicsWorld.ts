import { Camera } from "../components/cameraComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { TransformComponent } from "../components/transformComponent";
import type { World } from "../core/world";
import { Screen } from "../core/screen";
import type { Entity } from "../entities/entity";
import { AABB } from "../primitives/aabb";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";
import { Quadtree, Rectangle as QRectangle } from "@timohausmann/quadtree-ts";

interface SweepResult {
	collision: boolean;
	time: number;
	normal: Vec2;
	entity: Entity;
	isTrigger: boolean;
}

export class PhysicsWorld implements ISystem {
	#quadTree: Quadtree<QRectangle<Entity>>;
	#world: World;
	#screen: Screen;
	#queryPadding: number;
	#tempPosWithOffset = Vec2.create();
	#tempQuerySize = Vec2.create();
	#tempEndMin = Vec2.create();
	#tempEndMax = Vec2.create();
	#tempEndMinCopy = Vec2.create();
	#tempEndMaxCopy = Vec2.create();
	#tempEntryDist = Vec2.create();
	#tempExitDist = Vec2.create();
	#tempOffset = Vec2.create();
	#tempPos = Vec2.create();
	#tempEndAABB: AABB | undefined;
	#tempSweepBounds: AABB | undefined;
	#tempUnionMin = Vec2.create();
	#tempUnionMax = Vec2.create();

	constructor(world: World, screen: Screen) {
		this.#screen = screen;
		this.#world = world;
		const worldSize = screen.getWorldSize();
		this.#queryPadding = Math.max(worldSize[0], worldSize[1]) * 2;
		this.#quadTree = new Quadtree({
			width: 100000,
			height: 100000,
		});
	}

	fixedUpdate(world: World) {
		const entities = world.query(TransformComponent, ColliderComponent);

		const camera = world.getFirst(TransformComponent, Camera);
		const cameraCenter = camera ? camera.components[0].position : undefined;

		let queryBounds: AABB | undefined;
		if (cameraCenter) {
			const worldSize = this.#screen.getWorldSize();
			Vec2.set(
				this.#tempQuerySize,
				worldSize[0] + this.#queryPadding * 2,
				worldSize[1] + this.#queryPadding * 2,
			);
			queryBounds = AABB.fromCenter(cameraCenter, this.#tempQuerySize);
		}

		if (queryBounds) {
			const width = queryBounds.max[0] - queryBounds.min[0];
			const height = queryBounds.max[1] - queryBounds.min[1];
			this.#quadTree = new Quadtree({
				x: queryBounds.min[0],
				y: queryBounds.min[1],
				width,
				height,
			});
		} else {
			const worldSize = this.#screen.getWorldSize();
			const size = Math.max(worldSize[0], worldSize[1]) * 4;
			this.#quadTree = new Quadtree({
				x: -size / 2,
				y: -size / 2,
				width: size,
				height: size,
			});
		}

		this.#quadTree.clear();

		for (const item of entities) {
			const [transform, collider] = item.components;

			if (!collider.enabled) continue;

			Vec2.add(this.#tempPosWithOffset, transform.position, collider.offset);
			const aabb = AABB.fromCenter(this.#tempPosWithOffset, collider.size);

			if (queryBounds && !aabb.intersects(queryBounds)) continue;

			this.#quadTree.insert(aabb.toQuadTreeRectangle(item.entity));
		}
	}

	sweptAABB(entity: Entity, moving: AABB, velocity: Vec2): SweepResult[] {
		Vec2.add(this.#tempEndMin, moving.min, velocity);
		Vec2.add(this.#tempEndMax, moving.max, velocity);
		Vec2.copy(this.#tempEndMinCopy, this.#tempEndMin);
		Vec2.copy(this.#tempEndMaxCopy, this.#tempEndMax);

		if (!this.#tempEndAABB) {
			this.#tempEndAABB = new AABB(this.#tempEndMinCopy, this.#tempEndMaxCopy);
		} else {
			Vec2.set(
				this.#tempEndAABB.min,
				this.#tempEndMinCopy[0],
				this.#tempEndMinCopy[1],
			);
			Vec2.set(
				this.#tempEndAABB.max,
				this.#tempEndMaxCopy[0],
				this.#tempEndMaxCopy[1],
			);
		}

		if (!this.#tempSweepBounds) {
			this.#tempSweepBounds = moving.union(this.#tempEndAABB);
		} else {
			Vec2.min(this.#tempUnionMin, moving.min, this.#tempEndAABB.min);
			Vec2.max(this.#tempUnionMax, moving.max, this.#tempEndAABB.max);
			Vec2.set(
				this.#tempSweepBounds.min,
				this.#tempUnionMin[0],
				this.#tempUnionMin[1],
			);
			Vec2.set(
				this.#tempSweepBounds.max,
				this.#tempUnionMax[0],
				this.#tempUnionMax[1],
			);
		}

		const sweepBounds = this.#tempSweepBounds;

		this.#world.debugAABB(sweepBounds);

		const candidates = this.#quadTree.retrieve(
			sweepBounds.toQuadTreeRectangle(null),
		);

		const collisions: SweepResult[] = [];

		for (const candidate of candidates) {
			if (candidate.data === entity) continue;

			const targetEntity = candidate.data!;
			const targetCollider = this.#world.getComponent(
				targetEntity,
				ColliderComponent,
			);
			if (!targetCollider) continue;

			const result = this.sweepAABBTest(
				moving,
				velocity,
				AABB.fromQuadTreeRectangle(candidate),
				targetCollider,
			);

			if (!result.collision) continue;

			result.entity = targetEntity;
			result.isTrigger = targetCollider.isTrigger;
			collisions.push(result);
		}

		return collisions.sort((a, b) => a.time - b.time);
	}

	sweepAABBTest(
		moving: AABB,
		velocity: Vec2,
		candidate: AABB,
		candidateCollider: ColliderComponent,
	): SweepResult {
		const result: SweepResult = {
			collision: false,
			normal: Vec2.create(),
			time: Infinity,
			entity: null as never,
			isTrigger: false,
		};

		if (this.isAABBColliding(moving, candidate)) {
			if (candidateCollider.oneWay) {
				return result;
			}

			result.collision = true;
			result.time = 0;

			const overlapX =
				Math.min(moving.max[0], candidate.max[0]) -
				Math.max(moving.min[0], candidate.min[0]);
			const overlapY =
				Math.min(moving.max[1], candidate.max[1]) -
				Math.max(moving.min[1], candidate.min[1]);

			if (overlapX < overlapY) {
				const movingCenterX = (moving.min[0] + moving.max[0]) * 0.5;
				const candidateCenterX = (candidate.min[0] + candidate.max[0]) * 0.5;
				Vec2.set(result.normal, movingCenterX < candidateCenterX ? -1 : 1, 0);
			} else {
				const movingCenterY = (moving.min[1] + moving.max[1]) * 0.5;
				const candidateCenterY = (candidate.min[1] + candidate.max[1]) * 0.5;
				Vec2.set(result.normal, 0, movingCenterY < candidateCenterY ? -1 : 1);
			}

			return result;
		}

		Vec2.set(
			this.#tempEntryDist,
			velocity[0] > 0
				? candidate.min[0] - moving.max[0]
				: candidate.max[0] - moving.min[0],
			velocity[1] > 0
				? candidate.min[1] - moving.max[1]
				: candidate.max[1] - moving.min[1],
		);

		Vec2.set(
			this.#tempExitDist,
			velocity[0] > 0
				? candidate.max[0] - moving.min[0]
				: candidate.min[0] - moving.max[0],
			velocity[1] > 0
				? candidate.max[1] - moving.min[1]
				: candidate.min[1] - moving.max[1],
		);

		let entryTimeX: number;
		let entryTimeY: number;
		let exitTimeX: number;
		let exitTimeY: number;

		if (velocity[0] === 0) {
			if (
				moving.max[0] <= candidate.min[0] ||
				moving.min[0] >= candidate.max[0]
			) {
				return result;
			} else {
				entryTimeX = -Infinity;
				exitTimeX = Infinity;
			}
		} else {
			entryTimeX = this.#tempEntryDist[0] / velocity[0];
			exitTimeX = this.#tempExitDist[0] / velocity[0];
		}

		if (velocity[1] === 0) {
			if (
				moving.max[1] <= candidate.min[1] ||
				moving.min[1] >= candidate.max[1]
			) {
				return result;
			} else {
				entryTimeY = -Infinity;
				exitTimeY = Infinity;
			}
		} else {
			entryTimeY = this.#tempEntryDist[1] / velocity[1];
			exitTimeY = this.#tempExitDist[1] / velocity[1];
		}

		const entry = Math.max(entryTimeX, entryTimeY);
		const exit = Math.min(exitTimeX, exitTimeY);

		if (entry >= 0 && entry <= 1 && entry <= exit) {
			result.collision = true;
			result.time = entry;

			if (entryTimeX > entryTimeY) {
				Vec2.set(result.normal, velocity[0] > 0 ? -1 : 1, 0);
			} else {
				Vec2.set(result.normal, 0, velocity[1] > 0 ? -1 : 1);
			}

			if (candidateCollider.oneWay) {
				const movingBottom = moving.min[1];
				const candidateTop = candidate.max[1];

				const isFallingOnTop =
					velocity[1] < 0 && movingBottom >= candidateTop - 1e-4;
				if (!isFallingOnTop) {
					result.collision = false;
					result.time = Infinity;
					Vec2.set(result.normal, 0, 0);
				}
			}
		}

		return result;
	}

	canPlaceAABB(entity: Entity | undefined, testAABB: AABB): boolean {
		const candidates = this.#quadTree.retrieve(
			testAABB.toQuadTreeRectangle(null),
		);

		for (const candidate of candidates) {
			if (candidate.data === entity) continue;

			const otherEntity = candidate.data!;
			const otherCollider = this.#world.getComponent(
				otherEntity,
				ColliderComponent,
			);
			if (!otherCollider) continue;

			const otherAABB = AABB.fromQuadTreeRectangle(candidate);

			if (this.isAABBColliding(testAABB, otherAABB)) {
				return false;
			}
		}

		return true;
	}

	findFreeSpawnPosition(
		entity: Entity | undefined,
		basePos: Vec2,
		size: Vec2,
		tries = 20,
	): Vec2 | undefined {
		let pos = basePos;

		for (let i = 0; i < tries; i++) {
			const aabb = AABB.fromCenter(pos, size);

			if (this.canPlaceAABB(entity, aabb)) {
				return pos;
			}

			Vec2.set(
				this.#tempOffset,
				(Math.random() * 2 - 1) * size[0] * 2,
				(Math.random() * 2 - 1) * size[1] * 2,
			);
			Vec2.add(this.#tempPos, basePos, this.#tempOffset);
			pos = this.#tempPos;
		}

		return;
	}
	private isAABBColliding(a: AABB, b: AABB): boolean {
		return (
			a.min[0] < b.max[0] &&
			a.max[0] > b.min[0] &&
			a.min[1] < b.max[1] &&
			a.max[1] > b.min[1]
		);
	}
}
