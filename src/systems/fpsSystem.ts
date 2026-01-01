import { FPSComponent } from "../components/fpsComponent";
import type { World } from "../core/world";
import type { ISystem } from "./system";
import { TextRenderComponent } from "../components/textRenderComponent";

export class FPSSystem implements ISystem {
	update(world: World, dt: number): void {
		for (const {
			components: [fps, render],
		} of world.query(FPSComponent, TextRenderComponent)) {
			const previousFPS = fps.fps;
			fps.update(dt);

			if (fps.fps !== previousFPS) {
				render.text = [["FPS"], [fps.fps.toString()]];
			}
		}
	}
}
