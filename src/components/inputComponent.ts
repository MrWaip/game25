import { Component } from "./component";

export type InputOptions = {
	enabled?: boolean;
};

export class InputComponent extends Component {
	#enabled: boolean;

	#jumpPressed = false;
	#leftPressed = false;
	#rightPressed = false;
	#topPressed = false;
	#bottomPressed = false;

	constructor(options?: InputOptions) {
		super();
		this.#enabled = options?.enabled ?? true;
	}

	get enabled() {
		return this.#enabled;
	}

	get jumpPressed() {
		return this.#jumpPressed;
	}

	set jumpPressed(v: boolean) {
		this.#jumpPressed = v;
	}

	get leftPressed() {
		return this.#leftPressed;
	}

	set leftPressed(v: boolean) {
		this.#leftPressed = v;
	}

	get rightPressed() {
		return this.#rightPressed;
	}

	set rightPressed(v: boolean) {
		this.#rightPressed = v;
	}

	get topPressed() {
		return this.#topPressed;
	}

	set topPressed(v: boolean) {
		this.#topPressed = v;
	}

	get bottomPressed() {
		return this.#bottomPressed;
	}

	set bottomPressed(v: boolean) {
		this.#bottomPressed = v;
	}
}
