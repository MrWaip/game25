import { worldPoint, screenPoint } from "@/render/projection";
import { it, expect, expectTypeOf } from "vite-plus/test";
import { vi } from "vite-plus/test";
import { createTestRenderer } from "@/testkit/renderer";
import { Vec2 } from "@/primitives/vec2-gl";
import type { FrameRenderer } from "@/render/renderer";

it("requires one sprite sizing mode instead of independent flags", () => {
	type Sprite = Parameters<FrameRenderer["renderSprite"]>[0];
	expectTypeOf<Sprite["sizing"]>().toEqualTypeOf<
		"stretch" | "repeat" | "repeat-x"
	>();
	expectTypeOf<Sprite>().not.toHaveProperty("fitToSize");
	expectTypeOf<Sprite>().not.toHaveProperty("tileX");
});

it.each([0, -1, NaN, Infinity])(
	"rejects invalid source width %s before drawing",
	(width) => {
		const { renderer, camera, ctx } = createTestRenderer();
		expect(() =>
			renderer.frame(camera, (frame) => {
				frame.renderSprite({
					imageName: "test",
					position: screenPoint(0, 0),
					size: Vec2.fromValues(50, 25),
					spriteSize: Vec2.fromValues(width, 10),
					spriteOffset: Vec2.create(),
					alpha: 1,
					sizing: "stretch",
				});
			}),
		).toThrow(RangeError);
		expect(ctx.drawImage).not.toHaveBeenCalled();
	},
);

it.each([
	{ sizing: "stretch", calls: 1, last: [4, 6, 20, 10, 0, 0, 50, 25] },
	{ sizing: "repeat", calls: 9, last: [4, 6, 10, 5, 40, 20, 10, 5] },
	{ sizing: "repeat-x", calls: 3, last: [4, 6, 10, 10, 40, 0, 10, 25] },
] as const)(
	"draws $sizing with cropped edge tiles",
	({ sizing, calls, last }) => {
		const { renderer, camera, ctx, image } = createTestRenderer();
		renderer.frame(camera, (frame) => {
			frame.renderSprite({
				imageName: "test",
				position: screenPoint(25, 12.5),
				size: Vec2.fromValues(50, 25),
				spriteSize: Vec2.fromValues(20, 10),
				spriteOffset: Vec2.fromValues(4, 6),
				alpha: 1,
				sizing,
			});
		});
		expect(ctx.drawImage).toHaveBeenCalledTimes(calls);
		expect(ctx.drawImage).toHaveBeenLastCalledWith(image, ...last);
	},
);

it("rejects drawing through a retained frame after its callback finishes", () => {
	const { renderer, camera } = createTestRenderer();
	let retained!: FrameRenderer;
	renderer.frame(camera, (frame) => {
		retained = frame;
	});
	expect(() =>
		retained.renderPrimitive({
			color: "red",
			form: "rect",
			position: worldPoint(0, 0),
			size: Vec2.fromValues(10, 10),
			filled: true,
		}),
	).toThrow("Frame is closed");
});

it("draws with the same zoom as its visible bounds", () => {
	const { renderer, camera, ctx } = createTestRenderer({ camera: { zoom: 2 } });
	renderer.frame(camera, (frame) => {
		expect(Array.from(frame.bounds.min)).toEqual([-800, -600]);
		expect(Array.from(frame.bounds.max)).toEqual([800, 600]);
		frame.renderPrimitive({
			color: "red",
			form: "rect",
			position: worldPoint(400, 200),
			size: Vec2.fromValues(100, 80),
			filled: true,
		});
	});
	expect(ctx.fillRect).toHaveBeenCalledWith(575, 180, 50, 40);
});

it("uses top-left logical pixels for screen text at DPR 3", () => {
	const { renderer, camera, ctx, canvas } = createTestRenderer({
		pixelRatio: 3,
	});
	renderer.frame(camera, (frame) => {
		frame.renderText({
			text: [["Score"]],
			position: screenPoint(30, 20),
			fontSize: 24,
			color: "white",
		});
	});
	expect(canvas.width).toBe(2400);
	expect(ctx.fillText).toHaveBeenCalledWith("Score", 30, 20);
	expect(ctx.font).toContain("24px");
	expect(ctx.setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
});

it.each([
	{ name: "strip frame", frame: 3, cols: undefined, cell: 100, x: 300, y: 0 },
	{ name: "matrix origin", frame: 0, cols: 3, cell: 100, x: 0, y: 0 },
	{ name: "matrix first row", frame: 2, cols: 3, cell: 100, x: 200, y: 0 },
	{ name: "matrix row transition", frame: 3, cols: 3, cell: 100, x: 0, y: 100 },
	{ name: "matrix last column", frame: 5, cols: 3, cell: 100, x: 200, y: 100 },
	{ name: "smaller sheet cells", frame: 3, cols: 2, cell: 50, x: 50, y: 50 },
])("selects the correct image region: $name", ({ frame, cols, cell, x, y }) => {
	const { renderer, camera, ctx, image } = createTestRenderer();
	renderer.frame(camera, (draw) => {
		draw.renderAnimated({
			name: "test",
			frame,
			cols,
			direction: "right",
			position: worldPoint(0, 0),
			size: Vec2.fromValues(cell, cell),
			spriteSize: Vec2.fromValues(cell, cell),
		});
	});
	expect(vi.mocked(ctx.drawImage).mock.calls[0].slice(0, 5)).toEqual([
		image,
		x,
		y,
		cell,
		cell,
	]);
});

it.each([
	{ name: "strip", frame: 2, cols: undefined, x: 200, y: 0 },
	{ name: "matrix", frame: 4, cols: 3, x: 100, y: 100 },
])(
	"mirrors $name animation without changing its source region",
	({ frame, cols, x, y }) => {
		const { renderer, camera, ctx, image } = createTestRenderer();
		renderer.frame(camera, (draw) => {
			draw.renderAnimated({
				name: "test",
				frame,
				cols,
				direction: "left",
				position: worldPoint(100, 0),
				size: Vec2.fromValues(100, 100),
				spriteSize: Vec2.fromValues(100, 100),
			});
		});
		expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
		expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(
			image,
			x,
			y,
			100,
			100,
			-550,
			250,
			100,
			100,
		);
	},
);
