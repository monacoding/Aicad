// Build every hull piping system, validate the pipeline, and render each.
// Drives the improvement loop: reports overlaps / tiny text / NaN / bounds.
//   tsx scripts/hull.mts [--render]
import { CadDocument } from "../src/cad/document.ts";
import { applyOps } from "../src/cad/ops.ts";
import { HULL_SYSTEMS, buildLinearSystem } from "../src/cad/hullSystems.ts";
import { entityBounds, type Entity } from "../src/cad/entities.ts";
import { boundsValid } from "../src/cad/geometry.ts";
import { compositeToFile } from "./render.mts";

function entityPoints(e: Entity): { x: number; y: number }[] {
  switch (e.type) {
    case "line":
      return [e.a, e.b];
    case "polyline":
      return e.points;
    case "circle":
    case "arc":
    case "ellipse":
      return [e.center];
    case "point":
    case "text":
      return [e.at];
    case "dimension":
      return [e.a, e.b];
  }
}
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function main() {
  const render = process.argv.includes("--render");
  let nan = 0;
  let emptyBounds = 0;
  let overlaps = 0;
  let tinyText = 0;
  let totalEntities = 0;
  const rows: string[] = [];

  for (const spec of HULL_SYSTEMS) {
    const doc = new CadDocument();
    let ops;
    try {
      ops = buildLinearSystem(spec);
      applyOps(doc, ops, { selection: new Set(), lastCreated: [] });
    } catch (err) {
      console.error(`${spec.key} threw:`, (err as Error).message);
      nan++;
      continue;
    }
    totalEntities += doc.entities.length;

    let bad = false;
    for (const e of doc.entities) for (const p of entityPoints(e)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) bad = true;
    if (bad) nan++;
    if (!boundsValid(doc.bounds())) emptyBounds++;

    // symbol-group overlap (each placed symbol is a group)
    const byGroup = new Map<string, { x: number; y: number }[]>();
    for (const e of doc.entities) {
      if (!e.group) continue;
      const bb = entityBounds(e);
      const arr = byGroup.get(e.group) ?? [];
      arr.push({ x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2 });
      byGroup.set(e.group, arr);
    }
    const centers = [...byGroup.values()].map((cs) => ({ x: avg(cs.map((p) => p.x)), y: avg(cs.map((p) => p.y)) }));
    let ov = 0;
    for (let a = 0; a < centers.length; a++)
      for (let b = a + 1; b < centers.length; b++)
        if (Math.hypot(centers[a].x - centers[b].x, centers[a].y - centers[b].y) < 1.6) ov++;
    if (ov) overlaps++;

    // readability vs the GEOMETRY extent (exclude text, whose long titles would
    // otherwise inflate the span and flag perfectly readable tags)
    let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    for (const e of doc.entities) {
      if (e.type === "text") continue;
      const b = entityBounds(e);
      if (!boundsValid(b)) continue;
      gx0 = Math.min(gx0, b.min.x); gy0 = Math.min(gy0, b.min.y);
      gx1 = Math.max(gx1, b.max.x); gy1 = Math.max(gy1, b.max.y);
    }
    const span = Math.max(gx1 - gx0, gy1 - gy0) || 1;
    let tt = 0;
    // exclude instrument-bubble internal text (sized to the symbol, not the sheet)
    for (const e of doc.entities) if (e.type === "text" && e.layer !== "instrument" && e.height / span < 0.008) tt++;
    tinyText += tt;

    rows.push(`  ${spec.key.padEnd(11)} ${String(doc.entities.length).padStart(3)} ent  overlaps:${ov}  tinyText:${tt}`);

    if (render) {
      compositeToFile(doc, `scripts/out/hull_${spec.key}.png`, {
        tool: "선택",
        note: `${spec.en} — ${spec.desc}`,
        cmd: `${spec.ko} 시스템 그려줘`,
        layers: [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"]],
      });
    }
  }

  console.log(`\n=== HULL PIPING SYSTEMS — ${HULL_SYSTEMS.length} diagrams ===`);
  console.log(rows.join("\n"));
  console.log(`\ntotals: entities ${totalEntities}, NaN ${nan}, emptyBounds ${emptyBounds}, systems-with-overlap ${overlaps}, tinyText ${tinyText}`);
}

main();
