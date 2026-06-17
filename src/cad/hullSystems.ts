// Hull piping systems library. A single auto-layout schematic builder turns a
// declarative spec into a complete P&ID with consistent spacing (no manual
// coordinate juggling -> no overlaps). Each ship service system is one spec.
import { Op, XY } from "./ops";

const EQ = "equipment";
const IN = "instrument";

export interface Component {
  symbol: string; // a SYMBOLS name, or "box:LABEL" for a labelled equipment box
  tag: string;
}
export interface Branch {
  tag: string; // valve tag
  label: string; // consumer / tank label
  symbol?: string; // tank/consumer symbol (default boxed)
}
export interface SystemSpec {
  key: string;
  ko: string; // Korean name
  en: string; // English title
  desc: string; // one-line flow description
  triggers: string[]; // NL keywords
  source: Component;
  dest: Component;
  inline: Component[]; // components on the header between source and dest
  branches?: Branch[]; // consumers/tanks dropped below the header
  instruments?: { tag: string }[]; // bubbles above the header
  overboard?: boolean;
}

// ---- shared low-level emit helpers ----------------------------------------
function makeEmit() {
  const ops: Op[] = [];
  const api = {
    ops,
    text: (at: XY, t: string, h = 0.6, layer = "0", color?: string) =>
      ops.push({ op: "add_text", at, text: t, height: h, layer, color }),
    pipe: (points: XY[]) => ops.push({ op: "add_pipe", points }),
    signal: (a: XY, b: XY) => ops.push({ op: "add_signal", a, b }),
    rect: (corner: XY, w: number, h: number, color: string, fill?: string, layer = EQ) =>
      ops.push({ op: "add_rectangle", corner, width: w, height: h, layer, color, fill }),
    sym: (symbol: string, at: XY, o: Partial<{ scale: number; rotation: number; tag: string; layer: string }> = {}) =>
      ops.push({ op: "add_symbol", symbol, at, scale: o.scale ?? 1, rotation: o.rotation ?? 0, tag: o.tag, layer: o.layer ?? EQ }),
  };
  return api;
}

/** Draw a component on the header at (x,0): a symbol, or a labelled box. */
function drawComponent(api: ReturnType<typeof makeEmit>, c: Component, x: number, y = 0) {
  if (c.symbol.startsWith("box:")) {
    const label = c.symbol.slice(4);
    const w = Math.max(2.6, label.length * 0.34 + 1.2);
    api.rect([x - w / 2, y - 1.4], w, 2.8, "#ffb454", "#ffb45422");
    api.text([x - w / 2 + 0.3, y + 0.2], label, 0.5);
    api.text([x - w / 2 + 0.3, y - 0.6], c.tag, 0.45);
    return w;
  }
  api.sym(c.symbol, [x, y], { scale: c.symbol === "heat_exchanger" || c.symbol === "vessel" || c.symbol === "tank" ? 1.3 : 0.95, tag: c.tag });
  return 2.4;
}

const SPACING = 7.5;
const TANK_W = 5;
const TANK_H = 3.4;

