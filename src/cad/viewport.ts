// World <-> screen transform. World Y is up (CAD convention); screen Y is down.
import { Vec2 } from "./geometry";
import { Bounds, boundsValid } from "./geometry";

export class Viewport {
  /** pixels per world unit */
  scale = 40;
  /** world coordinate at the center of the canvas */
  center: Vec2 = { x: 0, y: 0 };
  width = 800;
  height = 600;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  toScreen(p: Vec2): Vec2 {
    return {
      x: this.width / 2 + (p.x - this.center.x) * this.scale,
      y: this.height / 2 - (p.y - this.center.y) * this.scale,
    };
  }

  toWorld(p: Vec2): Vec2 {
    return {
      x: this.center.x + (p.x - this.width / 2) / this.scale,
      y: this.center.y - (p.y - this.height / 2) / this.scale,
    };
  }

  /** Zoom about a screen-space anchor (keeps that world point fixed). */
  zoomAt(screen: Vec2, factor: number): void {
    const before = this.toWorld(screen);
    this.scale = Math.max(0.01, Math.min(100000, this.scale * factor));
    const after = this.toWorld(screen);
    this.center.x += before.x - after.x;
    this.center.y += before.y - after.y;
  }

  panByScreen(dx: number, dy: number): void {
    this.center.x -= dx / this.scale;
    this.center.y += dy / this.scale;
  }

  /** Fit the given bounds into view with margin. */
  fit(bb: Bounds, margin = 0.1): void {
    if (!boundsValid(bb)) return;
    const w = bb.max.x - bb.min.x || 1;
    const h = bb.max.y - bb.min.y || 1;
    this.center = { x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2 };
    const sx = (this.width * (1 - margin)) / w;
    const sy = (this.height * (1 - margin)) / h;
    this.scale = Math.max(0.01, Math.min(sx, sy));
  }
}
