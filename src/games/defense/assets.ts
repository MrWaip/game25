import siegeUrl from "./assets/siege-atlas.png";
import stoneTowerUrl from "./assets/stone-tower.png";
import biomesUrl from "./assets/biomes.png";
import enemyCastleUrl from "./assets/enemy-castle.png";
import atlasUrl from "./assets/medieval-atlas.png";
import constructionUrl from "./assets/construction.png";
import upgradeConstructionUrl from "./assets/upgrade-construction.png";
import flyerUrl from "./assets/flyer-atlas.png";
import landmarksUrl from "./assets/landmarks.png";
import cityPavingUrl from "./assets/city-paving.png";
import terrainAutumnGroundUrl from "./assets/terrain-autumn-ground.png";
import terrainAutumnRoadUrl from "./assets/terrain-autumn-road.png";
import terrainDeadwoodGroundUrl from "./assets/terrain-deadwood-ground.png";
import terrainDeadwoodRoadUrl from "./assets/terrain-deadwood-road.png";
import terrainDesertGroundUrl from "./assets/terrain-desert-ground.png";
import terrainDesertRoadUrl from "./assets/terrain-desert-road.png";
import terrainDrylandsGroundUrl from "./assets/terrain-drylands-ground.png";
import terrainDrylandsRoadUrl from "./assets/terrain-drylands-road.png";
import terrainForestGroundUrl from "./assets/terrain-forest-ground.png";
import terrainForestRoadUrl from "./assets/terrain-forest-road.png";
import terrainVolcanoGroundUrl from "./assets/terrain-volcano-ground.png";
import terrainVolcanoRoadUrl from "./assets/terrain-volcano-road.png";
import ozonBankCastleUrl from "./assets/ozon-bank-castle.png";
import ozonBannerUrl from "./assets/ozon-banner.png";
import ozonWallUrl from "./assets/ozon-wall.png";
import relicsCommonUrl from "./assets/relics-common.png";
import relicsKeyUrl from "./assets/relics-key.png";
import relicsRareUrl from "./assets/relics-rare.png";
import specializationEffectsUrl from "./assets/specialization-effects.png";
import specializationTowersUrl from "./assets/specialization-towers.png";
import type {
	RelicSpriteId,
	SpecializationImpactId,
	SpecializationProjectileId,
	SpecializationTowerSpriteId,
	SpriteId,
} from "./model";
export { atlasUrl };
const terrainTextureUrls = [
	terrainForestGroundUrl,
	terrainForestRoadUrl,
	terrainAutumnGroundUrl,
	terrainAutumnRoadUrl,
	terrainDeadwoodGroundUrl,
	terrainDeadwoodRoadUrl,
	terrainDrylandsGroundUrl,
	terrainDrylandsRoadUrl,
	terrainDesertGroundUrl,
	terrainDesertRoadUrl,
	terrainVolcanoGroundUrl,
	terrainVolcanoRoadUrl,
];
export const spriteCells = {
	stoneTower: 16,
	shieldSquad: 17,
	stone: 18,
	shieldBreak: 19,
	arrowTower: 0,
	oilTower: 1,
	fireTower: 2,
	foundation: 3,
	goblin: 4,
	goblinSide: 5,
	gate: 6,
	oak: 7,
	pine: 8,
	rocks: 9,
	barrel: 10,
	bush: 11,
	chainRelic: 12,
	stacksRelic: 13,
	arrow: 14,
	oilDrop: 15,
	flyer: 20,
	flyerSide: 21,
} as const satisfies Partial<Record<SpriteId, number>>;
export type DefenseAssets = {
	atlas: HTMLImageElement;
	siege: HTMLImageElement;
	stoneTower: HTMLImageElement;
	biomes: HTMLImageElement;
	enemyCastle: HTMLImageElement;
	construction: HTMLImageElement;
	upgradeConstruction: HTMLImageElement;
	flyer: HTMLImageElement;
	landmarks: HTMLImageElement;
	cityPaving: HTMLImageElement;
	terrainTextures: readonly HTMLImageElement[];
	ozonBankCastle: HTMLImageElement;
	ozonBanner: HTMLImageElement;
	ozonWall: HTMLImageElement;
	relicsCommon: HTMLImageElement;
	relicsRare: HTMLImageElement;
	relicsKey: HTMLImageElement;
	specializationTowers: HTMLImageElement;
	specializationEffects: HTMLImageElement;
};

type RelicAtlas = "relicsCommon" | "relicsRare" | "relicsKey";
const relicSpriteCells: Record<
	RelicSpriteId,
	{ atlas: RelicAtlas; cell: number }
