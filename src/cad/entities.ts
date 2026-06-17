// Entity model. A drawing is a flat list of these. Geometry is in world units.
import {
  Vec2,
  Bounds,
  emptyBounds,
  growBounds,
  dist,
  distToSegment,
  mid,
  polar,
  add,
  sub,
  rotate,
  scale,
  angle,
} from "./geometry";

export type EntityType =
  | "line"
  | "polyline"
  | "circle"
  | "arc"
  | "point"
  | "text"
  | "dimension";

export interface BaseEntity {
  id: string;
  type: EntityType;
  layer: string;
  /** Optional per-entity color override (hex). Falls back to layer color. */
  color?: string;
}

export interface LineEntity extends BaseEntity {
  type: "line";
  a: Vec2;
  b: Vec2;
}

export interface PolylineEntity extends BaseEntity {
  type: "polyline";
  points: Vec2[];
  closed: boolean;
}

export interface CircleEntity extends BaseEntity {
  type: "circle";
  center: Vec2;
  radius: number;
}

export interface ArcEntity extends BaseEntity {
  type: "arc";
  center: Vec2;
  radius: number;
  /** radians, CCW */
  startAngle: number;
  endAngle: number;
}

export interface PointEntity extends BaseEntity {
  type: "point";
  at: Vec2;
}

export interface TextEntity extends BaseEntity {
  type: "text";
  at: Vec2;
  text: string;
  height: number;
  /** rotation in radians */
  rotation: number;
}

export interface DimensionEntity extends BaseEntity {
  type: "dimension";
  a: Vec2;
  b: Vec2;
  /** perpendicular offset distance of the dimension line */
  offset: number;
}

