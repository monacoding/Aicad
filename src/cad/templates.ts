// P&ID system templates — encoded ship-process diagrams learned from standard
// marine practice. Used by the local NL interpreter ("발라스트 시스템 그려줘")
// and by render scripts. Each returns a complete Op[] for one diagram.
import { Op, XY } from "./ops";

const EQ = "equipment";
const IN = "instrument";

/**
 * Ballast water system P&ID:
 *  high/low sea chests + sea valves -> mud box/strainer -> two ballast pumps
 *  (parallel, motor-driven) with discharge check valves -> BWTS (filter + UV)
 *  -> flow meter -> ballast main header -> remote butterfly valves to each
 *  ballast tank (FPT / double-bottom P&S / APT). Plus overboard discharge,
 *  eductor stripping line, and pressure/flow/level/salinity instruments.
 */
export function buildBallastSystem(): Op[] {
  const ops: Op[] = [];
  const Y = 0; // main run elevation
  const text = (at: XY, t: string, h = 0.7, layer = "0") =>
    ops.push({ op: "add_text", at, text: t, height: h, layer });
  const sym = (symbol: string, at: XY, opts: Partial<{ scale: number; rotation: number; tag: string; layer: string }> = {}) =>
    ops.push({ op: "add_symbol", symbol, at, scale: opts.scale ?? 1, rotation: opts.rotation ?? 0, tag: opts.tag, layer: opts.layer ?? EQ });
  const pipe = (points: XY[]) => ops.push({ op: "add_pipe", points });
  const signal = (a: XY, b: XY) => ops.push({ op: "add_signal", a, b });
  const box = (corner: XY, w: number, h: number, fill = "#ffb45433") =>
    ops.push({ op: "add_rectangle", corner, width: w, height: h, layer: EQ, color: "#ffb454", fill });

  // ---- sea chests + sea suction ----
  box([-44, 2], 2.4, 2, "#5cc8ff33");
  text([-44.3, 1.4], "SEA CHEST (HIGH)", 0.55);
  box([-44, -4], 2.4, 2, "#5cc8ff33");
  text([-44.3, -4.6], "SEA CHEST (LOW)", 0.55);
  sym("butterfly_valve", [-40.5, 3], { scale: 0.9, tag: "SV1", rotation: 0 });
  sym("butterfly_valve", [-40.5, -3], { scale: 0.9, tag: "SV2", rotation: 0 });
  pipe([[-41.6, 3], [-39, 3], [-39, -3], [-41.6, -3]]); // chest header
  pipe([[-39, 0], [-36, 0]]); // to strainer

  // ---- mud box / suction strainer ----
  sym("strainer", [-35, 0], { scale: 1, tag: "MB1" });
  pipe([[-34.5, 0], [-33, 0]]);

  // ---- two ballast pumps in parallel ----
  // suction header (vertical) feeding both pumps
  pipe([[-33, 0], [-33, -6]]);
  // pump 1 (upper, on main line)
  sym("pump", [-30, 0], { scale: 1.1, tag: "BP-1" });
  sym("motor", [-30, 2.4], { scale: 0.8, tag: "M1" });
  pipe([[-30, 0.6], [-30, 1.9]]);
  pipe([[-33, 0], [-30.6, 0]]); // suction to pump1
  sym("check_valve", [-27, 0], { scale: 0.9, tag: "NV1" });
  // pump 2 (lower, parallel)
  sym("pump", [-30, -6], { scale: 1.1, tag: "BP-2" });
  sym("motor", [-30, -3.6], { scale: 0.8, tag: "M2" });
  pipe([[-30, -5.4], [-30, -4.1]]);
  pipe([[-33, -6], [-30.6, -6]]); // suction to pump2
  sym("check_valve", [-27, -6], { scale: 0.9, tag: "NV2" });
  // discharge header (vertical) recombining
  pipe([[-25.6, 0], [-24, 0], [-24, -6], [-25.6, -6]]);
  pipe([[-24, 0], [-22, 0]]);

  // pressure gauge on pump discharge
  sym("instrument", [-24, 4], { scale: 1.1, tag: "PT1", layer: IN });
  signal([-24, 3.45], [-24, 0]);

  // ---- overboard discharge branch ----
  pipe([[-22, 0], [-22, 6]]);
  sym("gate_valve", [-22, 3], { scale: 0.9, rotation: 90, tag: "OB1" });
  sym("arrow", [-22, 6.4], { scale: 1.1, rotation: 90 });
  text([-21, 6.7], "OVERBOARD", 0.6);

  // ---- BWTS: filter (1st stage) + UV reactor (2nd stage) ----
  box([-20.5, -1.4], 3.2, 2.8, "#7bd88f33");
  text([-20.2, -0.1], "BWTS", 0.6);
  text([-20.4, -0.9], "FILTER", 0.55);
  pipe([[-22, 0], [-20.5, 0]]);
  pipe([[-17.3, 0], [-15.5, 0]]);
  box([-15.5, -1.8], 2.4, 3.6, "#b388ff33");
  text([-15.3, 0.2], "UV", 0.7);
  text([-15.4, -0.7], "REACT", 0.5);
  pipe([[-13.1, 0], [-11, 0]]);

  // salinity / TRO analyzer on the treated line
  sym("instrument", [-13, 4], { scale: 1.1, tag: "AT2", layer: IN });
  signal([-13, 3.45], [-13.5, 0]);

  // ---- flow meter + main isolation valve ----
  sym("instrument", [-9, 3.5], { scale: 1.1, tag: "FT1", layer: IN });
  signal([-9, 2.95], [-9, 0]);
  pipe([[-11, 0], [-7, 0]]);
  sym("gate_valve", [-6, 0], { scale: 1, tag: "V1" });
  pipe([[-5, 0], [-2, 0]]);

  // ---- eductor (stripping) ----
  sym("reducer", [-3.5, -4], { scale: 1, rotation: 90, tag: "ED1" });
  text([-2.8, -4.2], "EDUCTOR", 0.5);
  ops.push({ op: "add_signal", a: [-4, 0], b: [-3.5, -3] }); // motive line (dashed)

  // ---- ballast main header + tank branches ----
  const tanks: { x: number; tag: string }[] = [
    { x: 0, tag: "FPT" },
    { x: 7, tag: "1DB(P)" },
    { x: 14, tag: "1DB(S)" },
    { x: 21, tag: "2DB(P)" },
    { x: 28, tag: "APT" },
  ];
  const mainRight = tanks[tanks.length - 1].x + 2;
  pipe([[-2, Y], [mainRight, Y]]); // ballast main header

  let bv = 1;
  for (const t of tanks) {
    // branch drop with remote butterfly valve
    pipe([[t.x, 0], [t.x, -8]]);
    sym("butterfly_valve", [t.x, -4], { scale: 0.9, rotation: 90, tag: `BV${bv++}` });
    // ballast tank (rectangle)
    box([t.x - 2, -13], 4, 4, "#5cc8ff22");
    text([t.x - 1.6, -13.7], t.tag, 0.6);
  }
  // tank level gauges on two tanks
  sym("instrument", [tanks[1].x, -16.5], { scale: 1.1, tag: "LI1", layer: IN });
  signal([tanks[1].x, -15.95], [tanks[1].x, -13]);
  sym("instrument", [tanks[3].x, -16.5], { scale: 1.1, tag: "LI2", layer: IN });
  signal([tanks[3].x, -15.95], [tanks[3].x, -13]);

  // ---- title ----
  text([-44, 9.5], "BALLAST WATER SYSTEM  —  P&ID", 1.3, "0");
  text([-44, 8.2], "Sea chest → strainer → ballast pumps → BWTS (filter+UV) → ballast main → tanks", 0.55, "0");

  return ops;
}

