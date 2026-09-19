import {
	flightTime,
	shotLifetime,
	projectileImpact,
	projectileKind,
} from "./definitions/projectiles";
import { extensionHeight } from "./board";
import {
	paintFlame,
	paintSmoke,
	paintProjectile,
	type EffectLayer,
} from "@/render/effects";
import { DefenseTerrain } from "./boardScene";
import { paintTerrain } from "./render/terrain";
import type { PlacementPreview } from "./boardInput";
import { enemies } from "./definitions/enemies";
import { arcPoint, interpolatePoint, type Point } from "@/primitives/spatial";
import { CanvasSurface, type PaintContext } from "@/render/surface";
import type { CanvasElement } from "@/render/canvas";
import type { DefenseSnapshot } from "./session";
import type { ShotState, SpriteId } from "./model";
import {
	boardWidth,
	boardHeight,
	roadFor,
	pointOnRoad,
	pathLengthFor,
} from "./board";
import { towers, towerAttack } from "./definitions/towers";
import { footprints, spriteSource, type DefenseAssets } from "./assets";

const siteBase = 44;
const siteBottom = 24;
import { theme } from "./theme";
import { balance } from "./config";
import { queuePosition } from "./builders";
import { relics } from "./definitions/relics";
import {
	enemyStatuses,
	rarityLooks,
	towerBuffs,
	type EnemyStatus,
} from "./relicView";

const statusLooks: Record<EnemyStatus["id"], { fill: string; glyph: string }> =
	{
		oil: { fill: "#2b2118", glyph: "●" },
		acid: { fill: "#5fbf2f", glyph: "●" },
		vulnerable: { fill: "#9b59d0", glyph: "!" },
		burn: { fill: "#e8672a", glyph: "" },
		stun: { fill: "#f2c14e", glyph: "★" },
	};

