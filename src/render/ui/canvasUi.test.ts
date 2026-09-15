import { describe, expect, it, vi } from "vite-plus/test";
import { CanvasUi } from "@/render/ui/canvasUi";
import { createWidgets } from "@/render/ui/widgets";
import { TextLayout } from "@/render/ui/text";
import { Tween } from "@/render/ui/motion";
import type { UiNode } from "@/render/ui/types";

const widgets = createWidgets({
	text: "white",
	muted: "gray",
	surface: "black",
	border: "gray",
	action: "blue",
	onAction: "white",
});
function harness() {
	const ctx = {
		save: vi.fn(),
		restore: vi.fn(),
		measureText: (s: string) => ({ width: Array.from(s).length * 7 }),
		beginPath: vi.fn(),
		rect: vi.fn(),
		clip: vi.fn(),
		roundRect: vi.fn(),
		fill: vi.fn(),
		stroke: vi.fn(),
		fillText: vi.fn(),
		translate: vi.fn(),
		globalAlpha: 1,
	} as unknown as CanvasRenderingContext2D;
	return {
		ui: new CanvasUi(ctx, {
			focus: "blue",
			tooltipBackground: "black",
			tooltipText: "white",
		}),
		ctx,
	};
}

describe("Canvas UI through its screen interface", () => {
	it("lays out reusable cards and activates the same action by pointer and keyboard", () => {
		const { ui } = harness();
		const press = vi.fn();
		ui.show(
			widgets.column(
				[
					widgets.heading("Choose"),
					widgets.card({
						id: "a",
						label: "Long title",
						description: "A description that wraps across lines on a phone",
						icon: "*",
						onPress: press,
					}),
				],
				{ padding: 12 },
			),
			240,
		);
		const { rect } = ui.buttons[0];
		expect(rect.width).toBe(216);
		expect(rect.height).toBeGreaterThanOrEqual(112);
		ui.pointer("down", rect.x + 20, rect.y + 20);
		ui.pointer("up", rect.x + 20, rect.y + 20);
		ui.activate("a");
		expect(press).toHaveBeenCalledTimes(2);
	});
	it("cancels dragged, interrupted, disabled and stale actions", () => {
		const { ui } = harness();
		const press = vi.fn();
		const scene = widgets.button({ id: "a", label: "Play", onPress: press });
		ui.show(scene, 200);
		ui.pointer("down", 10, 10);
		ui.pointer("move", 300, 10);
		ui.pointer("up", 10, 10);
		ui.pointer("down", 10, 10);
		ui.cancel();
		ui.pointer("up", 10, 10);
		ui.enabled = false;
		ui.activate("a");
		ui.enabled = true;
		ui.pointer("down", 10, 10);
		ui.show(widgets.column([]), 200);
		ui.pointer("up", 10, 10);
		ui.activate("a");
		ui.show(
			widgets.button({
				id: "a",
				label: "Play",
				disabled: true,
				onPress: press,
			}),
			200,
		);
		ui.activate("a");
		expect(press).not.toHaveBeenCalled();
	});
	it("clips pointer targets to their parent panel", () => {
		const { ui } = harness();
		const press = vi.fn();
		ui.show(
			widgets.column(
				[widgets.button({ id: "a", label: "Play", onPress: press })],
				{ height: 20 },
			),
			200,
		);
		ui.pointer("down", 10, 30);
		ui.pointer("up", 10, 30);
		expect(press).not.toHaveBeenCalled();
		ui.pointer("down", 10, 10);
		ui.pointer("up", 10, 10);
		expect(press).toHaveBeenCalledOnce();
	});
	it("long press shows a tooltip without choosing, ordinary held buttons still work", () => {
		const { ui, ctx } = harness();
		const press = vi.fn();
		ui.show(
			widgets.button({
				id: "a",
				label: "Play",
				tooltip: "Details",
				onPress: press,
			}),
			200,
		);
		ui.pointer("down", 10, 10);
		ui.advance(0.7);
		ui.draw();
		ui.pointer("up", 10, 10);
		expect(ctx.fillText).toHaveBeenCalledWith(
			"Details",
			expect.any(Number),
			expect.any(Number),
		);
		expect(press).not.toHaveBeenCalled();
		ui.show(widgets.button({ id: "a", label: "Play", onPress: press }), 200);
		ui.pointer("down", 10, 10);
		ui.advance(0.7);
		ui.pointer("up", 10, 10);
		expect(press).toHaveBeenCalledOnce();
	});
	it("relayout uses new widths and rejects ambiguous action ids", () => {
		const { ui } = harness();
		const action = widgets.card({
			id: "a",
			label: "Title",
			description: "Some long description with several words to wrap",
			onPress: vi.fn(),
		});
		ui.show(action, 320);
		const wide = ui.height;
		ui.show(action, 120);
		expect(ui.height).toBeGreaterThan(wide);
		expect(() => ui.show(widgets.column([action, action]), 300)).toThrow(
			"Duplicate UI id",
		);
	});
	it("can compose a two-column menu with fixed and flexible widths", () => {
		const { ui } = harness();
		const scene: UiNode = widgets.row(
			[
				widgets.button(
					{ id: "back", label: "Back", onPress() {} },
					{ width: 80 },
				),
				widgets.button({ id: "next", label: "Next", onPress() {} }),
			],
			{ gap: 10 },
		);
		ui.show(scene, 300);
		expect(ui.buttons.map((item) => [item.rect.x, item.rect.width])).toEqual([
			[0, 80],
			[90, 210],
		]);
	});
});

describe("text and animation", () => {
	it("wraps explicit paragraphs, long words and Unicode without losing content", () => {
		const text = new TextLayout((s) => Array.from(s).length * 10);
		expect(text.wrap("hello world\n\n😀😀😀", { color: "white" }, 50)).toEqual([
			"hello",
			"world",
			"",
			"😀😀😀",
		]);
		expect(text.wrap("abcdefgh", { color: "white" }, 30)).toEqual([
			"abc",
			"def",
			"gh",
		]);
		expect(
			text.wrap("one two three", { color: "white", maxLines: 1 }, 40),
		).toEqual(["one…"]);
	});
	it("advances from explicit time, clamps overshoot and handles reduced motion", () => {
		const tween = new Tween(0, 10, 1);
		expect(tween.advance(-1)).toBe(0);
		expect(tween.advance(0.5)).toBeCloseTo(8.75);
		expect(tween.advance(10)).toBe(10);
		expect(tween.finished).toBe(true);
		expect(new Tween(0, 10, 0).value).toBe(10);
	});
});

it("centers visible text ink inside its line box", () => {
	const { ui, ctx } = harness();
	vi.spyOn(ctx, "measureText").mockReturnValue({
		width: 24,
		actualBoundingBoxAscent: 9,
		actualBoundingBoxDescent: 3,
	} as TextMetrics);
	ui.show(
		widgets.text("Play", { size: 12, lineHeight: 24, align: "center" }),
		100,
		false,
	);
	ui.draw();
	expect(ctx.textBaseline).toBe("alphabetic");
	expect(ctx.fillText).toHaveBeenCalledWith("Play", 50, 15);
});
