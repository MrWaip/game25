import { upgrades, type Upgrade } from "@/games/defense/definitions/upgrades";

type SynergyTag =
	| "armor"
	| "aura"
	| "charge"
	| "economy"
	| "frost"
	| "hit"
	| "kill"
	| "magic"
	| "overdrive"
	| "physical"
	| "portal"
	| "shield"
	| "spacing";

const tags: Record<Upgrade, readonly SynergyTag[]> = {
	charge: ["hit", "charge", "magic"],
	acidBurst: ["armor", "kill", "magic"],
	execution: ["hit", "kill"],
	soulHarvest: ["kill"],
	solitude: ["spacing"],
	auraPower: ["aura", "hit"],
	overdriveEcho: ["overdrive", "hit", "magic"],
	crossfire: ["physical", "magic", "hit"],
	reserve: ["overdrive", "economy"],
	shieldBurst: ["shield", "hit", "magic"],
	frostRelay: ["frost", "hit"],
	conduction: ["frost", "hit", "magic"],
	coldDeath: ["frost", "kill"],
	snowfall: ["frost", "spacing"],
	portal: ["portal", "spacing"],
	chill: ["frost", "hit"],
	shatter: ["frost", "hit", "magic"],
	echo: ["portal", "frost", "hit"],
	freeze: ["frost", "spacing"],
	chain: ["hit", "shield", "charge"],
	power: ["physical", "magic"],
	haste: ["hit", "charge"],
};

const chainOrder: readonly Upgrade[] = [
	"snowfall",
	"portal",
	"frostRelay",
	"chain",
	"haste",
	"auraPower",
	"chill",
	"conduction",
	"crossfire",
	"charge",
	"shieldBurst",
	"shatter",
	"execution",
	"acidBurst",
	"coldDeath",
	"echo",
	"overdriveEcho",
	"soulHarvest",
];

export function connectedUpgrades(
	bonuses: Record<Upgrade, number>,
	candidate: Upgrade,
): Upgrade[] {
	const owned = (Object.keys(upgrades) as Upgrade[]).filter(
		(key) => bonuses[key] > 0 && key !== candidate,
	);
	return owned.filter((key) =>
		tags[key].some((tag) => tags[candidate].includes(tag)),
	);
}

export function shopRole(
	bonuses: Record<Upgrade, number>,
	candidate: Upgrade,
): "ПРОДОЛЖЕНИЕ" | "НОВАЯ ВЕТВЬ" | "УСИЛЕНИЕ" {
	if (bonuses[candidate] > 0) return "УСИЛЕНИЕ";
	return connectedUpgrades(bonuses, candidate).length
		? "ПРОДОЛЖЕНИЕ"
		: "НОВАЯ ВЕТВЬ";
}

export function connectionHint(
	bonuses: Record<Upgrade, number>,
	candidate: Upgrade,
): string {
	const connected = connectedUpgrades(bonuses, candidate);
	if (!connected.length) return "Открывает новый язык эффектов";
	return `Связано: ${connected
		.slice(0, 2)
		.map((key) => upgrades[key].title)
		.join(" + ")}`;
}

export function discoveredChain(
	bonuses: Record<Upgrade, number>,
	triggers: Partial<Record<Upgrade, number>>,
): Upgrade[] {
	return chainOrder.filter(
		(key) => bonuses[key] > 0 && (triggers[key] ?? 0) > 0,
	);
}
