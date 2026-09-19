import type { Phase } from "./model";
import type { Run } from "./components/runComponent";
export type DefenseProgress = Readonly<{
	runId: string;
	seed: string;
	phase: Phase;
	currentWave: number;
	completedWaves: number;
	kills: number;
	health: number;
	coins: number;
	coinsEarned: number;
	coinsSpent: number;
	elapsedSeconds: number;
}>;
export type DefenseEventType = "runStarted" | "waveCompleted" | "runLost";
export type DefenseEvent = Readonly<{
	id: string;
	type: DefenseEventType;
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
		completedWaves: run.completedWaves,
		kills: run.kills,
		health: run.health,
		coins: run.coins,
		coinsEarned: run.coinsEarned,
		coinsSpent: run.coinsSpent,
		elapsedSeconds: run.elapsedSeconds,
	};
}
export function publish(
	run: Run,
	type: DefenseEventType,
	options: DefenseEventOptions,
): void {
	const event: DefenseEvent = {
		id: `${run.runId}:${type}:${run.wave}`,
		type,
		progress: getProgress(run),
	};
	const report = (error: unknown) => {
		try {
			options.onEventError?.(error, event);
		} catch {
			/* Host callbacks cannot stop the game. */
		}
	};
	try {
		void Promise.resolve(options.onEvent?.(event)).catch(report);
	} catch (error) {
		report(error);
	}
}
