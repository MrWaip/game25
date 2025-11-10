import type { Entity } from "../entities/entity";
import { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Options = {
  viewportSize: Vec2;
  followFor?: Entity;
  zoom?: number;
  highestY: number;
  allowFollowDown?: boolean;
};

export class Camera extends Component {
  public viewportSize: Vec2;
  public zoom: number;
  public followFor: Entity | undefined;
  public highestY: number;
  public allowFollowDown: boolean;

  constructor(options: Options) {
    super();

    this.viewportSize = options.viewportSize;
    this.zoom = options.zoom ?? 1;
    this.followFor = options.followFor;
    this.highestY = options.highestY;
    this.allowFollowDown = options.allowFollowDown ?? false;
  }
}
