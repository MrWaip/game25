import type { Upgrade } from "@/games/defense/config";
import type { UiNode } from "@/render/ui";
import { defenseTheme } from "@/games/defense/theme";

export const upgradeBadges: Record<Upgrade, string> = {
	shieldBurst: "ЩИТ ЛОПАЕТСЯ ВЗРЫВОМ",
	frostRelay: "МОРОЗ ПО ПЛОЩАДИ",
	conduction: "МАГИЧЕСКИЕ РИКОШЕТЫ",
	coldDeath: "ПЕРЕДАЧА ЗАМЕДЛЕНИЯ",
	snowfall: "ОБЛАСТЬ ЗАМЕДЛЕНИЯ",
	portal: "ВОЗВРАТ ВРАГОВ",
	chill: "+50% ПО ЗАМЕДЛЕННЫМ",
	shatter: "+12 УРОНА ВЗРЫВОМ",
	echo: "+50% ПОСЛЕ ПЕРЕНОСА",
	freeze: "УСИЛЕНИЕ СНЕГОПАДА",
	chain: "+1 ЦЕЛЬ",
	power: "+25% БАЗОВОГО УРОНА",
	haste: "+20% СКОРОСТИ АТАКИ",
};
export function upgradeAccent(key: Upgrade): string {
	if (["snowfall", "chill", "freeze", "frostRelay", "coldDeath"].includes(key))
		return defenseTheme.towers.frost;
	if (["portal", "echo", "conduction"].includes(key))
		return defenseTheme.towers.arcane;
	if (key === "shatter" || key === "shieldBurst")
		return defenseTheme.towers.blast;
	return defenseTheme.towers.rapid;
}
export function upgradePortrait(key: Upgrade): UiNode {
	return {
		kind: "drawing",
		height: 40,
		draw(ctx, rect) {
			const x = rect.x + rect.width / 2,
				y = rect.y + 20;
			ctx.strokeStyle = upgradeAccent(key);
			ctx.fillStyle = upgradeAccent(key);
			ctx.lineWidth = 2;
			const line = (a: number, b: number, c: number, d: number) => {
				ctx.beginPath();
				ctx.moveTo(x + a, y + b);
				ctx.lineTo(x + c, y + d);
				ctx.stroke();
			};
			const ring = (a: number, b: number, r: number) => {
				ctx.beginPath();
				ctx.arc(x + a, y + b, r, 0, Math.PI * 2);
				ctx.stroke();
			};
			if (
				["snowfall", "freeze", "chill", "frostRelay", "coldDeath"].includes(key)
			) {
				for (let i = 0; i < 6; i++) {
					const angle = (i * Math.PI) / 3;
					line(0, 0, Math.cos(angle) * 13, Math.sin(angle) * 13);
				}
				if (key === "coldDeath") {
					ring(-12, 10, 4);
					ring(12, 10, 4);
				}
				if (key === "freeze" || key === "frostRelay") ring(0, 0, 17);
				if (key === "chill") {
					line(5, -17, -2, -3);
					line(-2, -3, 7, 7);
				}
			} else if (key === "portal" || key === "echo") {
				ring(-6, 0, 10);
				ring(7, 0, 10);
				if (key === "echo") {
					line(-14, 15, 13, 15);
					line(13, 15, 7, 10);
				}
			} else if (key === "shatter" || key === "shieldBurst") {
				for (let i = 0; i < 7; i++) {
					const angle = (i * Math.PI * 2) / 7;
					line(
						Math.cos(angle) * 5,
						Math.sin(angle) * 5,
						Math.cos(angle) * 16,
						Math.sin(angle) * 16,
					);
				}
			} else if (key === "chain" || key === "conduction") {
				line(-12, 10, 0, -9);
				line(0, -9, 12, 10);
				ring(-12, 10, 4);
				ring(0, -9, 4);
				ring(12, 10, 4);
			} else if (key === "haste") {
				for (const a of [-10, 2]) {
					line(a, -12, a + 10, 0);
					line(a + 10, 0, a, 12);
				}
			} else {
				line(0, 14, 0, -14);
				line(0, -14, -10, -3);
				line(0, -14, 10, -3);
				line(-9, 15, 9, 15);
			}
		},
	};
}
