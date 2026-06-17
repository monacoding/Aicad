// Interactive CAD engine: owns the canvas, viewport, document, input handling,
// the active tool state machine, and selection.
import { CadDocument } from "./document";
import { Viewport } from "./viewport";
import { Renderer, RenderState } from "./renderer";
import { findSnap, SnapResult, SnapSettings } from "./snap";
import { Op, applyOps, ApplyContext } from "./ops";
import {
  Entity,
  LineEntity,
  distanceTo,
  entityBounds,
  translate,
  rotateEntity,
  scaleEntity,
} from "./entities";
import { Vec2, dist, dot, sub, angle as angleBetween, leftNormal, pointInBounds, boundsValid } from "./geometry";
import {
  mirrorEntity,
  offsetEntity,
  filletLines,
  chamferLines,
  trimLine,
  extendLine,
  entitySegments,
} from "./geomops";

export type ToolName =
  | "select"
  | "line"
  | "polyline"
  | "rectangle"
  | "circle"
  | "arc"
  | "ellipse"
  | "point"
  | "text"
  | "dimension"
  | "move"
  | "copy"
  | "rotate"
  | "scale"
  | "mirror"
  | "offset"
  | "fillet"
  | "chamfer"
  | "trim"
  | "extend"
  | "hatch"
  | "measure"
  | "erase";

interface Tool {
  name: ToolName;
  /** status-bar hint shown to the user */
  prompt: string;
  /** a confirmed (snapped) click at world point p */
  click(p: Vec2): void;
  /** cursor moved to world point p */
  move(p: Vec2): void;
  /** preview entities while drawing */
  preview(): Entity[];
  /** Enter / double-click to finish (optional) */
  finish?(): void;
  /** Escape pressed */
  cancel(): void;
}

export interface EngineUiState {
  tool: ToolName;
  prompt: string;
  cursor: Vec2 | null;
  selectionCount: number;
  snapOn: boolean;
  gridOn: boolean;
  scale: number;
  log: string[];
}

export class CadEngine {
  doc = new CadDocument();
  vp = new Viewport();
  private renderer: Renderer;
  private raf = 0;

  selection = new Set<string>();
  hover: string | null = null;
  snap: SnapResult | null = null;
  cursorWorld: Vec2 | null = null;
  preview: Entity[] = [];
  band: RenderState["band"] = null;

  snapSettings: SnapSettings = { enabled: true, grid: false, gridStep: 1 };
  showGrid = true;

  private tool: Tool;
  private toolName: ToolName = "select";
  private lastCreated: string[] = [];
  log: string[] = ["AiCAD 준비 완료. 도구를 선택하거나 명령을 입력하세요."];

  private panning = false;
  private panLast: Vec2 | null = null;
  private bandStart: Vec2 | null = null;

  /** Settings for fillet/chamfer (set via command, e.g. FILLET 0.5). */
  filletRadius = 0.5;
  chamferDist = 0.5;

  /** Active grip drag in the select tool. */
  private gripDrag: { id: string; setter: (e: Entity, p: Vec2) => Entity } | null = null;

