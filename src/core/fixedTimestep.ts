export type FixedTimestepOptions = {
	hz: number;
	maxFrameTime: number;
	maxSubSteps: number;
};

export type FixedTimestep = {
	tick: (currentTimeMs: number) => { steps: number; frameDt: number };
	fixedDt: number;
};

export function createFixedTimestep(
	options: FixedTimestepOptions,
	initialTimeMs: number,
): FixedTimestep {
	const fixedDt = 1 / options.hz;
	let previousTimeMs = initialTimeMs;
	let accumulator = 0;

	function tick(currentTimeMs: number) {
		const rawDt = (currentTimeMs - previousTimeMs) / 1000;
		const frameDt = Math.min(Math.max(rawDt, 0), options.maxFrameTime);
		accumulator += frameDt;

		let steps = 0;
		while (accumulator >= fixedDt && steps < options.maxSubSteps) {
			accumulator -= fixedDt;
			steps++;
		}

		previousTimeMs = currentTimeMs;
		return { steps, frameDt };
	}

	return { tick, fixedDt };
}
