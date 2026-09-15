import { Vec2 } from "@/primitives/vec2-gl";
import { Component } from "@/components/component";

type Options<SpriteKey extends string> = {
	name: SpriteKey;
	size: Vec2;
	offset?: Vec2;
	spriteSize?: Vec2;
	spriteOffset?: Vec2;
	static?: boolean;
	fitToSize?: boolean;
	tileX?: boolean;
	alpha?: number;
};

export class SpriteRenderComponent<
	SpriteKey extends string = string,
> extends Component {
	#name: SpriteKey;
	#size: Vec2;
	#offset: Vec2;
	#spriteSize: Vec2;
	#spriteOffset: Vec2;
	#static: boolean;
	#fitToSize: boolean;
	#tileX: boolean;
	#enabled: boolean;
	#alpha: number;

	constructor(options: Options<SpriteKey>) {
		super();
		this.#name = options.name;
		this.#size = options.size;
		this.#offset = options.offset ?? Vec2.create();
		this.#spriteSize = options.spriteSize ?? options.size;
		this.#spriteOffset = options.spriteOffset ?? Vec2.create();
		this.#static = options.static ?? false;
		this.#fitToSize = options.fitToSize ?? false;
		this.#tileX = options.tileX ?? false;
		this.#enabled = true;
		this.#alpha = options.alpha ?? 1;
	}

	get name(): SpriteKey {
		return this.#name;
	}

	get alpha(): number {
		return this.#alpha;
	}

	set alpha(value: number) {
		this.#alpha = value;
	}

	get fitToSize(): boolean {
		return this.#fitToSize;
	}

	get tileX(): boolean {
		return this.#tileX;
	}

	get size(): Vec2 {
		return this.#size;
	}

	get spriteOffset(): Vec2 {
		return this.#spriteOffset;
	}

	set spriteOffset(value: Vec2) {
		this.#spriteOffset = value;
	}

	get spriteSize(): Vec2 {
		return this.#spriteSize;
	}

	get offset(): Vec2 {
		return this.#offset;
	}

	get static(): boolean {
		return this.#static;
	}

	get enabled(): boolean {
		return this.#enabled;
	}

	enable() {
		this.#enabled = true;
	}

	disable() {
		this.#enabled = false;
	}
}
