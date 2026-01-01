/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Component } from "../components/component";
import { Camera } from "../components/cameraComponent";
import { DebugRenderComponent } from "../components/debugRenderComponent";
import { PlayerComponent } from "../components/playerComponent";
import { TransformComponent } from "../components/transformComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import type { Entity } from "../entities/entity";
import type { AABB } from "../primitives/aabb";
import type { GameEvents } from "../primitives/gameEvents";
import { Vec2 } from "../primitives/vec2-gl";
import { RenderLayers } from "../render/layers";
import { EventBus } from "../systems/eventBus";
import type { ISystem } from "../systems/system";

type ComponentClass<T extends Component = Component> = new (
	...args: any[]
) => T;

type QueryItem<T extends ComponentClass[]> = {
	entity: Entity;
	components: { [K in keyof T]: InstanceType<T[K]> };
};

type Options = {
	debug?: boolean;
};

export class World {
	#entities: Set<Entity>;
	#storage: Map<typeof Component, Map<Entity, Component>>;
	#disabledComponents: Map<Entity, Map<typeof Component, Component>>;
	#systems: ISystem[];
	#nextEntity: Entity;
	#debugEntity: Entity;
	#eventBus: EventBus<GameEvents>;
	#layerIndex: Map<RenderLayers, Set<Entity>>;
	#entityLayer: Map<Entity, RenderLayers>;
	#debug: boolean;
	#gameTime: number;

	constructor(options: Options) {
		this.#nextEntity = 0;
		this.#entities = new Set();
		this.#storage = new Map();
		this.#disabledComponents = new Map();
		this.#systems = [];
		this.#debugEntity = -1;
		this.#eventBus = new EventBus();
		this.#debug = options.debug ?? false;
		this.#layerIndex = new Map();
		this.#entityLayer = new Map();
		this.#gameTime = 0;
	}

	get eventBus(): EventBus<GameEvents> {
		return this.#eventBus;
	}