  private uiListeners = new Set<(s: EngineUiState) => void>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    this.renderer = new Renderer(ctx, this.doc, this.vp);
    this.tool = this.makeTool("select");
    this.doc.subscribe(() => this.scheduleRender());
    this.attach();
    this.resize();
  }

  // ---- UI subscription -------------------------------------------------
  subscribe(fn: (s: EngineUiState) => void): () => void {
    this.uiListeners.add(fn);
    fn(this.uiState());
    return () => this.uiListeners.delete(fn);
  }
  private emitUi(): void {
    const s = this.uiState();
    this.uiListeners.forEach((l) => l(s));
  }
  private uiState(): EngineUiState {
    return {
      tool: this.toolName,
      prompt: this.tool.prompt,
      cursor: this.cursorWorld,
      selectionCount: this.selection.size,
      snapOn: this.snapSettings.enabled,
      gridOn: this.showGrid,
      scale: this.vp.scale,
      log: this.log.slice(-60),
    };
  }
  private say(msg: string): void {
    this.log.push(msg);
    this.emitUi();
  }

  // ---- lifecycle -------------------------------------------------------
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    const ctx = this.canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.vp.resize(rect.width, rect.height);
    this.scheduleRender();
  }

  scheduleRender(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.renderer.render({
        selection: this.selection,
        hover: this.hover,
        snap: this.snap,
        cursor: this.cursorWorld,
        preview: this.preview,
        band: this.band,
        showGrid: this.showGrid,
      });
    });
  }

  // ---- public actions --------------------------------------------------
  setTool(name: ToolName): void {
    this.tool.cancel();
    this.tool = this.makeTool(name);
    this.toolName = name;
    this.preview = [];
    this.say(`도구: ${name}`);
    this.emitUi();
    this.scheduleRender();
  }

  applyOperations(ops: Op[]): void {
    const ctx: ApplyContext = { selection: this.selection, lastCreated: this.lastCreated };
    const res = applyOps(this.doc, ops, ctx);
    this.lastCreated = ctx.lastCreated;
    res.messages.forEach((m) => this.say(m));
    if (res.created.length) {
      this.selection = new Set(res.created);
      this.say(`생성: ${res.created.length}개 객체`);
    }
    this.emitUi();
    this.scheduleRender();
  }

  zoomFit(): void {
    const bb = this.doc.bounds();
    if (boundsValid(bb)) this.vp.fit(bb);
    else {
      this.vp.scale = 40;
      this.vp.center = { x: 0, y: 0 };
    }
    this.scheduleRender();
  }

  undo(): void {
    this.doc.undo();
    this.selection.clear();
    this.emitUi();
  }
  redo(): void {
    this.doc.redo();
    this.emitUi();
  }
  deleteSelection(): void {
    if (!this.selection.size) return;
    this.doc.transact(() => this.doc.remove(this.selection));
    this.say(`삭제: ${this.selection.size}개`);
    this.selection.clear();
    this.emitUi();
  }
  toggleSnap(): void {
    this.snapSettings.enabled = !this.snapSettings.enabled;
    this.emitUi();
  }
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.snapSettings.grid = this.showGrid;
    this.scheduleRender();
    this.emitUi();
  }

  /** Current snapped world point (used by tools and coordinate readout). */
  private snappedCursor(p: Vec2): Vec2 {
    this.snap = findSnap(this.doc, p, 12, this.vp.scale, this.snapSettings);
    return this.snap ? this.snap.point : p;
  }

  // ---- input handling --------------------------------------------------
  private attach(): void {
    const c = this.canvas;
    c.addEventListener("pointerdown", this.onDown);
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerup", this.onUp);
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("dblclick", this.onDbl);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", this.onKey);
  }

  detach(): void {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("dblclick", this.onDbl);
    window.removeEventListener("keydown", this.onKey);
  }

  private screenPos(e: PointerEvent | WheelEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    const sp = this.screenPos(e);
    // pan with middle button or space-pan (handled via button 1)
    if (e.button === 1) {
      this.panning = true;
      this.panLast = sp;
      return;
    }
    if (e.button !== 0) return;
    const world = this.snappedCursor(this.vp.toWorld(sp));

    if (this.toolName === "select") {
      const grip = this.pickGrip(world);
      if (grip) {
        this.gripDrag = grip;
      } else {
        this.bandStart = sp;
      }
    } else {
      this.tool.click(world);
      this.preview = this.tool.preview();
      this.scheduleRender();
    }
  };

  private onMove = (e: PointerEvent): void => {
    const sp = this.screenPos(e);
    if (this.panning && this.panLast) {
      this.vp.panByScreen(sp.x - this.panLast.x, sp.y - this.panLast.y);
      this.panLast = sp;
      this.scheduleRender();
      return;
    }
    const world = this.snappedCursor(this.vp.toWorld(sp));
    this.cursorWorld = world;

    if (this.toolName === "select") {
      if (this.gripDrag) {
        const ent = this.doc.entities.find((x) => x.id === this.gripDrag!.id);
        if (ent) this.preview = [{ ...this.gripDrag.setter(ent, world), id: "prev" } as Entity];
      } else if (this.bandStart) {
        const crossing = sp.x < this.bandStart.x;
        this.band = { from: this.bandStart, to: sp, crossing };
      } else {
        this.hover = this.pick(world);
      }
    } else {
      this.tool.move(world);
      this.preview = this.tool.preview();
    }
    this.scheduleRender();
    this.emitUi();
  };

  private onUp = (e: PointerEvent): void => {
    if (this.panning) {
      this.panning = false;
      this.panLast = null;
      return;
    }
    if (this.toolName === "select" && this.gripDrag) {
      const sp = this.screenPos(e);
      const world = this.snappedCursor(this.vp.toWorld(sp));
      const drag = this.gripDrag;
      this.doc.transact(() => {
        const ent = this.doc.entities.find((x) => x.id === drag.id);
        if (ent) this.doc.replace(drag.id, drag.setter(ent, world));
      });
      this.gripDrag = null;
      this.preview = [];
      this.scheduleRender();
      this.emitUi();
      return;
    }
    if (this.toolName === "select" && this.bandStart) {
      const sp = this.screenPos(e);
      const moved = dist(sp, this.bandStart) > 3;
      if (moved) {
        this.selectInBand(this.bandStart, sp, e.shiftKey);
      } else {
        const world = this.vp.toWorld(sp);
        this.clickSelect(world, e.shiftKey);
      }
      this.bandStart = null;
      this.band = null;
      this.scheduleRender();
      this.emitUi();
    }
  };

  private onDbl = (): void => {
    if (this.tool.finish) {
      this.tool.finish();
      this.preview = this.tool.preview();
      this.scheduleRender();
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const sp = this.screenPos(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.vp.zoomAt(sp, factor);
    this.scheduleRender();
    this.emitUi();
  };

  private onKey = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Escape") {
      this.tool.cancel();
      this.preview = [];
      this.selection.clear();
      this.band = null;
      this.bandStart = null;
      this.gripDrag = null;
      this.scheduleRender();
      this.emitUi();
    } else if (e.key === "Enter") {
      this.tool.finish?.();
      this.preview = this.tool.preview();
      this.scheduleRender();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      this.deleteSelection();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.redo();
    }
  };

  // ---- picking & selection --------------------------------------------
  private pick(world: Vec2): string | null {
    const tol = 8 / this.vp.scale;
    let best: string | null = null;
    let bestD = tol;
    for (const e of this.doc.entities) {
      if (!this.doc.isVisible(e)) continue;
      const d = distanceTo(e, world);
      if (d < bestD) {
        bestD = d;
        best = e.id;
      }
    }
    return best;
  }

  /** Editable grips for an entity: a handle point + a setter that applies a drag. */
  private grips(e: Entity): { p: Vec2; setter: (en: Entity, p: Vec2) => Entity }[] {
    switch (e.type) {
      case "line":
        return [
          { p: e.a, setter: (en, p) => ({ ...(en as LineEntity), a: p }) },
          { p: e.b, setter: (en, p) => ({ ...(en as LineEntity), b: p }) },
        ];
      case "polyline":
        return e.points.map((pt, i) => ({
          p: pt,
          setter: (en: Entity, p: Vec2) => {
            const poly = en as Extract<Entity, { type: "polyline" }>;
            const points = poly.points.map((q, j) => (j === i ? p : q));
            return { ...poly, points };
          },
        }));
      case "circle":
        return [
          { p: e.center, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "circle" }>), center: p }) },
          {
            p: { x: e.center.x + e.radius, y: e.center.y },
            setter: (en, p) => {
              const c = en as Extract<Entity, { type: "circle" }>;
              return { ...c, radius: dist(c.center, p) };
            },
          },
        ];
      case "arc":
        return [
          { p: e.center, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "arc" }>), center: p }) },
          {
            p: { x: e.center.x + Math.cos(e.startAngle) * e.radius, y: e.center.y + Math.sin(e.startAngle) * e.radius },
            setter: (en, p) => {
              const a = en as Extract<Entity, { type: "arc" }>;
              return { ...a, startAngle: angleBetween(a.center, p) };
            },
          },
          {
            p: { x: e.center.x + Math.cos(e.endAngle) * e.radius, y: e.center.y + Math.sin(e.endAngle) * e.radius },
            setter: (en, p) => {
              const a = en as Extract<Entity, { type: "arc" }>;
              return { ...a, endAngle: angleBetween(a.center, p) };
            },
          },
        ];
      case "ellipse":
        return [
          { p: e.center, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "ellipse" }>), center: p }) },
        ];
      case "point":
        return [{ p: e.at, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "point" }>), at: p }) }];
      case "text":
        return [{ p: e.at, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "text" }>), at: p }) }];
      case "dimension":
        return [
          { p: e.a, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "dimension" }>), a: p }) },
          { p: e.b, setter: (en, p) => ({ ...(en as Extract<Entity, { type: "dimension" }>), b: p }) },
        ];
    }
  }

  /** If a single entity is selected, find a grip near the world point. */
  private pickGrip(world: Vec2): { id: string; setter: (e: Entity, p: Vec2) => Entity } | null {
    if (this.selection.size !== 1) return null;
    const id = [...this.selection][0];
    const e = this.doc.entities.find((x) => x.id === id);
    if (!e) return null;
    const tol = 9 / this.vp.scale;
    for (const g of this.grips(e)) {
      if (dist(world, g.p) <= tol) return { id, setter: g.setter };
    }
    return null;
  }

  private clickSelect(world: Vec2, additive: boolean): void {
    const id = this.pick(world);
    if (!additive) this.selection.clear();
    if (id) {
      if (this.selection.has(id)) this.selection.delete(id);
      else this.selection.add(id);
    }
  }

  private selectInBand(a: Vec2, b: Vec2, additive: boolean): void {
    const w1 = this.vp.toWorld({ x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) });
    const w2 = this.vp.toWorld({ x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) });
    const bb = { min: w1, max: w2 };
    const crossing = b.x < a.x;
    if (!additive) this.selection.clear();
    for (const e of this.doc.entities) {
      if (!this.doc.isVisible(e)) continue;
      const eb = entityBounds(e);
      if (!boundsValid(eb)) continue;
      const inside =
        pointInBounds(eb.min, bb) && pointInBounds(eb.max, bb);
      const overlaps =
        eb.min.x <= bb.max.x && eb.max.x >= bb.min.x && eb.min.y <= bb.max.y && eb.max.y >= bb.min.y;
      if (crossing ? overlaps : inside) this.selection.add(e.id);
    }
  }

  // ---- tool factory ----------------------------------------------------
  private commit(ops: Op[]): void {
    this.applyOperations(ops);
  }

  /** Signed offset distance from an entity to a clicked point (side-aware). */
  private offsetDistanceFor(e: Entity, p: Vec2): number {
    switch (e.type) {
      case "line":
        return dot(sub(p, e.a), leftNormal(e.a, e.b));
      case "circle":
      case "arc":
        return dist(p, e.center) - e.radius;
      case "ellipse":
        return dist(p, e.center) - (e.rx + e.ry) / 2;
      default:
        return distanceTo(e, p);
    }
  }

  private makeTool(name: ToolName): Tool {
    const eng = this;
    const noop: Tool = {
      name,
      prompt: "",
      click() {},
      move() {},
      preview: () => [],
      cancel() {},
    };

    switch (name) {
      case "select":
        return {
          ...noop,
          prompt: "객체를 클릭하거나 드래그하여 선택 (Shift=추가, Del=삭제)",
        };

      case "line": {
        let a: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "선: 시작점 클릭 → 끝점 클릭",
          click(p) {
            if (!a) {
              a = p;
            } else {
              eng.commit([{ op: "add_line", a: [a.x, a.y], b: [p.x, p.y] }]);
              a = p; // chain
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (a && cur)
              return [{ id: "prev", type: "line", layer: eng.doc.currentLayer, a, b: cur }];
            return [];
          },
          finish() {
            a = null;
            cur = null;
          },
          cancel() {
            a = null;
            cur = null;
          },
        };
      }

      case "polyline": {
        const pts: Vec2[] = [];
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "폴리라인: 점들을 클릭, Enter/더블클릭으로 종료",
          click(p) {
            pts.push(p);
          },
          move(p) {
            cur = p;
          },
          preview() {
            const all = cur ? [...pts, cur] : [...pts];
            if (all.length < 2) return [];
            return [
              { id: "prev", type: "polyline", layer: eng.doc.currentLayer, points: all, closed: false },
            ];
          },
          finish() {
            if (pts.length >= 2) {
              eng.commit([{ op: "add_polyline", points: pts.map((p) => [p.x, p.y]) }]);
            }
            pts.length = 0;
            cur = null;
          },
          cancel() {
            pts.length = 0;
            cur = null;
          },
        };
      }

      case "rectangle": {
        let a: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "사각형: 첫 모서리 → 반대 모서리",
          click(p) {
            if (!a) a = p;
            else {
              eng.commit([
                {
                  op: "add_rectangle",
                  corner: [Math.min(a.x, p.x), Math.min(a.y, p.y)],
                  width: Math.abs(p.x - a.x),
                  height: Math.abs(p.y - a.y),
                },
              ]);
              a = null;
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (!a || !cur) return [];
            const c = { x: Math.min(a.x, cur.x), y: Math.min(a.y, cur.y) };
            const w = Math.abs(cur.x - a.x);
            const h = Math.abs(cur.y - a.y);
            return [
              {
                id: "prev",
                type: "polyline",
                layer: eng.doc.currentLayer,
                closed: true,
                points: [c, { x: c.x + w, y: c.y }, { x: c.x + w, y: c.y + h }, { x: c.x, y: c.y + h }],
              },
            ];
          },
          finish() {
            a = null;
            cur = null;
          },
          cancel() {
            a = null;
            cur = null;
          },
        };
      }

      case "circle": {
        let center: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "원: 중심 클릭 → 반지름 지정",
          click(p) {
            if (!center) center = p;
            else {
              eng.commit([{ op: "add_circle", center: [center.x, center.y], radius: dist(center, p) }]);
              center = null;
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (!center || !cur) return [];
            return [
              { id: "prev", type: "circle", layer: eng.doc.currentLayer, center, radius: dist(center, cur) },
            ];
          },
          finish() {
            center = null;
            cur = null;
          },
          cancel() {
            center = null;
            cur = null;
          },
        };
      }

      case "arc": {
        // 3-point arc: start, end, point-on-arc
        const pts: Vec2[] = [];
        let cur: Vec2 | null = null;
        const fromThree = (p1: Vec2, p2: Vec2, p3: Vec2): Entity | null => {
          const ax = p1.x,
            ay = p1.y,
            bx = p2.x,
            by = p2.y,
            cx = p3.x,
            cy = p3.y;
          const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
          if (Math.abs(d) < 1e-9) return null;
          const ux =
            ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) /
            d;
          const uy =
            ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) /
            d;
          const center = { x: ux, y: uy };
          const r = dist(center, p1);
          let sa = angleBetween(center, p1);
          let ea = angleBetween(center, p2);
          const ma = angleBetween(center, p3);
          // ensure mid angle lies within [sa,ea] sweep, else swap direction
          const within = (a: number, s: number, e: number) => {
            const n = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            let ss = n(s),
              ee = n(e),
              aa = n(a);
            if (ee < ss) ee += 2 * Math.PI;
            if (aa < ss) aa += 2 * Math.PI;
            return aa >= ss && aa <= ee;
          };
          if (!within(ma, sa, ea)) [sa, ea] = [ea, sa];
          return {
            id: "prev",
            type: "arc",
            layer: eng.doc.currentLayer,
            center,
            radius: r,
            startAngle: sa,
            endAngle: ea,
          };
        };
        return {
          name,
          prompt: "호(3점): 시작 → 끝 → 호 위의 점",
          click(p) {
            pts.push(p);
            if (pts.length === 3) {
              const a = fromThree(pts[0], pts[1], pts[2]);
              if (a && a.type === "arc")
                eng.commit([
                  {
                    op: "add_arc",
                    center: [a.center.x, a.center.y],
                    radius: a.radius,
                    startAngle: (a.startAngle * 180) / Math.PI,
                    endAngle: (a.endAngle * 180) / Math.PI,
                  },
                ]);
              pts.length = 0;
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (pts.length === 2 && cur) {
              const a = fromThree(pts[0], pts[1], cur);
              return a ? [a] : [];
            }
            if (pts.length >= 1 && cur) {
              return [{ id: "prev", type: "line", layer: eng.doc.currentLayer, a: pts[0], b: cur }];
            }
            return [];
          },
          cancel() {
            pts.length = 0;
            cur = null;
          },
        };
      }

      case "point":
        return {
          name,
          prompt: "점: 위치 클릭",
          click(p) {
            eng.commit([{ op: "add_point", at: [p.x, p.y] }]);
          },
          move() {},
          preview: () => [],
          cancel() {},
        };

      case "text":
        return {
          name,
          prompt: "문자: 위치 클릭 후 내용 입력",
          click(p) {
            const t = window.prompt("문자 입력:");
            if (t)
              eng.commit([{ op: "add_text", at: [p.x, p.y], text: t, height: 0.8 }]);
          },
          move() {},
          preview: () => [],
          cancel() {},
        };

      case "dimension": {
        let a: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "치수: 첫 점 → 둘째 점",
          click(p) {
            if (!a) a = p;
            else {
              eng.commit([{ op: "add_dimension", a: [a.x, a.y], b: [p.x, p.y], offset: 1 }]);
              a = null;
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (a && cur)
              return [
                { id: "prev", type: "dimension", layer: "dimensions", a, b: cur, offset: 1 },
              ];
            return [];
          },
          cancel() {
            a = null;
            cur = null;
          },
        };
      }

      case "ellipse": {
        let center: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "타원: 중심 클릭 → 반축 모서리",
          click(p) {
            if (!center) center = p;
            else {
              eng.commit([
                {
                  op: "add_ellipse",
                  center: [center.x, center.y],
                  rx: Math.abs(p.x - center.x) || 0.001,
                  ry: Math.abs(p.y - center.y) || 0.001,
                },
              ]);
              center = null;
            }
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (!center || !cur) return [];
            return [
              {
                id: "prev",
                type: "ellipse",
                layer: eng.doc.currentLayer,
                center,
                rx: Math.abs(cur.x - center.x) || 0.001,
                ry: Math.abs(cur.y - center.y) || 0.001,
                rotation: 0,
              },
            ];
          },
          cancel() {
            center = null;
            cur = null;
          },
        };
      }

      case "mirror": {
        let a: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "대칭: 대칭선 두 점 (먼저 객체 선택)",
          click(p) {
            if (!eng.selection.size) {
              eng.say("먼저 객체를 선택하세요.");
              return;
            }
            if (!a) {
              a = p;
              return;
            }
            eng.commit([
              { op: "mirror", selector: "selected", a: [a.x, a.y], b: [p.x, p.y], keepOriginal: true },
            ]);
            a = null;
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (!a || !cur) return [];
            return eng.doc.entities
              .filter((e) => eng.selection.has(e.id))
              .map((e) => ({ ...mirrorEntity(e, a!, cur!), id: "prev" + e.id }));
          },
          cancel() {
            a = null;
            cur = null;
          },
        };
      }

      case "offset": {
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "간격띄우기: 방향/거리 지점 클릭 (먼저 객체 선택)",
          click(p) {
            const t = eng.doc.entities.filter((e) => eng.selection.has(e.id));
            if (!t.length) {
              eng.say("먼저 객체를 선택하세요.");
              return;
            }
            const d = eng.offsetDistanceFor(t[0], p);
            eng.commit([{ op: "offset", selector: "selected", distance: d }]);
          },
          move(p) {
            cur = p;
          },
          preview() {
            const t = eng.doc.entities.filter((e) => eng.selection.has(e.id));
            if (!t.length || !cur) return [];
            const d = eng.offsetDistanceFor(t[0], cur);
            return t
              .map((e) => offsetEntity(e, d))
              .filter((e): e is Entity => !!e)
              .map((e) => ({ ...e, id: "prevoff" }));
          },
          cancel() {
            cur = null;
          },
        };
      }

      case "fillet":
      case "chamfer": {
        let first: string | null = null;
        return {
          name,
          prompt:
            name === "fillet"
              ? `모깎기 r=${this.filletRadius}: 선1 → 선2`
              : `모따기 d=${this.chamferDist}: 선1 → 선2`,
          click(p) {
            const id = eng.pick(p);
            const e = id ? eng.doc.entities.find((x) => x.id === id) : null;
            if (!e || e.type !== "line") {
              eng.say("선 두 개가 필요합니다.");
              return;
            }
            if (!first) {
              first = id;
              eng.say("선1 선택됨 — 선2를 클릭하세요.");
              return;
            }
            const l1 = eng.doc.entities.find((x) => x.id === first) as LineEntity | undefined;
            const l2 = e as LineEntity;
            first = null;
            if (!l1 || l1.id === l2.id) return;
            if (name === "fillet") {
              const res = filletLines(l1, l2, eng.filletRadius);
              if (!res) {
                eng.say("모깎기 실패(평행선).");
                return;
              }
              eng.doc.transact(() => {
                eng.doc.replace(l1.id, res.line1);
                eng.doc.replace(l2.id, res.line2);
                eng.doc.add(res.arc);
              });
              eng.say("모깎기 완료.");
            } else {
              const res = chamferLines(l1, l2, eng.chamferDist);
              if (!res) {
                eng.say("모따기 실패(평행선).");
                return;
              }
              eng.doc.transact(() => {
                eng.doc.replace(l1.id, res.line1);
                eng.doc.replace(l2.id, res.line2);
                eng.doc.add(res.bevel);
              });
              eng.say("모따기 완료.");
            }
          },
          move() {},
          preview: () => [],
          cancel() {
            first = null;
          },
        };
      }

      case "trim":
        return {
          name,
          prompt: "자르기: 잘라낼 선에서 제거할 부분을 클릭",
          click(p) {
            const id = eng.pick(p);
            const e = id ? eng.doc.entities.find((x) => x.id === id) : null;
            if (!e || e.type !== "line") {
              eng.say("선만 자를 수 있습니다.");
              return;
            }
            const cutters = eng.doc.entities.filter((x) => x.id !== id).flatMap(entitySegments);
            const pieces = trimLine(e as LineEntity, cutters, p);
            eng.doc.transact(() => {
              eng.doc.remove(new Set([e.id]));
              pieces.forEach((pc) => eng.doc.add(pc));
            });
            eng.say(`자르기: ${pieces.length}조각 남음.`);
          },
          move() {},
          preview: () => [],
          cancel() {},
        };

      case "extend":
        return {
          name,
          prompt: "연장: 연장할 선의 끝쪽을 클릭",
          click(p) {
            const id = eng.pick(p);
            const e = id ? eng.doc.entities.find((x) => x.id === id) : null;
            if (!e || e.type !== "line") {
              eng.say("선만 연장할 수 있습니다.");
              return;
            }
            const bounds = eng.doc.entities.filter((x) => x.id !== id).flatMap(entitySegments);
            const ext = extendLine(e as LineEntity, bounds, p);
            if (!ext) {
              eng.say("연장할 경계를 찾지 못했습니다.");
              return;
            }
            eng.doc.transact(() => eng.doc.replace(e.id, ext));
            eng.say("연장 완료.");
          },
          move() {},
          preview: () => [],
          cancel() {},
        };

      case "hatch":
        return {
          name,
          prompt: "채우기: 닫힌 객체(원/타원/닫힌 폴리라인) 클릭",
          click(p) {
            const id = eng.pick(p);
            const e = id ? eng.doc.entities.find((x) => x.id === id) : null;
            if (!e) return;
            if (e.type === "circle" || e.type === "ellipse" || (e.type === "polyline" && e.closed)) {
              eng.doc.transact(() => eng.doc.replace(e.id, { ...e, fill: "#4da3ff55" }));
              eng.say("채우기 적용.");
            } else {
              eng.say("닫힌 객체만 채울 수 있습니다.");
            }
          },
          move() {},
          preview: () => [],
          cancel() {},
        };

      case "measure": {
        let a: Vec2 | null = null;
        let cur: Vec2 | null = null;
        return {
          name,
          prompt: "거리: 두 점 클릭",
          click(p) {
            if (!a) {
              a = p;
              return;
            }
            const d = dist(a, p);
            const ang = (angleBetween(a, p) * 180) / Math.PI;
            eng.say(
              `거리 ${d.toFixed(3)}  각도 ${ang.toFixed(2)}°  ΔX ${(p.x - a.x).toFixed(3)} ΔY ${(p.y - a.y).toFixed(3)}`,
            );
            a = null;
          },
          move(p) {
            cur = p;
          },
          preview() {
            if (a && cur) return [{ id: "prev", type: "line", layer: eng.doc.currentLayer, a, b: cur }];
            return [];
          },
          cancel() {
            a = null;
            cur = null;
          },
        };
      }

      case "move":
      case "copy":
      case "rotate":
      case "scale":
        return this.makeTransformTool(name);

      case "erase":
        return {
          name,
          prompt: "지우기: 객체 클릭",
          click(p) {
            const id = eng.pick(p);
            if (id) {
              eng.doc.transact(() => eng.doc.remove(new Set([id])));
              eng.say("삭제: 1개");
            }
          },
          move() {},
          preview: () => [],
          cancel() {},
        };
    }
  }

  /** Generic two-click transform tool (move/copy/rotate/scale) on the selection. */
  private makeTransformTool(name: ToolName): Tool {
    const eng = this;
    let base: Vec2 | null = null;
    let cur: Vec2 | null = null;
    const targets = () => eng.doc.entities.filter((e) => eng.selection.has(e.id));
    const promptByName: Record<string, string> = {
      move: "이동: 기준점 → 목표점 (먼저 객체 선택)",
      copy: "복사: 기준점 → 목표점",
      rotate: "회전: 중심점 → 각도 방향",
      scale: "축척: 기준점 → 배율 방향",
    };
    const previewFor = (b: Vec2, c: Vec2): Entity[] => {
      const t = targets();
      if (name === "move" || name === "copy") {
        const d = { x: c.x - b.x, y: c.y - b.y };
        return t.map((e) => ({ ...translate(e, d), id: "prev" + e.id }));
      }
      if (name === "rotate") {
        const ang = angleBetween(b, c);
        return t.map((e) => ({ ...rotateEntity(e, b, ang), id: "prev" + e.id }));
      }
      // scale
      const f = dist(b, c) || 1;
      return t.map((e) => ({ ...scaleEntity(e, b, f), id: "prev" + e.id }));
    };
    return {
      name,
      prompt: promptByName[name] ?? "",
      click(p) {
        if (!eng.selection.size) {
          eng.say("먼저 객체를 선택하세요 (선택 도구 사용).");
          return;
        }
        if (!base) {
          base = p;
          return;
        }
        const b = base;
        if (name === "move") {
          eng.commit([{ op: "move", selector: "selected", delta: [p.x - b.x, p.y - b.y] }]);
        } else if (name === "copy") {
          eng.commit([{ op: "copy", selector: "selected", delta: [p.x - b.x, p.y - b.y] }]);
        } else if (name === "rotate") {
          eng.commit([
            { op: "rotate", selector: "selected", origin: [b.x, b.y], angle: (angleBetween(b, p) * 180) / Math.PI },
          ]);
        } else if (name === "scale") {
          eng.commit([{ op: "scale", selector: "selected", origin: [b.x, b.y], factor: dist(b, p) || 1 }]);
        }
        base = null;
      },
      move(p) {
        cur = p;
      },
      preview() {
        if (base && cur) return previewFor(base, cur);
        return [];
      },
      cancel() {
        base = null;
        cur = null;
      },
    };
  }
}
