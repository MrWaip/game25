import type { Component } from "../components/component";
import { TransformComponent } from "../components/transformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { SpriteRenderComponent } from "../components/spriteRenderComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

export function createBackground(size: Vec2): Component[] {
  const transform = new TransformComponent(Vec2.create());

  const offset = Vec2.create();
  Vec2.scale(offset, size, 0.5);
  const render = new SpriteRenderComponent({
    name: "ozonBg",
    size,
    offset,
    spriteOffset: Vec2.create(),
    spriteSize: Vec2.fromValues(1248, 832),
    static: true,
  });

  const layer = new RenderLayerComponent(RenderLayers.Background);

  return [transform, render, layer];
}
