import { vi } from "vitest";

export type RafCallback = (time: number) => void;

export function createRafHarness() {
	const callbacks: RafCallback[] = [];
	const requestAnimationFrame = vi.fn((cb: RafCallback) => {
		callbacks.push(cb);
		return callbacks.length;
	});

	function step(timeMs: number) {
		const cb = callbacks.shift();
		if (!cb) throw new Error("No requestAnimationFrame callback queued");
		cb(timeMs);
	}

	return { requestAnimationFrame, step };
}
