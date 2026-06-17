// Object snapping (endpoint, midpoint, center, quadrant, intersection, grid).
import { CadDocument } from "./document";
import { Entity, snapPoints } from "./entities";
import { Vec2, dist, segSegIntersect } from "./geometry";

export interface SnapResult {
  point: Vec2;
  kind: string;
}

export interface SnapSettings {
  enabled: boolean;
  grid: boolean;
  gridStep: number;
}

function lineSegments(e: Entity): [Vec2, Vec2][] {
  switch (e.type) {
    case "line":
      return [[e.a, e.b]];
    case "polyline": {
      const segs: [Vec2, Vec2][] = [];
      for (let i = 0; i < e.points.length - 1; i++) segs.push([e.points[i], e.points[i + 1]]);
      if (e.closed && e.points.length > 2) segs.push([e.points[e.points.length - 1], e.points[0]]);
      return segs;
    }
    case "dimension":
      return [[e.a, e.b]];
    default:
      return [];
  }
}

export function findSnap(
  doc: CadDocument,
  world: Vec2,
  pixelTol: number,
  scale: number,
  settings: SnapSettings,
): SnapResult | null {
  if (!settings.enabled) {
    if (settings.grid) return { point: snapToGrid(world, settings.gridStep), kind: "grid" };
    return null;
  }
  const tol = pixelTol / scale;
  let best: SnapResult | null = null;
  let bestD = tol;

  // vertex/center snaps
  for (const e of doc.entities) {
    if (!doc.isVisible(e)) continue;
    for (const sp of snapPoints(e)) {
      const d = dist(world, sp.p);
      if (d < bestD) {
        bestD = d;
        best = { point: sp.p, kind: sp.kind };
      }
    }
  }

  // intersection snaps (only check nearby segment pairs)
  const segs: [Vec2, Vec2][] = [];
  for (const e of doc.entities) {
    if (!doc.isVisible(e)) continue;
    for (const s of lineSegments(e)) segs.push(s);
  }
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const x = segSegIntersect(segs[i][0], segs[i][1], segs[j][0], segs[j][1]);
      if (x) {
        const d = dist(world, x);
        if (d < bestD) {
          bestD = d;
          best = { point: x, kind: "intersection" };
        }
      }
    }
  }

  if (best) return best;
  if (settings.grid) return { point: snapToGrid(world, settings.gridStep), kind: "grid" };
  return null;
}

export function snapToGrid(p: Vec2, step: number): Vec2 {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}
