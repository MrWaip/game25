import { colors } from "@/ui/colors";

// Shared UI roles. Each game owns its visual roles in its theme module.
export const theme = {
	ui: {
		background: colors.layerFloor0,
		surface: colors.layerFloor1,
		raised: colors.layerFloor2,
		border: colors.graphicNeutral,
		focus: colors.graphicActionPrimary,
		action: colors.bgActionPrimary,
		coldSurface: colors.bgActionSecondary,
		magicSurface: colors.bgMarketingSecondary,
		shadow: colors.layerOverlayDimming,
		text: colors.textPrimary,
		onAction: colors.textPrimaryOnDark,
		muted: colors.textSecondary,
		danger: colors.textNegative,
		dangerSurface: colors.bgNegativeSecondary,
		hintText: colors.textPrimaryOnDark,
		hintShadow: colors.layerOverlayDimming,
		hintGlow: colors.graphicQuaternary,
	},
} as const;

export function applyTheme(root: HTMLElement): void {
	for (const [role, value] of Object.entries(theme.ui)) {
		root.style.setProperty(`--color-${role}`, value);
	}
	root.style.colorScheme = "dark";
}
