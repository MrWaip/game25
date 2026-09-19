import { expect, test } from "vite-plus/test";
import { createDefenseSession, type DefenseSnapshot } from "./session";
import type { EnemyState, SpecializationId, TowerKind } from "./model";
import { shieldHealth } from "./definitions/enemies";
import { towers } from "./definitions/towers";
import { projectileImpact } from "./definitions/projectiles";

test("every specialization has a distinct tower, projectile and impact sprite", () => {
	const branches = Object.values(towers).flatMap(
		(definition) => definition.specializations,
	);
	expect(branches).toHaveLength(8);
	expect(new Set(branches.map((branch) => branch.sprite)).size).toBe(8);
	expect(new Set(branches.map((branch) => branch.attack.projectile)).size).toBe(
		8,
	);
	for (const branch of branches) {
		expect(branch.sprite).toBe(`${branch.id}SpecializedTower`);
		expect(branch.attack.projectile).toBe(`${branch.id}Projectile`);
		expect(projectileImpact(branch.attack.projectile)).toBe(
			`${branch.id}Impact`,
		);
	}
});

function goblin(id: number, distance = 245, hp = 400): EnemyState {
	return {
		id,
		kind: "goblin",
		distance,
		hp,
		maxHp: hp,
		oil: 0,
		layers: 0,
		slow: 0,
		acid: 0,
		vulnerability: 1,
		stun: 0,
		burn: 0,
		burnStacks: 0,
		spreadIn: 0,
	};
}

async function battle(
	kind: TowerKind,
	specialization: SpecializationId | null,
	units: EnemyState[],
	configure: (state: DefenseSnapshot) => void = () => {},
) {
	const initial = await createDefenseSession({ seed: "specialization" });
	initial.startWave();
	initial.build(0, kind);
	const state = initial.snapshot();
	await initial.destroy();
	state.towers[0].level = specialization ? 3 : 2;
	state.towers[0].specialization = specialization;
	state.towers[0].construction = 0;
	state.towers[0].constructionKind = null;
	state.enemies = units;
	state.remaining = 0;
	state.nextId = Math.max(0, ...units.map((enemy) => enemy.id)) + 1;
	configure(state);
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-7", run: state }),
	});
}

test("heavy arrowheads hit harder than the plain upgraded tower", async () => {
	const plain = await battle("arrow", null, [goblin(1)]);
	const heads = await battle("arrow", "heads", [goblin(1)]);
	try {
		plain.step(60);
		heads.step(60);
		expect(heads.snapshot().enemies[0].hp).toBeLessThan(
			plain.snapshot().enemies[0].hp,
		);
	} finally {
		await plain.destroy();
		await heads.destroy();
	}
});

test("ricochet spreads a volley over two extra neighbours and spares the distant one", async () => {
	const session = await battle("arrow", "ricochet", [
		goblin(1, 245),
		goblin(2, 240),
		goblin(3, 235),
		goblin(4, 20),
	]);
	try {
		session.step(120);
		const [main, second, third, far] = session.snapshot().enemies;
		expect(400 - main.hp).toBeGreaterThan(0);
		expect(400 - second.hp).toBeGreaterThan(0);
		expect(400 - third.hp).toBeGreaterThan(0);
		expect(400 - second.hp).toBeLessThan(400 - main.hp);
		expect(far.hp).toBe(400);
	} finally {
		await session.destroy();
	}
});

test("each bounce flies as its own arrow instead of landing instantly", async () => {
	const session = await battle("arrow", "ricochet", [
		goblin(1, 245),
		goblin(2, 240),
		goblin(3, 235),
	]);
	try {
		const bounced = new Set<number>();
		for (let i = 0; i < 60; i++) {
			session.step();
			for (const shot of session.snapshot().shots)
				if (shot.impact && shot.impact.targetId !== 1)
					bounced.add(shot.impact.targetId);
		}
		expect([...bounced].sort((a, b) => a - b)).toEqual([2, 3]);
	} finally {
		await session.destroy();
	}
});

