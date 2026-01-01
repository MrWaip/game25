import { describe, it, expect } from "vitest";
import { createHarness } from "./harness";
import { TransformComponent } from "../components/transformComponent";

describe("testkit/createHarness", () => {
	it("creates a world, can spawn entities and step", async () => {
		const h = await createHarness();
		const player = h.spawn.player({ x: 100, y: 200 });

		h.step(3);

		expect(h.world.getComponent(player, TransformComponent)).toBeDefined();
	});
});
