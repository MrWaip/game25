import { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Options = {
  text: string[][];
  fontSize: number;
  color?: string;
  offset?: Vec2;
  static?: boolean;
};

export class TextRenderComponent extends Component {
  public text: string[][];
  public static: boolean;
  public offset: Vec2;
  public fontSize: number;
  public color: string;

  constructor(options: Options) {
    super();

    this.text = options.text;
    this.static = options.static ?? false;
    this.offset = options.offset ?? Vec2.create();
    this.fontSize = options.fontSize;
    this.color = options.color ?? "white";
  }
}
