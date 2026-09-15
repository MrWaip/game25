import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { Selection } from "@/games/defense/interaction/state";
import type {
	ConstructionView,
	ConstructionAction,
	ActionView,
} from "@/games/defense/interaction/model";
import {
	towerDefinitions,
	towerKinds,
} from "@/games/defense/definitions/towers";
import { economy } from "@/games/defense/config";
import { grid, slotsFor, roadProgress } from "@/games/defense/board";
import { validPortalPair } from "@/games/defense/effects/portal";
import {
	isConstructionSite,
	quoteConstruction,
	quoteUpgrade,
	saleValue,
	canRelocate,
} from "@/games/defense/constructionRules";
import { waveAt } from "@/games/defense/waves";
import { enemyDefinitions } from "@/games/defense/definitions/enemies";

/** Internal projection: all decisions shared by the menu, input and board. */
export function present(
	state: DefenseSnapshot,
	selection: Selection,
	message: string,
): ConstructionView {
	const view = {
		...selection,
		kind: selection.mode === "build" ? selection.kind : null,
		entrance: selection.mode === "portalOut" ? selection.entrance : null,
	};
	const wave = waveAt(state.phase === "wave" ? state.wave : state.wave + 1);
	const actions: ActionView[] = [];
	const add = (
		label: string,
		id: ConstructionAction,
		disabled = false,
		tone: ActionView["tone"] = "normal",
	) => actions.push({ id, label, disabled, tone });
	const tower = state.towers.find((t) => t.slot === view.selected);
	let hint = "Выбери башню сверху, затем клетку.";
	if (view.mode === "build" && view.kind) {
		const definition = towerDefinitions[view.kind];
		hint = `${definition.title}: тап по пустой клетке строит за ${definition.cost}. Радиус ${definition.range / grid.cell} кл.`;
	} else if (view.mode === "snow") {
		hint = "Выбери центр снегопада. Круг показывает область замедления.";
		add("Разместить снег", "placeWorld", view.selected === null, "primary");
	} else if (view.mode === "portalIn") {
		hint =
			"Выбери ВХОД на дороге ближе к базе. Портал действует на маршруты через обе точки.";
		add(
			"Здесь вход →",
			"placeWorld",
			view.selected === null || roadProgress(state.map, view.selected) === null,
			"primary",
		);
	} else if (view.mode === "portalOut") {
		hint =
			"Выбери ВЫХОД раньше по пути, минимум на 3 клетки. Один перенос на врага.";
		add(
			"Связать портал",
			"placeWorld",
			view.entrance === null ||
				view.selected === null ||
				!validPortalPair(state.map, view.entrance, view.selected),
			"primary",
		);
		add("Выбрать другой вход", "portalBack");
	} else if (view.mode === "move") {
		hint =
			"Тапни клетку: свободная — перенос, занятая — обмен башен. Бесплатно.";
	} else if (view.mode === "replace" && tower) {
		hint = `Замена: вернём ${saleValue(tower)} монет (50% вложений). Новая башня — уровень 1.`;
	} else if (tower) {
		const definition = towerDefinitions[tower.kind];
		hint = `${definition.title} · ур. ${tower.level} · радиус ${definition.range / grid.cell} кл. ${definition.description}`;
		add(
			`Усилить · ${tower.level * economy.upgradeCost}`,
			"improve",
			!quoteUpgrade(state, tower.slot),
		);
		add(`Продать · +${saleValue(tower)}`, "sell", false, "danger");
	}

	if ((view.mode !== "inspect" || tower) && !state.pendingWorld)
		add("Закрыть", "cancel");
	const choices: ConstructionView["choices"] = towerKinds.map((kind) => {
		const definition = towerDefinitions[kind];
		const replacing = view.mode === "replace" && !!tower;
		const cost = definition.cost - (replacing ? saleValue(tower) : 0);
		return {
			kind,
			title: definition.title,
			glyph: definition.glyph,
			label: replacing
				? `${definition.title} · ${cost >= 0 ? `доплата ${cost}` : `возврат ${-cost}`}`
				: `${definition.title} · ${definition.cost}`,
			detail: `${cost < 0 ? "+" : ""}${Math.abs(cost)} ◈ · ${definition.range / grid.cell} кл.`,
			selected: view.kind === kind,
			disabled:
				state.phase !== "prepare" ||
				!!state.pendingWorld ||
				!["inspect", "build", "replace"].includes(view.mode) ||
				(replacing
					? !quoteConstruction(state, tower.slot, kind, true)
					: state.coins < definition.cost),
		};
	});
	const kind = view.kind ?? tower?.kind;
	const prepare = state.phase === "prepare";
	return {
		visible: prepare || state.phase === "wave",
		battle: state.phase === "wave",
		wave: {
			title: `${state.phase === "wave" ? "В БОЮ" : "ДАЛЬШЕ"} · ${wave.title} ⓘ`,
			description: wave.description,
			enemies: [...new Set(wave.enemies)].map(
				(kind) =>
					`${enemyDefinitions[kind].glyph} ${enemyDefinitions[kind].title}: ${enemyDefinitions[kind].description}`,
			),
		},
		hint:
			message ||
			(state.phase === "wave"
				? "Оборона работает · Значки рядом с врагами показывают их эффекты"
				: hint),
		actions: prepare ? actions : [],
		choices,
		launch: prepare
			? {
					id: "startWave",
					label: state.pendingWorld
						? "Сначала размести эффект мира"
						: `Начать волну ${state.wave + 1}`,
					disabled: state.pendingWorld !== null,
					tone: "primary",
				}
			: null,
		cells: slotsFor(state.map).map((_, cell) => {
			if (!prepare) return false;
			switch (selection.mode) {
				case "snow":
					return true;
				case "portalIn":
					return roadProgress(state.map, cell) !== null;
				case "portalOut":
					return validPortalPair(state.map, selection.entrance, cell);
				case "move":
					return canRelocate(state, selection.movingFrom, cell);
				default:
					return (
						state.towers.some((tower) => tower.slot === cell) ||
						isConstructionSite(
							state.map,
							cell,
							selection.mode === "build" ? selection.kind : undefined,
						)
					);
			}
		}),
		board: {
			placement:
				prepare && !state.pendingWorld && selection.mode === "build"
					? { kind: selection.kind, from: null }
					: prepare && selection.mode === "move" && tower
						? { kind: tower.kind, from: selection.movingFrom }
						: null,
			selected: view.selected,
			range:
				view.selected !== null && kind
					? { cell: view.selected, radius: towerDefinitions[kind].range }
					: null,
			snow:
				view.mode === "snow" && view.selected !== null
					? view.selected
					: state.snow,
			portalEntrance: view.entrance,
		},
	};
}
