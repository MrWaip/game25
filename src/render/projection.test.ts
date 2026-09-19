import { expect, expectTypeOf, it } from "vite-plus/test";
import { Screen } from "@/core/screen";
import { Vec2 } from "@/primitives/vec2-gl";
import {
	Projection,
	clientToScreen,
	clientPoint,
	screenPoint,
	worldPoint,
} from "@/render/projection";

it("keeps screen, world and browser points distinct at the interface", () => {
	expectTypeOf(worldPoint(0, 0)).not.toExtend<ReturnType<typeof screenPoint>>();
	expectTypeOf(clientPoint(0, 0)).not.toExtend<
		ReturnType<typeof screenPoint>
	>();
});

it("projects the same visible world used by the camera at zoom 2", () => {
	const screen = new Screen(Vec2.fromValues(800, 600), 3, 150);
	const projection = screen.projection(Vec2.fromValues(100, 50), 2);
	expect(projection.toScreen(worldPoint(100, 50))).toEqual(
		screenPoint(400, 300),
	);
	expect(projection.toScreen(worldPoint(-300, 350))).toEqual(screenPoint(0, 0));
	expect(projection.toWorld(screenPoint(800, 600))).toEqual(
		worldPoint(500, -250),
	);
	expect(projection.bounds).toEqual({
		x: -300,
		y: -250,
		width: 800,
		height: 600,
	});
});

it("maps a resized board's pointer through the same projection as its drawing", () => {
	const projection = new Projection(
		{ width: 264, height: 360 },
		{ x: 0, y: 0, width: 528, height: 720 },
		"down",
	);
	const painted = projection.toScreen(worldPoint(72, 120));
	expect(painted).toEqual(screenPoint(36, 60));
	const pointer = clientToScreen(
		clientPoint(82, 140),
		{ x: 10, y: 20, width: 528, height: 720 },
		projection.viewport,
	)!;
	expect(pointer).toEqual(painted);
	expect(projection.toWorld(pointer)).toEqual(worldPoint(72, 120));
	expect(
		clientToScreen(
			clientPoint(0, 0),
			{ x: 0, y: 0, width: 0, height: 0 },
			projection.viewport,
		),
	).toBeNull();
});

it.each([0, -1, NaN, Infinity])(
	"rejects unusable zoom %s before rendering",
	(zoom) => {
		const screen = new Screen(Vec2.fromValues(800, 600), 1, 150);
		expect(() => screen.projection(Vec2.create(), zoom)).toThrow(RangeError);
	},
);
