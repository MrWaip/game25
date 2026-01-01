import { Random } from "../primitives/random";

export class MockRandom extends Random {
	#values: number[] = [];
	#index = 0;

	constructor(seed: string | number, values: number[] = []) {
		super(seed);
		this.#values = values;
	}

	next(): number {
		if (this.#index < this.#values.length) {
			return this.#values[this.#index++];
		}

		return super.next();
	}

	reset(values: number[]) {
		this.#values = values;
		this.#index = 0;
	}
}
