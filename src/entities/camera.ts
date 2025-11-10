import { Camera } from "../components/cameraComponent";
import type { Component } from "../components/component";
import { TransformComponent } from "../components/transformComponent";
import { Vec2 } from "../primitives/vec2-gl";
import type { Entity } from "./entity";

type Options = {
  position: Vec2;
  followFor?: Entity;
  viewportSize: Vec2;
  zoom?: number;
};

export function createCamera(options: Options): Component[] {
  const transform = new TransformComponent(options.position);
  const camera = new Camera({
    viewportSize: options.viewportSize,
    followFor: options.followFor,
    zoom: options?.zoom,
    highestY: options.viewportSize[1] / 2,
  });

  return [transform, camera];
}