export class DefenseRenderer {
	private surface: CanvasSurface;
	private terrain = new DefenseTerrain();
	constructor(
		canvas: CanvasElement,
		private assets: DefenseAssets,
	) {
		this.surface = new CanvasSurface(canvas);
	}
	private sprite(
		ctx: PaintContext,
		id: SpriteId,
		x: number,
		y: number,
		size: number,
		anchor: Point = { x: 0.5, y: 0.5 },
	) {
		const source = spriteSource(this.assets, id);
		const scale = size / Math.max(source.width, source.height);
		const width = source.width * scale,
			height = source.height * scale;
		ctx.drawImage(
			source.image,
			source.x,
			source.y,
			source.width,
			source.height,
			x - width * anchor.x,
			y - height * anchor.y,
			width,
			height,
		);
	}
	private onSite(
		ctx: PaintContext,
		id: SpriteId | "construction",
		x: number,
		y: number,
	) {
		const footprint = footprints[id];
		const size = siteBase / footprint.base;
		if (id === "construction") {
			const image = this.assets.construction;
			ctx.drawImage(
				image,
				x - size * footprint.center,
				y + siteBottom - size * footprint.bottom,
				size,
				size,
			);
			return;
		}
		this.sprite(ctx, id, x, y + siteBottom, size, {
			x: footprint.center,
			y: footprint.bottom,
		});
	}
	private image(
		ctx: PaintContext,
		image: HTMLImageElement,
		x: number,
		y: number,
		size: number,
	) {
		const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
		ctx.drawImage(
			image,
			x - (image.naturalWidth * scale) / 2,
			y - (image.naturalHeight * scale) / 2,
			image.naturalWidth * scale,
			image.naturalHeight * scale,
		);
	}
	private drawBuffs(
		ctx: PaintContext,
		state: DefenseSnapshot,
		tower: DefenseSnapshot["towers"][number],
		site: Point,
	): void {
		const gate = pointOnRoad(pathLengthFor(state.level), state.level);
		const buffs = towerBuffs(state, tower, state.sites, gate);
		const size = 11;
		buffs.slice(0, 5).forEach((buff, index) => {
			const x = site.x + 30;
			const y = site.y - 24 + index * (size + 2);
			ctx.fillStyle = "#fff";
			ctx.globalAlpha = 0.7;
			ctx.beginPath();
			ctx.arc(x, y, size / 2 + 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.strokeStyle = rarityLooks[relics[buff.relic].rarity].frame;
			ctx.lineWidth = 1;
			ctx.stroke();
			this.sprite(ctx, relics[buff.relic].sprite, x, y, size);
			if (buff.relic === "rush") {
				ctx.strokeStyle = theme.gold;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.arc(
					x,
					y,
					size / 2 + 0.5,
					-Math.PI / 2,
					-Math.PI / 2 + (Math.PI * 2 * tower.rushed) / balance.rushSeconds,
				);
				ctx.stroke();
			}
		});
	}
	private drawHammer(ctx: PaintContext, site: Point, time: number): void {
		const beat = (time * 2.2) % 1;
		const swing = beat < 0.7 ? -1.1 + (beat / 0.7) * 1.1 : -(beat - 0.7) * 3.6;
		ctx.save();
		ctx.translate(site.x + 14, site.y - 14);
		ctx.rotate(swing);
		ctx.fillStyle = theme.roadEdge;
		ctx.fillRect(-1.5, -14, 3, 14);
		ctx.fillStyle = theme.muted;
		ctx.fillRect(-6, -18, 12, 6);
		ctx.restore();
		if (beat < 0.7) return;
		const puff = (beat - 0.7) / 0.3;
		ctx.fillStyle = theme.text;
		ctx.globalAlpha = 0.5 * (1 - puff);
		for (let dust = 0; dust < 3; dust++) {
			ctx.beginPath();
			ctx.arc(
				site.x + 4 + (dust - 1) * 7 * puff,
				site.y - 4 - puff * 6,
				1.5 + puff * 2,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}
	private drawStatuses(
		ctx: PaintContext,
		enemy: DefenseSnapshot["enemies"][number],
		x: number,
		barY: number,
		time: number,
	): void {
		const statuses = enemyStatuses(enemy);
		statuses.forEach((status, index) => {
			const look = statusLooks[status.id];
			const cx = x + (index - (statuses.length - 1) / 2) * 12;
			const cy = barY - 8;
			ctx.fillStyle = look.fill;
			ctx.beginPath();
			ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = theme.shadow;
			ctx.lineWidth = 1;
			ctx.stroke();
			const glyph =
				status.id === "burn"
					? String(status.stacks)
					: status.id === "oil" && status.layers
						? String(status.layers)
						: look.glyph;
			ctx.fillStyle = status.id === "stun" ? theme.shadow : "#fff";
			ctx.font = "800 8px system-ui, sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(glyph, cx, cy + 0.5);
		});
		if (enemy.stun > 0) {
			ctx.fillStyle = statusLooks.stun.fill;
			ctx.font = "700 7px system-ui, sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			for (let star = 0; star < 3; star++) {
				const angle = time * 5 + (star * Math.PI * 2) / 3;
				ctx.fillText(
					"★",
					x + Math.cos(angle) * 9,
					barY - 20 + Math.sin(angle) * 3,
				);
			}
		}
	}
	private ground(seed: string, level: number, top: number): CanvasImageSource {
		return this.surface.layer(
			`ground:${seed}:${level}`,
			{ width: boardWidth, height: boardHeight - top },
			(ctx) => {
				ctx.translate(0, -top);
				ctx.imageSmoothingQuality = "high";
				paintTerrain(ctx, this.terrain.prepare(seed, level, this.assets));
				this.drawFirstRegionBranding(ctx);
			},
		);
	}
	private drawFirstRegionBranding(ctx: PaintContext): void {
		// These are fixed landmarks of the starting (green) region. Extensions
		// keep their own biome scenery and do not repeat the campaign branding.
		ctx.save();
		ctx.globalAlpha = 1;
		this.image(ctx, this.assets.ozonBanner, 42, 430, 72);
		ctx.restore();
	}
	private drawBreach(ctx: PaintContext, shot: ShotState) {
		const progress = Math.min(1, shot.age / shotLifetime("breach"));
		const { x, y } = shot.to;
		ctx.globalAlpha = (1 - progress) * 0.55;
		ctx.fillStyle = theme.red;
		ctx.beginPath();
		ctx.ellipse(x, y, 14 + progress * 30, 7 + progress * 12, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1 - progress;
		ctx.fillStyle = theme.stone;
		for (let chip = 0; chip < 6; chip++) {
			const angle = -Math.PI * (0.15 + (chip / 5) * 0.7);
			const reach = 8 + progress * 26;
			ctx.fillRect(
				x + Math.cos(angle) * reach,
				y + Math.sin(angle) * reach + progress * progress * 18,
				3,
				3,
			);
		}
		ctx.fillStyle = theme.red;
		ctx.font = "800 13px system-ui, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("−1", x + 16, y - 12 - progress * 18);
		ctx.globalAlpha = 1;
	}
	private drawSiegeShot(
		ctx: PaintContext,
		shot: ShotState,
		layer: EffectLayer,
	) {
		ctx.save();
		if (shot.sprite === "breach") {
			if (layer === "air") this.drawBreach(ctx, shot);
		} else if (shot.sprite === "shieldBreak") {
			if (layer === "air") {
				const progress = Math.min(1, shot.age / 0.65);
				ctx.globalAlpha = 1 - progress;
				this.sprite(
					ctx,
					"shieldBreak",
					shot.to.x,
					shot.to.y - 16 - progress * 12,
					45 + progress * 45,
				);
			}
		} else {
			const progress = Math.min(1, shot.age / flightTime("stone"));
			if (progress < 1) {
				if (layer === "ground") {
					const p = interpolatePoint(shot.from, shot.to, progress);
					ctx.globalAlpha = 0.25;
					ctx.fillStyle = theme.shadow;
					ctx.beginPath();
					ctx.ellipse(p.x, p.y, 7, 3, 0, 0, Math.PI * 2);
					ctx.fill();
				} else {
					const p = arcPoint(shot.from, shot.to, progress, 55);
					ctx.translate(p.x, p.y);
					ctx.rotate(progress * Math.PI * 2);
					this.sprite(ctx, "stone", 0, 0, 19);
				}
			} else if (layer === "ground") {
				const fade = Math.min(1, (shot.age - flightTime("stone")) / 0.6);
				ctx.globalAlpha = (1 - fade) * 0.65;
				ctx.strokeStyle = theme.stone;
				ctx.lineWidth = 3 * (1 - fade);
				ctx.beginPath();
				ctx.ellipse(
					shot.to.x,
					shot.to.y,
					8 + fade * 40,
					4 + fade * 20,
					0,
					0,
					Math.PI * 2,
				);
				ctx.stroke();
				for (let i = 0; i < 6; i++) {
					const angle = (i * Math.PI) / 3;
					this.sprite(
						ctx,
						"stone",
						shot.to.x + Math.cos(angle) * fade * 35,
						shot.to.y +
							Math.sin(angle) * fade * 18 -
							Math.sin(fade * Math.PI) * 12,
						6,
					);
				}
			}
		}
		ctx.restore();
	}
	private drawSpecializationShot(
		ctx: PaintContext,
		shot: ShotState,
		layer: EffectLayer,
	): boolean {
		if (shot.sprite === "breach") return false;
		const impact = projectileImpact(shot.sprite);
		if (!impact) return false;
		const kind = projectileKind(shot.sprite)!;
		const flight = flightTime(shot.sprite);
		ctx.save();
		if (shot.age >= flight) {
			const impactLayer = kind === "arrow" ? "air" : "ground";
			if (layer === impactLayer) {
				const progress = Math.min(1, (shot.age - flight) / 0.6);
				ctx.globalAlpha = (1 - progress) ** 1.5;
				const size =
					(kind === "stone" ? 58 : kind === "liquid" ? 48 : 36) *
					(0.75 + progress * 0.55);
				this.sprite(
					ctx,
					impact,
					shot.to.x,
					shot.to.y - (kind === "arrow" ? 12 : 0),
					size,
				);
			}
			ctx.restore();
			return true;
		}
		const origin = { x: shot.from.x, y: shot.from.y - 19 };
		const destination = {
			x: shot.to.x,
			y: shot.to.y - (kind === "arrow" ? 12 : 0),
		};
		const progress = Math.min(1, shot.age / flight);
		const height = kind === "liquid" ? 42 : kind === "stone" ? 55 : 0;
		const point = arcPoint(origin, destination, progress, height);
		if (layer === "ground" && kind === "stone") {
			ctx.globalAlpha = 0.22;
			ctx.fillStyle = theme.shadow;
			ctx.beginPath();
			ctx.ellipse(point.x, shot.to.y, 7, 3, 0, 0, Math.PI * 2);
			ctx.fill();
		} else if (layer === "air") {
			const tail = arcPoint(
				origin,
				destination,
				Math.max(0, progress - 0.08),
				height,
			);
			ctx.translate(point.x, point.y);
			ctx.rotate(
				kind === "stone"
					? shot.age * 8
					: Math.atan2(point.y - tail.y, point.x - tail.x),
			);
			this.sprite(
				ctx,
				shot.sprite,
				0,
				0,
				kind === "arrow" ? 31 : kind === "liquid" ? 19 : 23,
			);
		}
		ctx.restore();
		return true;
	}
	private drawEntrance(
		ctx: PaintContext,
		x: number,
		y: number,
		collapse = 0,
	): void {
		if (collapse > 0) {
			ctx.save();
			ctx.fillStyle = theme.roadEdge;
			for (let i = 0; i < 7; i++) {
				ctx.beginPath();
				ctx.ellipse(
					x + (i - 3) * 9,
					y - 2 + Math.sin(i * 3) * 4,
					8,
					5,
					i,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
			if (collapse < 1) {
				const image = this.assets.enemyCastle;
				for (let i = 0; i < 6; i++) {
					ctx.save();
					ctx.globalAlpha = 1 - collapse;
					ctx.translate(
						x - 42 + i * 14 + Math.sin(i * 7) * collapse * 13,
						y - 76 + collapse * collapse * (42 + i * 4),
					);
					ctx.rotate((i - 2.5) * collapse * 0.12);
					ctx.drawImage(
						image,
						(i * image.naturalWidth) / 6,
						0,
						image.naturalWidth / 6,
						image.naturalHeight,
						0,
						0,
						14,
						84,
					);
					ctx.restore();
				}
				ctx.globalAlpha = Math.sin(collapse * Math.PI) * 0.35;
				ctx.fillStyle = theme.road;
				for (let i = 0; i < 5; i++) {
					ctx.beginPath();
					ctx.ellipse(
						x + (i - 2) * 16 * collapse,
						y - collapse * 12,
						12 + collapse * 9,
						7 + collapse * 6,
						0,
						0,
						Math.PI * 2,
					);
					ctx.fill();
				}
			}
			ctx.restore();
			return;
		}
		// The arch threshold is at 90% of the sprite height.
		ctx.drawImage(this.assets.enemyCastle, x - 42, y - 76, 84, 84);
	}

	draw(
		state: DefenseSnapshot,
		selected: number | null,
		placement: PlacementPreview | null = null,
		collapse: { level: number; progress: number } | null = null,
		visible: { top: number; bottom: number } | null = null,
	): void {
		const top = -(state.level - 1) * extensionHeight;
		this.surface.resizeToDisplay(
			{ width: boardWidth, height: boardHeight - top },
			devicePixelRatio || 1,
		);
		const ground = this.ground(state.seed, state.level, top);
		this.surface.frame((ctx) => {
			ctx.imageSmoothingQuality = "high";
			ctx.translate(0, -top);
			if (visible) {
				ctx.beginPath();
				ctx.rect(0, visible.top, boardWidth, visible.bottom - visible.top);
				ctx.clip();
			}
			const path = roadFor(state.level);
			ctx.drawImage(ground, 0, top, boardWidth, boardHeight - top);
			for (const [index, site] of state.sites.entries()) {
				if (!state.towers.some((t) => t.slot === index))
					this.onSite(ctx, "foundation", site.x, site.y);
			}
			if (selected !== null) {
				const site = state.sites[selected];
				const tower = state.towers.find((t) => t.slot === selected);
				if (site) {
					ctx.fillStyle = theme.blue;
					ctx.globalAlpha = 0.12;
					ctx.beginPath();
					ctx.arc(
						site.x,
						site.y,
						tower
							? towerAttack(tower.kind, tower.level, tower.specialization).range
							: 30,
						0,
						Math.PI * 2,
					);
					ctx.fill();
					ctx.globalAlpha = 1;
					ctx.strokeStyle = theme.gold;
					ctx.lineWidth = 2;
					ctx.strokeRect(site.x - 26, site.y - 26, 52, 52);
				}
			}
			if (placement && state.sites[placement.slot]) {
				const p = state.sites[placement.slot];
				ctx.strokeStyle = placement.valid ? theme.green : theme.red;
				ctx.fillStyle = ctx.strokeStyle;
				ctx.globalAlpha = 0.12;
				ctx.beginPath();
				ctx.arc(
					p.x,
					p.y,
					towers[placement.kind].attacks[0].range,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.strokeRect(p.x - 26, p.y - 26, 52, 52);
				if (!state.towers.some((t) => t.slot === placement.slot)) {
					ctx.globalAlpha = 0.6;
					this.onSite(ctx, towers[placement.kind].sprite, p.x, p.y);
					ctx.globalAlpha = 1;
				}
			}
			for (const tower of state.towers) {
				const definition = towers[tower.kind],
					site = state.sites[tower.slot];
				const sprite =
					definition.specializations.find((s) => s.id === tower.specialization)
						?.sprite ?? definition.sprite;
				const recent = state.shots.find(
					(shot) =>
						shot.from.x === site.x && shot.from.y === site.y && shot.age < 0.2,
				);
				const recoil = recent
					? Math.sin(Math.min(1, recent.age / 0.18) * Math.PI) * 4
					: 0;
				const direction = recent
					? Math.atan2(recent.to.y - site.y, recent.to.x - site.x)
					: 0;
				if (tower.constructionKind !== "build") {
					this.onSite(
						ctx,
						sprite,
						site.x - Math.cos(direction) * recoil,
						site.y - Math.sin(direction) * recoil,
					);
				}
				if (tower.constructionKind) {
					if (tower.constructionKind === "build")
						this.onSite(ctx, "construction", site.x, site.y);
					else
						this.image(
							ctx,
							this.assets.upgradeConstruction,
							site.x,
							site.y - 5,
							67,
						);
					const progress = 1 - tower.construction / balance.constructionSeconds;
					ctx.fillStyle = theme.shadow;
					ctx.fillRect(site.x - 22, site.y + 26, 44, 5);
					ctx.fillStyle = theme.gold;
					ctx.fillRect(site.x - 21, site.y + 27, 42 * progress, 3);
					const position = queuePosition(state.towers, tower);
					if (position) {
						ctx.fillStyle = theme.panel;
						ctx.globalAlpha = 0.85;
						ctx.fillRect(site.x - 26, site.y + 8, 52, 13);
						ctx.globalAlpha = 1;
						ctx.fillStyle = theme.text;
						ctx.font = "700 9px system-ui, sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(`очередь ${position}`, site.x, site.y + 15);
					} else
						this.drawHammer(
							ctx,
							site,
							state.elapsedSeconds + tower.slot * 0.37,
						);
				}
				for (let dot = 0; dot < tower.level; dot++) {
					ctx.fillStyle = theme.gold;
					ctx.beginPath();
					ctx.arc(
						site.x + (dot - (tower.level - 1) / 2) * 7,
						site.y + 25,
						2.5,
						0,
						Math.PI * 2,
					);
					ctx.fill();
				}
				if (tower.construction === 0) this.drawBuffs(ctx, state, tower, site);
			}
			for (let level = 1; level < state.level; level++) {
				const entrance = roadFor(level)[0];
				this.drawEntrance(
					ctx,
					entrance.x,
					entrance.y,
					collapse?.level === level ? collapse.progress : 1,
				);
			}
			this.drawEntrance(ctx, path[0].x, path[0].y);
			const units = state.enemies
				.map((enemy) => {
					const p = pointOnRoad(enemy.distance, state.level),
						definition = enemies[enemy.kind];
					return {
						enemy,
						p,
						definition,
						bodyY:
							p.y -
							definition.hover -
							definition.spriteSize * (definition.spriteAnchor.y - 0.5),
						bob:
							Math.sin(enemy.distance / 3 + enemy.id) *
							(definition.hover > 0 ? 2.6 : 1.2),
						topY:
							p.y -
							definition.hover -
							definition.spriteSize * definition.spriteAnchor.y,
					};
				})
				.sort(
					(a, b) => a.p.y - b.p.y || a.p.x - b.p.x || a.enemy.id - b.enemy.id,
				);
			const drawProjectiles = (layer: EffectLayer) => {
				for (const shot of state.shots) {
					if (this.drawSpecializationShot(ctx, shot, layer)) continue;
					if (
						shot.sprite === "stone" ||
						shot.sprite === "shieldBreak" ||
						shot.sprite === "breach"
					) {
						this.drawSiegeShot(ctx, shot, layer);
						continue;
					}
					paintProjectile(
						ctx,
						shot.from,
						shot.to,
						shot.age,
						{
							kind: shot.sprite === "oilDrop" ? "liquid" : "arrow",
							flightTime: flightTime(shot.sprite),
							color: shot.sprite === "oilDrop" ? theme.oil : theme.roadEdge,
							highlight:
								shot.sprite === "oilDrop" ? theme.oilHighlight : theme.text,
							flame: shot.fire
								? {
										edge: theme.fireEdge,
										middle: theme.fire,
										core: theme.fireCore,
										smoke: theme.smoke,
									}
								: undefined,
						},
						layer,
					);
				}
			};
			// Every ground effect must precede every unit, including its neighbours.
			drawProjectiles("ground");
			for (const { enemy, p, definition, bodyY } of units) {
				const flying = definition.hover > 0;
				ctx.fillStyle = theme.shadow;
				ctx.globalAlpha = flying ? 0.18 : 0.3;
				ctx.beginPath();
				ctx.ellipse(
					p.x,
					p.y,
					flying ? 9 : 12,
					flying ? 3.5 : 5,
					0,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.globalAlpha = 1;
				if (enemy.oil > 0) {
					ctx.fillStyle =
						enemy.acid > 0
							? statusLooks.acid.fill
							: enemy.vulnerability > 1
								? statusLooks.vulnerable.fill
								: theme.oil;
					ctx.globalAlpha =
						enemy.acid > 0 || enemy.vulnerability > 1 ? 0.55 : 1;
					const spread = Math.max(0, enemy.layers - 1) * 3;
					ctx.beginPath();
					ctx.ellipse(p.x, p.y, 14 + spread, 8 + spread / 2, 0, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 1;
				}
				if (enemy.burn > 0) {
					const time = state.elapsedSeconds + enemy.id * 0.37;
					paintSmoke(ctx, p.x, bodyY, time, theme.smoke);
					for (let flame = 0; flame < 2; flame++) {
						const x =
							p.x + (flame === 0 ? -1 : 1) * definition.spriteSize * 0.28;
						paintFlame(ctx, x, p.y - 3, 9, time + flame * 0.7, {
							edge: theme.fireEdge,
							middle: theme.fire,
							core: theme.fireCore,
							smoke: theme.smoke,
						});
					}
					for (let spark = 0; spark < 2; spark++) {
						const age = (time * 1.5 + spark / 3) % 1;
						ctx.globalAlpha = (1 - age) * (0.35 + enemy.burnStacks * 0.15);
						ctx.fillStyle = theme.fireCore;
						ctx.fillRect(
							p.x + Math.sin(time * 3 + spark * 5) * 9,
							p.y - 9 - age * 13,
							1,
							1.5,
						);
					}
					ctx.globalAlpha = 1;
				}
			}
			// Bodies and their attached coating share a stable foot-depth order.
			for (const { enemy, p, definition, bodyY, bob } of units) {
				const hit = state.shots.find(
					(shot) =>
						shot.hitTargetId === enemy.id &&
						shot.age - flightTime(shot.sprite) < 0.18,
				);
				const hitAge = hit
					? Math.max(0, hit.age - flightTime(hit.sprite)) / 0.18
					: 1;
				const recoil = Math.sin(hitAge * Math.PI) * (1 - hitAge) * 5;
				const direction = hit
					? Math.atan2(hit.to.y - hit.from.y, hit.to.x - hit.from.x)
					: 0;
				const burnPhase = (state.elapsedSeconds * 2.5 + enemy.id * 0.31) % 1;
				const burnTwitch =
					enemy.burn > 0 && burnPhase < 0.22
						? Math.sin((burnPhase / 0.22) * Math.PI * 2) * 1.4
						: 0;
				const stunned = enemy.stun > 0;
				const x =
					p.x + Math.cos(direction) * recoil + (stunned ? 0 : burnTwitch);
				const y =
					p.y -
					definition.hover +
					(stunned ? 0 : bob) +
					Math.sin(direction) * recoil;
				this.sprite(
					ctx,
					definition.sprite,
					x,
					y,
					definition.spriteSize,
					definition.spriteAnchor,
				);
				if (enemy.oil > 0 && enemy.acid > 0) {
					ctx.save();
					ctx.globalAlpha = 0.4;
					ctx.filter = "sepia(1) saturate(5) hue-rotate(45deg) brightness(1.1)";
					this.sprite(
						ctx,
						definition.sprite,
						x,
						y,
						definition.spriteSize,
						definition.spriteAnchor,
					);
					ctx.restore();
				}

				if (enemy.oil > 0) {
					ctx.save();
					ctx.globalAlpha = 0.45;
					ctx.strokeStyle = theme.oil;
					ctx.lineWidth = 1.5;
					ctx.lineCap = "round";
					for (let drip = 0; drip < 2; drip++) {
						const x = p.x + (drip === 0 ? -6 : 6);
						ctx.beginPath();
						ctx.moveTo(x, bodyY + 1);
						ctx.lineTo(x + 1, bodyY + 4 + Math.sin(enemy.id + drip) * 3);
						ctx.stroke();
					}
					ctx.strokeStyle = theme.oilSheen;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.ellipse(p.x - 3, p.y - 1, 7, 2, -0.2, Math.PI, Math.PI * 1.8);
					ctx.stroke();
					ctx.restore();
				}
			}
			drawProjectiles("air");
			// Health is a separate overlay and cannot be covered by another unit.
			for (const { enemy, p, bodyY, topY } of units) {
				// The bar clears the tallest silhouette, wings included.
				const barY = Math.min(bodyY - 23, topY - 7);
				ctx.fillStyle = theme.shadow;
				ctx.fillRect(p.x - 12, barY, 24, 4);
				ctx.fillStyle = enemy.kind === "shieldSquad" ? theme.shield : theme.red;
				ctx.fillRect(
					p.x - 11,
					barY + 1,
					22 * Math.max(0, enemy.hp / enemy.maxHp),
					2,
				);
				this.drawStatuses(ctx, enemy, p.x, barY, state.elapsedSeconds);
			}

			// Separate wall modules overlap slightly, forming a continuous line from
			// the bank to each map edge without turning into one stretched texture.
			for (const x of [15, 70, 125, 265, 320, 375])
				this.image(ctx, this.assets.ozonWall, x, 495, 105);
			this.image(ctx, this.assets.ozonBankCastle, 195, 469, 150);
			if (state.health === 0) {
				ctx.fillStyle = theme.shadow;
				ctx.fillRect(179, 498, 32, 29);
				ctx.fillStyle = theme.roadEdge;
				ctx.fillRect(177, 527, 36, Math.min(22, state.fallTime * 30));
			}
		});
	}
}