/**
 * 174K-class membrane LNG carrier ballast P&ID. Port water-ballast tanks run
 * above the ballast main (duct keel), starboard below — conveying the
 * double-hull arrangement around 4 cargo holds. Aft pump room: two ballast
 * pumps + BWTS + sea chests + overboard. Pass `levels` (tag -> 0..100) to
 * annotate tank fill from a simulation run.
 */
export function buildLngcBallastSystem(levels?: Record<string, number>): Op[] {
  const ops: Op[] = [];
  const text = (at: XY, t: string, h = 0.7, layer = "0", color?: string) =>
    ops.push({ op: "add_text", at, text: t, height: h, layer, color });
  const sym = (symbol: string, at: XY, o: Partial<{ scale: number; rotation: number; tag: string; layer: string }> = {}) =>
    ops.push({ op: "add_symbol", symbol, at, scale: o.scale ?? 1, rotation: o.rotation ?? 0, tag: o.tag, layer: o.layer ?? EQ });
  const pipe = (points: XY[]) => ops.push({ op: "add_pipe", points });
  const signal = (a: XY, b: XY) => ops.push({ op: "add_signal", a, b });
  const rect = (corner: XY, w: number, h: number, color: string, fill?: string, layer = EQ) =>
    ops.push({ op: "add_rectangle", corner, width: w, height: h, layer, color, fill });

  // drawing positions per tank (longitudinal compressed; P above main, S below)
  const POS: Record<string, { dx: number; row: "P" | "S" | "C" }> = {
    FPT: { dx: 19, row: "C" }, WBT1P: { dx: 12, row: "P" }, WBT1S: { dx: 12, row: "S" },
    WBT2P: { dx: 5, row: "P" }, WBT2S: { dx: 5, row: "S" }, WBT3P: { dx: -2, row: "P" },
    WBT3S: { dx: -2, row: "S" }, WBT4P: { dx: -9, row: "P" }, WBT4S: { dx: -9, row: "S" },
    APT: { dx: -16, row: "C" },
  };
  const TW = 5.2; // tank box width
  const TH = 3.4; // tank box height

  // ---- cargo tanks (context, dashed) ----
  for (let i = 0; i < 4; i++) {
    const cx = -12 + i * 8;
    ops.push({ op: "add_polyline", layer: "0", closed: true, lineType: "dashed", points: [
      [cx - 3.4, 12], [cx + 3.4, 12], [cx + 3.4, 16.5], [cx - 3.4, 16.5],
    ] });
    text([cx - 1.3, 14], `CT${4 - i}`, 0.6, "0");
  }
  text([-20, 17.2], "LNG CARGO TANKS (MEMBRANE) — reference", 0.55, "0");

  // ---- ballast main (duct keel) ----
  const mainL = -20;
  const mainR = 21;
  pipe([[mainL, 0], [mainR, 0]]);
  text([13, 0.6], "BALLAST MAIN (DUCT KEEL)", 0.5, "process", "#7bd88f");

  // ---- tank boxes + branch butterfly valves ----
  let bv = 1;
  const drawTank = (cx: number, cy: number, tag: string) => {
    rect([cx - TW / 2, cy - TH / 2], TW, TH, "#5cc8ff", "#5cc8ff14");
    const pct = levels?.[tag];
    if (pct !== undefined) {
      const fh = (TH - 0.4) * (pct / 100);
      rect([cx - TW / 2 + 0.2, cy - TH / 2 + 0.2], TW - 0.4, Math.max(0, fh), "#5cc8ff", "#5cc8ff77");
      text([cx + TW / 2 - 1.6, cy + TH / 2 - 1.0], `${pct}%`, 0.6, "0", "#cdeaff");
    }
    text([cx - TW / 2 + 0.2, cy - TH / 2 - 0.9], tag, 0.55, "0");
  };
  for (const [tag, p] of Object.entries(POS)) {
    const cx = p.dx;
    if (p.row === "P" || p.row === "C") {
      const cy = 6.2;
      pipe([[cx, 0], [cx, cy - TH / 2]]);
      sym("butterfly_valve", [cx, (cy - TH / 2) / 2 + 0.4], { scale: 0.8, rotation: 90, tag: `BV${bv++}` });
      drawTank(cx, cy, tag);
    } else {
      const cy = -6.2;
      pipe([[cx, 0], [cx, cy + TH / 2]]);
      sym("butterfly_valve", [cx, (cy + TH / 2) / 2 - 0.4], { scale: 0.8, rotation: 90, tag: `BV${bv++}` });
      drawTank(cx, cy, tag);
    }
  }
  text([19 - TW / 2, 6.2 + TH / 2 + 0.6], "FORE PEAK", 0.45, "0");
  text([-16 - TW / 2, 6.2 + TH / 2 + 0.6], "AFT PEAK", 0.45, "0");

  // ---- aft pump room machinery (left of main) ----
  // sea chests + sea valves
  rect([-34, 2], 2.2, 1.8, "#5cc8ff", "#5cc8ff33");
  text([-34.2, 1.5], "SEA CHEST (H)", 0.42);
  rect([-34, -3.8], 2.2, 1.8, "#5cc8ff", "#5cc8ff33");
  text([-34.2, -4.3], "SEA CHEST (L)", 0.42);
  sym("butterfly_valve", [-31, 2.9], { scale: 0.8, tag: "SV1" });
  sym("butterfly_valve", [-31, -2.9], { scale: 0.8, tag: "SV2" });
  pipe([[-31.8, 2.9], [-30, 2.9], [-30, -2.9], [-31.8, -2.9]]);
  pipe([[-30, 0], [-28.5, 0]]);
  sym("strainer", [-27.7, 0], { scale: 0.9, tag: "MB1" });
  // two ballast pumps ~3000 m^3/h each
  pipe([[-27.2, 0], [-27.2, -5]]);
  sym("pump", [-25, 0], { scale: 1, tag: "BP-1" });
  sym("motor", [-25, 2.1], { scale: 0.7, tag: "M1" });
  pipe([[-25, 0.5], [-25, 1.75]]);
  pipe([[-27.2, 0], [-25.5, 0]]);
  sym("check_valve", [-22.5, 0], { scale: 0.8, tag: "NV1" });
  sym("pump", [-25, -5], { scale: 1, tag: "BP-2" });
  sym("motor", [-25, -2.9], { scale: 0.7, tag: "M2" });
  pipe([[-25, -4.5], [-25, -3.25]]);
  pipe([[-27.2, -5], [-25.5, -5]]);
  sym("check_valve", [-22.5, -5], { scale: 0.8, tag: "NV2" });
  pipe([[-21.6, 0], [-21, 0], [-21, -5], [-21.6, -5]]);
  text([-26, 3.2], "BALLAST PUMPS 2×3000 m³/h", 0.42, "0");
  // pressure gauge
  sym("instrument", [-21, 3.5], { scale: 1, tag: "PT1", layer: IN });
  signal([-21, 3.0], [-21, 0]);
  // overboard
  pipe([[-21, 0], [-19, 0]]);
  pipe([[-19, 0], [-19, -8]]);
  sym("gate_valve", [-19, -4], { scale: 0.8, rotation: 90, tag: "OB1" });
  sym("arrow", [-19, -8.4], { scale: 1, rotation: -90 });
  text([-18.2, -8.6], "OVERBOARD", 0.5);
  // BWTS filter + UV between pumps and main
  rect([-18.5, -1.2], 2.8, 2.4, "#7bd88f", "#7bd88f33");
  text([-18.2, 0.2], "BWTS", 0.5);
  text([-18.3, -0.6], "FILTER", 0.45);
  pipe([[-19, 0], [-18.5, 0]]);
  pipe([[-15.7, 0], [-14.5, 0]]);
  rect([-14.5, -1.5], 2, 3, "#b388ff", "#b388ff33");
  text([-14.3, 0.1], "UV", 0.6);
  pipe([[-12.5, 0], [-20, 0]]); // treated water into main (overlap ok)
  sym("instrument", [-14, 4], { scale: 1, tag: "AT2", layer: IN });
  signal([-14, 3.5], [-13.5, 0]);
  sym("instrument", [-10, 3.8], { scale: 1, tag: "FT1", layer: IN });
  signal([-10, 3.3], [-10, 0]);

  // ---- title / notes ----
  text([-34, 19.5], "174K LNGC  —  BALLAST WATER SYSTEM P&ID", 1.3, "0");
  text([-34, 18.2], "WBT total ≈ 50,500 m³ · 2×3000 m³/h pumps · BWTS (filter+UV) · port WBT above main, stbd below", 0.5, "0");
  if (levels) text([-34, 9.6], "Tank fill annotated from ballast simulation (paired/balanced sequence).", 0.5, "0", "#cdeaff");

  return ops;
}
