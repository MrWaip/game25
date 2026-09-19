import { createMockCanvas } from "@/testkit/canvas";
import { vi } from "vite-plus/test";
import { CanvasRenderer } from "@/render/renderer";
import type { AssetsManager } from "@/core/assetsManager";
import { Vec2 } from "@/primitives/vec2-gl";
import { Screen } from "@/core/screen";

export function createMockImageBitmap(): ImageBitmap {
	return {
		width: 100,
		height: 100,
		close: vi.fn(),
	} as unknown as ImageBitmap;
}

export function createMockAssetsManager(): {
	assetsManager: Pick<AssetsManager, "getImage">;
	setImage: (name: string, image: ImageBitmap) => void;
} {
	const images = new Map<string, ImageBitmap>();
	return {
		assetsManager: {
			getImage(name) {
				const image = images.get(name);
				if (!image) throw new Error(`Missing test image: ${name}`);
				return image;
			},
		},
		setImage: (name, image) => {
			images.set(name, image);
		},
	};
}

export function createTestRenderer(options?: {
	pixelRatio?: number;
	viewportSize?: Vec2;
	camera?: {
		position?: Vec2;
		orthographicSize?: number;
		zoom?: number;
	};
}): {
	renderer: CanvasRenderer;
	camera: { position: Vec2; zoom: number };
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	assetsManager: Pick<AssetsManager, "getImage">;
	image: ImageBitmap;
	setImage: (name: string, image: ImageBitmap) => void;
} {
	const viewportSize = options?.viewportSize ?? Vec2.fromValues(800, 600);
	const orthographicSize =
		options?.camera?.orthographicSize ?? viewportSize[1] / 2;
	const screen = new Screen(
		viewportSize,
		options?.pixelRatio ?? 1,
		orthographicSize,
	);
	const { canvas, ctx } = createMockCanvas();
	const { assetsManager, setImage } = createMockAssetsManager();
	const image = createMockImageBitmap();
	setImage("test", image);

	const renderer = new CanvasRenderer(canvas, assetsManager, screen);

	const cameraPosition = options?.camera?.position ?? Vec2.create();
	const cameraZoom = options?.camera?.zoom ?? 1;

	const camera = { position: cameraPosition, zoom: cameraZoom };

	return { renderer, camera, canvas, ctx, assetsManager, setImage, image };
}
