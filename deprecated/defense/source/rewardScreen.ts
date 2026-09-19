import { ownedJokers } from "@/games/defense/shop";
import { starterChoices } from "@/games/defense/rewards";
import {
	upgradePortrait,
	upgradeBadges,
	upgradeAccent,
} from "@/games/defense/upgradePortrait";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import {
	starters,
	upgrades,
	milestone,
	isMilestone,
	type Starter,
	type Upgrade,
} from "@/games/defense/config";
import { waveAt } from "@/games/defense/waves";
import { ui } from "@/games/defense/canvasUi";
import type { UiNode, UiPanel } from "@/render/ui";
import { theme } from "@/ui/theme";

export class RewardScreen {
	#key = "";
	#selected: Starter | Upgrade | null = null;
	constructor(
		private readonly root: HTMLElement,
		private readonly panel: UiPanel,
		private readonly actions: {
			chooseStarter(starter: Starter): void;
			choose(choice: Upgrade): void;
			restart(): void;
			continue(): void;
		},
	) {}
	refresh(state: DefenseSnapshot): void {
		if (!["draft", "reward", "lost"].includes(state.phase)) {
			this.panel.update(null);
			this.#key = "";
			return;
		}
		const key = JSON.stringify([
			state.phase,
			state.seed,
			state.wave,
			state.choices,
			state.bonuses,
		]);
		if (key === this.#key) return;
		this.#key = key;
		const draft = state.phase === "draft",
			reward = state.phase === "reward";
		this.root.setAttribute("role", "dialog");
		this.root.setAttribute(
			"aria-label",
			draft
				? "Выбор стартовой сборки"
				: reward
					? "Выбор награды"
					: "Результат забега",
		);
		const lost = state.phase === "lost";
		const title = draft
			? "Выбери сборку"
			: reward
				? isMilestone(state.wave)
					? "Этап пройден"
					: "Волна отбита"
				: "Оборона прорвана";
		const lead = draft
			? "Шесть слотов джокеров. Магазин между волнами, бесплатный джокер после босса."
			: `Побеждено ${state.waveKills} · Прорывов ${state.waveLeaks} · Переносов ${state.teleports} · Осколков ${state.shatters}`;
		this.root.setAttribute(
			"aria-description",
			`${title.replaceAll("\n", " ")} ${lead}`,
		);
		const nodes: UiNode[] = [
			ui.text(draft ? "ОБОРОНА" : `ВОЛНА ${state.wave}`, {
				style: "caption",
			}),
			ui.text(title, { style: "title" }),
			ui.text(lead, { size: 12, muted: true }),
		];
		if (lost)
			nodes.splice(
				1,
				0,
				ui.text("✕", {
					size: 42,
					lineHeight: 48,
					align: "center",
					color: theme.ui.danger,
				}),
			);
		if (reward && isMilestone(state.wave))
			nodes.push(
				ui.text(
					`Этап ${state.wave / milestone.interval} · +${milestone.coins} монет · восстановление до ${milestone.healing} жизней (максимум 10)`,
					{ size: 12 },
				),
			);
		if (draft || reward) {
			const choices = draft ? starterChoices(state.seed) : state.choices;
			if (!this.#selected || !choices.includes(this.#selected as never))
				this.#selected = choices[0] ?? null;
			const cards: UiNode[] = [];
			for (const key of choices) {
				const card = draft
					? starters[key as Starter]
					: upgrades[key as Upgrade];
				const effect = draft
					? starters[key as Starter].upgrade
					: (key as Upgrade);
				const background = ["snowfall", "freeze", "chill"].includes(effect)
					? theme.ui.coldSurface
					: ["portal", "echo"].includes(effect)
						? theme.ui.magicSurface
						: theme.ui.surface;
				cards.push(
					ui.card({
						variant: "reward",
						id: `reward-${key}`,
						label: card.title,
						caption: draft
							? "СТАРТОВАЯ КАРТА"
							: state.bonuses[effect]
								? `РАНГ ${state.bonuses[effect] + 1}`
								: "НОВЫЙ ДЖОКЕР",
						disabled:
							!draft &&
							!state.bonuses[effect] &&
							ownedJokers(state.bonuses).length >= 6,
						description: upgradeBadges[effect],
						tooltip: card.description,
						pressed: this.#selected === key,
						icon: card.icon,
						artwork: upgradePortrait(effect),
						style: {
							border: upgradeAccent(effect),
							insetBorder: upgradeAccent(effect),
							offsetY: this.#selected === key ? -6 : 0,
						},
						background,
						onPress: () => {
							if (this.#selected === key) {
								if (draft) this.actions.chooseStarter(key as Starter);
								else this.actions.choose(key as Upgrade);
								return;
							}
							this.#selected = key;
							this.#key = "";
							this.refresh(state);
						},
					}),
				);
			}
			if (cards.length)
				nodes.push(
					ui.row(cards, {
						padding: 6,
						gap: 5,
						wrap: true,
						justify: "center",
					}),
				);
			if (this.#selected) {
				const selected = draft
					? starters[this.#selected as Starter]
					: upgrades[this.#selected as Upgrade];
				nodes.push(
					ui.column(
						[
							ui.text(selected.title, { style: "rewardTitle" }),
							ui.text(selected.description, { size: 11 }),
							ui.button({
								id: "confirm-reward",
								label: draft
									? "Начать с этой картой"
									: "Взять выбранный джокер",
								onPress: () => {
									if (draft)
										this.actions.chooseStarter(this.#selected as Starter);
									else this.actions.choose(this.#selected as Upgrade);
								},
							}),
						],
						{ padding: 10, gap: 6, background: theme.ui.surface, radius: 10 },
					),
				);
			}
			if (reward) {
				if (ownedJokers(state.bonuses).length >= 6 && state.choices.length)
					nodes.push(
						ui.text(
							"Все слоты заняты. Открой магазин ниже и продай джокер, чтобы взять награду.",
							{ size: 12 },
						),
					);
				nodes.push(
					ui.button({
						id: "continue-wave",
						label: state.choices.length
							? "Пропустить награду → подготовка"
							: "К подготовке и магазину",
						onPress: () => this.actions.continue(),
					}),
				);
			}
			const next = waveAt(state.wave + 1);
			nodes.push(
				ui.text(
					`ДАЛЬШЕ · ${next.title}\n${next.description}\nОсобая награда каждые ${milestone.interval} волн`,
					{ size: 11, muted: true },
				),
			);
		} else {
			nodes.push(
				ui.row(
					[
						ui.column(
							[
								ui.text(String(Math.max(0, state.wave - 1)), {
									size: 24,
									weight: 700,
									align: "center",
								}),
								ui.text("ВОЛН", { style: "caption", align: "center" }),
							],
							{
								grow: 1,
								padding: 10,
								background: theme.ui.surface,
								radius: 10,
							},
						),
						ui.column(
							[
								ui.text(String(state.kills), {
									size: 24,
									weight: 700,
									align: "center",
								}),
								ui.text("УНИЧТОЖЕНО", { style: "caption", align: "center" }),
							],
							{
								grow: 1,
								padding: 10,
								background: theme.ui.surface,
								radius: 10,
							},
						),
					],
					{ gap: 8 },
				),
			);
			nodes.push(
				ui.button({
					id: "restart",
					label: "Собрать новую оборону",
					onPress: () => this.actions.restart(),
				}),
			);
		}
		this.panel.update(
			ui.column(nodes, {
				padding: 10,
				gap: 10,
				background: theme.ui.background,
				radius: 16,
			}),
		);
	}
}
