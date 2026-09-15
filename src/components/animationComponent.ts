import type { Vec2 } from "@/primitives/vec2-gl";
import { Component } from "@/components/component";

type TableOptions<T extends string, SpriteKey extends string> = {
	clips: Record<T, AnimationClip<SpriteKey>>;
};

type StateOptions<T extends string> = {
	current: T;
};

type TimerOptions = {
	frame?: number;
	time?: number;
	playing?: boolean;
};

export type AnimationClip<SpriteKey extends string = string> = {
	sheet: SpriteKey;
	offset: Vec2;
	size: Vec2;
	spriteSize?: Vec2;
	frames: number;
	frameTime: number;
	loop: boolean;
	cols?: number;
};

export class AnimationTable<
	T extends string,
	SpriteKey extends string = string,
> extends Component {
	public clips: Record<T, AnimationClip<SpriteKey>>;

	constructor(options: TableOptions<T, SpriteKey>) {
		super();

		this.clips = options.clips;
	}
}

export class AnimationState<T extends string> extends Component {
	public current: T;
	public previous: T | undefined;
	public playId: number;
	public lastAppliedPlayId: number;

	constructor(options: StateOptions<T>) {
		super();

		this.previous = undefined;
		this.current = options.current;
		this.playId = 0;
		this.lastAppliedPlayId = 0;
	}

	public set(next: T, restartIfSame = false) {
		if (next !== this.current || restartIfSame) {
			this.current = next;
			this.restart();
		}
	}

	public restart() {
		this.playId += 1;
	}
}

export class AnimationTimer extends Component {
	public frame: number;
	public time: number;
	public playing: boolean;

	constructor(options?: TimerOptions) {
		super();

		this.frame = options?.frame ?? 0;
		this.time = options?.time ?? 0;
		this.playing = options?.playing ?? false;
	}
}
