// Canvas 2D renderer: grid, entities, selection highlight, snap markers, preview.
import { CadDocument } from "./document";
import { Viewport } from "./viewport";
import { Entity } from "./entities";
import { Vec2 } from "./geometry";
import { SnapResult } from "./snap";

export interface RenderState {
  selection: Set<string>;
  hover: string | null;
  snap: SnapResult | null;
  cursor: Vec2 | null;
  preview: Entity[];
  /** rubber-band selection rectangle in screen space */
  band: { from: Vec2; to: Vec2; crossing: boolean } | null;
  showGrid: boolean;
}

export class Renderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private doc: CadDocument,
    private vp: Viewport,
  ) {}

  render(st: RenderState): void {
    const { ctx, vp } = this;
    ctx.save();
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(0, 0, vp.width, vp.height);

    if (st.showGrid) this.drawGrid();
    this.drawAxes();

    for (const e of this.doc.entities) {
      if (!this.doc.isVisible(e)) continue;
      const selected = st.selection.has(e.id);
      const hovered = st.hover === e.id;
      this.drawEntity(e, this.doc.colorOf(e), selected, hovered);
    }

    for (const e of st.preview) {
      this.drawEntity(e, "#ffd24d", false, false, true);
    }

    if (st.band) this.drawBand(st.band);
    if (st.snap) this.drawSnap(st.snap);

    ctx.restore();
  }

  private drawGrid(): void {
    const { ctx, vp } = this;
    // pick a "nice" grid step so lines stay ~visible at any zoom
    const targetPx = 80;
    const rawStep = targetPx / vp.scale;
    const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const candidates = [1, 2, 5, 10].map((m) => m * pow);
    const step = candidates.find((c) => c * vp.scale >= 50) ?? candidates[candidates.length - 1];

    const tl = vp.toWorld({ x: 0, y: 0 });
    const br = vp.toWorld({ x: vp.width, y: vp.height });
    const x0 = Math.floor(tl.x / step) * step;
    const x1 = Math.ceil(br.x / step) * step;
    const y0 = Math.floor(br.y / step) * step;
    const y1 = Math.ceil(tl.y / step) * step;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#2a2a33";
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) {
      const s = vp.toScreen({ x, y: 0 });
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, vp.height);
    }
    for (let y = y0; y <= y1; y += step) {
      const s = vp.toScreen({ x: 0, y });
      ctx.moveTo(0, s.y);
      ctx.lineTo(vp.width, s.y);
    }
    ctx.stroke();
  }

  private drawAxes(): void {
    const { ctx, vp } = this;
    const o = vp.toScreen({ x: 0, y: 0 });
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#46343a";
    ctx.beginPath();
    ctx.moveTo(0, o.y);
    ctx.lineTo(vp.width, o.y);
    ctx.moveTo(o.x, 0);
    ctx.lineTo(o.x, vp.height);
    ctx.stroke();
  }

  private drawEntity(
    e: Entity,
    color: string,
    selected: boolean,
    hovered: boolean,
    preview = false,
  ): void {
    const { ctx, vp } = this;
    ctx.lineWidth = selected ? 2.5 : hovered ? 2 : 1.4;
    ctx.strokeStyle = selected ? "#4da3ff" : color;
    ctx.fillStyle = ctx.strokeStyle;
    if (preview) ctx.setLineDash([6, 4]);

    const S = (p: Vec2) => vp.toScreen(p);

    switch (e.type) {
      case "line": {
        const a = S(e.a);
        const b = S(e.b);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        break;
      }
      case "polyline": {
        ctx.beginPath();
        e.points.forEach((p, i) => {
          const s = S(p);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        });
        if (e.closed) ctx.closePath();
        ctx.stroke();
        break;
      }
      case "circle": {
        const c = S(e.center);
        ctx.beginPath();
        ctx.arc(c.x, c.y, e.radius * vp.scale, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "arc": {
        const c = S(e.center);
        // screen Y is flipped, so draw clockwise with negated angles
        ctx.beginPath();
        ctx.arc(c.x, c.y, e.radius * vp.scale, -e.startAngle, -e.endAngle, true);
        ctx.stroke();
        break;
      }
      case "point": {
        const p = S(e.at);
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y);
        ctx.lineTo(p.x + 5, p.y);
        ctx.moveTo(p.x, p.y - 5);
        ctx.lineTo(p.x, p.y + 5);
        ctx.stroke();
        break;
      }
      case "text": {
        const p = S(e.at);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(-e.rotation);
        ctx.font = `${Math.max(8, e.height * vp.scale)}px ui-monospace, monospace`;
        ctx.textBaseline = "bottom";
        ctx.fillText(e.text, 0, 0);
        ctx.restore();
        break;
      }
      case "dimension":
        this.drawDimension(e);
        break;
    }
    ctx.setLineDash([]);
  }

  private drawDimension(e: Extract<Entity, { type: "dimension" }>): void {
    const { ctx, vp } = this;
    // perpendicular offset
    const dx = e.b.x - e.a.x;
    const dy = e.b.y - e.a.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const oa = { x: e.a.x + nx * e.offset, y: e.a.y + ny * e.offset };
    const ob = { x: e.b.x + nx * e.offset, y: e.b.y + ny * e.offset };
    const Sa = vp.toScreen(oa);
    const Sb = vp.toScreen(ob);
    const Ea = vp.toScreen(e.a);
    const Eb = vp.toScreen(e.b);
    ctx.beginPath();
    ctx.moveTo(Ea.x, Ea.y);
    ctx.lineTo(Sa.x, Sa.y);
    ctx.moveTo(Eb.x, Eb.y);
    ctx.lineTo(Sb.x, Sb.y);
    ctx.moveTo(Sa.x, Sa.y);
    ctx.lineTo(Sb.x, Sb.y);
    ctx.stroke();
    const m = { x: (Sa.x + Sb.x) / 2, y: (Sa.y + Sb.y) / 2 };
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(L.toFixed(2), m.x, m.y - 4);
    ctx.textAlign = "start";
  }

  private drawBand(band: NonNullable<RenderState["band"]>): void {
    const { ctx } = this;
    const x = Math.min(band.from.x, band.to.x);
    const y = Math.min(band.from.y, band.to.y);
    const w = Math.abs(band.to.x - band.from.x);
    const h = Math.abs(band.to.y - band.from.y);
    ctx.save();
    ctx.fillStyle = band.crossing ? "rgba(80,200,120,0.12)" : "rgba(77,163,255,0.12)";
    ctx.strokeStyle = band.crossing ? "#50c878" : "#4da3ff";
    ctx.setLineDash(band.crossing ? [5, 4] : []);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private drawSnap(snap: SnapResult): void {
    const { ctx, vp } = this;
    const s = vp.toScreen(snap.point);
    ctx.save();
    ctx.strokeStyle = "#ffcf33";
    ctx.lineWidth = 1.5;
    const r = 6;
    switch (snap.kind) {
      case "endpoint":
        ctx.strokeRect(s.x - r, s.y - r, r * 2, r * 2);
        break;
      case "midpoint":
        ctx.beginPath();
        ctx.moveTo(s.x - r, s.y + r);
        ctx.lineTo(s.x, s.y - r);
        ctx.lineTo(s.x + r, s.y + r);
        ctx.closePath();
        ctx.stroke();
        break;
      case "center":
      case "quadrant":
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "intersection":
        ctx.beginPath();
        ctx.moveTo(s.x - r, s.y - r);
        ctx.lineTo(s.x + r, s.y + r);
        ctx.moveTo(s.x - r, s.y + r);
        ctx.lineTo(s.x + r, s.y - r);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
  }
}
