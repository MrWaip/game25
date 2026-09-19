import { vi } from "vite-plus/test";

/** Browser drawing is the only substituted dependency. Pixel/state semantics
 * belong to the real-browser rendering contracts, not a second Canvas engine.
 */
export function createCanvasContext() {
	const methods = [
		"drawImage",
		"save",
		"restore",
		"scale",
		"reset",
		"setTransform",
		"clearRect",
		"strokeRect",
		"fillRect",
		"fillText",
		"beginPath",
		"closePath",
		"moveTo",
		"lineTo",
		"bezierCurveTo",
		"stroke",
		"fill",
		"setLineDash",
		"arc",
		"ellipse",
		"roundRect",
		"rect",
		"clip",
		"translate",
	] as const;
	const calls = Object.fromEntries(methods.map((name) => [name, vi.fn()]));
	return {
		...calls,
		measureText: (text: string) => ({ width: Array.from(text).length * 7 }),
		createRadialGradient: () => ({ addColorStop: vi.fn() }),
		globalAlpha: 1,
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		font: "",
		textAlign: "left",
		textBaseline: "top",
	} as unknown as CanvasRenderingContext2D;
}

export function createMockCanvas() {
	const canvas = document.createElement("canvas");
	const ctx = createCanvasContext();
	vi.spyOn(canvas, "getContext").mockReturnValue(ctx);
	return { canvas, ctx };
}
