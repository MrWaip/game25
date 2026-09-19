import type { PaintContext } from "@/render/surface";
import { createPainter } from "@/render/painter";
import type { BoardScene, BadgeVisual } from "@/games/defense/render/scene";
import { defenseTheme, defensePaint } from "@/games/defense/theme";
const { units } = defenseTheme;

export function drawLabels(ctx: PaintContext, scene: BoardScene): void {
	const draw = createPainter(ctx, defensePaint);
	for (const label of scene.labels)
		draw.text(label.text, label.position, {
			style: "boardLabel",
			align: label.align,
		});
	for (const tower of scene.towers)
		drawBadges(draw, tower.position.x, tower.position.y - 22, tower.badges);
	for (const enemy of scene.enemies) {
		const { position: p, radius } = enemy;
		draw.rect(p.x - 13, p.y - radius - 12, 26, 4, { fill: units.healthTrack });
		draw.rect(p.x - 13, p.y - radius - 12, 26 * enemy.health, 4, {
			fill: units.health,
		});
		drawBadges(draw, p.x, p.y + radius + 11, enemy.badges);
		if (enemy.shieldLabel)
			draw.text(
				enemy.shieldLabel,
				{ x: p.x, y: p.y + radius + 29 },
				{ style: "timer" },
			);
	}
}
function drawBadges(
	draw: ReturnType<typeof createPainter<keyof typeof defensePaint>>,
	x: number,
	y: number,
	badges: readonly BadgeVisual[],
): void {
	for (const [index, badge] of badges.entries()) {
		const left = x - badges.length * 7 + index * 14;
		draw.rect(left, y - 7, 13, 13, {
			radius: 3,
			fill: units.badge,
			stroke: badge.color,
			lineWidth: 0.7,
		});
		draw.text(
			badge.icon,
			{ x: left + 6.5, y: y + 3 },
			{ style: "badge", color: badge.color },
		);
	}
}
