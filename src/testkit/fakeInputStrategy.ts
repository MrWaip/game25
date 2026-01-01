import type { InputStrategy, MoveInput } from "../input";

export class FakeInputStrategy implements InputStrategy {
	#down = new Set<MoveInput>();

	isDown(action: MoveInput): boolean {
		return this.#down.has(action);
	}

	down(...actions: MoveInput[]) {
		for (const a of actions) this.#down.add(a);
	}

	up(...actions: MoveInput[]) {
		for (const a of actions) this.#down.delete(a);
	}

	set(state: Partial<Record<MoveInput, boolean>>) {
		for (const [k, v] of Object.entries(state) as [MoveInput, boolean][]) {
			if (v) this.#down.add(k);
			else this.#down.delete(k);
		}
	}

	reset() {
		this.#down.clear();
	}

	destroy(): void {
		this.#down.clear();
	}
}
