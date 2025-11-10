import type { SpriteName } from "../assets";
import { AssetsManager } from "../core/assetsManager";
import type { AABB } from "../primitives/aabb";
import { Vec2 } from "../primitives/vec2-gl";

export interface IRenderer {
  clear(): void;

  renderAnimated(sprite: RenderAnimated): void;

  renderPrimitive(render: RenderPrimitive): void;

  debugAABB(aabb: AABB, color: string, name: string | undefined): void;

  renderSprite(sprite: RenderSprite): void;

  setCamera(camera: Camera): void;

  renderText(text: RenderText): void;
}

type Camera = {
  viewport: Vec2;
  zoom: number;
  position: Vec2;
};

type RenderText = {
  text: string[][];
  position: Vec2;
  offset: Vec2;
  static: boolean;
  fontSize: number;
  color: string;
};

type RenderAnimated = {
  name: SpriteName;
  frame: number;
  direction: "right" | "left";
  position: Vec2;
  offset: Vec2;
  size: Vec2;
  spriteSize: Vec2;
  cols?: number;
};

type RenderPrimitive = {
  color: string;
  form: "rect";
  position: Vec2;
  size: Vec2;
  offset: Vec2;
  filled: boolean;
};

type RenderSprite = {
  alpha: number;
  imageName: SpriteName;
  position: Vec2;
  offset: Vec2;
  size: Vec2;
  spriteSize: Vec2;
  spriteOffset: Vec2;
  static: boolean;
  fitToSize?: boolean;
};

