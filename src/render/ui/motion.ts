// Driven by the host's update(dt), with no timers or animation loop of its own.
export class Tween {
	#elapsed = 0;
	constructor(
		private readonly from: number,
		private readonly to: number,
		private readonly duration: number,
	) {}
	advance(dt: number): number {
		this.#elapsed = Math.min(this.duration, this.#elapsed + Math.max(0, dt));
		return this.value;
	}
	get value(): number {
		const t =
			this.duration <= 0 ? 1 : Math.min(1, this.#elapsed / this.duration);
		return this.from + (this.to - this.from) * (1 - (1 - t) ** 3);
	}
	get finished(): boolean {
		return this.duration <= 0 || this.#elapsed >= this.duration;
	}
}
