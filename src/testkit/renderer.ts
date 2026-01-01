import { vi } from "vitest";
import { CanvasRenderer } from "../render/renderer";
import { AssetsManager } from "../core/assetsManager";
import type { SpriteName } from "../assets";
import { Vec2 } from "../primitives/vec2-gl";
import { Screen } from "../core/screen";

export function createMockImageBitmap(): ImageBitmap {
	return {
		width: 100,
		height: 100,
		close: vi.fn(),
	} as unknown as ImageBitmap;
}

export function createMockCanvas(): {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
} {
	const canvas = document.createElement("canvas");
	canvas.width = 800;
	canvas.height = 600;

	const drawImage = vi.fn();
	const save = vi.fn();
	const restore = vi.fn();
	const scale = vi.fn();
	const reset = vi.fn();
	const strokeRect = vi.fn();
	const fillRect = vi.fn();
	const fillText = vi.fn();

	const ctx = {
		drawImage,
		save,
		restore,
		scale,
		reset,
		strokeRect,
		fillRect,
		fillText,
		globalAlpha: 1,
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 0,
		font: "",
		textAlign: "left" as CanvasTextAlign,
		textBaseline: "top" as CanvasTextBaseline,
	} as unknown as CanvasRenderingContext2D;

	vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

	return { canvas, ctx };
}

type AssetsManagerWithPrivate = AssetsManager & {
	"#images": Map<SpriteName, ImageBitmap>;
};

export function createMockAssetsManager(): {
	assetsManager: AssetsManager;
	setImage: (name: SpriteName, image: ImageBitmap) => void;
} {
	const assetsManager = new AssetsManager() as AssetsManagerWithPrivate;

	function setImage(name: SpriteName, image: ImageBitmap) {
		if (!assetsManager["#images"]) {
			assetsManager["#images"] = new Map<SpriteName, ImageBitmap>();
		}
		assetsManager["#images"].set(name, image);

		const verify = assetsManager["#images"].get(name);
		if (!verify) {
			throw new Error(`Failed to set image ${name}`);
		}
	}

	return { assetsManager, setImage };
}

export function createTestRenderer(options?: {
	viewportSize?: Vec2;
	camera?: {
		position?: Vec2;
		orthographicSize?: number;
		zoom?: number;
	};
}): {
	renderer: CanvasRenderer;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	assetsManager: AssetsManager;
	setImage: (name: SpriteName, image: ImageBitmap) => void;
} {
	const viewportSize = options?.viewportSize ?? Vec2.fromValues(800, 600);
	const orthographicSize =
		options?.camera?.orthographicSize ?? viewportSize[1] / 2;
	const screen = new Screen(viewportSize, 1, orthographicSize);
	const { canvas, ctx } = createMockCanvas();
	const { assetsManager, setImage } = createMockAssetsManager();

	const renderer = new CanvasRenderer(canvas, assetsManager, screen);

	const cameraPosition = options?.camera?.position ?? Vec2.create();
	const cameraZoom = options?.camera?.zoom ?? 1;

	renderer.setCamera({
		position: cameraPosition,
		zoom: cameraZoom,
	});

	return { renderer, canvas, ctx, assetsManager, setImage };
}
