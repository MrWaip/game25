import type { PaintTextStyle } from "@/render/painter";
import type { WidgetRecipes } from "@/render/ui/widgets";
import { colors } from "@/ui/colors";
import type { TowerKind } from "@/games/defense/definitions/towers";
import type { EnemyKind } from "@/games/defense/definitions/enemies";
export const defenseTheme = {
	towerCards: {
		corrode: "#193626",
		amplifier: "#343018",
		rapid: "#352d17",
		blast: "#38201d",
		frost: "#132c3a",
		arcane: "#28213c",
	} satisfies Record<TowerKind, string>,
	towers: {
		corrode: colors.graphicPositivePrimary,
		amplifier: colors.graphicWarningPrimary,
		rapid: colors.graphicWarningPrimary,
		blast: colors.graphicNegativePrimary,
		frost: colors.graphicActionPrimary,
		arcane: colors.graphicMarketing,
	} satisfies Record<TowerKind, string>,
	enemies: {
		normal: colors.textPrimary,
		fast: colors.graphicWarningPrimary,
		shield: colors.graphicActionPrimary,
		tank: colors.graphicAccentPrimary,
		wisp: colors.graphicMarketing,
		herald: colors.textPositive,
		boss: colors.graphicNegativePrimary,
	} satisfies Record<EnemyKind, string>,
	board: {
		buildAllowed: colors.textPositive,
		buildBlocked: colors.textNegative,
		background: colors.layerFloor1,
		cellAccent: colors.layerFloor3,
		cell: colors.layerFloor2,
		dot: colors.graphicQuaternary,
		road: colors.layerFloor0,
		roadMark: colors.graphicQuaternary,
		selection: colors.graphicActionPrimary,
		label: colors.textSecondary,
	},
	snow: {
		fill: colors.bgActionSecondary,
		edge: colors.graphicActionPrimary,
		flake: colors.textPrimary,
	},
	portal: {
		entrance: colors.graphicActionPrimary,
		spark: colors.textPrimary,
		link: colors.graphicMarketing,
		fill: colors.bgMarketingSecondarySolid,
		cooldown: colors.textTertiary,
		edge: colors.graphicMarketing,
		label: colors.textPrimary,
	},
	units: {
		rangeFill: colors.bgActionSecondary,
		rangeEdge: colors.graphicActionPrimary,
		shadow: colors.layerOverlayDimming,
		towerBody: colors.layerFloor1,
		shatter: colors.textPrimary,
		auraFill: colors.bgPositiveSecondary,
		auraEdge: colors.graphicPositivePrimary,
		enemyGlyph: colors.textPrimaryOnLight,
		teleported: colors.graphicMarketing,
		shield: colors.graphicActionPrimary,
		healthTrack: colors.layerFloor0,
		health: colors.textPositive,
		timer: colors.textPrimary,
		badge: colors.layerFloor1,
	},
	statuses: {
		cold: colors.graphicActionPrimary,
		armor: colors.graphicNegativePrimary,
		ward: colors.graphicMarketing,
		haste: colors.textPositive,
		echo: colors.graphicMarketing,
		chilledWeapon: colors.graphicActionPrimary,
		power: colors.graphicWarningPrimary,
	},
} as const;

// Recipes are the authoring defaults for this game's UI; callers provide content.
export const defenseUi = {
	text: {
		caption: { size: 9, color: colors.textSecondary },
		detail: { size: 11 },
		hint: { size: 11, maxLines: 2, lineHeight: 16 },
		title: { size: 22, lineHeight: 25, weight: 700 },
		rewardTitle: { size: 14, weight: 700 },
		badge: { size: 9, weight: 700 },
		towerTitle: { size: 9, lineHeight: 10, weight: 700, align: "center" },
		towerDetail: { size: 11, lineHeight: 12, weight: 700, align: "center" },
		waveIcon: {
			size: 24,
			lineHeight: 30,
			align: "center",
			color: colors.graphicActionPrimary,
		},
		waveLabel: { size: 10, lineHeight: 18, align: "center" },
	},
	buttons: {
		compact: {
			box: {
				padding: 10,
				minHeight: 44,
				background: colors.layerFloor1,
				border: colors.graphicNeutral,
				radius: 10,
			},
			text: {
				size: 12,
				lineHeight: 24,
				maxLines: 1,
				color: colors.textPrimary,
			},
		},
		icon: {
			box: {
				width: 44,
				padding: 0,
				minHeight: 44,
				background: colors.layerFloor1,
				radius: 10,
			},
			text: { size: 22, lineHeight: 44, color: colors.textPrimary },
		},
		tower: { box: { width: 60, padding: 4, gap: 2, minHeight: 64, radius: 3 } },
		bonus: {
			box: {
				width: 44,
				minHeight: 36,
				padding: 8,
				radius: 6,
				background: colors.layerFloor1,
			},
			text: { size: 16, color: colors.textPrimary },
		},
		wave: {
			box: {
				width: 64,
				height: 64,
				padding: 4,
				gap: 2,
				radius: 12,
				background: colors.bgActionSecondary,
			},
		},
	},
	cards: {
		reward: {
			box: {
				width: 104,
				padding: 8,
				gap: 5,
				minHeight: 176,
				direction: "column",
				align: "center",
				justify: "space-between",
				radius: 10,
			},
			title: { size: 12, lineHeight: 14, weight: 700, align: "center" },
			description: {
				size: 9,
				lineHeight: 12,
				color: colors.textSecondary,
				align: "center",
				maxLines: 3,
			},
			caption: { size: 8, weight: 700, align: "center", maxLines: 1 },
			content: { gap: 4, align: "center" },
			artworkWidth: 52,
		},
	},
} satisfies WidgetRecipes<string, string, string>;

export const defensePaint = {
	towerGlyph: {
		color: colors.textPrimary,
		font: "bold 22px sans-serif",
		align: "center",
	},
	enemyGlyph: { color: defenseTheme.units.enemyGlyph, align: "center" },
	boardLabel: { color: defenseTheme.board.label, font: "bold 9px sans-serif" },
	timer: {
		color: defenseTheme.units.timer,
		font: "9px sans-serif",
		align: "center",
	},
	badge: {
		color: colors.textPrimary,
		font: "bold 10px sans-serif",
		align: "center",
	},
} satisfies Record<string, PaintTextStyle>;