/** Build a horizontal-flow P&ID from a spec with automatic, collision-free spacing. */
export function buildLinearSystem(spec: SystemSpec): Op[] {
  const api = makeEmit();
  const n = spec.inline.length;
  const left = 0;
  const xs = spec.inline.map((_, i) => left + (i + 1) * SPACING);
  const srcX = left - SPACING * 0.6;
  const dstX = left + (n + 1) * SPACING + SPACING * 0.6;

  // source & destination
  drawComponent(api, spec.source, srcX);
  api.text([srcX - 2, -2.2], spec.source.tag, 0.5);
  drawComponent(api, spec.dest, dstX);
  api.text([dstX - 2, -2.2], spec.dest.tag, 0.5);

  // header pipe
  api.pipe([[srcX + 1.6, 0], [dstX - 1.6, 0]]);
  // flow-direction arrows + main line size (P&ID convention)
  api.sym("arrow", [srcX + 3.2, 0], { scale: 0.6 });
  api.sym("arrow", [dstX - 3.2, 0], { scale: 0.6 });
  api.text([srcX + 1.8, 0.7], "DN250", 0.42, "process", "#7bd88f");

  // inline components
  for (let i = 0; i < n; i++) {
    drawComponent(api, spec.inline[i], xs[i]);
    api.text([xs[i] - 1.6, -2.2], spec.inline[i].tag, 0.5);
  }

  // instruments above, spread across the header, signalling down to a component
  const instr = spec.instruments ?? [];
  instr.forEach((ins, i) => {
    const x = left + SPACING * (1 + (i * n) / Math.max(1, instr.length));
    api.sym("instrument", [x, 4.5], { scale: 1, tag: ins.tag, layer: IN });
    api.signal([x, 4.0], [x, 0.4]);
  });

  // branches (consumers / tanks) below the header. Place each at the midpoint
  // of an inline gap so a branch drop never lands under a header component.
  const branches = spec.branches ?? [];
  if (branches.length) {
    const anchors = [srcX, ...xs, dstX];
    const gaps: number[] = [];
    for (let i = 0; i < anchors.length - 1; i++) gaps.push((anchors[i] + anchors[i + 1]) / 2);
    // choose evenly-distributed gap midpoints, widening the layout if needed
    const pickGap = (i: number) => {
      if (branches.length <= gaps.length) return gaps[Math.round((i * (gaps.length - 1)) / Math.max(1, branches.length - 1))];
      return srcX + SPACING * 0.7 + ((dstX - srcX - SPACING) * (i + 0.5)) / branches.length;
    };
    branches.forEach((b, i) => {
      const x = pickGap(i);
      api.pipe([[x, 0], [x, -3.6]]);
      api.sym("butterfly_valve", [x, -1.8], { scale: 0.8, rotation: 90, tag: b.tag });
      const cy = -6.6;
      api.rect([x - TANK_W / 2, cy - TANK_H / 2], TANK_W, TANK_H, "#5cc8ff", "#5cc8ff18");
      api.text([x - TANK_W / 2 + 0.2, cy - TANK_H / 2 - 0.9], b.label, 0.5);
    });
  }

  // overboard discharge
  if (spec.overboard) {
    const x = dstX - SPACING * 0.4;
    api.pipe([[x, 0], [x, 6]]);
    api.sym("gate_valve", [x, 3], { scale: 0.8, rotation: 90, tag: "OB" });
    api.sym("arrow", [x, 6.4], { scale: 1, rotation: 90 });
    api.text([x + 0.8, 6.6], "OVERBOARD", 0.5);
  }

  // title
  api.text([srcX - 2, 9], `${spec.en}  —  P&ID`, 1.1, "0");
  api.text([srcX - 2, 7.8], spec.desc, 0.5, "0");
  return api.ops;
}

