export const theme = {
	grass: "#658c45",
	grassLight: "#739c4e",
	grassDark: "#52793b",
	road: "#cfb17b",
	roadEdge: "#7d703f",
	roadLight: "#dfc28c",
	cityPaving: "#b8ab96",
	cityAvenue: "#9b907f",
	cityCurb: "#8f8475",
	shield: "#a8cbe2",
	stone: "#9c9992",
	shadow: "#20332b",
	panel: "#101f31",
	card: "#132639",
	cardEdge: "#223b53",
	raised: "#1d334b",
	border: "#526e8b",
	text: "#f1f0de",
	muted: "#a6b6c7",
	blue: "#2879e9",
	blueEdge: "#1557b4",
	blueHighlight: "#65a7ff",
	blueCaption: "#c4deff",
	gold: "#ffd471",
	red: "#ee6559",
	green: "#8bd95c",
	oil: "#393026",
	fire: "#ffae37",
	fireEdge: "#ee5424",
	fireCore: "#fff1a3",
	smoke: "#4e4349",
	oilHighlight: "#817449",
	oilSheen: "#a4a177",
	transparent: "#00000000",
	white: "#ffffff",
};

export type TerrainPalette = {
	ground: string;
	light: string;
	dark: string;
	road: string;
	edge: string;
};
export type BiomeId =
	| "forest"
	| "autumn"
	| "deadwood"
	| "drylands"
	| "desert"
	| "volcano";
export const terrainPalettes: Record<BiomeId, TerrainPalette> = {
	forest: {
		ground: theme.grass,
		light: theme.grassLight,
		dark: theme.grassDark,
		road: theme.road,
		edge: theme.roadEdge,
	},
	autumn: {
		ground: "#9b8545",
		light: "#b6a054",
		dark: "#786b39",
		road: "#d9b579",
		edge: "#82613d",
	},
	deadwood: {
		ground: "#697b70",
		light: "#829087",
		dark: "#53685e",
		road: "#b8b09a",
		edge: "#657166",
	},
	drylands: {
		ground: "#ac965d",
		light: "#c4ac6f",
		dark: "#96804c",
		road: "#d6ba83",
		edge: "#887044",
	},
	desert: {
		ground: "#c6a56b",
		light: "#ddbf82",
		dark: "#b18d55",
		road: "#ebce95",
		edge: "#aa834c",
	},
	volcano: {
		ground: "#4b454c",
		light: "#61535a",
		dark: "#38353e",
		road: "#998078",
		edge: "#352f38",
	},
};
