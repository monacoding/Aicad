// Geometric editing operations: mirror, offset, array, fillet, trim, extend.
// Pure functions over the Entity model; the engine/ops layer wires them up.
import {
  Entity,
  LineEntity,
  ArcEntity,
  newId,
  translate as translateEntity,
  rotateEntity,
} from "./entities";
import {
  Vec2,
  add,
  sub,
  scale,
  len,
  dist,
  dot,
  angle,
  polar,
  reflectPoint,
  leftNormal,
  lineLineIntersect,
  segSegIntersect,
} from "./geometry";

// ---- mirror ---------------------------------------------------------------
export function mirrorEntity(e: Entity, a: Vec2, b: Vec2): Entity {
  const R = (p: Vec2) => reflectPoint(p, a, b);
  const lineAng = angle(a, b);
  const c = { ...e, id: newId() } as Entity;
  switch (c.type) {
    case "line":
      return { ...c, a: R(c.a), b: R(c.b) };
    case "polyline":
      return { ...c, points: c.points.map(R) };
    case "circle":
      return { ...c, center: R(c.center) };
    case "arc": {
      const nc = R(c.center);
      const se = R(polar(c.center, c.startAngle, c.radius));
      const ee = R(polar(c.center, c.endAngle, c.radius));
      // reflection reverses orientation, so swap start/end
      return { ...c, center: nc, startAngle: angle(nc, ee), endAngle: angle(nc, se) };
    }
    case "ellipse":
      return { ...c, center: R(c.center), rotation: 2 * lineAng - c.rotation };
    case "point":
      return { ...c, at: R(c.at) };
    case "text":
      return { ...c, at: R(c.at), rotation: 2 * lineAng - c.rotation };
    case "dimension":
      return { ...c, a: R(c.a), b: R(c.b) };
  }
}

// ---- offset ---------------------------------------------------------------
/** Offset by `d` world units. Positive = to the left of direction / outward. */
export function offsetEntity(e: Entity, d: number): Entity | null {
  switch (e.type) {
    case "line": {
      const n = leftNormal(e.a, e.b);
      const off = scale(n, d);
      return { ...e, id: newId(), a: add(e.a, off), b: add(e.b, off) };
    }
    case "circle": {
      const r = e.radius + d;
      if (r <= 0) return null;
      return { ...e, id: newId(), radius: r };
    }
    case "arc": {
      const r = e.radius + d;
      if (r <= 0) return null;
      return { ...e, id: newId(), radius: r };
    }
    case "ellipse": {
      const rx = e.rx + d;
      const ry = e.ry + d;
      if (rx <= 0 || ry <= 0) return null;
      return { ...e, id: newId(), rx, ry };
    }
    case "polyline": {
      const pts = e.points;
      const n = pts.length;
      if (n < 2) return null;
      const segNormal = (i: number) => {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        return leftNormal(a, b);
      };
      const out: Vec2[] = pts.map((p, i) => {
        const prevSeg = e.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
        const nextSeg = e.closed ? i % n : Math.min(n - 2, i);
        const n1 = segNormal(prevSeg);
        const n2 = segNormal(nextSeg);
        const m = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
        const L = len(m) || 1;
        // miter length compensation
        const cosHalf = Math.max(0.2, L);
        return add(p, scale({ x: m.x / L, y: m.y / L }, d / cosHalf));
      });
      return { ...e, id: newId(), points: out };
    }
    default:
      return null;
  }
}

// ---- arrays ---------------------------------------------------------------
export function arrayRect(
  e: Entity,
  rows: number,
  cols: number,
  dx: number,
  dy: number,
): Entity[] {
  const out: Entity[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue;
      out.push(translateClone(e, { x: c * dx, y: r * dy }));
    }
  }
  return out;
}

export function arrayPolar(e: Entity, center: Vec2, count: number, totalDeg: number): Entity[] {
  const out: Entity[] = [];
  const step = (totalDeg * Math.PI) / 180 / count;
  for (let i = 1; i < count; i++) {
    out.push(rotateClone(e, center, step * i));
  }
  return out;
}

function translateClone(e: Entity, d: Vec2): Entity {
  return { ...translateEntity(e, d), id: newId() };
}
function rotateClone(e: Entity, o: Vec2, ang: number): Entity {
  return { ...rotateEntity(e, o, ang), id: newId() };
}

// ---- fillet (two lines) ---------------------------------------------------
export interface FilletResult {
  line1: LineEntity;
  line2: LineEntity;
  arc: ArcEntity;
}