	async initialize(): Promise<void> {
		this.registerComponent(DebugRenderComponent);
		this.#entities.add(this.#debugEntity);
		this.updateComponent(this.#debugEntity, new DebugRenderComponent());
		this.updateComponent(
			this.#debugEntity,
			new RenderLayerComponent(RenderLayers.Debug),
		);
		this.updateComponent(
			this.#debugEntity,
			new TransformComponent(Vec2.create()),
		);

		for await (const system of this.#systems) {
			await system.initialize?.(this);
		}
	}

	addEntity(components?: Component[]): Entity {
		const entity = this.#nextEntity;
		this.#entities.add(entity);
		this.#nextEntity++;

		if (components) {
			for (const component of components) {
				this.updateComponent(entity, component);
			}
		}

		return entity;
	}

	deleteEntity(entity: Entity): void {
		this.#entities.delete(entity);

		for (const map of this.#storage.values()) {
			map.delete(entity);
		}

		this.#disabledComponents.delete(entity);

		const layer = this.#entityLayer.get(entity);

		if (layer === undefined) return;

		const set = this.#layerIndex.get(layer)!;

		set.delete(entity);
		this.#entityLayer.delete(entity);
	}

	private getComponentMap(
		componentClass: typeof Component,
	): Map<Entity, Component> {
		const map = this.#storage.get(componentClass);

		if (!map) {
			throw new Error(`Component ${componentClass.name} not registered`);
		}

		return map;
	}

	updateComponent(entity: Entity, component: Component): void {
		const componentClass = component.constructor as typeof Component;
		const map = this.getComponentMap(componentClass);

		map.set(entity, component);

		if (component instanceof RenderLayerComponent) {
			const newLayer = component.value;
			const oldLayer = this.#entityLayer.get(entity);

			if (oldLayer !== undefined && oldLayer !== newLayer) {
				const oldSet = this.#layerIndex.get(oldLayer);
				oldSet?.delete(entity);
			}

			let set = this.#layerIndex.get(newLayer);

			if (set === undefined) {
				set = new Set();
				this.#layerIndex.set(newLayer, set);
			}

			set.add(entity);
			this.#entityLayer.set(entity, newLayer);
		}
	}

	hasComponent(entity: Entity, componentClass: ComponentClass): boolean {
		const map = this.getComponentMap(componentClass);

		return map.has(entity);
	}

	disableComponent(entity: Entity, componentClass: ComponentClass): void {
		const map = this.getComponentMap(componentClass);
		const component = map.get(entity);

		if (!component) {
			return;
		}

		map.delete(entity);

		let disabledMap = this.#disabledComponents.get(entity);
		if (!disabledMap) {
			disabledMap = new Map();
			this.#disabledComponents.set(entity, disabledMap);
		}

		disabledMap.set(componentClass, component);
	}

	enableComponent(entity: Entity, componentClass: ComponentClass): void {
		const disabledMap = this.#disabledComponents.get(entity);
		if (!disabledMap) {
			return;
		}

		const component = disabledMap.get(componentClass);
		if (!component) {
			return;
		}

		disabledMap.delete(componentClass);
		if (disabledMap.size === 0) {
			this.#disabledComponents.delete(entity);
		}

		const map = this.getComponentMap(componentClass);
		map.set(entity, component);
	}

	removeComponent(entity: Entity, componentClass: ComponentClass): void {
		const map = this.getComponentMap(componentClass);

		map.delete(entity);
	}

	getComponent<T extends ComponentClass>(
		entity: Entity,
		componentClass: T,
	): InstanceType<T> | undefined {
		const map = this.getComponentMap(componentClass);

		if (!map.has(entity)) return;

		return map.get(entity) as InstanceType<T>;
	}

	registerComponent(component: ComponentClass): void {
		this.#storage.set(component, new Map());
	}

	registerSystem(system: ISystem): void {
		this.#systems.push(system);
	}

	*query<T extends ComponentClass[]>(
		...componentClasses: T
	): Generator<QueryItem<T>> {
		if (componentClasses.length === 1) {
			const componentClass = componentClasses[0];
			const map = this.getComponentMap(componentClass);

			for (const [entity, component] of map.entries()) {
				yield {
					entity,
					components: [component] as { [K in keyof T]: InstanceType<T[K]> },
				};
			}

			return;
		}

		let rarestMap: Map<Entity, Component> | undefined;
		let minSize = Infinity;

		for (let i = 0; i < componentClasses.length; i++) {
			const map = this.getComponentMap(componentClasses[i]);
			if (map.size < minSize) {
				minSize = map.size;
				rarestMap = map;
			}
		}

		if (rarestMap) {
			for (const entity of rarestMap.keys()) {
				const list: unknown[] = [];

				for (let i = 0; i < componentClasses.length; i++) {
					const instance = this.getComponent(entity, componentClasses[i]);
					if (!instance) {
						break;
					}
					list.push(instance);
				}

				if (list.length === componentClasses.length) {
					yield {
						entity,
						components: list as { [K in keyof T]: InstanceType<T[K]> },
					};
				}
			}

			return;
		}

		main: for (const entity of this.#entities) {
			const list: unknown[] = [];

			for (const componentClass of componentClasses) {
				const instance = this.getComponent(entity, componentClass);
				if (!instance) continue main;
				list.push(instance);
			}

			yield {
				entity,
				components: list as { [K in keyof T]: InstanceType<T[K]> },
			};
		}
	}

	*queryByLayer(
		layer: RenderLayers,
		filter?: (entity: Entity) => boolean,
	): Generator<Entity> {
		const entities = this.#layerIndex.get(layer);

		if (entities === undefined) return;

		for (const entity of entities) {
			if (filter && !filter(entity)) continue;
			yield entity;
		}
	}

	getComponentsOrUndefined<T extends ComponentClass[]>(
		entity: Entity,
		...classes: T
	): { [K in keyof T]: InstanceType<T[K]> } | undefined {
		const result: unknown[] = [];

		for (const cls of classes) {
			const c = this.getComponent(entity, cls);
			if (!c) {
				return undefined; // атомарный фейл
			}
			result.push(c);
		}

		return result as { [K in keyof T]: InstanceType<T[K]> };
	}

	getLayers(): Iterable<RenderLayers> {
		return this.#layerIndex.keys();
	}

	getCamera():
		| QueryItem<[typeof Camera, typeof TransformComponent]>
		| undefined {
		const iterator = this.query(Camera, TransformComponent).next();
		return iterator.done ? undefined : iterator.value;
	}

	getPlayer():
		| QueryItem<[typeof TransformComponent, typeof PlayerComponent]>
		| undefined {
		const iterator = this.query(TransformComponent, PlayerComponent).next();
		return iterator.done ? undefined : iterator.value;
	}

	*querySingle<T extends ComponentClass>(
		componentClass: T,
	): Generator<{ entity: Entity; component: InstanceType<T> }> {
		const map = this.getComponentMap(componentClass);

		for (const [entity, component] of map.entries()) {
			yield {
				entity,
				component: component as InstanceType<T>,
			};
		}
	}

	getFirstComponent<T extends ComponentClass>(
		componentClass: T,
	): InstanceType<T> | undefined {
		const map = this.getComponentMap(componentClass);
		const firstEntry = map.entries().next().value;
		return firstEntry ? (firstEntry[1] as InstanceType<T>) : undefined;
	}

	getFirstEntityWith<T extends ComponentClass>(
		componentClass: T,
	): { entity: Entity; component: InstanceType<T> } | undefined {
		const map = this.getComponentMap(componentClass);
		const firstEntry = map.entries().next().value;
		return firstEntry
			? { entity: firstEntry[0], component: firstEntry[1] as InstanceType<T> }
			: undefined;
	}

	getFirst<T extends ComponentClass[]>(
		...componentClasses: T
	): QueryItem<T> | undefined {
		const iterator = this.query(...componentClasses).next();
		return iterator.done ? undefined : iterator.value;
	}

	debugAABB(aabb: AABB, color?: string) {
		if (!this.#debug) return;

		const component = this.getComponent(
			this.#debugEntity,
			DebugRenderComponent,
		)!;

		component.addAABB(aabb, color);
	}

	debugPersistentAABB(key: string, aabb: AABB, color?: string) {
		if (!this.#debug) return;

		const component = this.getComponent(
			this.#debugEntity,
			DebugRenderComponent,
		)!;

		component.setPersistentAABB(key, aabb, color);
	}

	debugRemovePersistent(key: string) {
		if (!this.#debug) return;

		const component = this.getComponent(
			this.#debugEntity,
			DebugRenderComponent,
		)!;

		component.removePersistentAABB(key);
	}

	debug(fn: VoidFunction) {
		if (!this.#debug) return;

		fn();
	}

	getCurrentTime(): number {
		return this.#gameTime;
	}

	fixedUpdate(dt: number): void {
		this.#gameTime += dt * 1000;

		for (const system of this.#systems) {
			system.fixedUpdate?.(this, dt);
		}
	}

	update(dt: number): void {
		for (const system of this.#systems) {
			system.update?.(this, dt);
		}
	}

	async destroy(): Promise<void> {
		for (const system of this.#systems) {
			await system.destroy?.(this);
		}

		this.#eventBus.clear();
	}
}
