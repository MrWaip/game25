import { CameraTracking } from "@/games/jumper/components/cameraTrackingComponent";
import { Camera } from "@/components/cameraComponent";
import type { Component } from "@/components/component";
import { TransformComponent } from "@/components/transformComponent";
import { Vec2 } from "@/primitives/vec2-gl";
import type { Entity } from "@/entities/entity";

type Options = {
	position: Vec2;
	followFor?: Entity;
	highestY: number;
	zoom?: number;
};

export function createCamera(options: Options): Component[] {
	const transform = new TransformComponent(options.position);
	const camera = new Camera({
		zoom: options?.zoom,
	});

	return [
		transform,
		camera,
		new CameraTracking(options.highestY, options.followFor),
	];
}
