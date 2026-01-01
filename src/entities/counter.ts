import type { Component } from "../components/component";
import { CounterComponent } from "../components/counterComponent";
import { TransformComponent } from "../components/transformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { TextRenderComponent } from "../components/textRenderComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

export function createCounter(viewportSize: Vec2): Component[] {
	const transform = new TransformComponent(
		Vec2.fromValues(30, viewportSize[1] - 20),
	);
	const counter = new CounterComponent();
	const render = new TextRenderComponent({
		text: [[""]],
		static: true,
		fontSize: 24,
	});

	const layer = new RenderLayerComponent(RenderLayers.UI);

	return [counter, render, transform, layer];
}