export type Entity =
  | LineEntity
  | PolylineEntity
  | CircleEntity
  | ArcEntity
  | PointEntity
  | TextEntity
  | DimensionEntity;

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `e${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** Vertices used as snap targets (endpoints, centers, midpoints). */
export function snapPoints(e: Entity): { p: Vec2; kind: string }[] {
  switch (e.type) {
    case "line":
      return [
        { p: e.a, kind: "endpoint" },
        { p: e.b, kind: "endpoint" },
        { p: mid(e.a, e.b), kind: "midpoint" },
      ];
    case "polyline": {
      const out = e.points.map((p) => ({ p, kind: "endpoint" }));
      for (let i = 0; i < e.points.length - 1; i++) {
        out.push({ p: mid(e.points[i], e.points[i + 1]), kind: "midpoint" });
      }
      if (e.closed && e.points.length > 1) {
        out.push({ p: mid(e.points[e.points.length - 1], e.points[0]), kind: "midpoint" });
      }
      return out;
    }
    case "circle":
      return [
        { p: e.center, kind: "center" },
        { p: { x: e.center.x + e.radius, y: e.center.y }, kind: "quadrant" },
        { p: { x: e.center.x - e.radius, y: e.center.y }, kind: "quadrant" },
        { p: { x: e.center.x, y: e.center.y + e.radius }, kind: "quadrant" },
        { p: { x: e.center.x, y: e.center.y - e.radius }, kind: "quadrant" },
      ];
    case "arc":
      return [
        { p: e.center, kind: "center" },
        { p: polar(e.center, e.startAngle, e.radius), kind: "endpoint" },
        { p: polar(e.center, e.endAngle, e.radius), kind: "endpoint" },
      ];
    case "point":
      return [{ p: e.at, kind: "node" }];
    case "text":
      return [{ p: e.at, kind: "node" }];
    case "dimension":
      return [
        { p: e.a, kind: "endpoint" },
        { p: e.b, kind: "endpoint" },
      ];
  }
}

export function entityBounds(e: Entity): Bounds {
  const bb = emptyBounds();
  switch (e.type) {
    case "line":
      growBounds(bb, e.a);
      growBounds(bb, e.b);
      break;
    case "polyline":
      e.points.forEach((p) => growBounds(bb, p));
      break;
    case "circle":
      growBounds(bb, { x: e.center.x - e.radius, y: e.center.y - e.radius });
      growBounds(bb, { x: e.center.x + e.radius, y: e.center.y + e.radius });
      break;
    case "arc": {
      growBounds(bb, polar(e.center, e.startAngle, e.radius));
      growBounds(bb, polar(e.center, e.endAngle, e.radius));
      growBounds(bb, e.center);
      // include axis crossings within sweep
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        if (angleInSweep(a, e.startAngle, e.endAngle)) growBounds(bb, polar(e.center, a, e.radius));
      }
      break;
    }
    case "point":
      growBounds(bb, e.at);
      break;
    case "text":
      growBounds(bb, e.at);
      growBounds(bb, { x: e.at.x + e.text.length * e.height * 0.6, y: e.at.y + e.height });
      break;
    case "dimension":
      growBounds(bb, e.a);
      growBounds(bb, e.b);
      break;
  }
  return bb;
}

export function angleInSweep(a: number, start: number, end: number): boolean {
  const norm = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const s = norm(start);
  let e = norm(end);
  let aa = norm(a);
  if (e < s) e += 2 * Math.PI;
  if (aa < s) aa += 2 * Math.PI;
  return aa >= s && aa <= e;
}

/** World-space distance from a point to the entity outline (for picking). */
export function distanceTo(e: Entity, p: Vec2): number {
  switch (e.type) {
    case "line":
      return distToSegment(p, e.a, e.b);
    case "polyline": {
      let best = Infinity;
      for (let i = 0; i < e.points.length - 1; i++) {
        best = Math.min(best, distToSegment(p, e.points[i], e.points[i + 1]));
      }
      if (e.closed && e.points.length > 2) {
        best = Math.min(best, distToSegment(p, e.points[e.points.length - 1], e.points[0]));
      }
      return best;
    }
    case "circle":
      return Math.abs(dist(p, e.center) - e.radius);
    case "arc": {
      const a = angle(e.center, p);
      if (angleInSweep(a, e.startAngle, e.endAngle)) {
        return Math.abs(dist(p, e.center) - e.radius);
      }
      return Math.min(
        dist(p, polar(e.center, e.startAngle, e.radius)),
        dist(p, polar(e.center, e.endAngle, e.radius)),
      );
    }
    case "point":
      return dist(p, e.at);
    case "text":
      return dist(p, e.at);
    case "dimension":
      return distToSegment(p, e.a, e.b);
  }
}

/** Translate an entity in place-by returning a moved copy. */
export function translate(e: Entity, d: Vec2): Entity {
  const m = (p: Vec2) => add(p, d);
  switch (e.type) {
    case "line":
      return { ...e, a: m(e.a), b: m(e.b) };
    case "polyline":
      return { ...e, points: e.points.map(m) };
    case "circle":
      return { ...e, center: m(e.center) };
    case "arc":
      return { ...e, center: m(e.center) };
    case "point":
      return { ...e, at: m(e.at) };
    case "text":
      return { ...e, at: m(e.at) };
    case "dimension":
      return { ...e, a: m(e.a), b: m(e.b) };
  }
}

export function rotateEntity(e: Entity, origin: Vec2, ang: number): Entity {
  const r = (p: Vec2) => rotate(p, origin, ang);
  switch (e.type) {
    case "line":
      return { ...e, a: r(e.a), b: r(e.b) };
    case "polyline":
      return { ...e, points: e.points.map(r) };
    case "circle":
      return { ...e, center: r(e.center) };
    case "arc":
      return { ...e, center: r(e.center), startAngle: e.startAngle + ang, endAngle: e.endAngle + ang };
    case "point":
      return { ...e, at: r(e.at) };
    case "text":
      return { ...e, at: r(e.at), rotation: e.rotation + ang };
    case "dimension":
      return { ...e, a: r(e.a), b: r(e.b) };
  }
}

export function scaleEntity(e: Entity, origin: Vec2, factor: number): Entity {
  const s = (p: Vec2) => add(origin, scale(sub(p, origin), factor));
  switch (e.type) {
    case "line":
      return { ...e, a: s(e.a), b: s(e.b) };
    case "polyline":
      return { ...e, points: e.points.map(s) };
    case "circle":
      return { ...e, center: s(e.center), radius: e.radius * factor };
    case "arc":
      return { ...e, center: s(e.center), radius: e.radius * factor };
    case "point":
      return { ...e, at: s(e.at) };
    case "text":
      return { ...e, at: s(e.at), height: e.height * factor };
    case "dimension":
      return { ...e, a: s(e.a), b: s(e.b) };
  }
}
