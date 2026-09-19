import type { PaintContext } from "@/render/surface";
import { createPainter } from "@/render/painter";
import type { BoardScene } from "@/games/defense/render/scene";
import { drawPortal } from "@/games/defense/render/portal";
import { defenseTheme, defensePaint } from "@/games/defense/theme";
const { units } = defenseTheme;

export function drawObjects(ctx: PaintContext, scene: BoardScene): void {
	const draw = createPainter(ctx, defensePaint);
	for (const portal of scene.portals) drawPortal(ctx, portal, scene.time);
	for (const tower of scene.towers) {
		const { position: p, color } = tower;
		if (tower.boosted || tower.overdrive > 0) {
			ctx.globalAlpha = tower.overdrive > 0 ? 0.7 : 0.3;
			draw.circle(p, 22 + Math.sin(scene.time * 8) * 2, {
				stroke: color,
				lineWidth: tower.overdrive > 0 ? 3 : 1,
			});
			ctx.globalAlpha = 1;
		}
		draw.ellipse({ x: p.x, y: p.y + 13 }, 19, 8, { fill: units.shadow });
		draw.rect(p.x - 16, p.y - 17, 32, 32, {
			radius: 7,
			fill: units.towerBody,
			stroke: color,
			lineWidth: 2,
		});
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = 2;
		switch (tower.form) {
			case "rapid":
				draw.rect(p.x - 8, p.y - 4, 16, 16, { radius: 3, fill: color });
				for (const x of [-5, 3])
					draw.rect(p.x + x, p.y - 15, 3, 15, { radius: 1, fill: color });
				draw.rect(p.x - 4, p.y + 5, 8, 4, { fill: units.towerBody });
				break;
			case "blast":
				draw.circle(p, 12, { fill: color });
				draw.circle({ x: p.x, y: p.y - 4 }, 8, { fill: units.towerBody });
				draw.circle({ x: p.x, y: p.y - 5 }, 4, { fill: units.shadow });
				break;
			case "frost":
				for (let i = 0; i < 6; i++) {
					const angle = (Math.PI * i) / 3;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y);
					ctx.lineTo(p.x + Math.cos(angle) * 13, p.y + Math.sin(angle) * 13);
					ctx.stroke();
				}
				draw.circle(p, 4, { fill: units.shatter });
				break;
			case "arcane":
				ctx.beginPath();
				ctx.moveTo(p.x, p.y - 15);
				ctx.lineTo(p.x + 10, p.y);
				ctx.lineTo(p.x, p.y + 13);
				ctx.lineTo(p.x - 10, p.y);
				ctx.closePath();
				ctx.fill();
				draw.circle(p, 3, { fill: units.shatter });
				break;
			case "corrode":
				draw.rect(p.x - 3, p.y - 14, 6, 8, { fill: color });
				draw.circle({ x: p.x, y: p.y + 2 }, 10, {
					stroke: color,
					lineWidth: 2,
				});
				draw.ellipse({ x: p.x, y: p.y + 5 }, 7, 4, { fill: color });
				draw.circle({ x: p.x + 2, y: p.y }, 2, { fill: units.shatter });
				break;
			case "amplifier":
				draw.circle(p, 12, { stroke: color, lineWidth: 2 });
				draw.circle(p, 7, { stroke: color, lineWidth: 2 });
				draw.circle(p, 3, { fill: units.shatter });
				for (const dx of [-12, 12])
					draw.rect(p.x + dx - 2, p.y - 13, 4, 25, { radius: 2, fill: color });
				break;
		}
		for (let i = 0; i < Math.min(tower.level, 6); i++)
			draw.rect(p.x - Math.min(tower.level, 6) * 3 + i * 6, p.y + 18, 4, 3, {
				fill: color,
			});
	}
	for (const enemy of scene.enemies) {
		const { position: p, radius } = enemy;
		draw.ellipse({ x: p.x, y: p.y + radius }, radius, 4, {
			fill: units.shadow,
		});
		draw.circle(p, radius, { fill: enemy.color });
		if (enemy.armor)
			draw.rect(p.x - radius, p.y - radius, radius * 2, radius * 2, {
				radius: 3,
				stroke: defenseTheme.statuses.armor,
				lineWidth: 2,
			});
		if (enemy.chilled) {
			ctx.globalAlpha = 0.7;
			draw.circle(p, radius + 2, {
				stroke: defenseTheme.statuses.cold,
				lineWidth: 3,
			});
			for (let i = 0; i < 6; i++) {
				const a = (i * Math.PI) / 3;
				ctx.strokeStyle = defenseTheme.units.shatter;
				ctx.beginPath();
				ctx.moveTo(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius);
				ctx.lineTo(
					p.x + Math.cos(a) * (radius + 5),
					p.y + Math.sin(a) * (radius + 5),
				);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		}
		if (enemy.corrosion > 0) {
			ctx.strokeStyle = defenseTheme.towers.corrode;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(p.x - radius, p.y - radius);
			ctx.lineTo(p.x + 2, p.y - 2);
			ctx.lineTo(p.x - 3, p.y + 3);
			ctx.lineTo(p.x + radius, p.y + radius);
			ctx.stroke();
		}
		for (let i = 0; i < enemy.charge; i++)
			draw.circle({ x: p.x - 6 + i * 4, y: p.y - radius - 6 }, 1.5, {
				fill: defenseTheme.units.shatter,
			});
		draw.text(
			enemy.glyph,
			{ x: p.x, y: p.y + 4 },
			{ style: "enemyGlyph", font: `bold ${radius + 3}px sans-serif` },
		);
		if (enemy.teleported)
			draw.circle(p, radius + 3, { stroke: units.teleported, lineWidth: 2 });
		for (let i = 0; i < enemy.shield; i++)
			draw.arc(p, radius + 6, (i * Math.PI) / 2, (i * Math.PI) / 2 + 1.1, {
				stroke: units.shield,
				lineWidth: 3,
			});
	}
}
