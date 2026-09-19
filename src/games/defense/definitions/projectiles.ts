import type {
	ProjectileSpriteId,
	SpecializationImpactId,
	SpecializationProjectileId,
	SpriteId,
} from "../model";

export type ProjectileKind = "arrow" | "liquid" | "stone";

export const projectileSprites = [
	"arrow",
	"oilDrop",
	"stone",
	"headsProjectile",
	"fireProjectile",
	"ricochetProjectile",
	"thickProjectile",
	"acidProjectile",
	"soakProjectile",
	"heavyProjectile",
	"stunProjectile",
] as const satisfies readonly ProjectileSpriteId[];

const specializationKinds: Record<SpecializationProjectileId, ProjectileKind> =
	{
		headsProjectile: "arrow",
		fireProjectile: "arrow",
		ricochetProjectile: "arrow",
		thickProjectile: "liquid",
		acidProjectile: "liquid",
		soakProjectile: "liquid",
		heavyProjectile: "stone",
		stunProjectile: "stone",
	};

const specializationImpacts: Record<
	SpecializationProjectileId,
	SpecializationImpactId
> = {
	headsProjectile: "headsImpact",
	fireProjectile: "fireImpact",
	ricochetProjectile: "ricochetImpact",
	thickProjectile: "thickImpact",
	acidProjectile: "acidImpact",
	soakProjectile: "soakImpact",
	heavyProjectile: "heavyImpact",
	stunProjectile: "stunImpact",
};

export function projectileKind(sprite: SpriteId): ProjectileKind | undefined {
	if (sprite === "arrow") return "arrow";
	if (sprite === "oilDrop") return "liquid";
	if (sprite === "stone") return "stone";
	return (specializationKinds as Partial<Record<SpriteId, ProjectileKind>>)[
		sprite
	];
}

export function projectileImpact(
	sprite: SpriteId,
): SpecializationImpactId | undefined {
	return (
		specializationImpacts as Partial<Record<SpriteId, SpecializationImpactId>>
	)[sprite];
}

export function flightTime(sprite: SpriteId | "breach"): number {
	if (sprite === "breach") return 0;
	const kind = projectileKind(sprite);
	if (kind === "stone") return 0.7;
	return kind === "liquid" ? 0.24 : 0.28;
}

export function shotLifetime(sprite: SpriteId | "breach"): number {
	if (sprite === "breach") return 0.8;
	return flightTime(sprite) + 0.6;
}
