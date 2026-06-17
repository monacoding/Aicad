// P&ID symbol library (ship process diagrams). Each symbol is built in a unit
// local frame, then scaled/rotated/translated into place and tagged with a
// shared group id so it selects and moves as one block (AutoCAD-block-like).
import { Entity, newId, translate, rotateEntity, scaleEntity } from "./entities";
import { Vec2, rad } from "./geometry";

export const SYMBOLS = [
  "gate_valve",
  "globe_valve",
  "check_valve",
  "ball_valve",
  "butterfly_valve",
  "control_valve",
  "pump",
  "vessel",
  "tank",
  "heat_exchanger",
  "instrument",
  "reducer",
  "flange",
  "arrow",
  "strainer",
  "motor",
] as const;

export type SymbolName = (typeof SYMBOLS)[number];

export interface SymbolOpts {
  at: Vec2;
  scale?: number;
  rotation?: number; // degrees
  layer?: string;
  color?: string;
  tag?: string;
  group?: string;
  size?: string;
  service?: string;
}

// ---- local-frame proto builders (id assigned later) -----------------------
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
type Proto = DistributiveOmit<Entity, "id" | "layer" | "group">;

const L = (a: Vec2, b: Vec2): Proto => ({ type: "line", a, b });
const C = (center: Vec2, radius: number): Proto => ({ type: "circle", center, radius });
const POLY = (points: Vec2[], closed = false): Proto => ({ type: "polyline", points, closed });
const ARC = (center: Vec2, radius: number, s: number, e: number): Proto => ({
  type: "arc",
  center,
  radius,
  startAngle: rad(s),
  endAngle: rad(e),
});
const TXT = (at: Vec2, text: string, height = 0.32): Proto => ({
  type: "text",
  at,
  text,
  height,
  rotation: 0,
});

/** A bowtie/hourglass valve body (width 1, height ~0.7). */
function bowtie(): Proto[] {
  return [
    POLY([{ x: -0.5, y: -0.35 }, { x: -0.5, y: 0.35 }, { x: 0, y: 0 }], true),
    POLY([{ x: 0.5, y: -0.35 }, { x: 0.5, y: 0.35 }, { x: 0, y: 0 }], true),
  ];
}

function protosFor(name: SymbolName): Proto[] {
  switch (name) {
    case "gate_valve":
      return bowtie();
    case "globe_valve":
      return [...bowtie(), C({ x: 0, y: 0 }, 0.18)];
    case "check_valve":
      return [
        ...bowtie(),
        // flow arrow through the body
        L({ x: -0.5, y: 0 }, { x: 0.5, y: 0 }),
        POLY([{ x: 0.18, y: 0.16 }, { x: 0.5, y: 0 }, { x: 0.18, y: -0.16 }], true),
      ];
    case "ball_valve":
      return [...bowtie(), C({ x: 0, y: 0 }, 0.16)];
    case "butterfly_valve":
      return [...bowtie(), L({ x: 0, y: -0.35 }, { x: 0, y: 0.35 })];
    case "control_valve":
      return [
        ...bowtie(),
        // actuator (diaphragm) above with stem
        L({ x: 0, y: 0 }, { x: 0, y: 0.55 }),
        ARC({ x: 0, y: 0.62 }, 0.28, 0, 180),
        L({ x: -0.28, y: 0.62 }, { x: 0.28, y: 0.62 }),
      ];
    case "pump":
      return [
        C({ x: 0, y: 0 }, 0.5),
        // discharge nozzle (top) + suction (left)
        L({ x: 0, y: 0.5 }, { x: 0, y: 0.8 }),
        L({ x: -0.5, y: 0 }, { x: -0.8, y: 0 }),
        // impeller hint
        POLY([{ x: -0.2, y: -0.25 }, { x: 0.25, y: 0 }, { x: -0.2, y: 0.25 }]),
      ];
    case "motor":
      return [C({ x: 0, y: 0 }, 0.5), TXT({ x: -0.18, y: -0.16 }, "M", 0.4)];
    case "vessel":
      // vertical vessel with rounded caps
      return [
        L({ x: -0.5, y: -0.9 }, { x: -0.5, y: 0.9 }),
        L({ x: 0.5, y: -0.9 }, { x: 0.5, y: 0.9 }),
        ARC({ x: 0, y: 0.9 }, 0.5, 0, 180),
        ARC({ x: 0, y: -0.9 }, 0.5, 180, 360),
      ];
    case "tank":
      // horizontal storage tank
      return [
        L({ x: -1.1, y: -0.6 }, { x: 1.1, y: -0.6 }),
        L({ x: -1.1, y: 0.6 }, { x: 1.1, y: 0.6 }),
        ARC({ x: -1.1, y: 0 }, 0.6, 90, 270),
        ARC({ x: 1.1, y: 0 }, 0.6, -90, 90),
      ];
    case "heat_exchanger":
      return [
        C({ x: 0, y: 0 }, 0.7),
        L({ x: -0.7, y: 0 }, { x: 0.7, y: 0 }),
        L({ x: 0, y: -0.7 }, { x: 0, y: 0.7 }),
      ];
    case "instrument":
      return [C({ x: 0, y: 0 }, 0.5)];
    case "reducer":
      return [
        POLY(
          [
            { x: -0.5, y: 0.35 },
            { x: 0.5, y: 0.18 },
            { x: 0.5, y: -0.18 },
            { x: -0.5, y: -0.35 },
          ],
          true,
        ),
      ];
    case "flange":
      return [L({ x: 0, y: -0.3 }, { x: 0, y: 0.3 }), L({ x: 0.12, y: -0.3 }, { x: 0.12, y: 0.3 })];
    case "arrow":
      return [POLY([{ x: -0.4, y: 0.22 }, { x: 0.4, y: 0 }, { x: -0.4, y: -0.22 }], true)];
    case "strainer":
      return [
        L({ x: -0.5, y: 0 }, { x: 0.5, y: 0 }),
        POLY([{ x: -0.1, y: 0 }, { x: 0.25, y: -0.3 }, { x: 0.4, y: -0.45 }]),
      ];
  }
}

