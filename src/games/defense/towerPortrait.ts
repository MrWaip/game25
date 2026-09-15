import type { TowerKind } from "@/games/defense/config";
import { defenseTheme } from "@/games/defense/theme";
import type { UiNode } from "@/render/ui";

/** Small, code-drawn portraits keep tower cards sharp on phone screens. */
export function towerPortrait(kind: TowerKind): UiNode {
	return {
		kind: "drawing",
		height: 30,
		draw(ctx, rect) {
			const x = rect.x + rect.width / 2,
				y = rect.y;
			const color = defenseTheme.towers[kind];
			const palette = defenseTheme.units;
			const box = (
				left: number,
				top: number,
				width: number,
				height: number,
				fill: string,
				radius = 3,
			) => {
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.roundRect(x + left, y + top, width, height, radius);
				ctx.fill();
			};
			const circle = (
				left: number,
				top: number,
				radius: number,
				fill: string,
			) => {
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.arc(x + left, y + top, radius, 0, Math.PI * 2);
				ctx.fill();
			};
			box(-17, 24, 34, 5, palette.shadow);
			box(-13, 19, 26, 8, palette.towerBody);
			box(-11, 19, 22, 4, color);
			if (kind === "rapid") {
				box(-7, 9, 14, 13, color);
				box(-5, 1, 4, 15, color, 1);
				box(2, 1, 4, 15, color, 1);
				box(-5, 1, 4, 3, palette.shatter, 1);
				box(2, 1, 4, 3, palette.shatter, 1);
				box(-4, 16, 8, 4, palette.towerBody, 1);
			} else if (kind === "blast") {
				circle(0, 12, 11, color);
				circle(0, 9, 7, palette.towerBody);
				circle(0, 8, 3, palette.shadow);
				box(-14, 18, 6, 8, color, 2);
				box(8, 18, 6, 8, color, 2);
			} else if (kind === "frost") {
				box(-4, 10, 8, 14, color);
				ctx.strokeStyle = color;
				ctx.lineWidth = 3;
				for (let i = 0; i < 6; i++) {
					const angle = (i * Math.PI) / 3;
					ctx.beginPath();
					ctx.moveTo(x, y + 10);
					ctx.lineTo(x + Math.cos(angle) * 11, y + 10 + Math.sin(angle) * 9);
					ctx.stroke();
				}
				circle(0, 10, 3, palette.shatter);
			} else {
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + 10, y + 12);
				ctx.lineTo(x, y + 23);
				ctx.lineTo(x - 10, y + 12);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = palette.shatter;
				ctx.beginPath();
				ctx.moveTo(x, y + 3);
				ctx.lineTo(x + 3, y + 12);
				ctx.lineTo(x, y + 19);
				ctx.lineTo(x - 3, y + 12);
				ctx.closePath();
				ctx.fill();
			}
		},
	};
}
