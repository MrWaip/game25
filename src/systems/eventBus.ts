/* oxlint-disable typescript/no-explicit-any */
type Listener<T> = (payload: T) => void;
type AllEventsListener<E extends Record<string, any>> = <K extends keyof E>(
	event: K,
	payload: E[K],
) => void;
type Subscription<T> = { listener: T; active: boolean };

class Subscriptions<T> {
	#entries = new Map<T, Subscription<T>>();
	add(listener: T): () => void {
		let entry = this.#entries.get(listener);
		if (!entry) {
			entry = { listener, active: true };
			this.#entries.set(listener, entry);
		}
		const subscription = entry;
		return () => {
			if (!subscription.active) return;
			subscription.active = false;
			this.#entries.delete(listener);
		};
	}
	remove(listener: T): void {
		const entry = this.#entries.get(listener);
		if (entry) entry.active = false;
		this.#entries.delete(listener);
	}
	snapshot(): Subscription<T>[] {
		return [...this.#entries.values()];
	}
	clear(): void {
		for (const entry of this.#entries.values()) entry.active = false;
		this.#entries.clear();
	}
}

export class EventBus<E extends Record<string, any>> {
	#listeners = new Map<keyof E, Subscriptions<Listener<any>>>();
	#allListeners = new Subscriptions<AllEventsListener<E>>();

	/** Capture subscriptions at emission start; removals take effect immediately. */
	emit<K extends keyof E>(
		event: K,
		...args: E[K] extends void ? [] : [E[K]]
	): void {
		const listeners = this.#listeners.get(event)?.snapshot() ?? [];
		const allListeners = this.#allListeners.snapshot();
		for (const entry of listeners) {
			if (entry.active) entry.listener(args[0]!);
		}
		for (const entry of allListeners) {
			if (entry.active) entry.listener(event, args[0]!);
		}
	}
	on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
		let listeners = this.#listeners.get(event);
		if (!listeners) {
			listeners = new Subscriptions();
			this.#listeners.set(event, listeners);
		}
		return listeners.add(listener);
	}
	onAll(listener: AllEventsListener<E>): () => void {
		return this.#allListeners.add(listener);
	}
	offAll(listener: AllEventsListener<E>): void {
		this.#allListeners.remove(listener);
	}
	clear(): void {
		for (const listeners of this.#listeners.values()) listeners.clear();
		this.#listeners.clear();
		this.#allListeners.clear();
	}
}
