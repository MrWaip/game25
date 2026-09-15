import type { Phase } from "@/games/defense/config";
import type { Run } from "@/games/defense/components/runComponent";

export type DefenseProgress = Readonly<{
	runId: string;
	seed: string;
	phase: Phase;
	currentWave: number;
	completedWaves: number;
	kills: number;
	health: number;
	coins: number;
	/** Active combat time across the run; null for saves predating this counter. */
	elapsedSeconds: number | null;
}>;
export type DefenseEvent = Readonly<{
	id: string;
	type: "runStarted" | "waveCompleted" | "runLost";
	progress: DefenseProgress;
}>;
export type DefenseEventOptions = {
	onEvent?: (event: DefenseEvent) => void | Promise<void>;
	onEventError?: (error: unknown, event: DefenseEvent) => void;
};

export function getProgress(run: Run): DefenseProgress {
	return {
		runId: run.runId,
		seed: run.seed,
		phase: run.phase,
		currentWave: run.wave,
		completedWaves: Math.max(
			0,
			run.wave - (run.phase === "wave" || run.phase === "lost" ? 1 : 0),
		),
		kills: run.kills,
		health: run.health,
		coins: run.coins,
		elapsedSeconds: run.elapsedSeconds,
	};
}

/** Observe committed transitions; loading a checkpoint never replays its history. */
export function observeProgress(run: Run, options: DefenseEventOptions) {
	let phase = run.phase;
	let runId = run.runId;
	return () => {
		const previous = runId === run.runId ? phase : "draft";
		runId = run.runId;
		phase = run.phase;
		const type =
			previous === "draft" && phase === "prepare"
				? "runStarted"
				: previous === "wave" && phase === "reward"
					? "waveCompleted"
					: previous === "wave" && phase === "lost"
						? "runLost"
						: null;
		if (!type || !options.onEvent) return;
		const event: DefenseEvent = Object.freeze({
			id: `${runId}:${type}:${run.wave}`,
			type,
			progress: Object.freeze(getProgress(run)),
		});
		const report = (error: unknown) => {
			try {
				if (options.onEventError) options.onEventError(error, event);
				else console.error("Defense event listener failed", error);
			} catch (reportError) {
				console.error("Defense event error handler failed", reportError);
			}
		};
		try {
			void Promise.resolve(options.onEvent(event)).catch(report);
		} catch (error) {
			report(error);
		}
	};
}
