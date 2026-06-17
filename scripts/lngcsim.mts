// 100-run ballast simulation for the 174K LNGC, comparing a naive sequential
// fill against a P/S-balanced (paired) strategy, then rendering the ballast
// P&ID annotated with a representative run's tank fills.
//   tsx scripts/lngcsim.mts [runs]
import { CadDocument } from "../src/cad/document.ts";
import { applyOps } from "../src/cad/ops.ts";
import { buildLngcBallastSystem } from "../src/cad/templates.ts";
import { LNGC_TANKS, simulate, totalCapacity, type SimOptions } from "../src/cad/ballastSim.ts";
import { compositeToFile } from "./render.mts";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffle = <T,>(a: T[], rng: () => number): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const base: SimOptions = { pumpRate: 3000, nPumps: 2, strategy: "naive", dt: 0.1, crossover: true };
const tags = LNGC_TANKS.map((t) => t.tag);

interface Agg {
  heel: number[];
  trim: number[];
  hours: number[];
  overflow: number;
  dry: number;
  unreachable: number;
}
const mk = (): Agg => ({ heel: [], trim: [], hours: [], overflow: 0, dry: 0, unreachable: 0 });
const stat = (a: number[]) => ({
  avg: Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10,
  max: Math.round(Math.max(...a) * 10) / 10,
});

function main() {
  const runs = Number(process.argv[2] ?? 100);
  const rng = mulberry32(174000);
  const naive = mk();
  const paired = mk();
  let repFill: Record<string, number> | null = null;
  let repVol = 0;

  for (let i = 0; i < runs; i++) {
    // random ballast condition: a base fill + per-tank jitter (0..1)
    const baseFill = 0.4 + rng() * 0.6;
    const targets: Record<string, number> = {};
    for (const t of tags) targets[t] = Math.min(1, Math.max(0, baseFill + (rng() - 0.5) * 0.5));
    const start = Object.fromEntries(tags.map((t) => [t, 0]));
    const order = shuffle(tags, rng);

    const rN = simulate(LNGC_TANKS, targets, order, start, { ...base, strategy: "naive" });
    const rP = simulate(LNGC_TANKS, targets, order, start, { ...base, strategy: "paired" });

    for (const [agg, r] of [[naive, rN], [paired, rP]] as const) {
      agg.heel.push(r.maxHeelIndex);
      agg.trim.push(r.maxTrimIndex);
      agg.hours.push(r.hours);
      if (r.overflow) agg.overflow++;
      if (r.dry) agg.dry++;
      if (r.unreachable.length) agg.unreachable++;
    }

    // representative: the run closest to a "heavy ballast" condition
    const vol = tags.reduce((s, t) => s + targets[t], 0);
    if (vol > repVol) {
      repVol = vol;
      repFill = rP.finalFillPct;
    }
  }

  console.log(`\n=== 174K LNGC ballast — ${runs} simulations ===`);
  console.log(`tanks: ${tags.length}, total WBT capacity: ${totalCapacity().toLocaleString()} m³, pumps: 2×3000 m³/h`);
  console.log(`\nmax transient HEEL index (0..100, lower=better):`);
  console.log(`  naive  sequential : avg ${stat(naive.heel).avg}  max ${stat(naive.heel).max}`);
  console.log(`  paired balanced   : avg ${stat(paired.heel).avg}  max ${stat(paired.heel).max}`);
  console.log(`max transient TRIM index:`);
  console.log(`  naive  : avg ${stat(naive.trim).avg}  max ${stat(naive.trim).max}`);
  console.log(`  paired : avg ${stat(paired.trim).avg}  max ${stat(paired.trim).max}`);
  console.log(`completion hours (2 pumps): avg ${stat(paired.hours).avg}`);
  console.log(`integrity — overflow: naive ${naive.overflow}/paired ${paired.overflow},  dry: ${naive.dry}/${paired.dry},  unreachable: ${naive.unreachable}/${paired.unreachable}`);
  const improvement = Math.round((1 - stat(paired.heel).max / stat(naive.heel).max) * 100);
  console.log(`\n→ balanced (paired) sequencing cuts worst-case heel by ${improvement}%`);

  // render the annotated diagram for the representative heavy-ballast run
  const doc = new CadDocument();
  applyOps(doc, buildLngcBallastSystem(repFill ?? undefined), { selection: new Set(), lastCreated: [] });
  compositeToFile(doc, "scripts/out/lngc_ballast.png", {
    tool: "선택",
    note: '"174k lngc 발라스트 다이어그램" → 충수율은 100회 시뮬레이션 중 대표(중량 밸러스트) 결과',
    cmd: "174k lngc 발라스트 시스템 그려줘",
    layers: [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"]],
  });
  console.log("wrote scripts/out/lngc_ballast.png");
}

main();
