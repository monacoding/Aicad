// 2D vector + geometry helpers used across the CAD engine.

export interface Vec2 {
  x: number;
  y: number;
}

export const v = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const angle = (from: Vec2, to: Vec2): number =>
  Math.atan2(to.y - from.y, to.x - from.x);

export const polar = (origin: Vec2, ang: number, radius: number): Vec2 => ({
  x: origin.x + Math.cos(ang) * radius,
  y: origin.y + Math.sin(ang) * radius,
});

export const rotate = (p: Vec2, origin: Vec2, ang: number): Vec2 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
};

export const deg = (rad: number): number => (rad * 180) / Math.PI;
export const rad = (d: number): number => (d * Math.PI) / 180;

/** Closest point on segment ab to point p. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return add(a, scale(ab, t));
}

/** Distance from p to segment ab. */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  return dist(p, closestOnSegment(p, a, b));
}

/** Intersection point of two infinite lines (p1->p2, p3->p4), or null if parallel. */
export function lineLineIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;
  const a = p1.x * p2.y - p1.y * p2.x;
  const b = p3.x * p4.y - p3.y * p4.x;
  return {
    x: (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / d,
    y: (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / d,
  };
}

/** Segment intersection point (only if it lies on both segments), else null. */
export function segSegIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const pt = lineLineIntersect(p1, p2, p3, p4);
  if (!pt) return null;
  const on = (a: Vec2, b: Vec2) =>
    pt.x >= Math.min(a.x, b.x) - 1e-6 &&
    pt.x <= Math.max(a.x, b.x) + 1e-6 &&
    pt.y >= Math.min(a.y, b.y) - 1e-6 &&
    pt.y <= Math.max(a.y, b.y) + 1e-6;
  return on(p1, p2) && on(p3, p4) ? pt : null;
}

/** Reflect point p across the infinite line through a and b. */
export function reflectPoint(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a);
  const len2 = dot(ab, ab) || 1;
  const t = dot(sub(p, a), ab) / len2;
  const proj = add(a, scale(ab, t));
  return { x: 2 * proj.x - p.x, y: 2 * proj.y - p.y };
}

/** Unit perpendicular (left normal) of direction a->b. */
export function leftNormal(a: Vec2, b: Vec2): Vec2 {
  const d = sub(b, a);
  const L = len(d) || 1;
  return { x: -d.y / L, y: d.x / L };
}

export interface Bounds {
  min: Vec2;
  max: Vec2;
}

export function emptyBounds(): Bounds {
  return { min: { x: Infinity, y: Infinity }, max: { x: -Infinity, y: -Infinity } };
}

export function growBounds(bb: Bounds, p: Vec2): void {
  bb.min.x = Math.min(bb.min.x, p.x);
  bb.min.y = Math.min(bb.min.y, p.y);
  bb.max.x = Math.max(bb.max.x, p.x);
  bb.max.y = Math.max(bb.max.y, p.y);
}

export function boundsValid(bb: Bounds): boolean {
  return bb.min.x <= bb.max.x && bb.min.y <= bb.max.y;
}

export function pointInBounds(p: Vec2, bb: Bounds): boolean {
  return p.x >= bb.min.x && p.x <= bb.max.x && p.y >= bb.min.y && p.y <= bb.max.y;
}
