import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { DefenseSession } from "@/games/defense/session";
import { ui } from "@/games/defense/canvasUi";
import { upgrades, type Upgrade } from "@/games/defense/definitions/upgrades";
import {
	ownedJokers,
	jokerSlots,
	jokerPrice,
	rerollPrice,
} from "@/games/defense/shop";
import { expansion } from "@/games/defense/expansion";
import {
	upgradeAccent,
	upgradeBadges,
	upgradePortrait,
} from "@/games/defense/upgradePortrait";
import {
	connectionHint,
	discoveredChain,
	shopRole,
} from "@/games/defense/synergyRules";
import type { UiNode, UiPanel } from "@/render/ui";
import { theme } from "@/ui/theme";

/** Between-wave decisions and the in-game catalogue use the same content as
 * combat tests. Long descriptions remain in normal page flow on mobile. */
export class StrategyScreen {
	#journal = false;
	#shopOpen = false;
	#selectedOffer: Upgrade | null = null;
	#key = "";
	constructor(
		private readonly panel: UiPanel,
		private readonly session: DefenseSession,
		private readonly perform: (action: () => unknown) => void,
	) {}
	get mode(): "shop" | "journal" | null {
		return this.#shopOpen ? "shop" : this.#journal ? "journal" : null;
	}
	toggle(mode: "shop" | "journal"): void {
		if (mode === "shop") {
			this.#shopOpen = !this.#shopOpen;
			this.#journal = false;
		} else {
			this.#journal = !this.#journal;
			this.#shopOpen = false;
		}
		this.#key = "";
	}
	refresh(state: DefenseSnapshot): void {
		if (state.phase === "draft" || state.phase === "lost") {
			this.panel.update(null);
			this.#key = "";
			return;
		}
		const key = JSON.stringify([
			state.phase,
			state.bonuses,
			state.shop,
			state.shopRoll,
			state.heldOffer,
			state.coins,
			state.expansionDue,
			state.towerLimit,
			state.pendingWorld,
			this.#journal,
			this.#shopOpen,
		]);
		if (key === this.#key) return;
		this.#key = key;
		const nodes: UiNode[] = [];
		const button = (
			id: string,
			label: string,
			action: () => unknown,
			disabled = false,
			variant: "compact" = "compact",
		) =>
			ui.button({
				id,
				label,
				disabled,
				variant,
				onPress: () => this.perform(action),
			});
		if (state.expansionDue && state.phase === "prepare") {
			nodes.push(ui.text("Расширение обороны", { style: "rewardTitle" }));
			const options: UiNode[] = [];
			if (state.towerLimit < expansion.maxLimit)
				options.push(
					button(
						"expand-limit",
						`Лимит ${state.towerLimit} → ${state.towerLimit + 1}`,
						() =>
							this.session.dispatch({
								type: "progression.expand",
								choice: "limit",
							}),
					),
				);
			if (!options.length)
				options.push(
					button("expand-income", "Оборона развёрнута · +75 монет", () =>
						this.session.dispatch({
							type: "progression.expand",
							choice: "income",
						}),
					),
				);
			nodes.push(ui.row(options, { gap: 6, wrap: true }));
		}
		if (this.#shopOpen && state.phase !== "wave") {
			if (state.phase === "prepare") {
				if (!this.#selectedOffer || !state.shop.includes(this.#selectedOffer))
					this.#selectedOffer = state.shop[0] ?? null;
				nodes.push(
					ui.text("Магазин · монеты общие с башнями", { style: "rewardTitle" }),
				);
				const shopCards: UiNode[] = [];
				for (const offer of state.shop) {
					const rule = upgrades[offer],
						price = jokerPrice(offer, state.bonuses[offer]);
					const full =
						!state.bonuses[offer] &&
						ownedJokers(state.bonuses).length >= jokerSlots;
					shopCards.push(
						ui.card({
							variant: "reward",
							id: `offer-${offer}`,
							label: `${shopRole(state.bonuses, offer)}: ${rule.title}, ${price} монет`,
							caption: shopRole(state.bonuses, offer),
							title: `${rule.icon} ${rule.title}`,
							description: upgradeBadges[offer],
							tooltip: rule.description,
							pressed: this.#selectedOffer === offer,
							artwork: upgradePortrait(offer),
							disabled: full || state.coins < price || !!state.pendingWorld,
							style: {
								border: upgradeAccent(offer),
								insetBorder: upgradeAccent(offer),
								offsetY: this.#selectedOffer === offer ? -6 : 0,
							},
							footer: ui.column(
								[
									ui.text(full ? "НУЖЕН СЛОТ" : `${price} ◈`, {
										size: 12,
										weight: 700,
										align: "center",
										color: upgradeAccent(offer),
									}),
								],
								{ gap: 3, align: "center" },
							),
							onPress: () => {
								this.#selectedOffer = offer;
								this.#key = "";
								this.refresh(state);
							},
						}),
					);
				}
				nodes.push(
					ui.row(shopCards, {
						padding: 6,
						gap: 5,
						wrap: true,
						justify: "center",
					}),
				);
				if (this.#selectedOffer) {
					const selected = this.#selectedOffer,
						rule = upgrades[selected],
						price = jokerPrice(selected, state.bonuses[selected]),
						full =
							!state.bonuses[selected] &&
							ownedJokers(state.bonuses).length >= jokerSlots;
					nodes.push(
						ui.column(
							[
								ui.text(rule.title, { style: "rewardTitle" }),
								ui.text(rule.description, { size: 11 }),
								ui.text(connectionHint(state.bonuses, selected), {
									size: 10,
									color: upgradeAccent(selected),
								}),
								ui.row(
									[
										button(
											"buy-selected",
											`Взять за ${price} ◈`,
											() =>
												this.session.dispatch({
													type: "shop.buy",
													upgrade: selected,
												}),
											full || state.coins < price || !!state.pendingWorld,
										),
										button(
											"hold-selected",
											state.heldOffer === selected
												? "◆ Закреплено"
												: "◇ Закрепить",
											() =>
												this.session.dispatch({
													type: "shop.hold",
													upgrade: selected,
												}),
										),
									],
									{ gap: 6, wrap: true },
								),
							],
							{ padding: 10, gap: 6, background: theme.ui.surface, radius: 10 },
						),
					);
				}
				nodes.push(
					button(
						"reroll-shop",
						`Обновить · ${rerollPrice(state.shopRoll)} ◈`,
						() => this.session.dispatch({ type: "shop.reroll" }),
						state.coins < rerollPrice(state.shopRoll),
					),
				);
			}
			const owned = ownedJokers(state.bonuses);
			nodes.push(
				ui.text(`Твоя сборка · ${owned.length}/6`, { style: "rewardTitle" }),
			);
			for (const ownedKey of owned)
				nodes.push(this.ownedCard(ownedKey, state, button));
		}
		if (this.#journal) {
			const chain = discoveredChain(state.bonuses, state.triggers);
			nodes.push(
				ui.text("Цепи этого забега", { style: "title" }),
				ui.text(
					chain.length
						? "Здесь только эффекты, которые уже сработали. Счётчики показывают вклад каждого звена."
						: "Пока ни одна цепь не сработала. Начни волну — журнал соберёт реальные события боя.",
					{ size: 12 },
				),
			);
			if (chain.length)
				nodes.push(
					ui.column(
						chain.map((key, index) =>
							ui.text(
								`${index ? "↓  " : ""}${upgrades[key].icon} ${upgrades[key].title} · ${state.triggers[key] ?? 0}`,
								{ size: 12, color: upgradeAccent(key) },
							),
						),
						{ padding: 10, gap: 7, background: theme.ui.surface, radius: 10 },
					),
				);
		}
		this.panel.update(ui.column(nodes, { padding: 8, gap: 8 }));
	}
	private ownedCard(
		key: Upgrade,
		state: DefenseSnapshot,
		button: (
			id: string,
			label: string,
			action: () => unknown,
			disabled?: boolean,
		) => UiNode,
	): UiNode {
		return ui.column(
			[
				ui.text(
					`${upgrades[key].icon} ${upgrades[key].title} · ${state.bonuses[key]}`,
					{
						style: "rewardTitle",
						color: upgradeAccent(key),
					},
				),
				ui.text(upgrades[key].description, { size: 11 }),
				button(
					`sell-joker-${key}`,
					`Продать · +${Math.floor(jokerPrice(key, state.bonuses[key] - 1) / 2)} ◈`,
					() => this.session.dispatch({ type: "shop.sell", upgrade: key }),
				),
			],
			{ padding: 8, gap: 4, background: theme.ui.surface, radius: 8 },
		);
	}
}
