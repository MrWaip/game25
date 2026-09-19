import type { Enemy } from "@/games/defense/components/enemyComponent";
import type { Tower } from "@/games/defense/components/towerComponent";
import type { Run } from "@/games/defense/components/runComponent";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
import type { Upgrade } from "@/games/defense/config";
import { damageReceived } from "@/games/defense/combatRules";
import { isChilled } from "@/games/defense/worldRules";

export function signal(run: Run, key: Upgrade): void {
	run.triggers[key] = (run.triggers[key] ?? 0) + 1;
}

/** Trigger damage cannot trigger another on-hit effect. Death reactions are
 * resolved by the attack system once per enemy, so chains are finite. */
export function reactionDamage(
	run: Run,
	build: BuildModifiers,
	tower: Tower,
	target: Enemy,
	amount: number,
	effect: NonNullable<Tower["shots"]>[number]["effect"],
): void {
	if (target.hp <= 0) return;
	if (target.shield > 0) target.shield--;
	else
		target.hp -= damageReceived(
			target,
			amount,
			"magic",
			isChilled(run, target, build),
			build,
		);
	(tower.shots ??= []).push({ x: target.x, y: target.y, life: 0.4, effect });
}

export function hitReactions(
	run: Run,
	build: BuildModifiers,
	tower: Tower,
	enemy: Enemy,
	enemies: readonly Enemy[],
	damage: number,
): void {
	if (build.chargeDamage > 0) {
		enemy.charge++;
		if (enemy.charge >= 5) {
			enemy.charge = 0;
			signal(run, "charge");
			const targets = [
				enemy,
				...enemies
					.filter(
						(e) =>
							e !== enemy &&
							e.hp > 0 &&
							Math.hypot(e.x - enemy.x, e.y - enemy.y) <= 100,
					)
					.slice(0, 2),
			];
			for (const target of targets)
				reactionDamage(
					run,
					build,
					tower,
					target,
					build.chargeDamage * tower.level,
					"lightning",
				);
		}
	}
	if (tower.overdrive > 0 && build.overdriveSplash > 0) {
		signal(run, "overdriveEcho");
		for (const target of enemies)
			if (Math.hypot(target.x - enemy.x, target.y - enemy.y) <= 65)
				reactionDamage(
					run,
					build,
					tower,
					target,
					damage * build.overdriveSplash,
					"blast",
				);
	}
	if (
		build.executionThreshold > 0 &&
		enemy.shield === 0 &&
		enemy.hp > 0 &&
		enemy.hp / enemy.maxHp <
			(enemy.kind === "boss" ? 0.05 : build.executionThreshold)
	) {
		enemy.hp = 0;
		signal(run, "execution");
		(tower.shots ??= []).push({
			x: enemy.x,
			y: enemy.y,
			life: 0.45,
			effect: "execute",
		});
	}
}

export function deathReactions(
	run: Run,
	build: BuildModifiers,
	tower: Tower,
	enemy: Enemy,
	enemies: readonly Enemy[],
): void {
	if (build.harvestGrowth > 0) {
		run.harvestKills++;
		if (run.harvestKills % 10 === 0) signal(run, "soulHarvest");
	}
	if (build.deathSlow > 0 && isChilled(run, enemy, build)) {
		signal(run, "coldDeath");
		for (const nearby of enemies)
			if (
				nearby.hp > 0 &&
				Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) <= 80
			)
				nearby.slow = Math.max(nearby.slow, build.deathSlow);
	}
	if (build.acidBurstDamage > 0 && enemy.corrosion > 0) {
		signal(run, "acidBurst");
		for (const nearby of enemies) {
			if (
				nearby.hp <= 0 ||
				Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) > 80
			)
				continue;
			nearby.corrosion = Math.min(0.65, nearby.corrosion + 0.2);
			nearby.corrosionTime = 4;
			reactionDamage(
				run,
				build,
				tower,
				nearby,
				build.acidBurstDamage * tower.level,
				"acid",
			);
		}
	}
}
