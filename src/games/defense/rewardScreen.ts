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
import { createUiHost, rewardCard, ui } from "@/games/defense/canvasUi";
import type { UiNode } from "@/render/ui";
import { theme } from "@/ui/theme";

export class RewardScreen {
	#host;
	#key = "";
	constructor(
		private readonly root: HTMLElement,
		private readonly actions: {
			chooseStarter(starter: Starter): void;
			choose(choice: Upgrade): void;
			restart(): void;
		},
	) {
		this.#host = createUiHost(root);
	}
	refresh(state: DefenseSnapshot, paused: boolean): void {
		this.root.hidden = !["draft", "reward", "lost"].includes(state.phase);
		this.#host.enabled = !paused && !this.root.hidden;
		if (this.root.hidden) {
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
		const title = draft
			? "Выбери сборку"
			: reward
				? isMilestone(state.wave)
					? "Этап пройден"
					: "Выбери улучшение"
				: "Ещё одна попытка?";
		const lead = draft
			? "Один бонус на старте. Новые — после каждой волны."
			: `Побеждено ${state.waveKills} · Прорывов ${state.waveLeaks} · Переносов ${state.teleports} · Осколков ${state.shatters}`;
		this.root.setAttribute(
			"aria-description",
			`${title.replaceAll("\n", " ")} ${lead}`,
		);
		const nodes: UiNode[] = [
			ui.text(draft ? "ОБОРОНА" : `ВОЛНА ${state.wave}`, {
				size: 9,
				muted: true,
			}),
			ui.heading(title, { size: 22, lineHeight: 25, weight: 700 }),
			ui.text(lead, { size: 12, muted: true }),
		];
		if (reward && isMilestone(state.wave))
			nodes.push(
				ui.text(
					`Этап ${state.wave / milestone.interval} · +${milestone.coins} монет · восстановление до ${milestone.healing} жизней (максимум 10)`,
					{ size: 12 },
				),
			);
		if (draft || reward) {
			for (const key of draft ? starterChoices(state.seed) : state.choices) {
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
				nodes.push(
					rewardCard({
						id: `reward-${key}`,
						label: card.title,
						description: card.description,
						icon: card.icon,
						artwork: upgradePortrait(effect),
						accent: upgradeAccent(effect),
						badge: upgradeBadges[effect],
						background,
						onPress: () => {
							if (draft) this.actions.chooseStarter(key as Starter);
							else this.actions.choose(key as Upgrade);
						},
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
		} else
			nodes.push(
				ui.button({
					id: "restart",
					label: "Новый забег",
					onPress: () => this.actions.restart(),
				}),
			);
		this.#host.show(
			ui.column(nodes, {
				padding: 10,
				gap: 10,
				background: theme.ui.background,
				radius: 16,
			}),
		);
	}
	advance(dt: number): void {
		if (!this.root.hidden) this.#host.advance(dt);
	}
	destroy(): void {
		this.#host.destroy();
	}
}
