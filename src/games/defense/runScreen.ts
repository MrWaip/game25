import type { BattleSpeed, RelicId } from "./model";
import { Tween } from "@/render/ui/motion";
import { extensionHeight } from "./board";
import { placePopover } from "@/render/ui/popover";
import type { DefenseAssets } from "./assets";
import { BoardInput, type PlacementPreview } from "./boardInput";
import { createCanvas } from "@/render/canvas";
import type { UiNode } from "@/render/ui";
import { DefenseRenderer } from "./renderer";
import type { DefenseSession, DefenseSnapshot } from "./session";
import { towers, towerSalePrice } from "./definitions/towers";
import { contains } from "@/render/ui/types";
import { relics } from "./definitions/relics";
import {
	assaultProgress,
	levelDefinition,
	totalWaves,
} from "./definitions/campaign";
import { boardWidth, boardHeight, pointOnRoad } from "./board";
import { theme } from "./theme";
import { balance } from "./config";
import { builderStates, queued, type BuilderState } from "./builders";
import {
	ui,
	createPanels,
	portrait,
	action,
	card,
	placeholders,
	panel,
	relicArt,
	relicCard,
} from "./canvasUi";
import { rarityLooks, relicReadout, towerBuffs, towerStats } from "./relicView";
import { pathLengthFor } from "./board";
function region(className: string): HTMLDivElement {
	const node = document.createElement("div");
	node.className = className;
	return node;
}
export type Persistence = {
	onSave?: (saved: string) => void;
	onSaveError?: (error: unknown) => void;
};
export class RunScreen {
	speed: BattleSpeed = 1;
	private canvas = createCanvas();
	private assets: DefenseAssets;
	private renderer: DefenseRenderer;
	private input: BoardInput;
	private placement: PlacementPreview | null = null;
	private panels = createPanels();
	private hudRoot = region("td-hud");
	private hud = this.panels.mount(this.hudRoot);
	private scroll = region("td-scroll");
	private field = region("td-field");
	private trayRoot = region("td-tray");
	private tray = this.panels.mount(this.trayRoot, { touchAction: "none" });
	private overlayRoot = region("td-overlay");
	private overlay = this.panels.mount(this.overlayRoot);
	private detailRoot = region("td-detail");
	private detail = this.panels.mount(this.detailRoot);
	private warningRoot = region("td-warning");
	private warning = this.panels.mount(this.warningRoot);
	private errorRoot = region("td-save-error");
	private error = this.panels.mount(this.errorRoot);
	private selected: number | null = null;
	private selling = false;
	private saleRoot = region("td-sale");
	private sale = this.panels.mount(this.saleRoot);
	private specialization = false;
	/** Offer awaiting the relic it will replace once every slot is taken. */
	private pendingRelic: RelicId | null = null;
	private inspected: RelicId | null = null;
	private relicInfoRoot = region("td-relic-info");
	private relicInfo = this.panels.mount(this.relicInfoRoot);
	private paused = false;
	private key = "";
	private lastWave = 0;
	private displayedLevel = 0;
	private transition: {
		level: number;
		elapsed: number;
		approach: Tween;
		departure: Tween;
		oldTop: number;
	} | null = null;
	private readonly reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	private drawBoard(state: DefenseSnapshot) {
		const collapse = this.transition
			? {
					level: this.transition.level,
					progress: Math.max(
						0,
						Math.min(1, (this.transition.elapsed - 0.4) / 0.9),
					),
				}
			: null;
		const field = this.field.getBoundingClientRect(),
			view = this.scroll.getBoundingClientRect();
		const top = -(state.level - 1) * extensionHeight;
		const unit = (boardHeight - top) / Math.max(1, field.height);
		const visible = field.height
			? {
					top: top + (view.top - field.top) * unit - 4,
					bottom: top + (view.bottom - field.top) * unit + 4,
				}
			: null;
		this.renderer.draw(state, this.selected, this.placement, collapse, visible);
	}
	private lastPhase = "";
	private saveTime = 0;
	private timer = 0;
	private warningVisible = false;
	constructor(
		private root: HTMLElement,
		private session: DefenseSession,
		assets: DefenseAssets,
		private persistence: Persistence,
		private togglePause: () => void,
	) {
		this.assets = assets;
		for (const [name, value] of Object.entries(theme))
			root.style.setProperty(`--td-${name}`, value);
		this.renderer = new DefenseRenderer(this.canvas, assets);
		this.canvas.setAttribute("aria-label", "Поле обороны");
		this.field.append(this.canvas);
		this.scroll.append(this.field);
		this.overlayRoot.setAttribute("role", "dialog");
		this.overlayRoot.setAttribute("aria-label", "Выбор улучшения");
		this.overlayRoot.setAttribute("aria-modal", "true");
		root.append(
			this.scroll,
			this.hudRoot,
			this.warningRoot,
			this.trayRoot,
			this.detailRoot,
			this.overlayRoot,
			this.errorRoot,
			this.saleRoot,
			this.relicInfoRoot,
		);
		this.input = new BoardInput(this.field, this.scroll, assets, {
			state: () => session.snapshot(),
			saleContains: (x, y) =>
				!this.saleRoot.hidden &&
				contains(this.saleRoot.getBoundingClientRect(), x, y),
			selling: (slot, hovered) => {
				const tower = session
					.snapshot()
					.towers.find((tower) => tower.slot === slot);
				this.selling = !!tower;
				this.saleRoot.setAttribute(
					"aria-label",
					tower ? `Продать башню за ${towerSalePrice(tower)}` : "Продажа башни",
				);
				this.sale.update(
					tower
						? ui.column(
								[
									ui.text("🗑", { size: 24, align: "center" }),
									ui.text(`Продать · +${towerSalePrice(tower)}`, {
										size: 13,
										align: "center",
										color: theme.gold,
									}),
								],
								{
									padding: 8,
									gap: 3,
									background: hovered ? theme.raised : theme.panel,
									border: hovered ? theme.red : theme.border,
									radius: 10,
								},
							)
						: null,
				);
				if (tower) this.detail.update(null);
			},
			sell: (slot) =>
				this.perform(() => {
					if (session.sell(slot)) this.selected = null;
				}),
			select: (slot) => this.selectSite(slot),
			move: (from, to) =>
				this.perform(() => {
					if (session.relocate(from, to)) {
						this.selected = to;
					}
				}),
			preview: (value) => {
				this.placement = value;
				this.drawBoard(session.snapshot());
			},
			build: (slot, kind) =>
				this.perform(() => {
					if (session.build(slot, kind)) {
						this.selected = slot;
						this.specialization = false;
					}
				}),
		});
		this.scroll.onscroll = () => {
			this.updateWarning(this.session.snapshot());
			this.positionDetail();
		};
		this.root.addEventListener("click", this.dismissDetail);
		this.refresh();
	}
	private dismissDetail = (event: MouseEvent) => {
		if (
			!(event.target instanceof Element) ||
			event.target.closest(".td-site, .td-detail, .td-overlay")
		)
			return;
		if (this.selected === null) return;
		this.selected = null;
		this.placement = null;
		this.refresh();
	};
	private positionDetail() {
		if (this.detailRoot.hidden || this.selected === null) return;
		const anchor =
			this.field.querySelectorAll<HTMLElement>(".td-site")[this.selected];
		if (!anchor) return;
		const rect = anchor.getBoundingClientRect(),
			viewport = this.scroll.getBoundingClientRect();
		const visible = rect.bottom > viewport.top && rect.top < viewport.bottom;
		this.detailRoot.style.visibility = visible ? "visible" : "hidden";
		if (!visible) return;
		const origin = this.root.getBoundingClientRect();
		const point = placePopover(rect, viewport, {
			width: this.detailRoot.offsetWidth,
			height: this.detailRoot.offsetHeight,
		});
		this.detailRoot.style.left = `${point.x - origin.x}px`;
		this.detailRoot.style.top = `${point.y - origin.y}px`;
	}
	private perform(fn: () => unknown) {
		if (this.paused || this.transition) return;
		fn();
		this.persist();
		this.refresh();
	}
	private updateWarning(state: DefenseSnapshot) {
		const visible =
			this.scroll.scrollTop + this.scroll.clientHeight <
				this.field.clientHeight - 80 &&
			state.enemies.some((e) => pointOnRoad(e.distance, state.level).y > 400);
		if (visible === this.warningVisible) return;
		this.warningVisible = visible;
		this.warning.update(
			visible
				? action("base-warning", "⚠ К воротам", () => {
						this.scroll.scrollTop = this.scroll.scrollHeight;
					})
				: null,
		);
	}
	private updateSites(state: DefenseSnapshot, active: boolean) {
		const top = -(state.level - 1) * extensionHeight;
		this.field.style.aspectRatio = `${boardWidth} / ${boardHeight - top}`;
		this.field.querySelectorAll(".td-site").forEach((node) => node.remove());
		state.sites.forEach((point, index) => {
			const tower = state.towers.find((t) => t.slot === index),
				control = document.createElement("button");
			control.className = "td-site";
			control.type = "button";
			control.disabled = !active;
			control.style.left = `${(point.x / boardWidth) * 100}%`;
			control.style.top = `${((point.y - top) / (boardHeight - top)) * 100}%`;
			control.setAttribute(
				"aria-label",
				tower
					? `${towers[tower.kind].title} · уровень ${tower.level}${queued(state.towers, tower) ? " · в очереди" : tower.construction > 0 ? " · строится" : ""} · площадка ${index + 1}`
					: `Площадка ${index + 1}`,
			);
			control.setAttribute("aria-pressed", String(this.selected === index));
			control.style.touchAction = tower ? "none" : "pan-y";
			control.onclick = (event) => {
				if (tower && event.detail > 0) return;
				this.selectSite(index);
			};
			this.field.append(control);
		});
	}
	private selectSite(index: number) {
		this.perform(() => {
			this.selected = this.session
				.snapshot()
				.towers.some((tower) => tower.slot === index)
				? index
				: null;
			this.specialization = false;
			this.placement = null;
		});
	}
	private reward(state: DefenseSnapshot): UiNode {
		const full = state.relics.length >= balance.relicSlots;
		const pending = full ? this.pendingRelic : null;
		const cards = state.offers.map((id) =>
			relicCard(
				this.assets,
				relics[id],
				() =>
					this.perform(() => {
						if (full) {
							this.pendingRelic = this.pendingRelic === id ? null : id;
							return;
						}
						this.session.choose(id);
						this.selected = null;
					}),
				pending === id,
			),
		);
		const targets = pending
			? [
					ui.text(`Что выбросить ради «${relics[pending].title}»?`, {
						size: 12,
						align: "center",
						weight: 700,
						color: theme.gold,
					}),
					...state.relics.map((id) => {
						const relic = relics[id],
							readout = relicReadout(state, id);
						return ui.button({
							id: `discard-${id}`,
							label: `Выбросить: ${relic.title}`,
							description: relic.description,
							onPress: () =>
								this.perform(() => {
									this.session.choose(pending, id);
									this.pendingRelic = null;
									this.selected = null;
								}),
							style: {
								direction: "row",
								align: "center",
								gap: 8,
								padding: 6,
								background: theme.raised,
								border: rarityLooks[relic.rarity].frame,
								radius: 8,
							},
							children: [
								ui.column(
									[relicArt(this.assets, relic.sprite, relic.rarity, 36)],
									{ width: 40 },
								),
								ui.column(
									[
										ui.text(relic.title, { size: 12, weight: 800 }),
										ui.text(relic.description, {
											size: 10,
											lineHeight: 13,
											color: theme.muted,
										}),
										...(readout
											? [
													ui.text(readout, {
														size: 10,
														weight: 700,
														color: theme.gold,
													}),
												]
											: []),
									],
									{ gap: 1, grow: 1 },
								),
								ui.column(
									[
										ui.text("✕", {
											size: 16,
											weight: 800,
											align: "center",
											color: theme.red,
										}),
									],
									{ width: 20 },
								),
							],
						});
					}),
					action("keep", "Назад", () =>
						this.perform(() => {
							this.pendingRelic = null;
						}),
					),
				]
			: [];
		return panel(
			`Волна ${state.wave} отбита!`,
			[
				ui.text(
					full
						? "Слоты заняты: новая реликвия заменит одну из ваших"
						: "Выберите реликвию",
					{ size: 12, align: "center", weight: 700 },
				),
				...(cards.length
					? [ui.row([...cards, ...placeholders(3 - cards.length)], { gap: 8 })]
					: [
							ui.text("Все доступные реликвии собраны", {
								align: "center",
								size: 12,
							}),
						]),
				...targets,
				...(pending
					? []
					: [
							action("skip", cards.length ? "Пропустить" : "Продолжить", () =>
								this.perform(() => {
									this.pendingRelic = null;
									this.session.continue();
								}),
							),
						]),
			],
			true,
		);
	}
	private relicBar(state: DefenseSnapshot): UiNode {
		const size = 26;
		return ui.row(
			[
				...Array.from({ length: balance.relicSlots }, (_, index) => {
					const id = state.relics[index];
					if (!id)
						return ui.column([], {
							width: size,
							height: size,
							background: theme.raised,
							radius: 6,
						});
					const relic = relics[id];
					return ui.button({
						id: `relic-${index}`,
						label: `Реликвия: ${relic.title}`,
						description: relicReadout(state, id) ?? relic.description,
						pressed: this.inspected === id,
						onPress: () =>
							this.perform(() => {
								this.inspected = this.inspected === id ? null : id;
							}),
						style: {
							width: size,
							height: size,
							minHeight: size,
							padding: 0,
							background: theme.raised,
							border: rarityLooks[relic.rarity].frame,
							radius: 6,
						},
						children: [
							relicArt(this.assets, relic.sprite, relic.rarity, size - 4),
						],
					});
				}),
				ui.column([], { grow: 1 }),
				...builderStates(state.towers).map((builder, index) =>
					this.builderChip(builder, index),
				),
			],
			{ gap: 4, padding: 0, align: "center" },
		);
	}
	private builderChip(builder: BuilderState, index: number): UiNode {
		const busy = builder.slot !== null;
		const live = () =>
			builderStates(this.session.snapshot().towers)[index] ?? builder;
		const ring: UiNode = {
			kind: "drawing",
			height: 20,
			draw: (ctx, rect) => {
				const current = live();
				const x = rect.x + 10,
					y = rect.y + rect.height / 2;
				ctx.lineWidth = 2.5;
				ctx.strokeStyle = theme.shadow;
				ctx.beginPath();
				ctx.arc(x, y, 8, 0, Math.PI * 2);
				ctx.stroke();
				if (current.slot !== null) {
					ctx.strokeStyle = theme.gold;
					ctx.beginPath();
					ctx.arc(
						x,
						y,
						8,
						-Math.PI / 2,
						-Math.PI / 2 + Math.PI * 2 * current.progress,
					);
					ctx.stroke();
				} else {
					ctx.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() / 300);
					ctx.fillStyle = theme.gold;
					ctx.beginPath();
					ctx.arc(x, y, 8, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 1;
				}
				ctx.fillStyle = current.slot !== null ? theme.muted : theme.text;
				ctx.font = "700 10px system-ui, sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("⚒", x, y + 0.5);
			},
		};
		return ui.button({
			id: `builder-${index}`,
			label: busy
				? `Строитель ${index + 1}: площадка ${builder.slot + 1} · ${builder.seconds} с`
				: `Строитель ${index + 1}: свободен`,
			onPress: () =>
				this.perform(() => {
					if (builder.slot !== null) this.selected = builder.slot;
				}),
			style: {
				direction: "row",
				width: 56,
				height: 26,
				minHeight: 26,
				padding: 2,
				gap: 2,
				align: "center",
				background: theme.raised,
				border: busy ? theme.border : theme.gold,
				radius: 6,
			},
			children: [
				ui.column([ring], { width: 20 }),
				ui.text(busy ? `${builder.seconds} с` : "готов", {
					size: 9,
					maxLines: 1,
					weight: 700,
					color: busy ? theme.muted : theme.gold,
				}),
			],
		});
	}
	private relicDetails(state: DefenseSnapshot): UiNode | null {
		const id = this.inspected;
		if (!id || !state.relics.includes(id)) return null;
		const relic = relics[id],
			look = rarityLooks[relic.rarity],
			readout = relicReadout(state, id),
			index = state.relics.indexOf(id);
		const shift = (step: -1 | 1, label: string, icon: string) =>
			ui.button({
				id: `relic-shift-${step}`,
				label,
				icon,
				disabled: index + step < 0 || index + step >= state.relics.length,
				onPress: () => this.perform(() => this.session.shiftRelic(id, step)),
				style: {
					width: 32,
					minHeight: 32,
					padding: 2,
					radius: 6,
					background: theme.raised,
					border: theme.border,
				},
			});
		return ui.column(
			[
				ui.row(
					[
						ui.column([relicArt(this.assets, relic.sprite, relic.rarity, 48)], {
							width: 52,
						}),
						ui.column(
							[
								ui.text(look.label.toUpperCase(), {
									size: 9,
									weight: 800,
									color: look.frame,
								}),
								ui.text(relic.title, { size: 13, weight: 800 }),
								ui.text(relic.description, { size: 11, color: theme.muted }),
								...(readout
									? [
											ui.text(readout, {
												size: 12,
												weight: 700,
												color: theme.gold,
											}),
										]
									: []),
							],
							{ gap: 2, grow: 1 },
						),
					],
					{ gap: 8, align: "center" },
				),
				ui.row(
					[
						shift(-1, "Сдвинуть влево", "◀"),
						shift(1, "Сдвинуть вправо", "▶"),
						ui.column([], { grow: 1 }),
						ui.button({
							id: "relic-info",
							label: `Закрыть: ${relic.title}`,
							icon: "✕",
							onPress: () =>
								this.perform(() => {
									this.inspected = null;
								}),
							style: {
								width: 32,
								minHeight: 32,
								padding: 2,
								radius: 6,
								background: theme.raised,
								border: theme.border,
							},
						}),
					],
					{ gap: 6, align: "center" },
				),
			],
			{
				gap: 6,
				padding: 8,
				background: theme.panel,
				border: look.frame,
				radius: 10,
			},
		);
	}

