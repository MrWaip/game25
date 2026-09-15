import { AudioSystem } from "@/games/jumper/systems/audioSystem";
import { expect, it } from "vite-plus/test";
import { JumperWorld } from "@/games/jumper/world";

it("clears game subscriptions after failed startup even when another system fails cleanup", async () => {
	const world = new JumperWorld({});
	let calls = 0;
	world.eventBus.on("death", () => {
		calls++;
	});
	world.registerSystem({
		initialize: () => {
			throw new Error("startup");
		},
		destroy: () => {
			throw new Error("cleanup");
		},
	});
	await expect(world.initialize()).rejects.toThrow(AggregateError);
	world.eventBus.emit("death", { entity: 0 });
	expect(calls).toBe(0);
});

it("stops delivering events to systems already disposed during world teardown", async () => {
	const world = new JumperWorld({});
	let played = 0;
	world.registerSystem({
		destroy: () => world.eventBus.emit("audioPlay", { name: "jump" }),
	});
	world.registerSystem(
		new AudioSystem({
			play: () => {
				played++;
			},
			pauseAll: () => {},
			resumeAll: () => {},
			destroy: () => {},
		}),
	);
	await world.initialize();
	world.eventBus.emit("audioPlay", { name: "jump" });
	await world.destroy();
	expect(played).toBe(1);
});