> = {
	tarRelic: { atlas: "relicsCommon", cell: 0 },
	bellowsRelic: { atlas: "relicsCommon", cell: 1 },
	weightRelic: { atlas: "relicsCommon", cell: 2 },
	stacksRelic: { atlas: "relicsCommon", cell: 3 },
	interestRelic: { atlas: "relicsCommon", cell: 4 },
	greedRelic: { atlas: "relicsCommon", cell: 5 },
	whetstoneRelic: { atlas: "relicsCommon", cell: 6 },
	fowlerRelic: { atlas: "relicsCommon", cell: 7 },
	nomadRelic: { atlas: "relicsCommon", cell: 8 },
	echoRelic: { atlas: "relicsRare", cell: 0 },
	piggyRelic: { atlas: "relicsRare", cell: 1 },
	brandRelic: { atlas: "relicsRare", cell: 2 },
	rushRelic: { atlas: "relicsRare", cell: 3 },
	brigadeRelic: { atlas: "relicsRare", cell: 4 },
	autopsyRelic: { atlas: "relicsRare", cell: 5 },
	beheadRelic: { atlas: "relicsRare", cell: 6 },
	outpostRelic: { atlas: "relicsRare", cell: 7 },
	batteryRelic: { atlas: "relicsRare", cell: 8 },
	chainRelic: { atlas: "relicsKey", cell: 0 },
	blueprintRelic: { atlas: "relicsKey", cell: 1 },
	bonesRelic: { atlas: "relicsKey", cell: 2 },
	bridgeRelic: { atlas: "relicsKey", cell: 3 },
	tinderRelic: { atlas: "relicsKey", cell: 4 },
	ashRelic: { atlas: "relicsKey", cell: 5 },
	markRelic: { atlas: "relicsKey", cell: 6 },
	lastStandRelic: { atlas: "relicsKey", cell: 7 },
	vialRelic: { atlas: "relicsKey", cell: 8 },
};

type SpecializationSpriteId =
	| SpecializationTowerSpriteId
	| SpecializationProjectileId
	| SpecializationImpactId;
type SpecializationAtlas = "specializationTowers" | "specializationEffects";
const specializationSpriteCells: Record<
	SpecializationSpriteId,
	{ atlas: SpecializationAtlas; cell: number; rows: number }
> = {
	headsSpecializedTower: { atlas: "specializationTowers", cell: 0, rows: 2 },
	fireSpecializedTower: { atlas: "specializationTowers", cell: 1, rows: 2 },
	ricochetSpecializedTower: { atlas: "specializationTowers", cell: 2, rows: 2 },
	thickSpecializedTower: { atlas: "specializationTowers", cell: 3, rows: 2 },
	acidSpecializedTower: { atlas: "specializationTowers", cell: 4, rows: 2 },
	soakSpecializedTower: { atlas: "specializationTowers", cell: 5, rows: 2 },
	heavySpecializedTower: { atlas: "specializationTowers", cell: 6, rows: 2 },
	stunSpecializedTower: { atlas: "specializationTowers", cell: 7, rows: 2 },
	headsProjectile: { atlas: "specializationEffects", cell: 0, rows: 4 },
	fireProjectile: { atlas: "specializationEffects", cell: 1, rows: 4 },
	ricochetProjectile: { atlas: "specializationEffects", cell: 2, rows: 4 },
	thickProjectile: { atlas: "specializationEffects", cell: 3, rows: 4 },
	acidProjectile: { atlas: "specializationEffects", cell: 4, rows: 4 },
	soakProjectile: { atlas: "specializationEffects", cell: 5, rows: 4 },
	heavyProjectile: { atlas: "specializationEffects", cell: 6, rows: 4 },
	stunProjectile: { atlas: "specializationEffects", cell: 7, rows: 4 },
	headsImpact: { atlas: "specializationEffects", cell: 8, rows: 4 },
	fireImpact: { atlas: "specializationEffects", cell: 9, rows: 4 },
	ricochetImpact: { atlas: "specializationEffects", cell: 10, rows: 4 },
	thickImpact: { atlas: "specializationEffects", cell: 11, rows: 4 },
	acidImpact: { atlas: "specializationEffects", cell: 12, rows: 4 },
	soakImpact: { atlas: "specializationEffects", cell: 13, rows: 4 },
	heavyImpact: { atlas: "specializationEffects", cell: 14, rows: 4 },
	stunImpact: { atlas: "specializationEffects", cell: 15, rows: 4 },
};
async function loadImage(url: string): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = url;
	await image.decode();
	return image;
}
export async function loadAssets(): Promise<DefenseAssets> {
	const [
		atlas,
		enemyCastle,
		biomes,
		siege,
		stoneTower,
		construction,
		upgradeConstruction,
		flyer,
		landmarks,
		cityPaving,
		terrainTextures,
		ozonBankCastle,
		ozonBanner,
		ozonWall,
		relicsCommon,
		relicsRare,
		relicsKey,
		specializationTowers,
		specializationEffects,
	] = await Promise.all([
		loadImage(atlasUrl),
		loadImage(enemyCastleUrl),
		loadImage(biomesUrl),
		loadImage(siegeUrl),
		loadImage(stoneTowerUrl),
		loadImage(constructionUrl),
		loadImage(upgradeConstructionUrl),
		loadImage(flyerUrl),
		loadImage(landmarksUrl),
		loadImage(cityPavingUrl),
		Promise.all(terrainTextureUrls.map(loadImage)),
		loadImage(ozonBankCastleUrl),
		loadImage(ozonBannerUrl),
		loadImage(ozonWallUrl),
		loadImage(relicsCommonUrl),
		loadImage(relicsRareUrl),
		loadImage(relicsKeyUrl),
		loadImage(specializationTowersUrl),
		loadImage(specializationEffectsUrl),
	]);
	return {
		atlas,
		enemyCastle,
		biomes,
		siege,
		stoneTower,
		construction,
		upgradeConstruction,
		flyer,
		landmarks,
		cityPaving,
		terrainTextures,
		ozonBankCastle,
		ozonBanner,
		ozonWall,
		relicsCommon,
		relicsRare,
		relicsKey,
		specializationTowers,
		specializationEffects,
	};
}

