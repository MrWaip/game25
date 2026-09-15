import { FPSComponent } from "@/games/jumper/components/fpsComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { JumperSystem } from "@/games/jumper/world";
import { TextRenderComponent } from "@/components/textRenderComponent";

export class FPSSystem implements JumperSystem {
	update(world: JumperWorld, dt: number): void {
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
