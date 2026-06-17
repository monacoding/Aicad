// Declarative CAD operations. This is the single vocabulary shared by the
// command line, the toolbar tools, and the natural-language layer (Claude
// returns an array of these). Coordinates are [x, y] tuples in world units;
// angles are in degrees. Keep this in sync with server/opSchema.js.
import { CadDocument } from "./document";
import {
  Entity,
  newId,
  translate,
  rotateEntity,
  scaleEntity,
} from "./entities";
import { Vec2, rad } from "./geometry";

export type XY = [number, number];

export type Selector = "all" | "selected" | "last" | { layer: string };

export type Op =
  | { op: "add_line"; a: XY; b: XY; layer?: string; color?: string }
  | { op: "add_polyline"; points: XY[]; closed?: boolean; layer?: string; color?: string }
  | { op: "add_rectangle"; corner: XY; width: number; height: number; layer?: string; color?: string }
  | { op: "add_circle"; center: XY; radius: number; layer?: string; color?: string }
  | {
      op: "add_arc";
      center: XY;
      radius: number;
      startAngle: number;
      endAngle: number;
      layer?: string;
      color?: string;
    }
  | { op: "add_point"; at: XY; layer?: string; color?: string }
  | {
      op: "add_text";
      at: XY;
      text: string;
      height?: number;
      rotation?: number;
      layer?: string;
      color?: string;
    }
  | { op: "add_dimension"; a: XY; b: XY; offset?: number; layer?: string }
  | { op: "move"; selector?: Selector; delta: XY }
  | { op: "copy"; selector?: Selector; delta: XY; count?: number }
  | { op: "rotate"; selector?: Selector; origin: XY; angle: number }
  | { op: "scale"; selector?: Selector; origin: XY; factor: number }
  | { op: "delete"; selector?: Selector }
  | { op: "set_layer"; name: string; color?: string; visible?: boolean; current?: boolean }
  | { op: "clear" };

export interface ApplyContext {
  selection: Set<string>;
  lastCreated: string[];
}

export interface ApplyResult {
  created: string[];
  messages: string[];
}

const xy = (p: XY): Vec2 => ({ x: p[0], y: p[1] });

function resolve(doc: CadDocument, sel: Selector | undefined, ctx: ApplyContext): Entity[] {
  const s = sel ?? "selected";
  if (s === "all") return [...doc.entities];
  if (s === "selected") {
    const ids = ctx.selection.size ? ctx.selection : new Set(ctx.lastCreated);
    return doc.entities.filter((e) => ids.has(e.id));
  }
  if (s === "last") {
    const id = ctx.lastCreated[ctx.lastCreated.length - 1];
    return doc.entities.filter((e) => e.id === id);
  }
  if (typeof s === "object" && "layer" in s) {
    return doc.entities.filter((e) => e.layer === s.layer);
  }
  return [];
}

/** Apply a batch of operations inside one undoable transaction. */
export function applyOps(doc: CadDocument, ops: Op[], ctx: ApplyContext): ApplyResult {
  const created: string[] = [];
  const messages: string[] = [];

  doc.transact(() => {
    for (const op of ops) {
      const layer = "layer" in op && op.layer ? op.layer : doc.currentLayer;
      if ("layer" in op && op.layer) doc.ensureLayer(op.layer);
      const color = "color" in op ? op.color : undefined;

      switch (op.op) {
        case "add_line": {
          const e: Entity = { id: newId(), type: "line", layer, color, a: xy(op.a), b: xy(op.b) };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_polyline": {
          const e: Entity = {
            id: newId(),
            type: "polyline",
            layer,
            color,
            points: op.points.map(xy),
            closed: !!op.closed,
          };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_rectangle": {
          const c = xy(op.corner);
          const pts: Vec2[] = [
            c,
            { x: c.x + op.width, y: c.y },
            { x: c.x + op.width, y: c.y + op.height },
            { x: c.x, y: c.y + op.height },
          ];
          const e: Entity = { id: newId(), type: "polyline", layer, color, points: pts, closed: true };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_circle": {
          const e: Entity = {
            id: newId(),
            type: "circle",
            layer,
            color,
            center: xy(op.center),
            radius: op.radius,
          };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_arc": {
          const e: Entity = {
            id: newId(),
            type: "arc",
            layer,
            color,
            center: xy(op.center),
            radius: op.radius,
            startAngle: rad(op.startAngle),
            endAngle: rad(op.endAngle),
          };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_point": {
          const e: Entity = { id: newId(), type: "point", layer, color, at: xy(op.at) };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_text": {
          const e: Entity = {
            id: newId(),
            type: "text",
            layer,
            color,
            at: xy(op.at),
            text: op.text,
            height: op.height ?? 1,
            rotation: rad(op.rotation ?? 0),
          };
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "add_dimension": {
          const e: Entity = {
            id: newId(),
            type: "dimension",
            layer: op.layer ?? "dimensions",
            a: xy(op.a),
            b: xy(op.b),
            offset: op.offset ?? 1,
          };
          doc.ensureLayer(e.layer, "#33cc99");
          doc.add(e);
          created.push(e.id);
          break;
        }
        case "move": {
          const targets = resolve(doc, op.selector, ctx);
          const d = xy(op.delta);
          for (const e of targets) doc.replace(e.id, translate(e, d));
          messages.push(`이동: ${targets.length}개 객체`);
          break;
        }
        case "copy": {
          const targets = resolve(doc, op.selector, ctx);
          const d = xy(op.delta);
          const n = Math.max(1, op.count ?? 1);
          for (const e of targets) {
            for (let i = 1; i <= n; i++) {
              const c = translate(e, { x: d.x * i, y: d.y * i });
              c.id = newId();
              doc.add(c);
              created.push(c.id);
            }
          }
          messages.push(`복사: ${targets.length}개 × ${n}`);
          break;
        }
        case "rotate": {
          const targets = resolve(doc, op.selector, ctx);
          for (const e of targets) doc.replace(e.id, rotateEntity(e, xy(op.origin), rad(op.angle)));
          messages.push(`회전: ${targets.length}개, ${op.angle}°`);
          break;
        }
        case "scale": {
          const targets = resolve(doc, op.selector, ctx);
          for (const e of targets) doc.replace(e.id, scaleEntity(e, xy(op.origin), op.factor));
          messages.push(`축척: ${targets.length}개 × ${op.factor}`);
          break;
        }
        case "delete": {
          const targets = resolve(doc, op.selector, ctx);
          doc.remove(new Set(targets.map((e) => e.id)));
          messages.push(`삭제: ${targets.length}개`);
          break;
        }
        case "set_layer": {
          const l = doc.ensureLayer(op.name, op.color ?? "#e6e6e6");
          if (op.color) l.color = op.color;
          if (op.visible !== undefined) l.visible = op.visible;
          if (op.current) doc.currentLayer = op.name;
          messages.push(`레이어: ${op.name}`);
          break;
        }
        case "clear": {
          doc.clear();
          messages.push("도면 초기화");
          break;
        }
      }
    }
  });

  ctx.lastCreated = created;
  return { created, messages };
}
