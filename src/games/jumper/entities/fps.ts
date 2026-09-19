import { jumperTheme } from "@/games/jumper/theme";
import type { Component } from "@/components/component";
import { FPSComponent } from "@/games/jumper/components/fpsComponent";
import { TransformComponent } from "@/components/transformComponent";
import { RenderLayerComponent } from "@/components/renderLayerComponent";
import { TextRenderComponent } from "@/components/textRenderComponent";
import { Vec2 } from "@/primitives/vec2-gl";
import { RenderLayers } from "@/render/layers";

export function createFPS(viewportSize: Vec2): Component[] {
	const transform = new TransformComponent(
		Vec2.fromValues(viewportSize[0] - 70, 20),
	);
	const fps = new FPSComponent();
	const render = new TextRenderComponent({
		text: [["FPS"], ["0"]],
		static: true,
		fontSize: 24,
		color: jumperTheme.fps,
	});

	const layer = new RenderLayerComponent(RenderLayers.UI);

	return [fps, render, transform, layer];
}
