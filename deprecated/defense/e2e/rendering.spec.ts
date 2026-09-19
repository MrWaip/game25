import { expect, test } from "./fixtures";

test("board passes keep effects above objects, health above effects and selection on top", async ({
	page,
}) => {
	await page.goto("/");
	const samples = await page.evaluate(async () => {
		const paths = [
			"/src/render/surface.ts",
			"/src/games/defense/render/paint.ts",
			"/src/games/defense/boardScene.ts",
			"/src/games/defense/session.ts",
			"/src/render/projection.ts",
			"/src/games/defense/theme.ts",
		];
		const [
			{ CanvasSurface },
			{ paintBoard },
			{ prepareBoardScene },
			{ createDefenseSession },
			{ worldPoint },
			{ defenseTheme },
		] = await Promise.all(paths.map((path) => import(path)));
		const session = await createDefenseSession({ seed: "render-passes" });
		try {
			const base = prepareBoardScene(session.snapshot(), {
				selected: null,
				range: null,
				snow: null,
				portalEntrance: null,
			});
			const canvas = document.createElement("canvas");
			canvas.id = "board-passes";
			document.body.replaceChildren(canvas);
			const surface = new CanvasSurface(canvas);
			surface.resize(base.grid, 1);
			const tower = {
				position: worldPoint(72, 72),
				color: "blue",
				glyph: "",
				level: 0,
				badges: [],
			};
			const enemy = {
				position: worldPoint(72, 100),
				color: "blue",
				glyph: "",
				radius: 9,
				teleported: false,
				shield: 0,
				health: 1,
				badges: [],
				shieldLabel: null,
			};
			const shot = (y: number) => ({
				from: worldPoint(20, y),
				to: worldPoint(120, y),
				color: "red",
				alpha: 1,
				blastRadius: null,
				shatter: false,
			});
			const reference = document.createElement("canvas").getContext("2d")!;
			const color = (value: string) => {
				reference.fillStyle = value;
				reference.fillRect(0, 0, 1, 1);
				return Array.from(reference.getImageData(0, 0, 1, 1).data);
			};
			return [
				{
					name: "effect covers every tower",
					scene: { ...base, towers: [tower], shots: [shot(72)] },
					x: 72,
					y: 72,
					expected: "red",
				},
				{
					name: "health covers effects",
					scene: { ...base, enemies: [enemy], shots: [shot(81)] },
					x: 72,
					y: 80,
					expected: defenseTheme.units.health,
				},
				{
					name: "selection covers effects",
					scene: {
						...base,
						towers: [tower],
						shots: [shot(72)],
						selected: worldPoint(72, 72),
					},
					x: 50,
					y: 72,
					expected: defenseTheme.board.selection,
				},
			].map(({ name, scene, x, y, expected }) => {
				surface.frame((ctx) => {
					paintBoard(ctx, scene);
				});
				return {
					name,
					actual: Array.from(
						canvas.getContext("2d")!.getImageData(x, y, 1, 1).data,
					),
					expected: color(expected),
				};
			});
		} finally {
			await session.destroy();
		}
	});
	for (const { name, actual, expected } of samples)
		expect(actual, name).toEqual(expected);
	await page
		.locator("#board-passes")
		.screenshot({ path: "test-results/board-passes.png" });
});

test("Canvas UI resize wraps text without an observer loop", async ({
	page,
}) => {
	await page.goto("/");
	const heights = await page.evaluate(async () => {
		const hostPath = "/src/render/ui/host.ts";
		const { CanvasUiHost } = await import(hostPath);
		const root = document.createElement("div");
		root.style.cssText = "position:relative;width:400px";
		document.body.replaceChildren(root);
		const host = new CanvasUiHost(root, {
			focus: "blue",
			tooltipBackground: "black",
			tooltipText: "white",
		});
		host.show(
			{
				kind: "text",
				text: "A long description that wraps into several lines as the available width becomes smaller.",
				style: { color: "white", size: 20 },
			},
			false,
		);
		const settle = async () => {
			for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
		};
		await settle();
		const before = root.clientHeight;
		root.style.width = "160px";
		await settle();
		const after = root.clientHeight;
		host.destroy();
		return { before, after };
	});
	expect(heights.after).toBeGreaterThan(heights.before);
});

