import { ColliderComponent } from "../components/colliderComponent";
import type { Component } from "../components/component";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { TransformComponent } from "../components/transformComponent";
import { PrimitiveRenderComponent } from "../components/renderableComponent";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";

type Options = {
  size: Vec2;
  position: Vec2;
};

export function createRectangle({ size, position }: Options): Component[] {
  const transform = new TransformComponent(position);
  const render = new PrimitiveRenderComponent(
    "black",
    "rect",
    size,
    Vec2.create(),
    true,
  );

  const collider = new ColliderComponent({ size });

  const renderLayer = new RenderLayerComponent(RenderLayers.World);

  return [transform, collider, render, renderLayer];
}
