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
import {
  mirrorEntity,
  offsetEntity,
  arrayRect,
  arrayPolar,
} from "./geomops";
import { makeSymbol, makePipe, makeSignal, SYMBOLS, SymbolName } from "./pid";

export type XY = [number, number];

export type Selector = "all" | "selected" | "last" | { layer: string };

export type Op =
  | { op: "add_line"; a: XY; b: XY; layer?: string; color?: string }
  | { op: "add_polyline"; points: XY[]; closed?: boolean; layer?: string; color?: string; lineType?: "solid" | "dashed" | "dotted" | "phantom" }
  | { op: "add_rectangle"; corner: XY; width: number; height: number; layer?: string; color?: string; fill?: string }
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
  | {
      op: "add_ellipse";
      center: XY;
      rx: number;
      ry: number;
      rotation?: number;
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
  | { op: "mirror"; selector?: Selector; a: XY; b: XY; keepOriginal?: boolean }
  | { op: "offset"; selector?: Selector; distance: number }
  | { op: "array_rect"; selector?: Selector; rows: number; cols: number; dx: number; dy: number }
  | { op: "array_polar"; selector?: Selector; center: XY; count: number; angle?: number }
  | { op: "hatch"; selector?: Selector; color?: string }
  | {
      op: "add_symbol";
      symbol: string;
      at: XY;
      scale?: number;
      rotation?: number;
      tag?: string;
      layer?: string;
      color?: string;
      size?: string;
      service?: string;
    }
  | { op: "add_pipe"; points: XY[]; layer?: string; size?: string; service?: string }
  | { op: "add_signal"; a: XY; b: XY; layer?: string }
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
            lineType: op.lineType,
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
          const e: Entity = { id: newId(), type: "polyline", layer, color, points: pts, closed: true, fill: op.fill };
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
        case "add_ellipse": {
          const e: Entity = {
            id: newId(),
            type: "ellipse",
            layer,
            color,
            center: xy(op.center),
            rx: op.rx,
            ry: op.ry,
            rotation: rad(op.rotation ?? 0),
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
        case "mirror": {
          const targets = resolve(doc, op.selector, ctx);
          const a = xy(op.a);
          const b = xy(op.b);
          for (const e of targets) {
            const m = mirrorEntity(e, a, b);
            doc.add(m);
            created.push(m.id);
            if (op.keepOriginal === false) doc.remove(new Set([e.id]));
          }
          messages.push(`대칭: ${targets.length}개`);
          break;
        }
        case "offset": {
          const targets = resolve(doc, op.selector, ctx);
          for (const e of targets) {
            const o = offsetEntity(e, op.distance);
            if (o) {
              doc.add(o);
              created.push(o.id);
            }
          }
          messages.push(`간격띄우기: ${op.distance}`);
          break;
        }
        case "array_rect": {
          const targets = resolve(doc, op.selector, ctx);
          for (const e of targets) {
            for (const c of arrayRect(e, Math.max(1, op.rows), Math.max(1, op.cols), op.dx, op.dy)) {
              doc.add(c);
              created.push(c.id);
            }
          }
          messages.push(`직사각형 배열: ${op.rows}×${op.cols}`);
          break;
        }
        case "array_polar": {
          const targets = resolve(doc, op.selector, ctx);
          for (const e of targets) {
            for (const c of arrayPolar(e, xy(op.center), Math.max(2, op.count), op.angle ?? 360)) {
              doc.add(c);
              created.push(c.id);
            }
          }
          messages.push(`원형 배열: ${op.count}개`);
          break;
        }
        case "hatch": {
          const targets = resolve(doc, op.selector, ctx);
          const fill = op.color ?? "#4da3ff55";
          let n = 0;
          for (const e of targets) {
            if (e.type === "circle" || e.type === "ellipse" || (e.type === "polyline" && e.closed)) {
              doc.replace(e.id, { ...e, fill });
              n++;
            }
          }
          messages.push(`채우기: ${n}개`);
          break;
        }
        case "add_symbol": {
          const sym = op.symbol as SymbolName;
          if (!SYMBOLS.includes(sym)) {
            messages.push(`알 수 없는 심볼: ${op.symbol}`);
            break;
          }
          const lyr = op.layer ?? "equipment";
          doc.ensureLayer(lyr, "#ffb454");
          const es = makeSymbol(sym, {
            at: xy(op.at),
            scale: op.scale ?? 1,
            rotation: op.rotation ?? 0,
            tag: op.tag,
            layer: lyr,
            color: op.color,
            size: op.size,
            service: op.service,
          });
          doc.add(...es);
          es.forEach((e) => created.push(e.id));
          break;
        }
        case "add_pipe": {
          const lyr = op.layer ?? "process";
          doc.ensureLayer(lyr, "#7bd88f");
          const es = makePipe(op.points.map(xy), lyr, 1.8, op.size, op.service) as Entity[];
          doc.add(...es);
          es.forEach((e) => created.push(e.id));
          break;
        }
        case "add_signal": {
          const lyr = op.layer ?? "instrument";
          doc.ensureLayer(lyr, "#5cc8ff");
          const es = makeSignal(xy(op.a), xy(op.b), lyr);
          doc.add(...es);
          es.forEach((e) => created.push(e.id));
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
