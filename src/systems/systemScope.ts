import type { EventBus } from "@/systems/eventBus";

/** Subscription interface given to a system; its World owns cleanup. */
export interface SystemScope {
	on<E extends Record<string, unknown>, K extends keyof E>(
		bus: EventBus<E>,
		event: K,
		listener: (payload: E[K]) => void,
	): () => void;
	onAll<E extends Record<string, unknown>>(
		bus: EventBus<E>,
		listener: <K extends keyof E>(event: K, payload: E[K]) => void,
	): () => void;
}

export function createSystemScope(): { scope: SystemScope; close(): void } {
	const subscriptions = new Set<() => void>();
	let closed = false;
	function own(subscribe: () => () => void): () => void {
		if (closed) throw new Error("System scope is closed");
		const unsubscribe = subscribe();
		const release = () => {
			if (subscriptions.delete(release)) unsubscribe();
		};
		subscriptions.add(release);
		return release;
	}
	const scope: SystemScope = {
		on(bus, event, listener) {
			// Each owner has its own subscription, even when callbacks are shared.
			return own(() => bus.on(event, (payload) => listener(payload)));
		},
		onAll(bus, listener) {
			return own(() => bus.onAll((event, payload) => listener(event, payload)));
		},
	};
	return {
		scope,
		close() {
			if (closed) return;
			closed = true;
			for (const release of subscriptions) release();
		},
	};
}
