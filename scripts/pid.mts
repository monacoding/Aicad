// Stress test: generate ~100 ship-process P&IDs through the real op pipeline,
// validate them, detect quality problems, and render representative diagrams.
// Usage: tsx scripts/pid.mts [count]
import { CadDocument } from "../src/cad/document.ts";
import { applyOps, type Op, type XY } from "../src/cad/ops.ts";
import { entityBounds, type Entity } from "../src/cad/entities.ts";
import { boundsValid } from "../src/cad/geometry.ts";
import { compositeToFile } from "./render.mts";

// deterministic RNG
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface System {
  name: string;
  code: string;
  source: "tank" | "vessel";
  dest: "tank" | "vessel" | "heat_exchanger";
}

const SYSTEMS: System[] = [
  { name: "Fuel Oil Transfer", code: "FO", source: "tank", dest: "tank" },
  { name: "Fuel Oil Service", code: "FOS", source: "tank", dest: "vessel" },
  { name: "Diesel Oil Transfer", code: "DO", source: "tank", dest: "tank" },
  { name: "Lube Oil Circulating", code: "LO", source: "tank", dest: "heat_exchanger" },
  { name: "Stern Tube Lube Oil", code: "STLO", source: "tank", dest: "vessel" },
  { name: "Main Sea Water Cooling", code: "SW", source: "vessel", dest: "heat_exchanger" },
  { name: "Central Fresh Water Cooling", code: "CFW", source: "vessel", dest: "heat_exchanger" },
  { name: "Jacket Cooling Water", code: "JCW", source: "vessel", dest: "heat_exchanger" },
  { name: "Bilge", code: "BLG", source: "vessel", dest: "tank" },
  { name: "Ballast", code: "BAL", source: "tank", dest: "vessel" },
  { name: "Fire Main", code: "FM", source: "vessel", dest: "vessel" },
  { name: "Domestic Fresh Water", code: "FW", source: "tank", dest: "vessel" },
  { name: "Hot Water Circulating", code: "HW", source: "tank", dest: "heat_exchanger" },
  { name: "Compressed Air (Starting)", code: "SA", source: "vessel", dest: "vessel" },
  { name: "Control / Service Air", code: "CA", source: "vessel", dest: "vessel" },
  { name: "Steam Service", code: "ST", source: "vessel", dest: "heat_exchanger" },
  { name: "Boiler Feed Water", code: "BFW", source: "tank", dest: "vessel" },
  { name: "Condensate", code: "CD", source: "vessel", dest: "tank" },
  { name: "Sewage", code: "SEW", source: "tank", dest: "vessel" },
  { name: "Sludge", code: "SLG", source: "tank", dest: "vessel" },
  { name: "Hydraulic Power", code: "HYD", source: "tank", dest: "vessel" },
  { name: "Inert Gas", code: "IG", source: "vessel", dest: "vessel" },
  { name: "Cargo Oil", code: "CO", source: "tank", dest: "tank" },
  { name: "Ventilation / Purge", code: "VT", source: "vessel", dest: "vessel" },
  { name: "Fuel Oil Purifier", code: "PUR", source: "tank", dest: "vessel" },
];

const INLINE = [
  "strainer", "pump", "check_valve", "gate_valve", "globe_valve",
  "control_valve", "ball_valve", "butterfly_valve", "reducer", "heat_exchanger",
] as const;
const INSTR = ["FT", "PT", "LT", "TT", "FI", "PI", "LI"];

function build(doc: CadDocument, sys: System, rng: () => number): void {
  const ops: Op[] = [];
  const left = -16;
  const right = 16;
  // source & destination equipment
  ops.push({ op: "add_symbol", symbol: sys.source, at: [left, 0], scale: 1.6, tag: `${sys.code}-T1`, layer: "equipment" });
  ops.push({ op: "add_symbol", symbol: sys.dest, at: [right, 0], scale: 1.6, tag: `${sys.code}-T2`, layer: "equipment" });

  // inline components evenly spaced along the header
  const n = 3 + Math.floor(rng() * 5); // 3..7
  const x0 = left + 3.5;
  const x1 = right - 3.5;
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(x0 + ((x1 - x0) * (i + 1)) / (n + 1));

  let tagNo = 1;
  const compCenters: XY[] = [];
  for (const x of xs) {
    const kind = INLINE[Math.floor(rng() * INLINE.length)];
    const rot = kind === "reducer" || kind === "heat_exchanger" ? 0 : rng() < 0.25 ? 90 : 0;
    const scale = kind === "heat_exchanger" ? 1.3 : 0.9 + rng() * 0.3;
    ops.push({ op: "add_symbol", symbol: kind, at: [x, 0], scale, rotation: rot, tag: `${sys.code}-${tagNo++}`, layer: "equipment" });
    compCenters.push([x, 0]);
    if (kind === "pump") {
      ops.push({ op: "add_symbol", symbol: "motor", at: [x, 2.2], scale: 0.8, tag: `M${tagNo}`, layer: "equipment" });
      ops.push({ op: "add_pipe", points: [[x, 0.5], [x, 1.7]] });
    }
  }

  // main header pipe through all component x positions
  ops.push({ op: "add_pipe", points: [[left + 1.4, 0], [right - 1.4, 0]] });

  // a branch line with a valve
  if (rng() < 0.8) {
    const bx = xs[Math.floor(rng() * xs.length)];
    const by = rng() < 0.5 ? -5 : 5;
    ops.push({ op: "add_pipe", points: [[bx, 0], [bx, by]] });
    ops.push({ op: "add_symbol", symbol: "gate_valve", at: [bx, by / 2], scale: 0.9, rotation: 90, tag: `${sys.code}-${tagNo++}`, layer: "equipment" });
  }

  // instruments: one per chosen component, staggered on a top rail so bubbles
  // never collide (>=3 units apart), each tied to its component by a signal.
  const ni = Math.min(compCenters.length, 1 + Math.floor(rng() * 4));
  const chosen = [...compCenters].sort((a, b) => a[0] - b[0]).filter((_, k) => k % Math.ceil(compCenters.length / ni) === 0).slice(0, ni);
  const rail = 5.5;
  chosen.forEach((c, i) => {
    const ix = c[0];
    const iy = rail + (i % 2) * 1.8; // alternate two rows to guarantee spacing
    const fn = INSTR[Math.floor(rng() * INSTR.length)];
    ops.push({ op: "add_symbol", symbol: "instrument", at: [ix, iy], scale: 1.1, tag: `${fn}${i + 1}`, layer: "instrument" });
    ops.push({ op: "add_signal", a: [ix, iy - 0.6], b: [c[0], c[1] + 0.5] });
  });

  // title + a dimension across the header
  ops.push({ op: "add_text", at: [left, -7.5], text: `${sys.name} P&ID (${sys.code})`, height: 0.9, layer: "0" });
  ops.push({ op: "add_dimension", a: [left, -6], b: [right, -6], offset: -1 });

  applyOps(doc, ops, { selection: new Set(), lastCreated: [] });
}

