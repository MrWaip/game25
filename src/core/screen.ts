import { Vec2 } from "../primitives/vec2-gl";

export class Screen {
	#size: Vec2;
	#pixelRatio: number;
	#bufferSize: Vec2;
	#orthographicSize: number;

	constructor(size: Vec2, pixelRatio: number, orthographicSize: number) {
		this.#size = Vec2.clone(size);
		this.#pixelRatio = pixelRatio;
		this.#orthographicSize = orthographicSize;
		this.#bufferSize = Vec2.create();
		this.updateBufferSize();
	}

	get size(): Vec2 {
		return this.#size;
	}

	get pixelRatio(): number {
		return this.#pixelRatio;
	}

	get bufferSize(): Vec2 {
		return this.#bufferSize;
	}

	get orthographicSize(): number {
		return this.#orthographicSize;
	}

	updateSize(cssWidth: number, cssHeight: number): void {
		Vec2.set(this.#size, cssWidth, cssHeight);
		this.updateBufferSize();
	}

	updatePixelRatio(dpr: number): void {
		this.#pixelRatio = dpr;
		this.updateBufferSize();
	}

	private updateBufferSize(): void {
		Vec2.set(
			this.#bufferSize,
			this.#size[0] * this.#pixelRatio,
			this.#size[1] * this.#pixelRatio,
		);
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
		return this.getVisibleWorldSize(this.#orthographicSize, zoom);
	}

	getCameraBottomY(cameraY: number, zoom: number = 1): number {
		const worldHeight = this.getCameraWorldHeight(zoom);
		return cameraY - worldHeight / 2;
	}

	getCameraCenterX(): number {
		return this.getWorldWidth() / 2;
	}
}
