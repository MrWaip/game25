/** Serializes async startup and teardown. Teardown waits for acquired resources. */
export class Lifecycle {
	#state: "new" | "initializing" | "ready" | "destroying" | "destroyed" = "new";
	#work: Promise<void> | undefined;
	#initialization: Promise<void> | undefined;
	#destruction: Promise<void> | undefined;
	constructor(
		private setup: () => Promise<void>,
		private cleanup: () => Promise<void>,
	) {}
	get ready(): boolean {
		return this.#state === "ready";
	}
	get started(): boolean {
		return this.#state !== "new";
	}
	get closed(): boolean {
		return this.#state === "destroying" || this.#state === "destroyed";
	}
	initialize(): Promise<void> {
		if (this.closed) return Promise.reject(new Error("Resource is destroyed"));
		if (this.#initialization) return this.#initialization;
		this.#state = "initializing";
		this.#work = Promise.resolve().then(async () => {
			if (this.closed) throw new Error("Destroyed before initialization");
			await this.setup();
			if (this.closed) throw new Error("Destroyed during initialization");
			this.#state = "ready";
		});
		this.#initialization = this.#work.catch(async (failure: unknown) => {
			try {
				await this.destroy();
			} catch (cleanup) {
				throw new AggregateError(
					[failure, cleanup],
					"Initialization and cleanup failed",
				);
			}
			throw failure;
		});
		return this.#initialization;
	}
	destroy(): Promise<void> {
		if (this.#destruction) return this.#destruction;
		this.#state = "destroying";
		this.#destruction = (async () => {
			await this.#work?.catch(() => {});
			try {
				await this.cleanup();
			} finally {
				this.#state = "destroyed";
			}
		})();
		return this.#destruction;
	}
}
