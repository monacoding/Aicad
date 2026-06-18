// Reproduction of the pasted WATER BALLAST SYSTEM P&ID (DWG 2T-7400-003),
// produced by reading the image the same way the /api/image endpoint does.
import { CadDocument } from "../src/cad/document.ts";
import { applyOps, type Op } from "../src/cad/ops.ts";
import { compositeToFile } from "./render.mts";

const ops: Op[] = [];
const P = (o: Op) => ops.push(o);
const text = (x: number, y: number, t: string, h = 0.7, layer = "0") =>
  P({ op: "add_text", at: [x, y], text: t, height: h, layer });
const box = (x: number, y: number, w: number, h: number, color = "#e6e6e6", fill?: string) =>
  P({ op: "add_rectangle", corner: [x, y], width: w, height: h, layer: "0", color, fill });
const sym = (s: string, x: number, y: number, tag?: string, scale = 0.9, rotation = 0) =>
  P({ op: "add_symbol", symbol: s, at: [x, y], scale, rotation, tag, layer: "equipment" });
const pipe = (pts: [number, number][]) => P({ op: "add_pipe", points: pts });

// ---- title block (top right) ----
box(20, 18.5, 30, 4, "#e6e6e6");
P({ op: "add_line", a: [38, 18.5], b: [38, 22.5] });
P({ op: "add_line", a: [20, 20.5], b: [50, 20.5] });
text(24, 21.2, "WATER BALLAST SYSTEM", 1.0);
text(39, 21.4, "SHIP NO. 3294-3299", 0.5);
text(39, 19.3, "DWG NO. 2T-7400-003", 0.5);

// ---- detail boxes (top, like the sheet layout) ----
P({ op: "add_polyline", points: [[-46, 11], [-22, 11], [-22, 22], [-46, 22]], closed: true, layer: "0", color: "#ff6b6b", lineType: "dashed" });
text(-40, 21, 'DETAIL "A"', 0.7);
text(-45, 20, "ENGINE ROOM / COFFERDAM / PIPE DUCT", 0.45);
sym("vessel", -44, 15, undefined, 0.7, 0);
text(-13, 21, 'DETAIL "B"', 0.7);
text(-18, 20, "GRP↔MILD STEEL, EYE PLATE", 0.45);
text(8, 21.5, "TYPICAL SECTION — CARGO TANK (W.B.TK P&S)", 0.5);
P({ op: "add_polyline", points: [[8, 12], [11, 16], [17, 16], [20, 12], [17, 11], [11, 11]], closed: true, layer: "0" });
text(11.5, 13.5, "CARGO TANK", 0.5);

// ---- ballast main header (PIPE DUCT) ----
const yMain = 0;
pipe([[-28, yMain], [36, yMain]]);
text(2, 0.7, "BALLAST MAIN LINE (PIPE DUCT)  450A", 0.45, "process");

// ---- W.B. tanks No.1~4 (P above main, S below) as hopper sections ----
const tanks = [
  { x: 30, n: "1" },
  { x: 22, n: "2" },
  { x: 14, n: "3" },
  { x: 6, n: "4" },
];
let bv = 1;
const hopper = (cx: number, cy: number, up: boolean, label: string) => {
  const w = 6.4;
  const h = 4.4;
  const top = cy + h / 2;
  const bot = cy - h / 2;
  // diamond/hopper outline with cross (tank section)
  P({ op: "add_polyline", layer: "0", closed: true, points: [
    [cx - w / 2, top], [cx + w / 2, top], [cx + w / 2 - 1, bot], [cx - w / 2 + 1, bot],
  ] });
  P({ op: "add_line", a: [cx - w / 2, top], b: [cx + w / 2 - 1, bot] });
  P({ op: "add_line", a: [cx + w / 2, top], b: [cx - w / 2 + 1, bot] });
  text(cx - w / 2 + 0.3, up ? top + 0.6 : bot - 1.0, label, 0.45);
  // branch from main with butterfly valve
  const edge = up ? bot : top;
  pipe([[cx, yMain], [cx, edge]]);
  sym("butterfly_valve", cx, (yMain + edge) / 2, `BF${String(bv++).padStart(4, "0")}`, 0.7, 90);
};
for (const t of tanks) {
  hopper(t.x, 7.5, true, `NO.${t.n} W.B.TK (P)`);
  hopper(t.x, -7.5, false, `NO.${t.n} W.B.TK (S)`);
  // instruments (level) on a couple tanks
  if (t.n === "2" || t.n === "4") {
    sym("instrument", t.x, 13, `LT${t.n}`, 0.9, 0);
    P({ op: "add_signal", a: [t.x, 12.5], b: [t.x, 9.8] });
  }
}

