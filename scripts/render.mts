// Shared headless compositor: renders the real CAD Renderer into a node canvas
// and draws the app chrome around it. Used by screenshot.mts and pid.mts.
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { CadDocument } from "../src/cad/document.ts";
import { Viewport } from "../src/cad/viewport.ts";
import { Renderer } from "../src/cad/renderer.ts";
import { boundsValid } from "../src/cad/geometry.ts";

let fontReady = false;
export function ensureFont() {
  if (fontReady) return;
  GlobalFonts.registerFromPath("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", "ZenHei");
  fontReady = true;
}

const C = {
  bg: "#16161c",
  panel: "#20202a",
  panel2: "#2a2a36",
  border: "#34343f",
  text: "#e6e6ec",
  muted: "#9a9aa8",
  accent: "#4da3ff",
  accent2: "#ffcf33",
};
const TOOLS = [
  "선택", "·", "선", "폴리", "사각", "원", "호", "타원", "점", "문자", "치수",
  "·", "이동", "복사", "회전", "축척", "대칭", "간격", "자름", "연장", "모깎", "모따", "채움", "지움", "·", "거리",
];

export interface CompositeOpts {
  tool?: string;
  note?: string;
  select?: number;
  layers?: [string, string][];
  cmd?: string;
}

export function compositeToFile(doc: CadDocument, out: string, opts: CompositeOpts = {}) {
  ensureFont();
  const W = 1280;
  const H = 820;
  const region = { x: 56, y: 40, w: W - 56 - 260, h: H - 40 - 110 };
  const canvas = createCanvas(W, H);
  const ctx: any = canvas.getContext("2d");

  drawChrome(ctx, W, H, region, opts);

  const vp = new Viewport();
  vp.resize(region.w, region.h);
  const bb = doc.bounds();
  if (boundsValid(bb)) vp.fit(bb, 0.16);
  const renderer = new Renderer(ctx, doc, vp);
  const selection = new Set<string>();
  if (opts.select) doc.entities.slice(-opts.select).forEach((e) => selection.add(e.id));

  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.translate(region.x, region.y);
  renderer.render({ selection, hover: null, snap: null, cursor: null, preview: [], band: null, showGrid: true });
  ctx.restore();

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  return out;
}

function drawChrome(ctx: any, w: number, h: number, region: { x: number; y: number; w: number; h: number }, o: CompositeOpts) {
  const tool = o.tool ?? "선택";
  const note = o.note ?? "";
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  // top bar
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = C.accent;
  ctx.font = "bold 16px ZenHei";
  ctx.textBaseline = "middle";
  ctx.fillText("AiCAD", 14, 21);
  ctx.fillStyle = C.muted;
  ctx.font = "13px ZenHei";
  ctx.fillText("자연어 웹 캐드", 70, 22);
  let bx = 170;
  for (const b of ["새 도면", "DXF 열기", "DXF 저장", "PNG", "취소", "복구", "전체보기"]) {
    const bw = ctx.measureText(b).width + 16;
    ctx.fillStyle = C.panel2;
    rr(ctx, bx, 8, bw, 24, 5);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.fillText(b, bx + 8, 21);
    bx += bw + 8;
  }
  ctx.strokeStyle = C.border;
  line(ctx, 0, 40.5, w, 40.5);

  // toolbar
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 40, 56, region.h);
  let ty = 50;
  ctx.font = "10px ZenHei";
  for (const t of TOOLS) {
    if (t === "·") {
      ctx.strokeStyle = C.border;
      line(ctx, 10, ty + 2, 46, ty + 2);
      ty += 8;
      continue;
    }
    if (t === tool) {
      ctx.fillStyle = C.accent;
      rr(ctx, 6, ty, 44, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#07223f";
    } else ctx.fillStyle = C.text;
    ctx.textAlign = "center";
    ctx.fillText(t, 28, ty + 11);
    ctx.textAlign = "start";
    ty += 24;
  }

  // side panel
  const sx = region.x + region.w;
  ctx.fillStyle = C.panel;
  ctx.fillRect(sx, 40, 260, region.h);
  ctx.strokeStyle = C.border;
  line(ctx, sx + 0.5, 40, sx + 0.5, 40 + region.h);
  ctx.fillStyle = C.muted;
  ctx.font = "bold 11px ZenHei";
  ctx.fillText("자연어로 그리기 (CLAUDE)", sx + 12, 60);
  ctx.fillStyle = C.bg;
  rr(ctx, sx + 10, 70, 240, 54, 6);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = "13px ZenHei";
  wrap(ctx, note, sx + 18, 88, 224, 16);
  ctx.fillStyle = C.accent;
  rr(ctx, sx + 10, 132, 150, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#07223f";
  ctx.fillText("그리기 (Ctrl+Enter)", sx + 20, 145);

  ctx.fillStyle = C.muted;
  ctx.font = "bold 11px ZenHei";
  ctx.fillText("속성", sx + 12, 182);
  ctx.font = "13px ZenHei";
  ctx.fillText(o.select ? `선택 ${o.select}개` : "선택된 객체", sx + 12, 202);

  ctx.fillStyle = C.muted;
  ctx.font = "bold 11px ZenHei";
  ctx.fillText("레이어", sx + 12, 236);
  const layers = o.layers ?? [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"], ["dimensions", "#33cc99"]];
  let ly = 256;
  ctx.font = "13px ZenHei";
  for (const [name, col] of layers) {
    ctx.fillStyle = col;
    rr(ctx, sx + 12, ly - 9, 12, 12, 3);
    ctx.fill();
    ctx.fillStyle = name === "0" ? C.accent : C.text;
    ctx.fillText(name, sx + 32, ly);
    ly += 22;
  }

  // command bar + status
  const cy = 40 + region.h;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, cy, w, h - cy);
  ctx.strokeStyle = C.border;
  line(ctx, 0, cy + 0.5, w, cy + 0.5);
  ctx.fillStyle = C.muted;
  ctx.font = "11px ZenHei";
  ctx.fillText("AiCAD 준비 완료.  " + note, 12, cy + 16);
  ctx.fillStyle = C.text;
  ctx.fillText("✓ 적용 완료", 12, cy + 32);
  ctx.fillStyle = C.accent;
  ctx.font = "12px ZenHei";
  ctx.fillText("명령:", 12, cy + 56);
  ctx.fillStyle = C.bg;
  rr(ctx, 56, cy + 44, w - 70, 24, 6);
  ctx.fill();
  ctx.fillStyle = C.muted;
  ctx.fillText(o.cmd ?? "SYMBOL pump 0,0 1 0 P-201   |   PIPE 0,0 10,0   |   SIGNAL 5,5 5,0", 64, cy + 57);
  ctx.fillStyle = C.muted;
  ctx.font = "11px ZenHei";
  ctx.fillText(`도구: ${tool}`, 12, h - 10);
  ctx.fillStyle = C.accent2;
  ctx.fillText("스냅", w - 110, h - 10);
  ctx.fillText("그리드", w - 70, h - 10);
}

function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function line(ctx: any, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function wrap(ctx: any, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(/\s+/);
  let ln = "";
  for (const wd of words) {
    const test = ln ? ln + " " + wd : wd;
    if (ctx.measureText(test).width > maxW && ln) {
      ctx.fillText(ln, x, y);
      ln = wd;
      y += lh;
    } else ln = test;
  }
  if (ln) ctx.fillText(ln, x, y);
}
