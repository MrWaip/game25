import { Component } from "./component";
export type JumpOptions = {
	jumpHeight: number;
	minJumpFactor?: number;
	coyoteTime?: number;
	bufferTime?: number;
};

export class JumpComponent extends Component {
	readonly jumpHeight: number;
	readonly minJumpFactor: number;
	readonly coyoteTime: number;
	readonly bufferTime: number;

	jumpSpeed = 0;
	minJumpSpeed = 0;

	#lastGroundedTime = -Infinity;
	#lastJumpPressTime = -Infinity;
	#isJumping = false;
	#startedThisFrame = false;

	constructor(options: JumpOptions) {
		super();
		this.jumpHeight = options.jumpHeight;
		this.minJumpFactor = options.minJumpFactor ?? 0.35;
		this.coyoteTime = options.coyoteTime ?? 0.1;
		this.bufferTime = options.bufferTime ?? 0.1;
	}

	get isJumping(): boolean {
		return this.#isJumping;
	}

	set isJumping(value: boolean) {
		this.#isJumping = value;
	}

	get startedThisFrame(): boolean {
		return this.#startedThisFrame;
	}

	recordGrounded(time: number): void {
		this.#lastGroundedTime = time;
	}

	recordJumpPress(time: number): void {
		this.#lastJumpPressTime = time;
	}

	canJump(now: number): boolean {
		return (
			now - this.#lastGroundedTime <= this.coyoteTime &&
			now - this.#lastJumpPressTime <= this.bufferTime
		);
	}

	consumeJump(): void {
		this.#lastJumpPressTime = -Infinity;
	}

	consumeJumpStart(): void {
		this.#startedThisFrame = false;
	}

	markJumpStarted(): void {
		this.#startedThisFrame = true;
	}
}