// ---- validation & problem detection --------------------------------------
function entityPoints(e: Entity): { x: number; y: number }[] {
  switch (e.type) {
    case "line":
      return [e.a, e.b];
    case "polyline":
      return e.points;
    case "circle":
    case "arc":
      return [e.center];
    case "ellipse":
      return [e.center];
    case "point":
    case "text":
      return [e.at];
    case "dimension":
      return [e.a, e.b];
  }
}

function main() {
  const count = Number(process.argv[2] ?? 100);
  const rng = mulberry32(20260617);
  const problems = { nan: 0, emptyBounds: 0, zeroEntities: 0, overlaps: 0, tinyText: 0 };
  let totalEntities = 0;
  let maxEntities = 0;
  const t0 = Date.now();

  const samples: { i: number; name: string }[] = [];

  for (let i = 0; i < count; i++) {
    const sys = SYSTEMS[i % SYSTEMS.length];
    const doc = new CadDocument();
    try {
      build(doc, sys, rng);
    } catch (err) {
      console.error(`diagram ${i} (${sys.name}) threw:`, (err as Error).message);
      problems.nan++;
      continue;
    }

    // NaN scan
    let nan = false;
    for (const e of doc.entities)
      for (const p of entityPoints(e)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) nan = true;
    if (nan) problems.nan++;

    // bounds
    if (!boundsValid(doc.bounds())) problems.emptyBounds++;
    if (doc.entities.length === 0) problems.zeroEntities++;

    // equipment overlap: pairwise group-center distance
    const centers: { x: number; y: number }[] = [];
    const byGroup = new Map<string, { x: number; y: number }[]>();
    for (const e of doc.entities) {
      if (!e.group) continue;
      const bb = entityBounds(e);
      const c = { x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2 };
      (byGroup.get(e.group) ?? byGroup.set(e.group, []).get(e.group)!).push(c);
    }
    for (const cs of byGroup.values()) {
      const c = { x: avg(cs.map((p) => p.x)), y: avg(cs.map((p) => p.y)) };
      centers.push(c);
    }
    let overlap = false;
    for (let a = 0; a < centers.length; a++)
      for (let b = a + 1; b < centers.length; b++) {
        const d = Math.hypot(centers[a].x - centers[b].x, centers[a].y - centers[b].y);
        if (d < 1.4) overlap = true;
      }
    if (overlap) problems.overlaps++;

    // text readability vs drawing size
    const bb = doc.bounds();
    const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    // readability: a tag should be at least ~0.8% of the sheet's long side
    for (const e of doc.entities)
      if (e.type === "text" && e.height / span < 0.008) problems.tinyText++;

    totalEntities += doc.entities.length;
    maxEntities = Math.max(maxEntities, doc.entities.length);

    // render a handful of representative diagrams
    if (i < 6) {
      compositeToFile(doc, `scripts/out/pid_${i}_${sys.code}.png`, {
        tool: "선택",
        note: `${sys.name} P&ID — 펌프·밸브·계기·신호선 자동 배치 (${doc.entities.length} 엔티티)`,
        cmd: `SYMBOL pump ${centers[0]?.x.toFixed(0) ?? 0},0 1 0 ${sys.code}-1   |   PIPE -15,0 15,0`,
      });
      samples.push({ i, name: sys.name });
    }
  }

  const dt = Date.now() - t0;
  console.log(`\n=== ${count} ship-process P&IDs generated in ${dt} ms (${(dt / count).toFixed(1)} ms each) ===`);
  console.log(`entities: total ${totalEntities}, avg ${(totalEntities / count).toFixed(0)}, max ${maxEntities}`);
  console.log("problems detected:", JSON.stringify(problems));
  console.log("rendered samples:", samples.map((s) => `#${s.i} ${s.name}`).join(", "));
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

main();
