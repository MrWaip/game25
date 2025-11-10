import { Component } from "./component";

export class FollowCameraComponent extends Component {
  public followX: boolean;
  public followY: boolean;

  constructor(followX: boolean, followY: boolean) {
    super();

    this.followX = followX;
    this.followY = followY;
  }
}
