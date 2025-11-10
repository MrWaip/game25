import type { AABB } from "./aabb";
import { Vec2 } from "./vec2-gl";

function hashString32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Random {
  #originalSeed: number;
  #seed: number;

  constructor(seed: string | number) {
    if (typeof seed === "string") {
      this.#originalSeed = this.#seed = hashString32(seed);
    } else {
      this.#originalSeed = this.#seed = seed;
    }
  }

  child(seed: string): Random {
    return new Random(hashString32(this.#originalSeed.toString() + seed));
  }

  next() {
    let t = (this.#seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number) {
    return this.next() * (max - min) + min;
  }

  int(min: number, max: number) {
    return Math.floor(this.range(min, max + 1));
  }

  randomInAABB(aabb: AABB): Vec2 {
    return Vec2.fromValues(
      aabb.min[0] + this.next() * (aabb.max[0] - aabb.min[0]),
      aabb.min[1] + this.next() * (aabb.max[1] - aabb.min[1]),
    );
  }
}

export class GlobalRandom {
  private static instance: Random | null = null;

  static initialize(seed: string): void {
    this.instance = new Random(seed);
  }

  static child(seed: string): Random {
    return this.getInstance().child(seed);
  }

  static next(): number {
    return this.getInstance().next();
  }

  static range(min: number, max: number): number {
    return this.getInstance().range(min, max);
  }

  static int(min: number, max: number): number {
    return this.getInstance().int(min, max);
  }

  static randomInAABB(aabb: AABB): Vec2 {
    return this.getInstance().randomInAABB(aabb);
  }

  private static getInstance(): Random {
    if (!this.instance) {
      throw new Error("GlobalRandom not initialized. Call GlobalRandom.initialize() first.");
    }
    return this.instance;
  }
}
