// 100-run BOM extraction test: generate diagrams, extract valve/pipe/equipment
// lists, and validate against ground truth taken from the op stream.
//   tsx scripts/bomtest.mts [runs]
import { CadDocument } from "../src/cad/document.ts";
import { applyOps, type Op } from "../src/cad/ops.ts";
import { buildLinearSystem, HULL_SYSTEMS } from "../src/cad/hullSystems.ts";
import { buildBallastSystem, buildLngcBallastSystem } from "../src/cad/templates.ts";
import { extractBom, toCSV, valveList, pipeList } from "../src/cad/bom.ts";

const VALVE_SYMS = new Set([
  "gate_valve", "globe_valve", "check_valve", "ball_valve", "butterfly_valve", "control_valve",
]);

// ground truth straight from the op list
function groundTruth(ops: Op[]) {
  let valves = 0;
  let pipes = 0;
  for (const op of ops) {
    if (op.op === "add_symbol" && VALVE_SYMS.has(op.symbol)) valves++;
    if (op.op === "add_pipe") pipes++;
  }
  return { valves, pipes };
}

function diagramFor(i: number): { name: string; ops: Op[] } {
  const n = HULL_SYSTEMS.length;
  const idx = i % (n + 2);
  if (idx < n) return { name: HULL_SYSTEMS[idx].key, ops: buildLinearSystem(HULL_SYSTEMS[idx]) };
  if (idx === n) return { name: "ballast", ops: buildBallastSystem() };
  return { name: "lngc", ops: buildLngcBallastSystem() };
}

function main() {
  const runs = Number(process.argv[2] ?? 100);
  const prob = {
    valveMismatch: 0,
    pipeMismatch: 0,
    emptyTag: 0,
    dupTag: 0,
    badLength: 0,
    csvMismatch: 0,
    crash: 0,
  };
  let totValves = 0;
  let totPipes = 0;
  const t0 = Date.now();

  for (let i = 0; i < runs; i++) {
    const { name, ops } = diagramFor(i);
    const doc = new CadDocument();
    let bom;
    try {
      applyOps(doc, ops, { selection: new Set(), lastCreated: [] });
      bom = extractBom(doc);
    } catch (err) {
      prob.crash++;
      console.error(`run ${i} (${name}) crashed:`, (err as Error).message);
      continue;
    }
    const gt = groundTruth(ops);

    if (bom.valves.length !== gt.valves) {
      prob.valveMismatch++;
      console.error(`run ${i} (${name}) valves: got ${bom.valves.length}, expected ${gt.valves}`);
    }
    if (bom.pipes.length !== gt.pipes) {
      prob.pipeMismatch++;
      console.error(`run ${i} (${name}) pipes: got ${bom.pipes.length}, expected ${gt.pipes}`);
    }
    totValves += bom.valves.length;
    totPipes += bom.pipes.length;

    // integrity: non-empty tags, finite positive pipe lengths
    for (const v of bom.valves) if (!v.tag) prob.emptyTag++;
    for (const p of bom.pipes) if (!p.tag) prob.emptyTag++;
    for (const p of bom.pipes) if (!Number.isFinite(p.length) || p.length <= 0) prob.badLength++;

    // duplicate tag detection within one diagram (valves + equipment + instruments)
    const tags = [...bom.valves, ...bom.equipment, ...bom.instruments].map((r) => r.tag);
    const seen = new Set<string>();
    let dup = false;
    for (const t of tags) {
      if (seen.has(t)) dup = true;
      seen.add(t);
    }
    if (dup) prob.dupTag++;

    // CSV integrity: header + one line per row (+ trailing newline)
    const csv = toCSV(bom.valves, ["tag", "type", "size", "service", "layer"]);
    const lines = csv.trim().split("\n");
    if (lines.length !== bom.valves.length + 1) prob.csvMismatch++;
  }

  const dt = Date.now() - t0;
  console.log(`\n=== BOM extraction — ${runs} runs in ${dt} ms ===`);
  console.log(`extracted: valves total ${totValves} (avg ${(totValves / runs).toFixed(1)}), pipes total ${totPipes} (avg ${(totPipes / runs).toFixed(1)})`);
  console.log("problems:", JSON.stringify(prob));

  // print one sample for eyeballing
  const sample = buildLinearSystem(HULL_SYSTEMS.find((s) => s.key === "lo")!);
  const d = new CadDocument();
  applyOps(d, sample, { selection: new Set(), lastCreated: [] });
  console.log("\nsample (L.O system) valve list:\n" + toCSV(valveList(d), ["tag", "type", "size", "service", "layer"]).trim());
  console.log("\nsample pipe list:\n" + toCSV(pipeList(d), ["tag", "size", "service", "length", "layer"]).trim());
}

main();
