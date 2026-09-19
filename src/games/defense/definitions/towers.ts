import type {
	Attack,
	TowerState,
	TowerKind,
	TowerLevel,
	SpecializationId,
	TowerDefinition,
} from "../model";
export const towers: Record<TowerKind, TowerDefinition> = {
	arrow: {
		id: "arrow",
		title: "Стрелковая",
		description: "Обстреливает ближайшего к воротам врага.",
		sprite: "arrowTower",
		price: 60,
		upgradePrice: 40,
		specializationPrice: 70,
		attacks: [
			{
				range: 125,
				interval: 0.75,
				projectile: "arrow",
				effects: [{ type: "damage", amount: 12 }],
			},
			{
				range: 125,
				interval: 0.5,
				projectile: "arrow",
				effects: [{ type: "damage", amount: 12 }],
			},
		],
		specializations: [
			{
				id: "heads",
				title: "Тяжёлые наконечники",
				description: "Больше урон и радиус.",
				sprite: "headsSpecializedTower",
				attack: {
					range: 150,
					interval: 0.5,
					projectile: "headsProjectile",
					effects: [{ type: "damage", amount: 19 }],
				},
			},
			{
				id: "fire",
				title: "Огненные стрелы",
				description: "Поджигает промасленных врагов.",
				sprite: "fireSpecializedTower",
				attack: {
					range: 130,
					interval: 0.5,
					projectile: "fireProjectile",
					effects: [{ type: "damage", amount: 12 }, { type: "ignite" }],
				},
			},
			{
				id: "ricochet",
				title: "Рикошет",
				description: "Стрела задевает ещё двух соседей вполсилы.",
				sprite: "ricochetSpecializedTower",
				attack: {
					range: 130,
					interval: 0.55,
					projectile: "ricochetProjectile",
					effects: [{ type: "damage", amount: 12 }],
					ricochet: { targets: 2, factor: 0.5, radius: 70 },
				},
			},
		],
	},
	stone: {
		id: "stone",
		title: "Камнемёт",
		description: "Камни бьют по площади. Сначала разбивает щиты.",
		sprite: "stoneTower",
		price: 100,
		upgradePrice: 60,
		specializationPrice: 90,
		attacks: [
			{
				range: 145,
				interval: 3.6,
				projectile: "stone",
				effects: [{ type: "damage", amount: 24 }],
				splash: { radius: 48, shieldMultiplier: 3 },
			},
			{
				range: 155,
				interval: 3,
				projectile: "stone",
				effects: [{ type: "damage", amount: 32 }],
				splash: { radius: 52, shieldMultiplier: 3 },
			},
		],
		specializations: [
			{
				id: "heavy",
				title: "Тяжёлый камень",
				description: "Больше урон и радиус разлёта.",
				sprite: "heavySpecializedTower",
				attack: {
					range: 155,
					interval: 3,
					projectile: "heavyProjectile",
					effects: [{ type: "damage", amount: 46 }],
					splash: { radius: 66, shieldMultiplier: 3 },
				},
			},
			{
				id: "stun",
				title: "Оглушающий",
				description: "Каждый третий камень оглушает всех в зоне удара.",
				sprite: "stunSpecializedTower",
				attack: {
					range: 155,
					interval: 3,
					projectile: "stunProjectile",
					effects: [{ type: "damage", amount: 28 }],
					splash: { radius: 52, shieldMultiplier: 3 },
					stun: { duration: 1.5, everyNth: 3 },
				},
			},
		],
	},
	oil: {
		id: "oil",
		title: "Масляная",
		description: "Брызги масла замедляют группу. Масло можно поджечь.",
		sprite: "oilTower",
		price: 70,
		upgradePrice: 40,
		specializationPrice: 70,
		attacks: [
			{
				range: 120,
				interval: 1.8,
				projectile: "oilDrop",
				effects: [{ type: "oil", radius: 48, duration: 5, slow: 0.45 }],
			},
			{
				range: 120,
				interval: 1.2,
				projectile: "oilDrop",
				effects: [{ type: "oil", radius: 48, duration: 5, slow: 0.45 }],
			},
		],
		specializations: [
			{
				id: "thick",
				title: "Густое масло",
				description: "Держится дольше, замедляет сильнее, брызги шире.",
				sprite: "thickSpecializedTower",
				attack: {
					range: 120,
					interval: 1.2,
					projectile: "thickProjectile",
					effects: [{ type: "oil", radius: 62, duration: 8, slow: 0.6 }],
				},
			},
			{
				id: "acid",
				title: "Кислота",
				description: "Масло само разъедает врагов и прочность щита.",
				sprite: "acidSpecializedTower",
				attack: {
					range: 120,
					interval: 1.2,
					projectile: "acidProjectile",
					effects: [
						{ type: "oil", radius: 48, duration: 5, slow: 0.3, acid: 7 },
					],
					// Acid is the only coating a shield cannot keep out.
					targets: { shieldSquad: 2 },
				},
			},
			{
				id: "soak",
				title: "Пропитка",
				description:
					"Замедления нет, но промасленный получает урон в полтора раза больше.",
				sprite: "soakSpecializedTower",
				attack: {
					range: 120,
					interval: 1.2,
					projectile: "soakProjectile",
					effects: [
						{
							type: "oil",
							radius: 48,
							duration: 5,
							slow: 0,
							vulnerability: 1.5,
						},
					],
				},
			},
		],
	},
};
export function towerAttack(
	kind: TowerKind,
	level: TowerLevel,
	specialization: SpecializationId | null,
): Attack {
	const definition: TowerDefinition = towers[kind];
	return (
		definition.specializations.find((s) => s.id === specialization)?.attack ??
		definition.attacks[level === 1 ? 0 : 1]
	);
}

export function towerSalePrice(tower: TowerState): number {
	const definition = towers[tower.kind];
	return Math.floor(
		(definition.price +
			(tower.level >= 2 ? definition.upgradePrice : 0) +
			(tower.level === 3 ? definition.specializationPrice : 0)) /
			2,
	);
}
