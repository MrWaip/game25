import { createCanvasContext } from "@/testkit/canvas";
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
	const ctx = createCanvasContext();
	return {
		ui: new CanvasUi((text) => ctx.measureText(text).width, {
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
		ui.draw(ctx);
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
	ui.draw(ctx);
	expect(ctx.textBaseline).toBe("alphabetic");
	expect(ctx.fillText).toHaveBeenCalledWith("Play", 50, 15);
});

describe("UI composition and layout", () => {
	it("wraps fixed cards at the available width and moves their pointer targets on resize", () => {
		const { ui } = harness();
		const press = vi.fn();
		const scene = widgets.row(
			["a", "b", "c"].map((id) =>
				widgets.button(
					{ id, label: id, onPress: () => press(id) },
					{ width: 60, height: 48 },
				),
			),
			{ wrap: true, gap: 10 },
		);
		ui.show(scene, 130, false);
		expect(ui.height).toBe(106);
		expect(ui.buttons.map(({ rect }) => [rect.x, rect.y, rect.width])).toEqual([
			[0, 0, 60],
			[70, 0, 60],
			[0, 58, 60],
		]);
		ui.pointer("down", 10, 70);
		ui.pointer("up", 10, 70);
		expect(press).toHaveBeenLastCalledWith("c");
		ui.show(scene, 200, false);
		expect(ui.height).toBe(48);
		ui.pointer("down", 10, 70);
		ui.pointer("up", 10, 70);
		expect(press).toHaveBeenCalledOnce();
		ui.pointer("down", 150, 10);
		ui.pointer("up", 150, 10);
		expect(press).toHaveBeenLastCalledWith("c");
	});
	it("shares remaining width by grow weights and keeps nested content within the allocation", () => {
		const { ui } = harness();
		const button = (id: string) =>
			widgets.button({ id, label: id, onPress() {} });
		ui.show(
			widgets.row(
				[
					widgets.column([button("a")], { width: 40, grow: 1 }),
					widgets.column([button("b")], { width: 40, grow: 2 }),
				],
				{ gap: 10 },
			),
			240,
			false,
		);
		expect(ui.buttons.map(({ rect }) => [rect.x, rect.width])).toEqual([
			[0, 90],
			[100, 140],
		]);
	});
	it("aligns nested controls and distributes spare space without losing hit targets", () => {
		const { ui } = harness();
		const press = vi.fn();
		const item = (id: string) =>
			widgets.column(
				[widgets.button({ id, label: id, onPress: press }, { height: 48 })],
				{ width: 40 },
			);
		ui.show(
			widgets.row([item("a"), item("b")], {
				height: 100,
				padding: 10,
				align: "end",
				justify: "space-between",
			}),
			200,
			false,
		);
		expect(ui.buttons.map(({ rect }) => [rect.x, rect.y])).toEqual([
			[10, 42],
			[150, 42],
		]);
		ui.pointer("down", 160, 50);
		ui.pointer("up", 160, 50);
		expect(press).toHaveBeenCalledOnce();
		ui.show(
			widgets.column([item("a")], {
				height: 100,
				align: "center",
				justify: "end",
			}),
			200,
			false,
		);
		expect(ui.buttons[0].rect).toEqual({ x: 80, y: 52, width: 40, height: 48 });
	});
	it("wraps oversized children, centers each line and handles empty rows", () => {
		const { ui } = harness();
		const item = (id: string, width: number) =>
			widgets.button({ id, label: id, onPress() {} }, { width, height: 48 });
		ui.show(
			widgets.row([item("a", 200), item("b", 40), item("c", 40)], {
				wrap: true,
				gap: 10,
				justify: "center",
			}),
			100,
			false,
		);
		expect(ui.buttons.map(({ rect }) => [rect.x, rect.y, rect.width])).toEqual([
			[0, 0, 100],
			[5, 58, 40],
			[55, 58, 40],
		]);
		ui.show(
			widgets.row([], { padding: 10, wrap: true, justify: "space-between" }),
			100,
			false,
		);
		expect(ui.height).toBe(20);
		expect(ui.buttons).toEqual([]);
	});
	it("composes custom button content and card slots using named theme recipes", () => {
		const { ui, ctx } = harness();
		const press = vi.fn();
		const kit = createWidgets(
			{
				text: "white",
				muted: "gray",
				surface: "black",
				border: "gray",
				action: "blue",
				onAction: "white",
			},
			{
				text: { title: { size: 20, lineHeight: 24 } },
				buttons: {
					icon: { box: { width: 48, padding: 0 }, text: { size: 22 } },
				},
				cards: {
					compact: { box: { padding: 8, minHeight: 0 }, artworkWidth: 24 },
				},
			},
		);
		ui.show(kit.heading("Heading", { style: "title" }), 240, false);
		expect(ui.height).toBe(24);
		ui.show(
			kit.column([
				kit.button({
					id: "close",
					label: "Close dialog",
					variant: "icon",
					children: [kit.text("×", { style: "title" })],
					onPress: press,
				}),
				kit.card({
					id: "reward",
					label: "Choose reward",
					title: "Reward",
					variant: "compact",
					description: "Details",
					artwork: kit.text("*"),
					footer: kit.text("Bonus"),
					onPress: press,
					disabled: true,
				}),
			]),
			240,
			false,
		);
		ui.draw(ctx);
		expect(ui.buttons.map(({ node }) => node.label)).toEqual([
			"Close dialog",
			"Choose reward",
		]);
		for (const value of ["×", "Reward", "Details", "*", "Bonus"])
			expect(ctx.fillText).toHaveBeenCalledWith(
				value,
				expect.any(Number),
				expect.any(Number),
			);
		ui.activate("close");
		ui.activate("reward");
		expect(press).toHaveBeenCalledOnce();
	});
});
