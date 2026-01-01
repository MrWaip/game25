import { Rectangle } from "@timohausmann/quadtree-ts";
import { Vec2 } from "./vec2-gl";

export class AABB {
	#min: Vec2;
	#max: Vec2;

	constructor(min: Vec2, max: Vec2) {
		this.#min = min;
		this.#max = max;
	}

	get min(): Vec2 {
		return this.#min;
	}

	get max(): Vec2 {
		return this.#max;
	}

	get width(): number {
		return this.#max[0] - this.#min[0];
	}

	get height(): number {
		return this.#max[1] - this.#min[1];
	}

	get center(): Vec2 {
		const out = Vec2.create();

		Vec2.add(out, this.#min, this.#max);
		Vec2.scale(out, out, 0.5);

		return out;
	}

	static fromCenter(center: Vec2, size: Vec2): AABB {
		const min = Vec2.create();
		const max = Vec2.create();

		Vec2.scale(min, size, 0.5);
		Vec2.scale(max, size, 0.5);

		Vec2.sub(min, center, min);
		Vec2.add(max, center, max);

		return new AABB(min, max);
	}

	static fromCenterInPlace(
		center: Vec2,
		size: Vec2,
		outMin: Vec2,
		outMax: Vec2,
	): AABB {
		Vec2.scale(outMin, size, 0.5);
		Vec2.scale(outMax, size, 0.5);

		Vec2.sub(outMin, center, outMin);
		Vec2.add(outMax, center, outMax);

		return new AABB(outMin, outMax);
	}

	union(other: AABB): AABB {
		const min = Vec2.create();
		const max = Vec2.create();

		Vec2.min(min, this.#min, other.#min);
		Vec2.max(max, this.#max, other.#max);

		return new AABB(min, max);
	}

	intersects(other: AABB): boolean {
		return (
			this.#min[0] < other.#max[0] &&
			this.#max[0] > other.#min[0] &&
			this.#min[1] < other.#max[1] &&
			this.#max[1] > other.#min[1]
		);
	}

	clone(): AABB {
		return new AABB(Vec2.clone(this.#min), Vec2.clone(this.#max));
	}

	toQuadTreeRectangle<T>(data: T): Rectangle<T> {
		return new Rectangle<T>({
			x: this.#min[0],
			y: this.#min[1],
			width: this.width,
			height: this.height,
			data,
		});
	}

	public static fromQuadTreeRectangle(rect: Rectangle<unknown>): AABB {
		return new AABB(
			Vec2.fromValues(rect.x, rect.y),
			Vec2.fromValues(rect.x + rect.width, rect.y + rect.height),
		);
	}
}
