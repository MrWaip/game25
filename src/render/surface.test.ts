import { createMockCanvas } from "@/testkit/canvas";
import { expect, expectTypeOf, it, vi } from "vite-plus/test";
import { CanvasSurface, type PaintContext } from "@/render/surface";
import type { CanvasElement } from "@/render/canvas";
import { clientPoint, screenPoint } from "@/render/projection";

it("keeps native context acquisition and frame configuration out of caller interfaces", () => {
	expectTypeOf<CanvasElement>().not.toHaveProperty("getContext");
	expectTypeOf<PaintContext>().not.toHaveProperty("canvas");
	expectTypeOf<PaintContext>().not.toHaveProperty("setTransform");
	expectTypeOf<PaintContext>().not.toHaveProperty("reset");
	expectTypeOf<
		Parameters<CanvasSurface["frame"]>[0]
	>().returns.toEqualTypeOf<undefined>();
});

it("rejects retained drawing functions and property writes after a frame", () => {
	const { canvas, ctx: native } = createMockCanvas();
	const surface = new CanvasSurface(canvas);
	let retained!: PaintContext;
	let draw!: PaintContext["fillRect"];
	surface.frame((ctx) => {
		retained = ctx;
		draw = ctx.fillRect;
	});
	expect(() => {
		retained.globalAlpha = 0.5;
	}).toThrow("Frame is closed");
	surface.frame(() => {
		expect(() => draw(0, 0, 1, 1)).toThrow("Frame is closed");
	});
	expect(native.fillRect).not.toHaveBeenCalled();
});

it("owns rounded backing size while input remains in logical pixels", () => {
	const { canvas, ctx } = createMockCanvas();
	vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
		x: 10,
		y: 20,
		width: 200,
		height: 100,
	} as DOMRect);
	const surface = new CanvasSurface(canvas);
	surface.resize({ width: 100, height: 50 }, 1.25);
	expect([canvas.width, canvas.height]).toEqual([125, 63]);
	expect(surface.point(clientPoint(110, 70))).toEqual(screenPoint(50, 25));
	expect(() =>
		surface.frame(() => {
			throw new Error("paint failed");
		}),
	).toThrow("paint failed");
	surface.frame(() => {});
	expect(ctx.setTransform).toHaveBeenLastCalledWith(1.25, 0, 0, 1.26, 0, 0);
	expect(ctx.restore).toHaveBeenCalledTimes(2);
});
