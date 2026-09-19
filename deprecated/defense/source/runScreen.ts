import { BattleAudio } from "@/games/defense/battleAudio";
import { StrategyScreen } from "@/games/defense/strategyScreen";
import { createCanvas } from "@/render/canvas";
import { BoardInput } from "@/games/defense/boardInput";
import { applyTheme } from "@/ui/theme";
import type { DefenseSession } from "@/games/defense/session";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";
import { DefenseRenderer } from "@/games/defense/renderer";
import { Controls } from "@/games/defense/controls";
import { RewardScreen } from "@/games/defense/rewardScreen";
import { DefenseController } from "@/games/defense/controller";
import { gridFor, slotsFor, type DefenseMap } from "@/games/defense/board";
import { upgrades, type Upgrade } from "@/games/defense/config";
import { jokerSlots, ownedJokers } from "@/games/defense/shop";
import type { UpgradeDefinition } from "@/games/defense/definitions/upgrades";
import { element, action } from "@/games/defense/dom";

import { createUiPanels, bonusChip, ui } from "@/games/defense/canvasUi";

/** Owns Run presentation and the aftermath of player actions. */
export class RunScreen {
	#controller: DefenseController;
	#audio = new BattleAudio();
	#feedbackKey = "";
	#boardInput: BoardInput;
	#controlsScreen: Controls;
	#panels = createUiPanels();
	#statusPanel;
	#bonusesPanel;
	#tray = element("div", "defense-tray");
	#rewardScreen: RewardScreen;
	#strategyScreen: StrategyScreen;
	#boardPreview: BoardPreview;
	#dragPlacement: BoardPreview["placement"] = null;
	#paused = false;
	#lastPhase = "";
	#saveTime = 0;
	#destroyed = false;
	#saveError = element("p", "defense-save-error");
	#status = element("div", "defense-status");
	#statusText = "";
	#seedSummary = element("summary", "");
	#seedInput = element("input", "");
	#seedButton = element("button", "", "Новый забег по коду");
	#bonuses = element("div", "defense-bonuses");
	#board = element("div", "defense-board");
	#canvas = createCanvas();
	#renderer = new DefenseRenderer(this.#canvas);
	#controls = element("div", "defense-controls");
	#overlay = element("section", "defense-reward-screen");
	#audioButton = element("button", "defense-icon-control");
	#strategyNav = element("nav", "defense-strategy-tabs");
	#shopTab = element("button", "", "Магазин");
	#journalTab = element("button", "", "Цепи");
	#cellButtons: HTMLButtonElement[] = [];
	#boardSize = "";

