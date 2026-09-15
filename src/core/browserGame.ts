import { Lifecycle } from "@/core/lifecycle";
import type { Engine } from "@/core/engine";

type Cleanup = () => void | Promise<void>;
type BrowserAdapter = {
	engine: Pick<Engine, "initialize" | "start" | "pause">;
	sync(paused: boolean): void;
	pagehide?(): void;
};

/**
 * Owns the root, browser listeners, pause reasons, and startup rollback.
 * Register acquired resources with defer immediately, including the engine.
 * Cleanup runs in reverse order, continues after errors, and is shared by callers.
 */
export async function mountBrowserGame(
	root: HTMLElement,
	setup: (
		defer: (cleanup: Cleanup) => void,
	) => BrowserAdapter | Promise<BrowserAdapter>,
) {
	const cleanup: Cleanup[] = [() => root.remove()];
	const defer = (dispose: Cleanup) => {
		cleanup.push(dispose);
	};
	let adapter: BrowserAdapter;
	let manualPause = false;
	let paused: boolean | undefined;
	function sync() {
		if (lifecycle.closed) return;
		const next = manualPause || document.hidden;
		if (paused === next) return;
		// Stop frames before game-specific pause work; resume only after it succeeds.
		adapter.engine.pause();
		adapter.sync(next);
		if (!next) adapter.engine.start();
		paused = next;
	}
	const lifecycle = new Lifecycle(
		async () => {
			adapter = await setup(defer);
			await adapter.engine.initialize();
			document.addEventListener("visibilitychange", sync);
			defer(() => document.removeEventListener("visibilitychange", sync));
			if (adapter.pagehide) {
				const pagehide = () => adapter.pagehide?.();
				window.addEventListener("pagehide", pagehide);
				defer(() => window.removeEventListener("pagehide", pagehide));
			}
			sync();
		},
		async () => {
			const errors: unknown[] = [];
			for (const dispose of cleanup.reverse()) {
				try {
					await dispose();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length)
				throw new AggregateError(errors, "Browser game cleanup failed");
		},
	);
	await lifecycle.initialize();
	return {
		pause() {
			manualPause = true;
			sync();
		},
		resume() {
			manualPause = false;
			sync();
		},
		destroy(): Promise<void> {
			adapter.engine.pause();
			return lifecycle.destroy();
		},
	};
}