// Authored rows are unequal: uniform thirds include the preceding tree roots.
export const biomeRowEdges: readonly number[] = [0, 390 / 1086, 730 / 1086, 1];

/** The generated siege sheet has a taller first row; sample its authored bounds. */
export function spriteSource(assets: DefenseAssets, id: SpriteId) {
	const relic = (
		relicSpriteCells as Partial<
			Record<SpriteId, { atlas: RelicAtlas; cell: number }>
		>
	)[id];
	if (relic) {
		const image = assets[relic.atlas];
		const side = image.naturalWidth / 3;
		return {
			image,
			x: (relic.cell % 3) * side,
			y: Math.floor(relic.cell / 3) * side,
			width: side,
			height: side,
		};
	}
	const specialized = (
		specializationSpriteCells as Partial<
			Record<
				SpriteId,
				{ atlas: SpecializationAtlas; cell: number; rows: number }
			>
		>
	)[id];
	if (specialized) {
		const image = assets[specialized.atlas];
		const width = image.naturalWidth / 4;
		const height = image.naturalHeight / specialized.rows;
		return {
			image,
			x: (specialized.cell % 4) * width,
			y: Math.floor(specialized.cell / 4) * height,
			width,
			height,
		};
	}
	if (id === "stoneTower") {
		const image = assets.stoneTower;
		return {
			image,
			x: 0,
			y: 0,
			width: image.naturalWidth,
			height: image.naturalHeight,
		};
	}
	if (id === "flyer" || id === "flyerSide") {
		const image = assets.flyer;
		return {
			image,
			x: (id === "flyerSide" ? 1 : 0) * (image.naturalWidth / 2),
			y: 0,
			width: image.naturalWidth / 2,
			height: image.naturalHeight,
		};
	}
	const cell = spriteCells[id as keyof typeof spriteCells];
	if (cell >= 16) {
		const index = cell - 16;
		const image = assets.siege;
		const top = index < 2 ? 0 : 0.56;
		const height = index < 2 ? 0.56 : 0.44;
		return {
			image,
			x: ((index % 2) * image.naturalWidth) / 2,
			y: top * image.naturalHeight,
			width: image.naturalWidth / 2,
			height: height * image.naturalHeight,
		};
	}
	const side = assets.atlas.naturalWidth / 4;
	return {
		image: assets.atlas,
		x: (cell % 4) * side,
		y: Math.floor(cell / 4) * side,
		width: side,
		height: side,
	};
}
export type Footprint = { base: number; center: number; bottom: number };
export const footprints: Record<string, Footprint> = {
	foundation: { base: 0.771, center: 0.49, bottom: 0.997 },
	arrowTower: { base: 0.691, center: 0.53, bottom: 0.997 },
	oilTower: { base: 0.732, center: 0.513, bottom: 0.997 },
	stoneTower: { base: 0.617, center: 0.5, bottom: 0.905 },
	fireSpecializedTower: { base: 0.687, center: 0.476, bottom: 0.984 },
	headsSpecializedTower: { base: 0.696, center: 0.501, bottom: 0.984 },
	ricochetSpecializedTower: { base: 0.689, center: 0.477, bottom: 0.984 },
	thickSpecializedTower: { base: 0.716, center: 0.471, bottom: 0.982 },
	acidSpecializedTower: { base: 0.739, center: 0.495, bottom: 0.968 },
	soakSpecializedTower: { base: 0.732, center: 0.479, bottom: 0.964 },
	heavySpecializedTower: { base: 0.748, center: 0.482, bottom: 0.964 },
	stunSpecializedTower: { base: 0.723, center: 0.474, bottom: 0.964 },
	construction: { base: 0.771, center: 0.49, bottom: 0.978 },
	upgradeConstruction: { base: 0.583, center: 0.498, bottom: 0.799 },
};
