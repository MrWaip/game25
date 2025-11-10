import type { Entity } from "../entities/entity";
import { Component } from "./component";

type Options = {
  lastPlatform?: Entity;
  // Растояние от игрока до последней сгенерированной платформы, после которой надо сгенерировать новые платформы
  triggerRange: number;
  minX: number;
  maxX: number;
};

export class PlatformSpawner extends Component {
  lastPlatform: Entity | undefined;
  triggerRange: number;
  minX: number;
  maxX: number;
  spawnCount: number;

  constructor(options: Options) {
    super();

    this.lastPlatform = options.lastPlatform;
    this.triggerRange = options.triggerRange;
    this.minX = options.minX;
    this.maxX = options.maxX;
    this.spawnCount = 0;
  }
}
