import { describe, expect, it } from "vitest";
import { createFixedTimestep } from "./fixedTimestep";

describe("createFixedTimestep", () => {
	it.each([
		{ fps: 30, frames: 30 },
		{ fps: 144, frames: 144 },
	])("runs 60 simulation steps per second even if frames are at $fps fps", ({
		fps,
		frames,
	}) => {
		const hz = 60;
		const stepper = createFixedTimestep(
			{ hz, maxFrameTime: 0.25, maxSubSteps: 10 },
			0,
		);

		const frameMs = 1000 / fps;
		let now = 0;
		let steps = 0;

		for (let i = 0; i < frames; i++) {
			now += frameMs;
			steps += stepper.tick(now).steps;
		}

		expect(steps).toBe(60);
	});
});