	private refresh() {
		const state = this.session.snapshot();
		const assault =
			state.phase === "wave"
				? assaultProgress(state.wave, state.remaining)
				: null;
		if (
			this.displayedLevel &&
			state.level > this.displayedLevel &&
			!this.reducedMotion
		) {
			const addedHeight =
				((state.level - this.displayedLevel) *
					extensionHeight *
					this.field.clientWidth) /
				boardWidth;
			const oldTop = addedHeight;
			this.transition = {
				level: this.displayedLevel,
				elapsed: 0,
				oldTop,
				approach: new Tween(this.scroll.scrollTop + addedHeight, oldTop, 0.4),
				departure: new Tween(oldTop, 0, 1.4),
			};
			this.selected = null;
			this.placement = null;
		}
		if (state.level < this.displayedLevel) this.transition = null;
		if (state.level > this.displayedLevel && this.reducedMotion)
			this.scroll.scrollTop = 0;
		this.displayedLevel = state.level;
		// Building costs battle time, so the field is live only during a wave.
		const active = !this.paused && !this.transition && state.phase === "wave";

		this.hudRoot.setAttribute("role", "group");
		this.hudRoot.setAttribute(
			"aria-label",
			`Глава ${levelDefinition(state.level).chapter}: ${levelDefinition(state.level).title}`,
		);
		this.hud.update(
			ui.column(
				[
					ui.row(
						[
							ui.column(
								[
									ui.text(`♥ ${state.health}/${balance.health}`, {
										size: 13,
										weight: 800,
										color: theme.red,
									}),
								],
								{ width: 64 },
							),
							ui.column(
								[
									ui.text(`● ${state.coins}`, {
										size: 13,
										weight: 800,
										color: theme.gold,
									}),
								],
								{ width: 62 },
							),
							ui.column(
								[
									ui.text(
										`Глава ${levelDefinition(state.level).chapter} · ${levelDefinition(state.level).title}`,
										{
											size: 9,
											maxLines: 1,
											align: "right",
											color: theme.muted,
										},
									),
									ui.text(
										state.wave > totalWaves
											? `Волна ${state.wave}`
											: `Волна ${Math.max(1, state.wave)}/${totalWaves}`,
										{
											size: 12,
											weight: 600,
											align: "right",
										},
									),
								],
								{ gap: 1 },
							),
							ui.button({
								id: "speed",
								label: `Скорость боя ×${this.speed}`,
								icon: `×${this.speed}`,
								onPress: () => {
									this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
									this.refresh();
								},
								style: {
									width: 40,
									minHeight: 40,
									padding: 4,
									background: theme.raised,
								},
							}),
							ui.button({
								id: "pause",
								label: this.paused ? "Продолжить бой" : "Пауза боя",
								icon: this.paused ? "▶" : "Ⅱ",
								onPress: this.togglePause,
								style: {
									width: 40,
									minHeight: 40,
									padding: 6,
									background: theme.raised,
								},
							}),
						],
						{
							gap: 6,
							align: "center",
						},
					),
					this.relicBar(state),
				],
				{
					gap: 4,
					padding: 4,
					background: theme.panel,
					radius: 9,
				},
			),
		);
		this.relicInfo.update(this.relicDetails(state));
		this.relicInfoRoot.style.top = `${this.hudRoot.offsetTop + this.hudRoot.offsetHeight + 4}px`;
		this.updateSites(state, active);
		const build = Object.values(towers).map((definition) => {
			const kind = definition.id;
			return ui.button({
				id: `build-${kind}`,
				drag: this.input.dragTower(kind),
				label: `${definition.title} · ${definition.price}`,
				disabled: !active || state.coins < definition.price,
				onPress: () => {},
				description:
					state.phase === "wave"
						? `${definition.description} Перетащите на свободную площадку`
						: "Строить можно только во время волны",
				style: {
					width: 56,
					grow: 0,
					height: 64,
					background: theme.raised,
					border: theme.border,
					padding: 4,
					gap: 1,
					radius: 8,
				},
				children: [
					portrait(this.assets, definition.sprite, 38),
					ui.text(`● ${definition.price}`, {
						size: 11,
						color: theme.gold,
						align: "center",
					}),
				],
			});
		});
		this.tray.update(
			ui.row(
				[
					...build,
					ui.column([], { grow: 1 }),
					ui.button({
						id: "play",
						description: assault
							? `${assault.title} · Натиск ${assault.index}/${assault.total}`
							: undefined,
						label:
							state.phase === "ready"
								? "Плей"
								: state.phase === "wave"
									? "Идёт волна"
									: "Следующая волна",
						onPress: () =>
							this.perform(() => {
								this.selected = null;
								this.session.startWave();
							}),
						disabled:
							this.paused ||
							!!this.transition ||
							!(state.phase === "ready" || state.phase === "prepare"),
						style: {
							width: 112,
							grow: 0,
							minHeight: 64,
							padding: 6,
							radius: 8,
							background: theme.blue,
							border: theme.blueEdge,
							insetBorder: theme.blueHighlight,
						},
						children: [
							ui.row(
								[
									...(assault
										? []
										: [
												ui.column(
													[ui.text("▶", { size: 16, color: theme.white })],
													{
														width: 16,
														gap: 0,
													},
												),
											]),
									ui.column(
										[
											ui.text(
												state.phase === "ready"
													? "Начать волну"
													: state.phase === "wave"
														? assault!.title
														: "Следующая волна",
												{ size: 10, weight: 700, color: theme.white },
											),
											ui.text(
												assault
													? `Натиск ${assault.index}/${assault.total}`
													: `Волна ${Math.min(totalWaves, state.wave + 1)}/${totalWaves}`,
												{ size: 10, color: theme.blueCaption },
											),
										],
										{ gap: 3 },
									),
								],
								{ gap: 7, align: "center" },
							),
						],
					}),
				],
				{
					gap: 4,
					padding: 4,
					align: "center",
					background: theme.panel,
					radius: 10,
				},
			),
		);
		const tower = state.towers.find((t) => t.slot === this.selected);
		this.detail.update(null);
		this.overlay.update(null);
		if (
			active &&
			!this.selling &&
			!this.specialization &&
			this.selected !== null
		) {
			const controls: UiNode[] = [];
			let title = "";
			if (tower) {
				const definition = towers[tower.kind];
				title = queued(state.towers, tower)
					? `В очереди · строителей ${balance.builders}`
					: tower.construction > 0
						? `${tower.constructionKind === "build" ? "Строительство" : "Улучшение"} · ${Math.ceil(tower.construction)} с`
						: tower.level === 3
							? `${definition.title} · максимум`
							: "";
				if (tower.construction === 0) {
					const gate = pointOnRoad(pathLengthFor(state.level), state.level);
					const stats = towerStats(state, tower, state.sites, gate);
					const boosted = stats.damage !== stats.baseDamage;
					controls.push(
						ui.column(
							[
								ui.text(
									`Урон ${stats.damage}${boosted ? ` (база ${stats.baseDamage})` : ""}`,
									{
										size: 11,
										weight: 700,
										color: boosted ? theme.gold : theme.text,
									},
								),
								ui.text(
									`Перезарядка ${stats.interval} с${stats.interval !== stats.baseInterval ? ` (база ${stats.baseInterval})` : ""}`,
									{ size: 10, color: theme.muted },
								),
								...towerBuffs(state, tower, state.sites, gate).map((buff) =>
									ui.text(`✦ ${buff.label}`, { size: 10, color: theme.gold }),
								),
							],
							{ gap: 2, padding: 4 },
						),
					);
				}
				if (tower.level < 3 && tower.construction === 0)
					controls.push(
						ui.button({
							id: "improve",
							label:
								tower.level === 1
									? `Улучшить · ${definition.upgradePrice}`
									: `Специализация · ${definition.specializationPrice}`,
							onPress: () =>
								this.perform(() => {
									if (tower.level === 1) this.session.improve(tower.slot);
									else this.specialization = true;
								}),
							disabled:
								state.coins <
								(tower.level === 1
									? definition.upgradePrice
									: definition.specializationPrice),
							style: {
								padding: 4,
								minHeight: 30,
								radius: 6,
								background: theme.raised,
								border: theme.border,
							},
							textStyle: { size: 11, weight: 600 },
						}),
					);
			}
			this.detail.update(
				ui.column(
					[
						...(title
							? [
									ui.text(title, {
										size: 11,
										align: "center",
										color: theme.muted,
									}),
								]
							: []),
						...controls,
					],
					{
						padding: 6,
						gap: 4,
						background: theme.panel,
						border: theme.border,
						radius: 10,
					},
				),
			);
		}
		if (state.phase === "reward") this.overlay.update(this.reward(state));
		else if (this.specialization && tower && active) {
			const definition = towers[tower.kind];
			const choices = definition.specializations.map((branch) =>
				card(
					branch.id,
					branch.title,
					branch.description,
					portrait(this.assets, branch.sprite, 80),
					() =>
						this.perform(() => {
							if (this.session.specialize(tower.slot, branch.id))
								this.specialization = false;
						}),
					state.coins < definition.specializationPrice,
				),
			);
			this.overlay.update(
				panel("Специализация", [
					ui.text("Бой продолжается", {
						align: "center",
						size: 12,
						color: theme.muted,
					}),
					ui.row([...choices, ...placeholders(3 - choices.length)], { gap: 8 }),
					action("back", "Назад", () =>
						this.perform(() => {
							this.specialization = false;
						}),
					),
				]),
			);
		} else if (state.phase === "lost" || state.phase === "won")
			this.overlay.update(
				panel(state.phase === "won" ? "Ворота устояли!" : "Оборона пала", [
					portrait(this.assets, "gate", 100),
					ui.text(
						state.completedWaves > totalWaves
							? `Пройдено волн: ${state.completedWaves}`
							: `Пройдено волн: ${state.completedWaves} из ${totalWaves}`,
						{ align: "center", size: 15 },
					),
					...(state.phase === "won"
						? [
								ui.text("Оборона держится — волны продолжают идти.", {
									align: "center",
									size: 12,
									color: theme.muted,
								}),
								action("endless", "Продолжить забег", () =>
									this.perform(() => {
										this.session.startWave();
									}),
								),
							]
						: []),
					action("restart", "Новый забег", () =>
						this.perform(() => {
							this.session.restart();
							this.selected = null;
							this.specialization = false;
						}),
					),
				]),
			);
		const modal = !this.overlayRoot.hidden;
		this.field.inert = modal || !!this.transition;
		this.scroll.style.overflowY = this.transition ? "hidden" : "auto";
		if (this.transition)
			this.scroll.scrollTop =
				this.transition.elapsed < 0.4
					? this.transition.approach.value
					: this.transition.elapsed < 1.3
						? this.transition.oldTop
						: this.transition.departure.value;
		this.input.enabled = active && !modal;
		this.tray.enabled = !modal && !this.transition;
		this.detail.enabled = !modal;
		this.drawBoard(state);
		this.updateWarning(state);
		if (state.wave !== this.lastWave) {
			this.lastWave = state.wave;
			this.scroll.scrollTop = 0;
		}
		if (state.phase !== this.lastPhase) {
			this.lastPhase = state.phase;
			if (state.phase === "falling")
				this.scroll.scrollTop = this.scroll.scrollHeight;
		}
		this.positionDetail();
		this.key = this.uiKey(state);
	}
	private uiKey(state: DefenseSnapshot) {
		const assault =
			state.phase === "wave"
				? assaultProgress(state.wave, state.remaining).index
				: 0;
		const construction = state.towers
			.map((tower) => Math.ceil(tower.construction))
			.join(",");
		const buffs = state.towers
			.map((tower) => `${tower.rate}/${Math.ceil(tower.rushed)}`)
			.join(",");
		return `${assault}:${state.phase}:${state.wave}:${state.level}:${state.coins}:${state.health}:${state.towers.length}:${construction}:${this.paused}:${state.relics.join(",")}:${state.piggyCoins}:${state.towersBuilt}:${state.flyerKills}:${state.stunKills}:${state.ignites}:${buffs}:${this.inspected}:${this.pendingRelic}`;
	}
	advance(dt: number) {
		if (this.transition && !this.paused) {
			const transition = this.transition;
			transition.elapsed += dt;
			if (transition.elapsed <= 0.4)
				this.scroll.scrollTop = transition.approach.advance(dt);
			else if (transition.elapsed <= 1.3)
				this.scroll.scrollTop = transition.oldTop;
			else this.scroll.scrollTop = transition.departure.advance(dt);
			if (transition.departure.finished) {
				this.transition = null;
				this.scroll.scrollTop = 0;
				this.refresh();
			}
		}

		this.panels.advance(dt);
		this.positionDetail();
		this.timer += dt;
		this.saveTime += dt;
		if (this.timer >= 1 / 30) {
			this.timer = 0;
			const state = this.session.snapshot();
			if (this.key !== this.uiKey(state)) this.refresh();
			else {
				this.drawBoard(state);
				this.updateWarning(state);
			}
		}
		if (this.saveTime >= 3) {
			this.saveTime = 0;
			this.persist();
		}
	}
	sync(paused: boolean) {
		this.paused = paused;
		if (paused) this.session.pause();
		else this.session.resume();
		this.refresh();
	}
	persist() {
		try {
			this.persistence.onSave?.(this.session.save());
			this.error.update(null);
		} catch (error) {
			this.error.update(
				ui.text("Не удалось сохранить забег", { color: theme.red, size: 12 }),
			);
			this.persistence.onSaveError?.(error);
		}
	}
	destroy() {
		this.persist();
		this.input.destroy();
		this.panels.destroy();
		this.scroll.onscroll = null;
		this.root.removeEventListener("click", this.dismissDetail);
	}
}