test("thick oil lasts longer and slows harder than plain oil", async () => {
	const plain = await battle("oil", null, [goblin(1)]);
	const thick = await battle("oil", "thick", [goblin(1)]);
	try {
		plain.step(120);
		thick.step(120);
		expect(thick.snapshot().enemies[0].oil).toBeGreaterThan(
			plain.snapshot().enemies[0].oil,
		);
		expect(thick.snapshot().enemies[0].slow).toBeGreaterThan(
			plain.snapshot().enemies[0].slow,
		);
	} finally {
		await plain.destroy();
		await thick.destroy();
	}
});

test("acid oil burns down health on its own and eats a shield", async () => {
	const session = await battle("oil", "acid", [goblin(1)]);
	const squad = await battle("oil", "acid", [
		{
			...goblin(1, 245, shieldHealth),
			kind: "shieldSquad",
			maxHp: shieldHealth,
			memberHp: 45,
		},
	]);
	try {
		session.step(180);
		squad.step(180);
		expect(session.snapshot().enemies[0].hp).toBeLessThan(400);
		expect(session.snapshot().enemies[0].burn).toBe(0);
		const shield = squad.snapshot().enemies[0];
		expect(shield.kind === "shieldSquad" ? shield.hp : 0).toBeLessThan(
			shieldHealth,
		);
	} finally {
		await session.destroy();
		await squad.destroy();
	}
});

test("soaking oil drops the slow but multiplies every hit the target takes", async () => {
	const plain = await battle("oil", null, [goblin(1)], (state) => {
		state.towers.push({
			slot: 1,
			kind: "arrow",
			level: 2,
			specialization: null,
			cooldown: 0,
			construction: 0,
			constructionKind: null,
			shots: 0,
			rate: 1,
			rushed: 0,
			order: 0,
		});
	});
	const soak = await battle("oil", "soak", [goblin(1)], (state) => {
		state.towers.push({
			slot: 1,
			kind: "arrow",
			level: 2,
			specialization: null,
			cooldown: 0,
			construction: 0,
			constructionKind: null,
			shots: 0,
			rate: 1,
			rushed: 0,
			order: 0,
		});
	});
	try {
		plain.step(240);
		soak.step(240);
		expect(soak.snapshot().enemies[0].slow).toBe(0);
		expect(soak.snapshot().enemies[0].hp).toBeLessThan(
			plain.snapshot().enemies[0].hp,
		);
	} finally {
		await plain.destroy();
		await soak.destroy();
	}
});

test("a heavy stone hits harder and wider than the plain catapult", async () => {
	const plain = await battle("stone", null, [goblin(1), goblin(2, 200)]);
	const heavy = await battle("stone", "heavy", [goblin(1), goblin(2, 200)]);
	try {
		plain.step(300);
		heavy.step(300);
		expect(heavy.snapshot().enemies[0].hp).toBeLessThan(
			plain.snapshot().enemies[0].hp,
		);
	} finally {
		await plain.destroy();
		await heavy.destroy();
	}
});

test("every third stunning stone freezes the enemies it lands on", async () => {
	const session = await battle("stone", "stun", [
		goblin(1, 60),
		goblin(2, 30),
		goblin(3, 10),
	]);
	try {
		let frozen: { id: number; distance: number } | undefined;
		for (let i = 0; i < 1200 && !frozen; i++) {
			session.step();
			const hit = session.snapshot().enemies.find((enemy) => enemy.stun > 0);
			if (hit) frozen = { id: hit.id, distance: hit.distance };
		}
		expect(frozen).toBeDefined();
		session.step(30);
		const after = session
			.snapshot()
			.enemies.find((enemy) => enemy.id === frozen!.id)!;
		expect(after.distance).toBe(frozen!.distance);
	} finally {
		await session.destroy();
	}
});