/** Round the corner between two lines with the given radius. */
export function filletLines(l1: LineEntity, l2: LineEntity, radius: number): FilletResult | null {
  const ip = lineLineIntersect(l1.a, l1.b, l2.a, l2.b);
  if (!ip) return null;
  // direction from intersection toward each line's far end
  const far = (l: LineEntity) => (dist(ip, l.a) > dist(ip, l.b) ? l.a : l.b);
  const d1 = unit(sub(far(l1), ip));
  const d2 = unit(sub(far(l2), ip));
  const half = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2)))) / 2;
  if (half <= 1e-6 || Math.abs(half - Math.PI / 2) < 1e-9) {
    // still allow right angle
  }
  const t = radius / Math.tan(half); // distance from corner to tangent points
  const p1 = add(ip, scale(d1, t));
  const p2 = add(ip, scale(d2, t));
  // bisector direction toward arc center
  const bis = unit(add(d1, d2));
  const centerDist = radius / Math.sin(half);
  const center = add(ip, scale(bis, centerDist));
  const sa = angle(center, p1);
  const ea = angle(center, p2);
  return {
    line1: { ...l1, a: far(l1), b: p1 },
    line2: { ...l2, a: far(l2), b: p2 },
    arc: {
      id: newId(),
      type: "arc",
      layer: l1.layer,
      center,
      radius,
      startAngle: sa,
      endAngle: ea,
    },
  };
}

// ---- chamfer (two lines) --------------------------------------------------
export interface ChamferResult {
  line1: LineEntity;
  line2: LineEntity;
  bevel: LineEntity;
}

export function chamferLines(l1: LineEntity, l2: LineEntity, d: number): ChamferResult | null {
  const ip = lineLineIntersect(l1.a, l1.b, l2.a, l2.b);
  if (!ip) return null;
  const far = (l: LineEntity) => (dist(ip, l.a) > dist(ip, l.b) ? l.a : l.b);
  const d1 = unit(sub(far(l1), ip));
  const d2 = unit(sub(far(l2), ip));
  const p1 = add(ip, scale(d1, d));
  const p2 = add(ip, scale(d2, d));
  return {
    line1: { ...l1, a: far(l1), b: p1 },
    line2: { ...l2, a: far(l2), b: p2 },
    bevel: { id: newId(), type: "line", layer: l1.layer, a: p1, b: p2 },
  };
}

// ---- trim / extend --------------------------------------------------------
export type Segment = [Vec2, Vec2];

export function entitySegments(e: Entity): Segment[] {
  switch (e.type) {
    case "line":
      return [[e.a, e.b]];
    case "polyline": {
      const s: Segment[] = [];
      for (let i = 0; i < e.points.length - 1; i++) s.push([e.points[i], e.points[i + 1]]);
      if (e.closed && e.points.length > 2) s.push([e.points[e.points.length - 1], e.points[0]]);
      return s;
    }
    case "dimension":
      return [[e.a, e.b]];
    default:
      return [];
  }
}

/** Trim a line at its intersections with cutters, removing the piece under pick. */
export function trimLine(line: LineEntity, cutters: Segment[], pick: Vec2): LineEntity[] {
  const dir = sub(line.b, line.a);
  const L2 = dot(dir, dir) || 1;
  const param = (p: Vec2) => dot(sub(p, line.a), dir) / L2;
  const ts = new Set<number>([0, 1]);
  for (const [c1, c2] of cutters) {
    const x = segSegIntersect(line.a, line.b, c1, c2);
    if (x) {
      const t = param(x);
      if (t > 1e-6 && t < 1 - 1e-6) ts.add(t);
    }
  }
  const sorted = [...ts].sort((a, b) => a - b);
  if (sorted.length <= 2) return [line]; // nothing to trim
  const tp = param(pick);
  const pieces: LineEntity[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const t0 = sorted[i];
    const t1 = sorted[i + 1];
    if (tp >= t0 && tp <= t1) continue; // drop the picked piece
    pieces.push({
      ...line,
      id: pieces.length ? newId() : line.id,
      a: add(line.a, scale(dir, t0)),
      b: add(line.a, scale(dir, t1)),
    });
  }
  return pieces;
}

/** Extend the end of `line` nearest `pick` to the closest boundary intersection. */
export function extendLine(line: LineEntity, boundaries: Segment[], pick: Vec2): LineEntity | null {
  const extendA = dist(pick, line.a) < dist(pick, line.b);
  const fixed = extendA ? line.b : line.a;
  const moving = extendA ? line.a : line.b;
  const dir = unit(sub(moving, fixed));
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (const [c1, c2] of boundaries) {
    const x = lineLineIntersect(line.a, line.b, c1, c2);
    if (!x) continue;
    // intersection must lie on the boundary segment
    const onSeg =
      x.x >= Math.min(c1.x, c2.x) - 1e-6 &&
      x.x <= Math.max(c1.x, c2.x) + 1e-6 &&
      x.y >= Math.min(c1.y, c2.y) - 1e-6 &&
      x.y <= Math.max(c1.y, c2.y) + 1e-6;
    if (!onSeg) continue;
    // must be beyond the moving end, in the extend direction
    const ahead = dot(sub(x, moving), dir);
    if (ahead <= 1e-6) continue;
    if (ahead < bestD) {
      bestD = ahead;
      best = x;
    }
  }
  if (!best) return null;
  return extendA ? { ...line, a: best } : { ...line, b: best };
}

// ---- helpers --------------------------------------------------------------
function unit(v: Vec2): Vec2 {
  const L = len(v) || 1;
  return { x: v.x / L, y: v.y / L };
}
