import { isChilled } from "@/games/defense/worldRules";
import { gridFor, slotsFor, isBuildable } from "@/games/defense/board";
import {
	canRelocate,
	isConstructionSite,
	quoteConstruction,
} from "@/games/defense/constructionRules";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";
import { snowRadius } from "@/games/defense/effects/snow";
import { portalRules } from "@/games/defense/effects/portal";
import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import { towerDefinitions } from "@/games/defense/definitions/towers";
import { enemyStatuses, towerStatuses } from "@/games/defense/statusView";
import { defenseTheme } from "@/games/defense/theme";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";
import type {
	BoardScene,
	LabelVisual,
	PortalVisual,
	SegmentVisual,
} from "@/games/defense/render/scene";
import { worldPoint } from "@/render/projection";

/** All game decisions are resolved here, before a painter gets any data. */
export function prepareBoardScene(
	state: DefenseSnapshot,
	view: BoardPreview,
): BoardScene {
	const grid = gridFor(state.map);
	const slots = slotsFor(state.map).map((p) => worldPoint(p.x, p.y));
	const build = buildModifiers(state.bonuses);
	const occupied = new Set(state.towers.map((tower) => tower.slot));
	const cells: BoardScene["cells"][number][] = [];
	for (const [index, position] of slots.entries()) {
		if (!isBuildable(state.map, index)) continue;
		cells.push({
			position,
			tone:
				!isConstructionSite(state.map, index) && !occupied.has(index)
					? "quiet"
					: index % 3 === 0
						? "accent"
						: "normal",
		});
	}
	const roads: SegmentVisual[] = [];
	const edges = new Set<string>();
	for (const route of state.map.paths)
		for (let i = 1; i < route.length; i++) {
			const a = route[i - 1],
				b = route[i];
			const key = `${a.x},${a.y}:${b.x},${b.y}`;
			if (edges.has(key)) continue;
			edges.add(key);
			roads.push({ from: worldPoint(a.x, a.y), to: worldPoint(b.x, b.y) });
		}
	const portals: PortalVisual[] = [];
	if (state.portal) {
		portals.push({
			position: slots[state.portal.entrance],
			role: "entrance",
			ready: state.portal.cooldown <= 0,
			progress: 1 - Math.min(1, state.portal.cooldown / portalRules.cooldown),
		});
		portals.push({
			position: slots[state.portal.exit],
			role: "exit",
			ready: true,
			progress: 1,
		});
	}
	if (view.portalEntrance !== null)
		portals.push({
			position: slots[view.portalEntrance],
			role: "entrance",
			ready: true,
			progress: 1,
		});
	const label = (
		x: number,
		y: number,
		text: string,
		align: LabelVisual["align"],
	): LabelVisual => {
		if (
			portals.some(
				({ position: p }) => Math.abs(p.x - x) < 24 && Math.abs(p.y - y) < 24,
			)
		) {
			align = x < grid.width / 2 ? "left" : "right";
			x += x < grid.width / 2 ? 26 : -26;
		}
		return { position: worldPoint(x, y), text, align };
	};
	const labels = [...new Set(state.map.paths.map((path) => path[0].x))].map(
		(x) => label(x, 14, "↓ ВХОД", x < grid.width / 2 ? "left" : "right"),
	);
	labels.push(
		label(state.map.paths[0].at(-1)!.x, grid.height - 11, "БАЗА ↓", "center"),
	);
	const placement: BoardScene["placement"][number][] = [];
	if (view.placement && state.phase === "prepare" && !state.pendingWorld) {
		const preview = view.placement;
		for (const [cell, position] of slots.entries()) {
			const hover = preview.hover === cell;
			if (!hover && !isBuildable(state.map, cell)) continue;
			placement.push({
				position,
				hover,
				allowed:
					preview.from === null
						? !!quoteConstruction(state, cell, preview.kind)
						: canRelocate(state, preview.from, cell),
			});
		}
	}
	return {
		grid,
		time: state.elapsed,
		cells,
		roads,
		links: state.towers
			.filter((t) => t.kind === "amplifier")
			.flatMap((source) =>
				state.towers
					.filter(
						(t) =>
							t.kind !== "amplifier" &&
							Math.hypot(
								slots[t.slot].x - slots[source.slot].x,
								slots[t.slot].y - slots[source.slot].y,
							) <= 110,
					)
					.map((t) => ({ from: slots[source.slot], to: slots[t.slot] })),
			),
		snow:
			view.snow === null
				? null
				: { position: slots[view.snow], radius: snowRadius(build) },
		range: view.range
			? { position: slots[view.range.cell], radius: view.range.radius }
			: null,
		auras: state.enemies.flatMap((enemy) => {
			const aura = enemyDefinitions[enemy.kind].speedAura;
			return aura
				? [{ position: worldPoint(enemy.x, enemy.y), radius: aura.radius }]
				: [];
		}),
		portalLink: state.portal
			? { from: slots[state.portal.entrance], to: slots[state.portal.exit] }
			: null,
		portals,
		towers: state.towers.map((tower) => ({
			position: slots[tower.slot],
			color: defenseTheme.towers[tower.kind],
			glyph: towerDefinitions[tower.kind].glyph,
			level: tower.level,
			form: tower.kind,
			boosted: state.towers.some(
				(source) =>
					source.kind === "amplifier" &&
					tower.kind !== "amplifier" &&
					Math.hypot(
						slots[source.slot].x - slots[tower.slot].x,
						slots[source.slot].y - slots[tower.slot].y,
					) <= 110,
			),
			overdrive: tower.overdrive,
			badges: towerStatuses(state, tower, build).map((badge) => ({ ...badge })),
		})),
		enemies: state.enemies.map((enemy) => ({
			position: worldPoint(enemy.x, enemy.y),
			color: defenseTheme.enemies[enemy.kind],
			glyph: enemyDefinitions[enemy.kind].glyph,
			radius: enemyDefinitions[enemy.kind].radius,
			teleported: enemy.teleported,
			shield: enemy.shield,
			chilled: isChilled(state, enemy, build),
			corrosion: enemy.corrosion,
			charge: enemy.charge,
			armor: enemyDefinitions[enemy.kind].resistance.physical > enemy.corrosion,
			health: Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)),
			badges: enemyStatuses(state, enemy, build).map((badge) => ({ ...badge })),
			shieldLabel: enemyDefinitions[enemy.kind].shieldRefresh
				? `ЩИТ ${Math.ceil(enemy.shieldTimer)}с`
				: null,
		})),
		shots:
			state.phase !== "wave"
				? []
				: state.towers.flatMap((tower) =>
						(tower.shots ?? []).map((shot) => ({
							from: slots[tower.slot],
							to: worldPoint(shot.x, shot.y),
							color:
								shot.effect === "shatter"
									? defenseTheme.units.shatter
									: defenseTheme.towers[tower.kind],
							alpha: Math.min(1, shot.life * 5),
							style: shot.effect ?? "shot",
							blastRadius:
								shot.effect === "blast" || shot.effect === "shatter"
									? 12 + Math.max(0, 0.4 - shot.life) * 130
									: null,
							shatter: shot.effect === "shatter",
						})),
					),
		labels,
		placement,
		selected: view.selected === null ? null : slots[view.selected],
	};
}
