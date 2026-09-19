import type { PaintContext } from "@/render/surface";
import type { BoardScene } from "@/games/defense/render/scene";
import { drawTerrain } from "@/games/defense/render/terrain";
import { drawZones } from "@/games/defense/render/zones";
import { drawObjects } from "@/games/defense/render/objects";
import { drawEffects } from "@/games/defense/render/effects";
import { drawLabels } from "@/games/defense/render/labels";
import { drawSelection } from "@/games/defense/render/placement";

// All objects finish before any effects; all labels finish before selection.
const passes = [
	drawTerrain,
	drawZones,
	drawObjects,
	drawEffects,
	drawLabels,
	drawSelection,
] as const;
export function paintBoard(ctx: PaintContext, scene: BoardScene): void {
	for (const paint of passes) {
		ctx.save();
		ctx.beginPath();
		try {
			paint(ctx, scene);
		} finally {
			ctx.restore();
		}
	}
}