// ---- FWD W.B.TK (C) + F.P.VOID + FWD PUMP ROOM (right) ----
P({ op: "add_polyline", points: [[36, -5], [40, -5], [42, 0], [40, 5], [36, 5]], closed: true, layer: "0" });
text(36.3, 0, "FWD W.B.TK (C)", 0.42);
text(42.5, 4, "F.P. VOID", 0.45);
text(42.5, 6, "FWD PUMP ROOM", 0.42);

// ---- aft peak tank (far left) ----
P({ op: "add_polyline", points: [[-34, -4], [-30, 0], [-34, 4]], closed: true, layer: "0" });
text(-35, -5, "A.P.TK", 0.5);

// ---- ballast pumps No.1 / No.2 + BWTS + sea chest + overboard (left) ----
sym("strainer", -27, 4, "ST1", 0.8, 0);
sym("pump", -23, 4, "BP-1", 1, 0);
sym("motor", -23, 6.2, "M1", 0.7, 0);
sym("check_valve", -20, 4, "NV1", 0.7, 0);
pipe([[-27, 4], [-18, 4], [-18, yMain]]);
text(-25, 7.6, "NO.1 BALLAST WATER PUMP (2,300 m³/h × 35mTH)", 0.4);

sym("strainer", -27, -4, "ST2", 0.8, 0);
sym("pump", -23, -4, "BP-2", 1, 0);
sym("motor", -23, -1.8, "M2", 0.7, 0);
sym("check_valve", -20, -4, "NV2", 0.7, 0);
pipe([[-27, -4], [-18, -4], [-18, yMain]]);
text(-25, -6.4, "NO.2 BALLAST WATER PUMP", 0.4);

box(-16, 1.2, 3, 3, "#7bd88f", "#7bd88f33");
text(-15.7, 2.4, "BWTS", 0.5);
text(-15.8, 1.7, "ECU", 0.42);

box(-30, 2.5, 1.8, 3, "#5cc8ff", "#5cc8ff33");
text(-30.2, 2.0, "SEA CHEST", 0.4);

sym("pump", -25, -10, "WSP", 0.8, 0);
text(-28, -11.5, "WATER SPRAY PUMP (350 m³/h × 11mTH)", 0.4);
pipe([[-25, -9.5], [-25, -7], [-18, -7]]);

// overboard discharges
sym("gate_valve", -36, -8, "OB1", 0.7, 90);
sym("arrow", -36, -10, undefined, 0.9, -90);
text(-39, -11, "OVBD DISCHARGE", 0.45);
sym("arrow", -22, -14, undefined, 0.9, -90);
text(-26, -15, "OVBD DISCHARGE (E/R)", 0.42);

// a few process instruments near pumps
sym("instrument", -18, 8, "PT1", 0.9, 0);
P({ op: "add_signal", a: [-18, 7.5], b: [-18, 4.5] });

// title under sheet
text(-46, -18, "WATER BALLAST SYSTEM — reproduced from pasted P&ID image (structural)", 0.5);

const doc = new CadDocument();
applyOps(doc, ops, { selection: new Set(), lastCreated: [] });
compositeToFile(doc, "scripts/out/ballast_img_repro.png", {
  tool: "선택",
  note: "이미지(WATER BALLAST SYSTEM P&ID) 붙여넣기 → Claude 비전 인식 → 도면 재현",
  cmd: "(Ctrl+V 이미지 붙여넣기)",
  layers: [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"]],
});
console.log("ops", ops.length, "entities", doc.entities.length);