/** Build a placed P&ID symbol as a group of entities. */
export function makeSymbol(name: SymbolName, opts: SymbolOpts): Entity[] {
  const group = opts.group ?? newId();
  const layer = opts.layer ?? "equipment";
  const scale = opts.scale ?? 1;
  const rotation = rad(opts.rotation ?? 0);
  const protos = protosFor(name);

  // instrument tag is split into two centered lines inside the bubble
  // (function letters over loop number, per ISA/P&ID convention); other
  // symbols get a single tag below, sized to stay readable.
  if (opts.tag) {
    if (name === "instrument") {
      const m = opts.tag.match(/^([A-Za-z]+)(.*)$/);
      const letters = m ? m[1] : opts.tag;
      const loop = m ? m[2] : "";
      const ch = 0.26;
      const cx = (s: string) => -(s.length * ch * 0.55) / 1;
      protos.push(TXT({ x: cx(letters), y: 0.02 }, letters, ch));
      if (loop) protos.push(TXT({ x: cx(loop), y: -0.28 }, loop, ch));
    } else {
      const ch = 0.42;
      protos.push(TXT({ x: -(opts.tag.length * ch * 0.3), y: -1.15 }, opts.tag, ch));
    }
  }

  return protos.map((p) => {
    // every entity of the symbol carries BOM metadata so any one identifies it
    let e = {
      ...(p as Entity),
      id: newId(),
      layer,
      group,
      kind: name,
      tag: opts.tag,
      size: opts.size,
      service: opts.service,
    } as Entity;
    if (opts.color) e.color = opts.color;
    e = scaleEntity(e, { x: 0, y: 0 }, scale);
    e = rotateEntity(e, { x: 0, y: 0 }, rotation);
    e = translate(e, opts.at);
    return e;
  });
}

/** A pipe run: a heavier solid polyline on the "process" layer. */
export function makePipe(
  points: Vec2[],
  layer = "process",
  width = 1.8,
  size?: string,
  service?: string,
  tag?: string,
): Entity[] {
  if (points.length < 2) return [];
  return [{ id: newId(), type: "polyline", layer, points, closed: false, width, kind: "pipe", size, service, tag }];
}

/** An instrument signal line (dashed, thin). */
export function makeSignal(a: Vec2, b: Vec2, layer = "instrument"): Entity[] {
  return [{ id: newId(), type: "line", layer, a, b, lineType: "dashed", width: 0.8, kind: "signal" }];
}