// ---- the hull piping systems ----------------------------------------------
export const HULL_SYSTEMS: SystemSpec[] = [
  {
    key: "bilge",
    ko: "빌지",
    en: "BILGE SYSTEM",
    desc: "bilge wells → strainer → bilge pump → oily water separator → overboard / sludge",
    triggers: ["빌지", "bilge"],
    source: { symbol: "vessel", tag: "BILGE WELL" },
    dest: { symbol: "box:OWS 15ppm", tag: "OWS" },
    inline: [
      { symbol: "strainer", tag: "MB" },
      { symbol: "pump", tag: "BP" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [
      { tag: "BV1", label: "E/R BILGE" },
      { tag: "BV2", label: "FWD BILGE" },
      { tag: "BV3", label: "SLUDGE TK" },
    ],
    instruments: [{ tag: "PT" }, { tag: "PI" }],
    overboard: true,
  },
  {
    key: "fire",
    ko: "소화",
    en: "FIRE MAIN (SEA WATER)",
    desc: "sea chest → fire pump → fire main → hydrants / foam / sprinkler",
    triggers: ["소화", "fire", "fire main", "방화"],
    source: { symbol: "box:SEA CHEST", tag: "SC" },
    dest: { symbol: "box:EMCY F.PP", tag: "EFP" },
    inline: [
      { symbol: "butterfly_valve", tag: "SV" },
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "FP-1" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [
      { tag: "HV1", label: "HYDRANTS" },
      { tag: "HV2", label: "FOAM SYS" },
      { tag: "HV3", label: "SPRINKLER" },
      { tag: "HV4", label: "DECK W/M" },
    ],
    instruments: [{ tag: "PT" }, { tag: "PI" }],
  },
  {
    key: "swcool",
    ko: "해수냉각",
    en: "CENTRAL SEA WATER COOLING",
    desc: "sea chest → SW pump → central coolers → overboard",
    triggers: ["해수냉각", "해수 냉각", "central cooling", "sea water cooling", "sw cooling"],
    source: { symbol: "box:SEA CHEST", tag: "SC(L)" },
    dest: { symbol: "box:SEA CHEST", tag: "SC(H)" },
    inline: [
      { symbol: "butterfly_valve", tag: "SV" },
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "SWP-1" },
      { symbol: "heat_exchanger", tag: "C/C-1" },
      { symbol: "heat_exchanger", tag: "C/C-2" },
    ],
    instruments: [{ tag: "TT" }, { tag: "PT" }],
    overboard: true,
  },
  {
    key: "ltfw",
    ko: "저온청수냉각",
    en: "LOW-TEMP FRESH WATER COOLING",
    desc: "expansion tank → LT pump → central cooler → consumers",
    triggers: ["저온청수", "lt cooling", "low temp", "청수냉각", "lt fw"],
    source: { symbol: "box:EXP TANK", tag: "ET" },
    dest: { symbol: "box:CONSUMERS", tag: "—" },
    inline: [
      { symbol: "pump", tag: "LTP-1" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "heat_exchanger", tag: "C/C" },
      { symbol: "control_valve", tag: "TCV" },
    ],
    branches: [
      { tag: "V1", label: "M/E A/C" },
      { tag: "V2", label: "G/E" },
      { tag: "V3", label: "AIR COMP" },
    ],
    instruments: [{ tag: "TT" }, { tag: "TI" }],
  },
  {
    key: "htfw",
    ko: "고온자켓냉각",
    en: "HIGH-TEMP JACKET COOLING",
    desc: "main engine jacket → HT pump → cooler → engine (with preheater)",
    triggers: ["고온", "자켓", "jacket", "ht cooling", "ht fw"],
    source: { symbol: "box:M/E JACKET", tag: "ME" },
    dest: { symbol: "box:PRE-HEATER", tag: "PH" },
    inline: [
      { symbol: "pump", tag: "HTP-1" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "heat_exchanger", tag: "JWC" },
      { symbol: "control_valve", tag: "TCV" },
    ],
    instruments: [{ tag: "TT" }, { tag: "TI" }, { tag: "PT" }],
  },
  {
    key: "fotransfer",
    ko: "연료유이송",
    en: "FUEL OIL TRANSFER",
    desc: "bunker tank → transfer pump → settling tank (heated)",
    triggers: ["연료유 이송", "연료 이송", "fo transfer", "fuel transfer", "벙커"],
    source: { symbol: "tank", tag: "F.O BUNKER" },
    dest: { symbol: "vessel", tag: "SETTLING TK" },
    inline: [
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "FOTP" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "gate_valve", tag: "V1" },
    ],
    branches: [
      { tag: "BV1", label: "F.O TK No.1" },
      { tag: "BV2", label: "F.O TK No.2" },
    ],
    instruments: [{ tag: "FT" }, { tag: "LT" }],
  },
  {
    key: "foservice",
    ko: "연료유서비스",
    en: "FUEL OIL SERVICE",
    desc: "settling → purifier → service tank → booster → main engine",
    triggers: ["연료유 서비스", "fo service", "fuel service", "청정", "purifier"],
    source: { symbol: "vessel", tag: "SETTLING TK" },
    dest: { symbol: "box:MAIN ENGINE", tag: "M/E" },
    inline: [
      { symbol: "pump", tag: "S.PP" },
      { symbol: "box:PURIFIER", tag: "PUR" },
      { symbol: "vessel", tag: "SERV TK" },
      { symbol: "box:BOOSTER", tag: "BST" },
      { symbol: "control_valve", tag: "FCV" },
    ],
    instruments: [{ tag: "TT" }, { tag: "FT" }, { tag: "VT" }],
  },
  {
    key: "diesel",
    ko: "디젤유",
    en: "DIESEL OIL SERVICE",
    desc: "D.O service tank → supply pump → generator engines",
    triggers: ["디젤유", "diesel", "do service", "경유"],
    source: { symbol: "tank", tag: "D.O SERV TK" },
    dest: { symbol: "box:GEN ENGINES", tag: "G/E" },
    inline: [
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "DOP" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [
      { tag: "V1", label: "G/E No.1" },
      { tag: "V2", label: "G/E No.2" },
      { tag: "V3", label: "G/E No.3" },
    ],
    instruments: [{ tag: "FT" }],
  },
  {
    key: "lo",
    ko: "윤활유",
    en: "MAIN L.O CIRCULATING",
    desc: "sump tank → L.O pump → cooler → filter → main engine",
    triggers: ["윤활유", "lube", "lube oil", "lo system", "l.o"],
    source: { symbol: "tank", tag: "L.O SUMP" },
    dest: { symbol: "box:MAIN ENGINE", tag: "M/E" },
    inline: [
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "LOP-1" },
      { symbol: "heat_exchanger", tag: "L.O CLR" },
      { symbol: "box:AUTO FILTER", tag: "AF" },
    ],
    instruments: [{ tag: "TT" }, { tag: "PT" }, { tag: "PI" }],
  },
  {
    key: "fw",
    ko: "위생청수",
    en: "DOMESTIC FRESH WATER",
    desc: "F.W tank → hydrophore pump → calorifier → cold / hot consumers",
    triggers: ["위생청수", "청수", "fresh water", "domestic", "fw system"],
    source: { symbol: "tank", tag: "F.W TANK" },
    dest: { symbol: "box:CALORIFIER", tag: "CAL" },
    inline: [
      { symbol: "pump", tag: "HYD PP" },
      { symbol: "vessel", tag: "HYDROPHORE" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [
      { tag: "V1", label: "COLD F.W" },
      { tag: "V2", label: "HOT F.W" },
      { tag: "V3", label: "GALLEY" },
    ],
    instruments: [{ tag: "PT" }, { tag: "LT" }],
  },
  {
    key: "sewage",
    ko: "오수처리",
    en: "SEWAGE TREATMENT",
    desc: "collecting tank → sewage treatment plant → discharge pump → overboard",
    triggers: ["오수", "sewage", "분뇨", "흑수"],
    source: { symbol: "tank", tag: "COLLECT TK" },
    dest: { symbol: "box:S.T.P", tag: "STP" },
    inline: [
      { symbol: "pump", tag: "DIS PP" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "gate_valve", tag: "V1" },
    ],
    instruments: [{ tag: "LT" }],
    overboard: true,
  },
  {
    key: "sludge",
    ko: "슬러지",
    en: "SLUDGE / OILY BILGE",
    desc: "sludge tank → sludge pump → incinerator / shore connection",
    triggers: ["슬러지", "sludge", "유성", "oily"],
    source: { symbol: "tank", tag: "SLUDGE TK" },
    dest: { symbol: "box:INCINERATOR", tag: "INC" },
    inline: [
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "SLP" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [{ tag: "V1", label: "SHORE CONN" }],
    instruments: [{ tag: "LT" }],
  },
  {
    key: "air",
    ko: "압축공기",
    en: "COMPRESSED AIR (STARTING / CONTROL)",
    desc: "air compressor → air receiver → starting air; control air via reducer/dryer",
    triggers: ["압축공기", "compressed air", "starting air", "control air", "에어"],
    source: { symbol: "box:AIR COMP", tag: "A/C-1" },
    dest: { symbol: "box:CONTROL AIR", tag: "CA" },
    inline: [
      { symbol: "check_valve", tag: "NV" },
      { symbol: "vessel", tag: "AIR RECVR" },
      { symbol: "reducer", tag: "PRV" },
      { symbol: "box:AIR DRYER", tag: "DRY" },
    ],
    branches: [
      { tag: "V1", label: "M/E START" },
      { tag: "V2", label: "G/E START" },
      { tag: "V3", label: "SERVICE AIR" },
    ],
    instruments: [{ tag: "PT" }, { tag: "PI" }],
  },
  {
    key: "steam",
    ko: "증기급수",
    en: "STEAM & FEED WATER",
    desc: "boiler → steam header → consumers; hotwell → feed pump → boiler",
    triggers: ["증기", "급수", "steam", "boiler", "feed water", "보일러"],
    source: { symbol: "vessel", tag: "BOILER" },
    dest: { symbol: "box:HOTWELL", tag: "HW" },
    inline: [
      { symbol: "globe_valve", tag: "MSV" },
      { symbol: "control_valve", tag: "PCV" },
      { symbol: "heat_exchanger", tag: "HEATER" },
      { symbol: "pump", tag: "FEED PP" },
      { symbol: "check_valve", tag: "NV" },
    ],
    branches: [
      { tag: "V1", label: "F.O HEAT" },
      { tag: "V2", label: "TANK HEAT" },
      { tag: "V3", label: "ACCOMM" },
    ],
    instruments: [{ tag: "PT" }, { tag: "TT" }, { tag: "LT" }],
  },
  {
    key: "hydraulic",
    ko: "유압조타",
    en: "HYDRAULIC POWER (STEERING / DECK)",
    desc: "H.P.U → accumulator → steering gear / deck machinery",
    triggers: ["유압", "조타", "hydraulic", "steering"],
    source: { symbol: "tank", tag: "H.OIL TK" },
    dest: { symbol: "box:STEERING GEAR", tag: "S/G" },
    inline: [
      { symbol: "strainer", tag: "ST" },
      { symbol: "pump", tag: "HPU-1" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "vessel", tag: "ACCUM" },
      { symbol: "control_valve", tag: "DCV" },
    ],
    branches: [
      { tag: "V1", label: "WINDLASS" },
      { tag: "V2", label: "MOORING W" },
    ],
    instruments: [{ tag: "PT" }, { tag: "PI" }],
  },
  {
    key: "inertgas",
    ko: "불활성가스",
    en: "INERT GAS / NITROGEN (LNGC)",
    desc: "IG generator / N2 plant → dryer → deck seal → cargo tanks (insulation/vent)",
    triggers: ["불활성", "질소", "inert", "nitrogen", "ig system", "n2"],
    source: { symbol: "box:N2/IG GEN", tag: "IGG" },
    dest: { symbol: "box:CARGO TANKS", tag: "CT" },
    inline: [
      { symbol: "box:DRYER", tag: "DRY" },
      { symbol: "check_valve", tag: "NV" },
      { symbol: "box:DECK SEAL", tag: "DS" },
      { symbol: "control_valve", tag: "PCV" },
    ],
    branches: [
      { tag: "V1", label: "INSULATION" },
      { tag: "V2", label: "INTERBARRIER" },
      { tag: "V3", label: "VENT MAST" },
    ],
    instruments: [{ tag: "PT" }, { tag: "AT" }, { tag: "O2" }],
  },
];

const byKey = Object.fromEntries(HULL_SYSTEMS.map((s) => [s.key, s]));

export function buildHullSystem(key: string): Op[] {
  const spec = byKey[key];
  return spec ? buildLinearSystem(spec) : [];
}

/** Match a free-text prompt to a hull system key (longest trigger wins). */
export function matchHullSystem(text: string): string | null {
  const s = text.toLowerCase();
  let best: { key: string; len: number } | null = null;
  for (const spec of HULL_SYSTEMS) {
    for (const t of spec.triggers) {
      if (s.includes(t.toLowerCase()) && (!best || t.length > best.len)) best = { key: spec.key, len: t.length };
    }
  }
  return best?.key ?? null;
}