	constructor(
		private readonly root: HTMLElement,
		private readonly session: DefenseSession,
		private readonly persistence: {
			onSave?: (saved: string) => void;
			onSaveError?: (error: unknown) => void;
		} = {},
	) {
		applyTheme(root);
		const header = element("header", "defense-header");
		header.append(element("span", "defense-eyebrow", "FIELD DEFENSE"));
		this.#saveError.setAttribute("role", "status");
		this.#saveError.hidden = true;
		this.#status.setAttribute("aria-live", "polite");
		header.append(this.#status);
		const seedDetails = element("details", "defense-seed");
		const seedForm = element("form", "");
		const seedLabel = element("label", "", "Код забега");
		this.#seedInput.type = "text";
		this.#seedInput.required = true;
		this.#seedInput.autocomplete = "off";
		seedLabel.append(this.#seedInput);
		this.#seedButton.type = "submit";
		seedForm.append(seedLabel, this.#seedButton);
		seedForm.onsubmit = (event) => {
			event.preventDefault();
			const seed = this.#seedInput.value.trim();
			if (seed) this.#perform(() => session.restart(seed));
		};
		seedDetails.append(
			this.#seedSummary,
			element(
				"p",
				"",
				"Одинаковый код и те же действия — та же карта и награды.",
			),
			seedForm,
		);
		header.append(seedDetails);
		this.#audioButton.type = "button";
		this.#audioButton.onclick = () =>
			this.#perform(() => {
				this.#audio.enabled = !this.#audio.enabled;
			}, false);
		header.append(this.#audioButton);
		this.#canvas.setAttribute(
			"aria-label",
			"Поле обороны: враги движутся сверху к базе",
		);
		this.#board.append(this.#canvas);
		const playArea = element("div", "defense-play-area");
		playArea.append(
			this.#bonuses,
			this.#tray,
			this.#board,
			this.#controls,
			this.#overlay,
		);
		const strategy = element("section", "defense-strategy");
		strategy.setAttribute("aria-label", "Магазин и цепи боя");
		this.#strategyNav.setAttribute("aria-label", "Развитие сборки");
		this.#shopTab.type = "button";
		this.#journalTab.type = "button";
		this.#strategyNav.append(this.#shopTab, this.#journalTab);
		root.append(header, this.#saveError, playArea, this.#strategyNav, strategy);
		this.#strategyScreen = new StrategyScreen(
			this.#panels.mount(strategy),
			session,
			(action) => this.#perform(action),
		);
		this.#shopTab.onclick = () =>
			this.#perform(() => this.#strategyScreen.toggle("shop"), false);
		this.#journalTab.onclick = () =>
			this.#perform(() => this.#strategyScreen.toggle("journal"), false);
		this.#controller = new DefenseController(session);
		this.#boardInput = new BoardInput(this.#board, this.#renderer, {
			state: () => session.snapshot(),
			preview: (placement) => {
				this.#dragPlacement = placement;
				if (!this.#destroyed) this.#renderBoard(session.snapshot());
			},
			build: (cell, kind) =>
				this.#perform(() => {
					if (session.dispatch({ type: "tower.build", cell, kind }))
						this.#controller.selectCell(cell);
				}),
			tap: (cell) => this.#perform(() => this.#controller.selectCell(cell)),
			move: (from, to) =>
				this.#perform(() => {
					if (session.dispatch({ type: "tower.relocate", from, to }))
						this.#controller.selectCell(to);
				}),
		});
		this.#statusPanel = this.#panels.mount(this.#status);
		this.#bonusesPanel = this.#panels.mount(this.#bonuses);
		this.#controlsScreen = new Controls(
			this.#panels.mount(this.#tray, { touchAction: "none" }),
			this.#panels.mount(this.#controls),
			{
				dragTower: (kind) => this.#boardInput.dragTower(kind),
				act: (id) => this.#perform(() => this.#controller.act(id)),
				selectTower: (kind) =>
					this.#perform(() => this.#controller.selectTower(kind)),
			},
		);
		this.#boardPreview = this.#controller.present().board;
		this.#rewardScreen = new RewardScreen(
			this.#overlay,
			this.#panels.mount(this.#overlay, { animate: true }),
			{
				chooseStarter: (starter) =>
					this.#perform(() =>
						session.dispatch({ type: "run.chooseStarter", starter }),
					),
				choose: (choice) =>
					this.#perform(() =>
						session.dispatch({ type: "reward.choose", choice }),
					),
				continue: () =>
					this.#perform(() => session.dispatch({ type: "run.continue" })),
				restart: () =>
					this.#perform(() => session.dispatch({ type: "run.restart" })),
			},
		);
	}

	#layout(map: DefenseMap): void {
		const grid = gridFor(map);
		const size = `${grid.columns}:${grid.rows}`;
		if (size === this.#boardSize) return;
		this.#boardSize = size;
		this.#board.style.aspectRatio = `${grid.columns} / ${grid.rows}`;
		this.#board.style.setProperty("--columns", String(grid.columns));
		this.#board.style.setProperty("--rows", String(grid.rows));
		for (const button of this.#cellButtons) button.remove();
		const slots = slotsFor(map);
		this.#cellButtons = slots.map((slot, index) => {
			const button = action(
				"",
				() => {
					if (this.session.snapshot().phase !== "prepare") return;
					this.#perform(() => this.#controller.selectCell(index));
				},
				"defense-cell",
			);
			// Pointer input is handled by the board; this mirror serves keyboard clicks.
			button.onclick = (event) => {
				if (event.detail === 0)
					this.#perform(() => this.#controller.selectCell(index));
			};
			button.style.left = `${(slot.x / grid.width) * 100}%`;
			button.style.top = `${(slot.y / grid.height) * 100}%`;
			button.setAttribute("aria-label", `Клетка ${index + 1}`);
			this.#board.append(button);
			return button;
		});
	}

	#perform(command: () => unknown, save = true): void {
		if (this.#paused || this.#destroyed) return;
		this.#audio.unlock();
		command();
		if (save) this.persist();
		this.#refresh(this.session.snapshot());
	}

	persist(): void {
		if (this.#destroyed || !this.persistence.onSave) return;
		try {
			this.persistence.onSave(this.session.save());
			this.#saveError.hidden = true;
		} catch (error) {
			this.#saveError.textContent =
				"Не удалось сохранить забег. Последние изменения могут быть потеряны.";
			this.#saveError.hidden = false;
			this.persistence.onSaveError?.(error);
		}
	}

	#updateStatus(state: DefenseSnapshot): void {
		const text = `${this.#paused}:${state.wave}:${state.health}:${state.coins}:${state.towers.length}:${state.towerLimit}:${state.overdrives}`;
		if (this.#statusText === text) return;
		this.#statusText = text;
		this.#statusPanel.update(
			ui.row(
				[
					ui.text(`${this.#paused ? "Пауза · " : ""}Волна ${state.wave}`, {
						size: 12,
					}),
					ui.text(
						`♥ ${state.health} · ▣ ${state.towers.length}/${state.towerLimit}`,
						{
							size: 14,
							align: "center",
						},
					),
					ui.text(`◈ ${state.coins}`, { size: 14, align: "right" }),
				],
				{ padding: 8, gap: 6 },
			),
		);
	}

	#refresh(state: DefenseSnapshot): void {
		this.#layout(state.map);
		const phaseChanged = this.#lastPhase !== state.phase;
		this.#lastPhase = state.phase;
		const model = this.#controller.present();
		this.#boardPreview = model.board;
		this.#updateStatus(state);
		this.#seedSummary.textContent = "Код забега ↗";
		if (document.activeElement !== this.#seedInput)
			this.#seedInput.value = state.seed;
		this.#seedInput.disabled = this.#paused;
		this.#seedButton.disabled = this.#paused;
		// Reveal the board before measuring its Canvas controls.
		this.#rewardScreen.refresh(state);
		this.#strategyScreen.refresh(state);
		const mode = this.#strategyScreen.mode;
		this.#audioButton.textContent = this.#audio.enabled ? "🔊" : "🔇";
		this.#audioButton.setAttribute(
			"aria-label",
			this.#audio.enabled ? "Выключить звук" : "Включить звук",
		);
		this.#shopTab.textContent = `Магазин · ${ownedJokers(state.bonuses).length}/${jokerSlots}`;
		this.#shopTab.setAttribute("aria-pressed", String(mode === "shop"));
		this.#journalTab.setAttribute("aria-pressed", String(mode === "journal"));
		this.#shopTab.disabled = state.phase === "wave";
		this.#controlsScreen.refresh(model);
		const selectedRow =
			model.board.selected === null
				? 0
				: Math.floor(model.board.selected / state.map.columns);
		const menuAbove = selectedRow >= state.map.rows / 2;
		this.#controls.style.top = menuAbove
			? `${this.#board.offsetTop + 8}px`
			: "auto";
		this.#controls.style.bottom = menuAbove ? "auto" : "8px";
		this.#board.inert = !this.#overlay.hidden;
		this.#controls.inert = !this.#overlay.hidden;
		this.#tray.inert = !this.#overlay.hidden;
		this.#bonusesPanel.enabled = Boolean(this.#overlay.hidden);
		const bonuses = (Object.keys(upgrades) as Upgrade[])
			.filter((key) => state.bonuses[key])
			.map((key) => {
				const rule: UpgradeDefinition = upgrades[key];
				return bonusChip(
					`bonus-${key}`,
					`${rule.icon} ${rule.title}${state.bonuses[key] > 1 ? ` ×${state.bonuses[key]}` : ""}`,
					`${rule.icon}${state.triggers[key] ? ` · ${state.triggers[key]}` : state.bonuses[key] > 1 ? state.bonuses[key] : ""}`,
					() =>
						this.#perform(() => {
							this.#controller.showDescription(rule.description);
							if (state.phase === "prepare" && rule.world)
								this.#controller.selectWorld(rule.world);
						}, false),
				);
			});
		this.#bonusesPanel.update(
			bonuses.length ? ui.row(bonuses, { gap: 4, wrap: true }) : null,
		);
		for (const [index, button] of this.#cellButtons.entries()) {
			button.disabled = this.#paused || !model.cells[index];
			button.setAttribute(
				"aria-pressed",
				String(model.board.selected === index),
			);
		}

		this.#renderBoard(state);
		if (phaseChanged && !this.#overlay.hidden)
			this.#overlay.querySelector("button")?.focus({ preventScroll: true });
	}

	#renderBoard(state: DefenseSnapshot): void {
		this.#renderer.draw(state, {
			...this.#boardPreview,
			placement: this.#paused
				? null
				: (this.#dragPlacement ?? this.#boardPreview.placement),
		});
	}

	advance(dt: number): void {
		if (this.#destroyed || this.#paused) return;
		this.#panels.advance(dt);

		const state = this.session.snapshot();
		if (state.phase !== this.#lastPhase) {
			this.persist();
			this.#refresh(state);
		} else {
			this.#updateStatus(state);
			this.#audio.update(state);
			const feedback = JSON.stringify([
				state.triggers,
				state.towers.map((tower) => tower.overdrive > 0),
			]);
			if (feedback !== this.#feedbackKey) {
				this.#feedbackKey = feedback;
				this.#refresh(state);
			} else this.#renderBoard(state);
		}
		this.#saveTime += dt;
		if (this.#saveTime >= 5) {
			this.#saveTime = 0;
			this.persist();
		}
	}

	sync(paused: boolean): void {
		if (this.#destroyed) return;
		const initial = this.#lastPhase === "";
		this.#paused = paused;
		this.#panels.enabled = !paused;
		this.#boardInput.enabled = !paused;
		if (paused) {
			this.session.pause();
			this.persist();
		} else this.session.resume();
		if (initial && !paused) this.persist();
		this.#refresh(this.session.snapshot());
	}

	destroy(): void {
		if (this.#destroyed) return;
		try {
			this.persist();
		} finally {
			this.#destroyed = true;
			this.#boardInput.destroy();
			this.#panels.destroy();
			this.#audio.destroy();
		}
	}
}
