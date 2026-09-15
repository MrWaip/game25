import { defenseTheme } from "@/games/defense/theme";
const { units } = defenseTheme;
import { slotsFor } from "@/games/defense/board";
import { towerDefinitions } from "@/games/defense/definitions/towers";
import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";
import {
	enemyStatuses,
	towerStatuses,
	type StatusBadge,
} from "@/games/defense/statusView";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";

export function drawUnits(
	ctx: CanvasRenderingContext2D,
	state: DefenseSnapshot,
	view: BoardPreview,
): void {
	const build = buildModifiers(state.bonuses);
	const slots = slotsFor(state.map);
	if (view.range) {
		const position = slots[view.range.cell];
		ctx.beginPath();
		ctx.arc(position.x, position.y, view.range.radius, 0, Math.PI * 2);
		ctx.fillStyle = units.rangeFill;
		ctx.fill();
		ctx.strokeStyle = units.rangeEdge;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
	for (const tower of state.towers) {
		const position = slots[tower.slot],
			definition = towerDefinitions[tower.kind];
		ctx.fillStyle = units.shadow;
		ctx.beginPath();
		ctx.ellipse(position.x, position.y + 13, 19, 8, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = units.towerBody;
		ctx.strokeStyle = defenseTheme.towers[tower.kind];
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(position.x - 16, position.y - 17, 32, 32, 7);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = defenseTheme.towers[tower.kind];
		ctx.font = "bold 22px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(definition.glyph, position.x, position.y + 6);
		for (let i = 0; i < tower.level; i++)
			ctx.fillRect(position.x - tower.level * 3 + i * 6, position.y + 18, 4, 3);
		drawBadges(
			ctx,
			position.x,
			position.y - 22,
			towerStatuses(state, tower, build),
		);
		if (state.phase !== "wave") continue;
		for (const shot of tower.shots ?? []) {
			const shatter = shot.effect === "shatter";
			ctx.globalAlpha = Math.min(1, shot.life * 8);
			ctx.strokeStyle = shatter
				? units.shatter
				: defenseTheme.towers[tower.kind];
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(position.x, position.y);
			ctx.lineTo(shot.x, shot.y);
			ctx.stroke();
			if (shot.effect === "blast" || shatter) {
				const radius = 12 + (0.24 - shot.life) * 130;
				ctx.beginPath();
				ctx.arc(shot.x, shot.y, radius, 0, Math.PI * 2);
				ctx.stroke();
				if (shatter)
					for (let i = 0; i < 6; i++) {
						const angle = (i * Math.PI) / 3;
						ctx.beginPath();
						ctx.moveTo(
							shot.x + Math.cos(angle) * radius,
							shot.y + Math.sin(angle) * radius,
						);
						ctx.lineTo(
							shot.x + Math.cos(angle) * (radius + 8),
							shot.y + Math.sin(angle) * (radius + 8),
						);
						ctx.stroke();
					}
			}
			ctx.globalAlpha = 1;
		}
	}
	for (const enemy of state.enemies) {
		const definition = enemyDefinitions[enemy.kind],
			radius = definition.radius;
		if (definition.speedAura) {
			ctx.beginPath();
			ctx.arc(enemy.x, enemy.y, definition.speedAura.radius, 0, Math.PI * 2);
			ctx.fillStyle = units.auraFill;
			ctx.fill();
			ctx.strokeStyle = units.auraEdge;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		ctx.fillStyle = defenseTheme.enemies[enemy.kind];
		ctx.beginPath();
		ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = units.enemyGlyph;
		ctx.font = `bold ${radius + 3}px sans-serif`;
		ctx.textAlign = "center";
		ctx.fillText(definition.glyph, enemy.x, enemy.y + 4);
		if (enemy.teleported) {
			ctx.strokeStyle = units.teleported;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(enemy.x, enemy.y, radius + 3, 0, Math.PI * 2);
			ctx.stroke();
		}
		for (let i = 0; i < enemy.shield; i++) {
			ctx.strokeStyle = units.shield;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(
				enemy.x,
				enemy.y,
				radius + 6,
				(i * Math.PI) / 2,
				(i * Math.PI) / 2 + 1.1,
			);
			ctx.stroke();
		}
		ctx.fillStyle = units.healthTrack;
		ctx.fillRect(enemy.x - 13, enemy.y - radius - 12, 26, 4);
		ctx.fillStyle = units.health;
		ctx.fillRect(
			enemy.x - 13,
			enemy.y - radius - 12,
			26 * Math.max(0, enemy.hp / enemy.maxHp),
			4,
		);
		drawBadges(
			ctx,
			enemy.x,
			enemy.y + radius + 11,
			enemyStatuses(state, enemy, build),
		);
		if (definition.shieldRefresh) {
			ctx.fillStyle = units.timer;
			ctx.font = "9px sans-serif";
			ctx.fillText(
				`ЩИТ ${Math.ceil(enemy.shieldTimer)}с`,
				enemy.x,
				enemy.y + radius + 29,
			);
		}
	}
}
function drawBadges(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	badges: StatusBadge[],
): void {
	for (const [index, badge] of badges.entries()) {
		const left = x - badges.length * 7 + index * 14;
		ctx.fillStyle = units.badge;
		ctx.strokeStyle = badge.color;
		ctx.lineWidth = 0.7;
		ctx.beginPath();
		ctx.roundRect(left, y - 7, 13, 13, 3);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = badge.color;
		ctx.textAlign = "center";
		ctx.font = "bold 10px sans-serif";
		ctx.fillText(badge.icon, left + 6.5, y + 3);
	}
}
