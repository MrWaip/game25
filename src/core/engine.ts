import { Lifecycle } from "@/core/lifecycle";
import type { Screen } from "@/core/screen";
import { createFixedTimestep } from "@/core/fixedTimestep";

type Simulation = {
	initialize(): Promise<void>;
	fixedUpdate(dt: number): void;
	update(dt: number): void;
	destroy(): Promise<void>;
};

/** Owns time and lifecycle; game modules own world construction. */
export class Engine {
	#running = false;
	#worldStarted = false;
	#worldDestruction: Promise<void> | undefined;
	#lifecycle = new Lifecycle(
		async () => {
			await this.assets.initialize();
			if (this.#lifecycle.closed) return;
			this.#worldStarted = true;
			await this.world.initialize();
		},
		async () => {
			const errors: unknown[] = [];
			try {
				await this.disposeWorld();
			} catch (error) {
				errors.push(error);
			}
			try {
				await this.assets.destroy?.();
			} catch (error) {
				errors.push(error);
			}
			if (errors.length)
				throw new AggregateError(errors, "Engine cleanup failed");
		},
	);
	#generation = 0;
	#frameId: number | undefined;
	constructor(
		private world: Simulation,
		private assets: { initialize(): Promise<void>; destroy?(): Promise<void> },
		_screen: Screen,
		private simulationHz: number,
	) {}

	initialize(): Promise<void> {
		return this.#lifecycle.initialize();
	}

	pause(): void {
		this.#running = false;
		this.#generation++;
		if (this.#frameId !== undefined) cancelAnimationFrame(this.#frameId);
		this.#frameId = undefined;
	}

	private disposeWorld(): Promise<void> {
		this.#worldDestruction ??= (async () => {
			await this.world.destroy();
		})();
		return this.#worldDestruction;
	}
	destroy(): Promise<void> {
		this.pause();
		// Propagate cancellation now; final cleanup awaits and reports this result.
		if (this.#worldStarted) void this.disposeWorld().catch(() => {});
		return this.#lifecycle.destroy();
	}

	start(): void {
		if (this.#running || this.#lifecycle.closed) return;
		if (!this.#lifecycle.ready)
			throw new Error("Initialize engine before starting");
		this.#running = true;
		const generation = ++this.#generation;
		const stepper = createFixedTimestep(
			{ hz: this.simulationHz, maxFrameTime: 0.25, maxSubSteps: 10 },
			performance.now(),
		);
		const active = () => this.#running && generation === this.#generation;
		const loop = (now: number) => {
			if (!active()) return;
			this.#frameId = undefined;
			try {
				const { steps, frameDt } = stepper.tick(now);
				for (let i = 0; i < steps && active(); i++)
					this.world.fixedUpdate(stepper.fixedDt);
				if (!active()) return;
				this.world.update(frameDt);
				if (active()) this.#frameId = requestAnimationFrame(loop);
			} catch (error) {
				this.pause();
				throw error;
			}
		};
		this.#frameId = requestAnimationFrame(loop);
	}
}
