import { Component } from "./component";

type Options = {
	acceleration: number;
	friction: number;
	maxSpeed: number;
};

export class MovementComponent extends Component {
	#acceleration: number;
	#friction: number;
	#maxSpeed: number;

	constructor(options: Options) {
		super();
		this.#acceleration = options.acceleration;
		this.#friction = options.friction;
		this.#maxSpeed = options.maxSpeed;
	}

	get acceleration(): number {
		return this.#acceleration;
	}

	get friction(): number {
		return this.#friction;
	}

	get maxSpeed(): number {
		return this.#maxSpeed;
	}
}