export class CanvasRenderer implements IRenderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #assetsManager: AssetsManager;
  #camera: Camera | undefined;
  #viewportSize: Vec2;

  constructor(
    canvas: HTMLCanvasElement,
    assetsManager: AssetsManager,
    viewportSize: Vec2,
  ) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d")!;
    this.#assetsManager = assetsManager;
    this.#camera = undefined;
    this.#viewportSize = viewportSize;
  }

  setCamera(camera: Camera): void {
    const fitX = this.#viewportSize[0] / camera.viewport[0];
    const fitY = this.#viewportSize[1] / camera.viewport[1];
    const fitScale = Math.min(fitX, fitY);

    this.#camera = {
      position: camera.position,
      viewport: camera.viewport,
      zoom: fitScale * camera.zoom,
    };
  }

  get camera(): Camera {
    if (!this.#camera) throw new Error("Camera is not set");

    return this.#camera;
  }

  renderAnimated(sprite: RenderAnimated): void {
    const worldCenter = Vec2.create();
    Vec2.add(worldCenter, sprite.position, sprite.offset);

    const screenCenter = this.worldToCanvas(worldCenter);
    const scaledSize = Vec2.create();
    Vec2.scale(scaledSize, sprite.size, this.camera.zoom);
    const halfSize = Vec2.create();
    Vec2.scale(halfSize, scaledSize, 0.5);
    const topLeft = Vec2.create();
    Vec2.sub(topLeft, screenCenter, halfSize);

    const cols = sprite.cols;
    let frameOffsetX: number;
    let frameOffsetY: number;

    if (cols !== undefined) {
      const col = sprite.frame % cols;
      const row = Math.floor(sprite.frame / cols);
      frameOffsetX = sprite.spriteSize[0] * col;
      frameOffsetY = sprite.spriteSize[1] * row;
    } else {
      frameOffsetX = sprite.spriteSize[0] * sprite.frame;
      frameOffsetY = 0;
    }

    const image = this.#assetsManager.getImage(sprite.name);

    this.#ctx.save();

    if (sprite.direction === "left") {
      this.#ctx.scale(-1, 1);

      this.#ctx.drawImage(
        image,
        frameOffsetX,
        frameOffsetY,
        sprite.spriteSize[0],
        sprite.spriteSize[1],
        -topLeft[0] - scaledSize[0],
        topLeft[1],
        scaledSize[0],
        scaledSize[1],
      );
    } else {
      this.#ctx.drawImage(
        image,
        frameOffsetX,
        frameOffsetY,
        sprite.spriteSize[0],
        sprite.spriteSize[1],
        topLeft[0],
        topLeft[1],
        scaledSize[0],
        scaledSize[1],
      );
    }

    this.#ctx.restore();
  }

  renderSprite(sprite: RenderSprite) {
    const image = this.#assetsManager.getImage(sprite.imageName);

    this.#ctx.save();

    this.#ctx.globalAlpha = sprite.alpha;

    let screenCenter: Vec2;
    let scaledSize: Vec2;
    let scaledTile: Vec2;

    if (sprite.static) {
      screenCenter = Vec2.create();
      Vec2.add(screenCenter, sprite.position, sprite.offset);
      scaledSize = sprite.size;
      scaledTile = sprite.spriteSize;
    } else {
      const worldCenter = Vec2.create();
      Vec2.add(worldCenter, sprite.position, sprite.offset);
      screenCenter = this.worldToCanvas(worldCenter);
      scaledSize = Vec2.create();
      Vec2.scale(scaledSize, sprite.size, this.camera.zoom);
      scaledTile = Vec2.create();
      Vec2.scale(scaledTile, sprite.spriteSize, this.camera.zoom);
    }

    const halfSize = Vec2.create();
    Vec2.scale(halfSize, scaledSize, 0.5);
    const topLeft = Vec2.create();
    Vec2.sub(topLeft, screenCenter, halfSize);

    if (sprite.fitToSize) {
      this.#ctx.drawImage(
        image,
        sprite.spriteOffset[0],
        sprite.spriteOffset[1],
        sprite.spriteSize[0],
        sprite.spriteSize[1],
        topLeft[0],
        topLeft[1],
        scaledSize[0],
        scaledSize[1],
      );

      this.#ctx.restore();
      return;
    }

    const cols = Math.ceil(scaledSize[0] / scaledTile[0]);
    const rows = Math.ceil(scaledSize[1] / scaledTile[1]);

    for (let y = 0; y < rows; y++) {
      const dstY = topLeft[1] + y * scaledTile[1];
      const remainingH = scaledSize[1] - y * scaledTile[1];
      if (remainingH <= 0) break;
      const drawH = Math.min(scaledTile[1], remainingH);

      for (let x = 0; x < cols; x++) {
        const dstX = topLeft[0] + x * scaledTile[0];
        const remainingW = scaledSize[0] - x * scaledTile[0];
        if (remainingW <= 0) break;
        const drawW = Math.min(scaledTile[0], remainingW);

        const sourceW = sprite.static ? drawW : drawW / this.camera.zoom;
        const sourceH = sprite.static ? drawH : drawH / this.camera.zoom;

        this.#ctx.drawImage(
          image,
          sprite.spriteOffset[0],
          sprite.spriteOffset[1],
          sourceW,
          sourceH,
          dstX,
          dstY,
          drawW,
          drawH,
        );
      }
    }

    this.#ctx.restore();
  }

  renderText(text: RenderText): void {
    const ctx = this.#ctx;
    ctx.save();

    const fontSize = text.fontSize;
    const color = text.color ?? "white";
    const lineHeight = fontSize * 1.2;
    const columnSpacing = 12;
    const centerCols = true;

    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let screenPos = Vec2.create();
    Vec2.add(screenPos, text.position, text.offset);

    if (text.static) {
      Vec2.set(screenPos, screenPos[0], this.#canvas.height - screenPos[1]);
    } else {
      const worldPos = screenPos;
      screenPos = this.worldToCanvas(worldPos);
    }

    const rows = text.text;

    const colCount = Math.max(...rows.map((r) => r.length));
    const colWidths = new Array(colCount).fill(0);
    const cellWidths: number[][] = [];

    for (let row = 0; row < rows.length; row++) {
      const rowWidths: number[] = [];
      for (let col = 0; col < rows[row].length; col++) {
        const cell = rows[row][col];
        const w = ctx.measureText(cell).width;
        rowWidths.push(w);
        if (w > colWidths[col]) colWidths[col] = w;
      }
      cellWidths.push(rowWidths);
    }

    for (let row = 0; row < rows.length; row++) {
      const y = screenPos[1] + row * lineHeight;
      const cells = rows[row];

      let x = screenPos[0];
      for (let col = 0; col < cells.length; col++) {
        const cell = cells[col];
        const colWidth = colWidths[col];
        const cellWidth = cellWidths[row][col];

        if (centerCols) {
          const centeredX = x + (colWidth - cellWidth) / 2;
          ctx.fillText(cell, centeredX, y);
        } else {
          ctx.fillText(cell, x, y);
        }

        x += colWidth + columnSpacing;
      }
    }
    ctx.restore();
  }

  debugAABB(aabb: AABB, color: string, name: string | undefined): void {
    this.#ctx.save();
    this.#ctx.strokeStyle = color;
    this.#ctx.lineWidth = 2;

    const topLeft = this.worldToCanvas(Vec2.fromValues(aabb.min[0], aabb.max[1]));
    const bottomRight = this.worldToCanvas(Vec2.fromValues(aabb.max[0], aabb.min[1]));

    const width = bottomRight[0] - topLeft[0];
    const height = bottomRight[1] - topLeft[1];

    this.#ctx.strokeRect(topLeft[0], topLeft[1], width, height);

    if (name) {
      this.renderText({
        color,
        fontSize: 10,
        offset: Vec2.create(),
        position: Vec2.fromValues(aabb.min[0], aabb.max[1]),
        static: false,
        text: [[name]],
      });
    }

    this.#ctx.restore();
  }

  private worldToCamera(world: Vec2): Vec2 {
    const rel = Vec2.create();
    Vec2.sub(rel, world, this.camera.position);
    const result = Vec2.create();
    Vec2.scale(result, rel, this.camera.zoom);
    return result;
  }

  private cameraToCanvas(cameraPos: Vec2): Vec2 {
    const x = this.#canvas.width / 2 + cameraPos[0];
    const y = this.#canvas.height / 2 - cameraPos[1];
    return Vec2.fromValues(x, y);
  }

  private worldToCanvas(world: Vec2): Vec2 {
    return this.cameraToCanvas(this.worldToCamera(world));
  }

  renderPrimitive(render: RenderPrimitive): void {
    this.#ctx.save();

    this.#ctx.fillStyle = render.color;
    this.#ctx.strokeStyle = render.color;
    this.#ctx.lineWidth = 2;

    const worldCenter = Vec2.create();
    Vec2.add(worldCenter, render.position, render.offset);

    const screenCenter = this.worldToCanvas(worldCenter);
    const scaledSize = Vec2.create();
    Vec2.scale(scaledSize, render.size, this.camera.zoom);

    const halfSize = Vec2.create();
    Vec2.scale(halfSize, scaledSize, 0.5);
    const topLeft = Vec2.create();
    Vec2.sub(topLeft, screenCenter, halfSize);

    switch (render.form) {
      case "rect":
        if (render.filled) {
          this.#ctx.fillRect(topLeft[0], topLeft[1], scaledSize[0], scaledSize[1]);
        } else {
          this.#ctx.strokeRect(
            topLeft[0],
            topLeft[1],
            scaledSize[0],
            scaledSize[1],
          );
        }
        break;
    }

    this.#ctx.restore();
  }

  clear(): void {
    this.#ctx.reset();
  }
}