test("render frames agree on zoom, DPR and top-left screen coordinates", async ({
	page,
}) => {
	await page.goto("/");
	const result = await page.evaluate(async () => {
		const rendererPath = "/src/render/renderer.ts";
		const screenPath = "/src/core/screen.ts";
		const projectionPath = "/src/render/projection.ts";
		const { CanvasRenderer } = await import(rendererPath);
		const { Screen } = await import(screenPath);
		const { worldPoint, screenPoint } = await import(projectionPath);
		const canvas = document.createElement("canvas");
		canvas.id = "render-contract";
		document.body.replaceChildren(canvas);
		const source = document.createElement("canvas");
		source.width = source.height = 10;
		const sourceContext = source.getContext("2d")!;
		sourceContext.fillStyle = "blue";
		sourceContext.fillRect(0, 0, 10, 10);
		const image = await createImageBitmap(source);
		const samples = [];
		for (const ratio of [1, 3]) {
			const renderer = new CanvasRenderer(
				canvas,
				{ getImage: () => image },
				new Screen([200, 100], ratio, 50),
			);
			renderer.frame({ position: [0, 0], zoom: 2 }, (frame) => {
				frame.renderPrimitive({
					color: "red",
					form: "rect",
					position: worldPoint(100, 0),
					size: [40, 40],
					filled: true,
				});
				frame.renderSprite({
					imageName: "blue",
					sizing: "repeat",
					position: screenPoint(20, 20),
					size: [20, 20],
					spriteSize: [10, 10],
					spriteOffset: [0, 0],
					alpha: 1,
				});
			});
			const ctx = canvas.getContext("2d")!;
			const pixel = (x: number, y: number) =>
				Array.from(ctx.getImageData(x * ratio, y * ratio, 1, 1).data);
			samples.push({
				red: pixel(150, 50),
				outside: pixel(170, 50),
				blue: pixel(15, 15),
				tileEnd: pixel(28, 28),
			});
		}
		image.close();
		return samples;
	});
	for (const sample of result)
		expect(sample).toEqual({
			red: [255, 0, 0, 255],
			outside: [0, 0, 0, 0],
			blue: [0, 0, 255, 255],
			tileEnd: [0, 0, 255, 255],
		});
	await page
		.locator("#render-contract")
		.screenshot({ path: "test-results/render-contract.png" });
});

test("a failed painter cannot leak transform, clip or opacity into the next frame", async ({
	page,
}) => {
	await page.goto("/");
	const pixels = await page.evaluate(async () => {
		const surfacePath = "/src/render/surface.ts";
		const { CanvasSurface } = await import(surfacePath);
		const canvas = document.createElement("canvas");
		const surface = new CanvasSurface(canvas);
		surface.resize({ width: 40, height: 40 }, 2);
		try {
			surface.frame((ctx) => {
				ctx.save();
				ctx.translate(100, 100);
				ctx.globalAlpha = 0.1;
				ctx.beginPath();
				ctx.rect(0, 0, 1, 1);
				ctx.clip();
				throw new Error("failed paint");
			});
		} catch {
			/* Exercise recovery after an interrupted pass. */
		}
		surface.frame((ctx) => {
			ctx.fillStyle = "red";
			ctx.fillRect(0, 0, 40, 40);
		});
		return Array.from(canvas.getContext("2d")!.getImageData(40, 40, 1, 1).data);
	});
	expect(pixels).toEqual([255, 0, 0, 255]);
});

test("complete drawing operations isolate state and paths inside a transformed frame", async ({
	page,
}) => {
	await page.goto("/");
	const result = await page.evaluate(async () => {
		const surfacePath = "/src/render/surface.ts",
			painterPath = "/src/render/painter.ts";
		const { CanvasSurface } = await import(surfacePath);
		const { createPainter } = await import(painterPath);
		const canvas = document.createElement("canvas");
		const surface = new CanvasSurface(canvas);
		surface.resize({ width: 100, height: 100 }, 2);
		let state,
			closed = false,
			failed = false,
			savedPainter;
		surface.frame((ctx) => {
			ctx.translate(10, 10);
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "green";
			ctx.strokeStyle = "purple";
			ctx.lineWidth = 9;
			ctx.font = "30px serif";
			ctx.textAlign = "right";
			ctx.textBaseline = "top";
			ctx.setLineDash([3, 7]);
			const draw = createPainter(ctx, {
				label: { color: "black", font: "12px sans-serif", anchor: "center" },
			});
			savedPainter = draw;
			draw.circle({ x: 10, y: 10 }, 5, { fill: "red" });
			draw.rect(30, 5, 10, 10, { fill: "blue" });
			try {
				draw.circle({ x: 0, y: 0 }, -1, { fill: "red" });
			} catch {
				failed = true;
			}
			draw.text("Hi", { x: 30, y: 40 }, { style: "label" });
			state = {
				fill: ctx.fillStyle,
				stroke: ctx.strokeStyle,
				width: ctx.lineWidth,
				font: ctx.font,
				align: ctx.textAlign,
				baseline: ctx.textBaseline,
				alpha: ctx.globalAlpha,
				dash: ctx.getLineDash(),
			};
			// Completed operations leave no path for subsequent raw strokes to repaint.
			ctx.stroke();
		});
		try {
			savedPainter.circle({ x: 0, y: 0 }, 1, { fill: "red" });
		} catch {
			closed = true;
		}
		const native = canvas.getContext("2d")!;
		const pixel = (x: number, y: number) =>
			Array.from(native.getImageData(x * 2, y * 2, 1, 1).data);
		return {
			state,
			failed,
			closed,
			red: pixel(20, 20),
			blue: pixel(45, 20),
			outside: pixel(5, 5),
		};
	});
	expect(result).toEqual({
		state: {
			fill: "#008000",
			stroke: "#800080",
			width: 9,
			font: "30px serif",
			align: "right",
			baseline: "top",
			alpha: 0.5,
			dash: [3, 7],
		},
		failed: true,
		closed: true,
		red: [255, 0, 0, 128],
		blue: [0, 0, 255, 128],
		outside: [0, 0, 0, 0],
	});
});
