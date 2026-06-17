// Render the BOM "리스트" result: a diagram with the valve/pipe-list overlay
// drawn on top (the same data the in-app modal shows). tsx scripts/bomshot.mts
import { CadDocument } from "../src/cad/document.ts";
import { applyOps } from "../src/cad/ops.ts";
import { buildLinearSystem, HULL_SYSTEMS } from "../src/cad/hullSystems.ts";
import { valveList, pipeList } from "../src/cad/bom.ts";
import { compositeToFile } from "./render.mts";

const C = { panel: "#20202a", panel2: "#2a2a36", border: "#46465a", text: "#e6e6ec", muted: "#9a9aa8", accent: "#4da3ff" };

function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function table(ctx: any, x: number, y: number, title: string, headers: string[], rows: string[][], colW: number[]) {
  const rowH = 19;
  const w = colW.reduce((a, b) => a + b, 0);
  ctx.fillStyle = C.accent;
  ctx.font = "bold 12px ZenHei";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${title}  (${rows.length})`, x, y - 6);
  // header
  ctx.fillStyle = C.panel2;
  ctx.fillRect(x, y, w, rowH);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.font = "11px ZenHei";
  let cx = x;
  ctx.fillStyle = C.muted;
  headers.forEach((hd, i) => {
    ctx.strokeRect(cx, y, colW[i], rowH);
    ctx.fillText(hd, cx + 5, y + 13);
    cx += colW[i];
  });
  // rows
  ctx.fillStyle = C.text;
  rows.forEach((r, ri) => {
    const ry = y + rowH * (ri + 1);
    let rx = x;
    r.forEach((cell, ci) => {
      ctx.strokeStyle = C.border;
      ctx.strokeRect(rx, ry, colW[ci], rowH);
      ctx.fillStyle = C.text;
      ctx.fillText(cell, rx + 5, ry + 13);
      rx += colW[ci];
    });
  });
  return rowH * (rows.length + 1);
}

const key = process.argv[2] ?? "fire";
const out = process.argv[3] ?? `scripts/out/bom_${key}.png`;
const spec = HULL_SYSTEMS.find((s) => s.key === key)!;
const doc = new CadDocument();
applyOps(doc, buildLinearSystem(spec), { selection: new Set(), lastCreated: [] });

const valves = valveList(doc);
const pipes = pipeList(doc);

compositeToFile(doc, out, {
  tool: "선택",
  note: `${spec.en} — 상단 '리스트' 버튼: 밸브/파이프 리스트 추출(BOM) + CSV`,
  cmd: "BOM",
  layers: [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"]],
  overlay: (ctx, W, H) => {
    // dim backdrop
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    const mw = 940;
    const mh = 540;
    const mx = (W - mw) / 2;
    const my = (H - mh) / 2;
    ctx.fillStyle = C.panel;
    rr(ctx, mx, my, mw, mh, 10);
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    rr(ctx, mx, my, mw, mh, 10);
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = "bold 15px ZenHei";
    ctx.fillText(`자재 추출 (BOM) — ${spec.en}`, mx + 18, my + 28);
    ctx.fillStyle = C.muted;
    ctx.font = "11px ZenHei";
    ctx.fillText("각 표마다 'CSV 저장' 버튼으로 내보내기", mx + 18, my + 46);

    const vRows = valves.map((v) => [v.tag, v.type, v.size, v.service, v.layer]);
    table(ctx, mx + 18, my + 80, "VALVE LIST", ["TAG", "TYPE", "SIZE", "SERVICE", "LAYER"],
      vRows, [70, 110, 60, 175, 95]);

    const pRows = pipes.map((p) => [p.tag, p.size, p.service, String(p.length), p.layer]);
    const vH = 19 * (vRows.length + 1);
    table(ctx, mx + 18, my + 80 + vH + 52, "PIPE LIST", ["LINE NO.", "SIZE", "SERVICE", "LENGTH", "LAYER"],
      pRows, [150, 60, 175, 70, 95]);
  },
});
console.log("wrote", out, "valves", valves.length, "pipes", pipes.length);
