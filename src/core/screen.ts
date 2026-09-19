import { Vec2 } from "@/primitives/vec2-gl";
import { Projection, positive } from "@/render/projection";

export class Screen {
	#size: Vec2;
	#pixelRatio: number;
	#orthographicSize: number;

	constructor(size: Vec2, pixelRatio: number, orthographicSize: number) {
		this.#size = Vec2.clone(size);
		this.#pixelRatio = pixelRatio;
		this.#orthographicSize = orthographicSize;
	}

	get size(): Vec2 {
		return this.#size;
	}

	get pixelRatio(): number {
		return this.#pixelRatio;
	}

	get orthographicSize(): number {
		return this.#orthographicSize;
	}

	updateSize(cssWidth: number, cssHeight: number): void {
		Vec2.set(this.#size, cssWidth, cssHeight);
	}

	updatePixelRatio(dpr: number): void {
		this.#pixelRatio = dpr;
	}

	getAspect(): number {
		if (this.#size[1] === 0) return 1;
		return this.#size[0] / this.#size[1];
	}

	getWorldWidth(orthographicSize?: number): number {
		const size = orthographicSize ?? this.#orthographicSize;
		return size * 2 * this.getAspect();
	}

	getWorldHeight(orthographicSize?: number): number {
		const size = orthographicSize ?? this.#orthographicSize;
		return size * 2;
	}

	getWorldSize(orthographicSize?: number): Vec2 {
		const size = orthographicSize ?? this.#orthographicSize;
		return Vec2.fromValues(this.getWorldWidth(size), this.getWorldHeight(size));
	}

	getVisibleWorldHeight(orthographicSize: number, zoom: number = 1): number {
		return this.getWorldHeight(orthographicSize) * zoom;
	}

	getVisibleWorldWidth(orthographicSize: number, zoom: number = 1): number {
		return this.getWorldWidth(orthographicSize) * zoom;
	}

	getVisibleWorldSize(orthographicSize: number, zoom: number = 1): Vec2 {
		const size = orthographicSize;
		const worldHeight = size * 2 * zoom;
		return Vec2.fromValues(worldHeight * this.getAspect(), worldHeight);
	}

	getCameraWorldHeight(zoom: number = 1): number {
		return this.getWorldHeight() * zoom;
	}

	getCameraWorldWidth(zoom: number = 1): number {
		return this.getWorldWidth() * zoom;
	}

	getCameraWorldSize(zoom: number = 1): Vec2 {
		positive(zoom, "camera zoom");
		return this.getVisibleWorldSize(this.#orthographicSize, zoom);
	}

	/** Larger zoom shows more world, matching the simulation's camera bounds. */
	projection(position: Vec2, zoom = 1): Projection {
		const size = this.getCameraWorldSize(zoom);
		return new Projection(
			{ width: this.#size[0], height: this.#size[1] },
			{
				x: position[0] - size[0] / 2,
				y: position[1] - size[1] / 2,
				width: size[0],
				height: size[1],
			},
			"up",
		);
	}

	getCameraBottomY(cameraY: number, zoom: number = 1): number {
		const worldHeight = this.getCameraWorldHeight(zoom);
		return cameraY - worldHeight / 2;
	}

	getCameraCenterX(): number {
		return this.getWorldWidth() / 2;
	}
}
