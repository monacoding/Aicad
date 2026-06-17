// Headless screenshot harness. No browser available in this environment, so we
// render the real CAD Renderer into a node canvas and composite the app chrome
// (toolbar / panels / command bar) around it to show the program's appearance.
//
// Usage: tsx scripts/screenshot.mts <scenario> <outfile.png>
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { CadDocument } from "../src/cad/document.ts";
import { Viewport } from "../src/cad/viewport.ts";
import { Renderer } from "../src/cad/renderer.ts";
import { applyOps, type Op } from "../src/cad/ops.ts";
import { boundsValid } from "../src/cad/geometry.ts";

GlobalFonts.registerFromPath("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", "ZenHei");
const UI = "13px ZenHei";
const FONT = (px: number, bold = false) => `${bold ? "bold " : ""}${px}px ZenHei`;

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

interface Scenario {
  tool: string;
  note: string;
  build: (doc: CadDocument) => void;
  select?: number; // select last N created
}

const apply = (doc: CadDocument, ops: Op[]) =>
  applyOps(doc, ops, { selection: new Set(), lastCreated: [] }).created;

const scenarios: Record<string, Scenario> = {
  // round 0 — baseline drawing showcasing primitives
  base: {
    tool: "선택",
    note: "기본 도형: 선·원·호·폴리라인·문자",
    build: (doc) =>
      apply(doc, [
        { op: "add_rectangle", corner: [-8, -5], width: 16, height: 10 },
        { op: "add_circle", center: [0, 0], radius: 3 },
        { op: "add_line", a: [-8, -5], b: [8, 5] },
        { op: "add_arc", center: [-4, 3], radius: 2, startAngle: 0, endAngle: 180 },
        { op: "add_text", at: [-7.5, 5.5], text: "AiCAD", height: 1 },
        { op: "add_dimension", a: [-8, -5], b: [8, -5], offset: -1.5 },
      ]),
  },

  // round 1 — relative/polar input (a closed polygon traced by polar steps)
  polar: {
    tool: "폴리",
    note: "상대·극좌표 입력: 0,0 @5<0 @5<120 @5<240 (정삼각형)",
    build: (doc) =>
      apply(doc, [
        { op: "add_polyline", points: [[0, 0], [5, 0], [2.5, 4.33]], closed: true },
        { op: "add_line", a: [0, 0], b: [5, 0] },
      ]),
  },

  // round 2 — ellipse
  ellipse: {
    tool: "타원",
    note: "타원 엔티티: rx=6 ry=3, 회전 30°",
    build: (doc) =>
      apply(doc, [
        { op: "add_ellipse", center: [0, 0], rx: 6, ry: 3, rotation: 30 },
        { op: "add_ellipse", center: [0, 0], rx: 3, ry: 6 },
      ]),
  },

  // round 3 — hatch / fill
  hatch: {
    tool: "채움",
    note: "닫힌 객체 채우기(HATCH)",
    build: (doc) => {
      apply(doc, [{ op: "add_polyline", points: [[-6, -4], [6, -4], [4, 4], [-4, 4]], closed: true }]);
      apply(doc, [{ op: "add_circle", center: [0, 0], radius: 2 }]);
      apply(doc, [{ op: "hatch", selector: "all", color: "#4da3ff55" }]);
    },
  },

  // round 4 — mirror
  mirror: {
    tool: "대칭",
    note: "Y축 대칭 복사",
    build: (doc) => {
      const ids = apply(doc, [
        { op: "add_polyline", points: [[1, 0], [5, 0], [4, 3], [2, 5]], closed: false },
      ]);
      applyOps(doc, [{ op: "mirror", selector: "selected", a: [0, 0], b: [0, 1], keepOriginal: true }], {
        selection: new Set(ids),
        lastCreated: ids,
      });
      apply(doc, [{ op: "add_line", a: [0, -2], b: [0, 6] }]);
    },
  },

  // round 5 — offset
  offset: {
    tool: "간격",
    note: "간격띄우기(OFFSET): 사각형·원 안팎으로 0.8씩",
    build: (doc) => {
      const a = apply(doc, [{ op: "add_rectangle", corner: [-6, -4], width: 12, height: 8 }]);
      applyOps(doc, [{ op: "offset", selector: "selected", distance: -0.8 }], { selection: new Set(a), lastCreated: a });
      const b = apply(doc, [{ op: "add_circle", center: [0, 0], radius: 2 }]);
      applyOps(doc, [{ op: "offset", selector: "selected", distance: 0.8 }], { selection: new Set(b), lastCreated: b });
    },
  },

  // round 6 — arrays
  array: {
    tool: "선택",
    note: "직사각형 배열 5×3 + 원형 배열 8개",
    build: (doc) => {
      const a = apply(doc, [{ op: "add_circle", center: [-9, -4], radius: 0.6 }]);
      applyOps(doc, [{ op: "array_rect", selector: "selected", rows: 3, cols: 5, dx: 2, dy: 2 }], {
        selection: new Set(a),
        lastCreated: a,
      });
      const b = apply(doc, [{ op: "add_circle", center: [6, 2], radius: 0.5 }]);
      applyOps(doc, [{ op: "array_polar", selector: "selected", center: [4, 2], count: 8, angle: 360 }], {
        selection: new Set(b),
        lastCreated: b,
      });
    },
  },

  // round 7 — fillet & chamfer (results constructed via geomops in tools; here show outcome)
  fillet: {
    tool: "모깎",
    note: "모깎기(FILLET)·모따기(CHAMFER)로 모서리 처리",
    build: (doc) => {
      // L-shapes with rounded / beveled corners (precomputed coordinates)
      apply(doc, [
        { op: "add_line", a: [-8, 4], b: [-2, 4] },
        { op: "add_arc", center: [-2, 2.5], radius: 1.5, startAngle: 90, endAngle: 0 },
        { op: "add_line", a: [-0.5, 2.5], b: [-0.5, -4] },
        { op: "add_line", a: [2, 4], b: [7, 4] },
        { op: "add_line", a: [8.5, 2.5], b: [8.5, -4] },
        { op: "add_line", a: [7, 4], b: [8.5, 2.5] },
      ]);
    },
  },

  // round 8 — trim/extend
  trim: {
    tool: "자름",
    note: "자르기(TRIM)·연장(EXTEND): 교차선 정리",
    build: (doc) =>
      apply(doc, [
        { op: "add_line", a: [-8, 0], b: [8, 0] },
        { op: "add_line", a: [-4, -5], b: [-4, 5] },
        { op: "add_line", a: [4, -5], b: [4, 5] },
        { op: "add_line", a: [-4, 3], b: [4, 3] },
      ]),
  },

  // round 9 — grips (single selection shows grip handles)
  grips: {
    tool: "선택",
    note: "그립 편집: 선택 객체의 점을 드래그",
    select: 1,
    build: (doc) =>
      apply(doc, [{ op: "add_polyline", points: [[-6, -3], [-2, 4], [3, -1], [6, 4]], closed: false }]),
  },

  // round 10 — composite "house" via NL-style ops, with dimensions
  house: {
    tool: "선택",
    note: "자연어 결과 예시: 집 도면 + 치수 + 채우기",
    build: (doc) =>
      apply(doc, [
        { op: "add_polyline", points: [[-6, -5], [6, -5], [6, 3], [-6, 3]], closed: true, layer: "0" },
        { op: "add_polyline", points: [[-7, 3], [0, 8], [7, 3]], closed: true, color: "#ff8a5c" },
        { op: "add_rectangle", corner: [-1.5, -5], width: 3, height: 4, color: "#ffd24d" },
        { op: "add_rectangle", corner: [-4.5, -1], width: 2.5, height: 2.5 },
        { op: "add_rectangle", corner: [2, -1], width: 2.5, height: 2.5 },
        { op: "add_circle", center: [0, 5], radius: 0.8 },
        { op: "add_dimension", a: [-6, -5], b: [6, -5], offset: -1.5 },
        { op: "add_dimension", a: [6, -5], b: [6, 3], offset: 1.5 },
      ]),
  },
};

function drawChrome(ctx: any, w: number, h: number, sc: Scenario, region: { x: number; y: number; w: number; h: number }) {
  // background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  // top bar
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = C.accent;
  ctx.font = FONT(16, true);
  ctx.textBaseline = "middle";
  ctx.fillText("AiCAD", 14, 21);
  ctx.fillStyle = C.muted;
  ctx.font = UI;
  ctx.fillText("자연어 웹 캐드", 70, 22);
  const topBtns = ["새 도면", "DXF 열기", "DXF 저장", "PNG", "↶ 취소", "↷ 복구", "전체보기"];
  let bx = 170;
  for (const b of topBtns) {
    const bw = ctx.measureText(b).width + 16;
    ctx.fillStyle = C.panel2;
    rr(ctx, bx, 8, bw, 24, 5);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.fillText(b, bx + 8, 21);
    bx += bw + 8;
  }
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(0, 40.5);
  ctx.lineTo(w, 40.5);
  ctx.stroke();

  // left toolbar
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 40, 56, region.h);
  let ty = 50;
  ctx.font = FONT(10);
  for (const t of TOOLS) {
    if (t === "·") {
      ctx.strokeStyle = C.border;
      ctx.beginPath();
      ctx.moveTo(10, ty + 2);
      ctx.lineTo(46, ty + 2);
      ctx.stroke();
      ty += 8;
      continue;
    }
    const active = t === sc.tool;
    if (active) {
      ctx.fillStyle = C.accent;
      rr(ctx, 6, ty, 44, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#07223f";
    } else {
      ctx.fillStyle = C.text;
    }
    ctx.textAlign = "center";
    ctx.fillText(t, 28, ty + 11);
    ctx.textAlign = "start";
    ty += 24;
  }

  // right side panel
  const sx = region.x + region.w;
  ctx.fillStyle = C.panel;
  ctx.fillRect(sx, 40, 260, region.h);
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(sx + 0.5, 40);
  ctx.lineTo(sx + 0.5, 40 + region.h);
  ctx.stroke();
  const section = (title: string, y: number) => {
    ctx.fillStyle = C.muted;
    ctx.font = FONT(11, true);
    ctx.fillText(title, sx + 12, y);
  };
  section("자연어로 그리기 (CLAUDE)", 60);
  ctx.fillStyle = C.bg;
  rr(ctx, sx + 10, 70, 240, 50, 6);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = UI;
  wrapText(ctx, sc.note, sx + 18, 88, 224, 16);
  ctx.fillStyle = C.accent;
  rr(ctx, sx + 10, 128, 150, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#07223f";
  ctx.fillText("그리기 (Ctrl+Enter)", sx + 20, 141);

  section("속성", 178);
  ctx.fillStyle = C.muted;
  ctx.font = UI;
  ctx.fillText(sc.select ? `선택 ${sc.select}개` : "선택된 객체", sx + 12, 198);

  section("레이어", 232);
  const layers = [
    ["0", "#e6e6e6"],
    ["dimensions", "#33cc99"],
    ["construction", "#888888"],
  ];
  let ly = 250;
  for (const [name, col] of layers) {
    ctx.fillStyle = col;
    rr(ctx, sx + 12, ly - 9, 12, 12, 3);
    ctx.fill();
    ctx.fillStyle = name === "0" ? C.accent : C.text;
    ctx.fillText(name, sx + 32, ly);
    ctx.fillStyle = C.muted;
    ctx.fillText("👁", sx + 230, ly);
    ly += 22;
  }

  // command bar + status
  const cy = 40 + region.h;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, cy, w, h - cy);
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(w, cy + 0.5);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = "11px ZenHei";
  ctx.fillText("AiCAD 준비 완료.  " + sc.note, 12, cy + 16);
  ctx.fillStyle = C.text;
  ctx.fillText("✓ 적용 완료", 12, cy + 32);
  // input row
  ctx.fillStyle = C.accent;
  ctx.font = "12px ZenHei";
  ctx.fillText("명령:", 12, cy + 56);
  ctx.fillStyle = C.bg;
  rr(ctx, 56, cy + 44, w - 70, 24, 6);
  ctx.fill();
  ctx.fillStyle = C.muted;
  ctx.fillText("LINE 0,0 @10<45   |   OFFSET 0.5   |   ARRAYPOLAR 0,0 8   |   ZOOM", 64, cy + 57);
  // status bar
  ctx.fillStyle = C.muted;
  ctx.font = "11px ZenHei";
  const sy = h - 10;
  ctx.fillText(`도구: ${sc.tool}`, 12, sy);
  ctx.fillText(sc.select ? `선택: ${sc.select}` : "선택: 0", w - 360, sy);
  ctx.fillStyle = C.accent2;
  ctx.fillText("스냅", w - 110, sy);
  ctx.fillText("그리드", w - 70, sy);
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

function wrapText(ctx: any, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(/\s+/);
  let line = "";
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = wd;
      y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function main() {
  const name = process.argv[2] ?? "base";
  const out = process.argv[3] ?? `scripts/out/${name}.png`;
  const sc = scenarios[name];
  if (!sc) {
    console.error("unknown scenario:", name, "available:", Object.keys(scenarios).join(", "));
    process.exit(1);
  }

  const W = 1280;
  const H = 820;
  const region = { x: 56, y: 40, w: W - 56 - 260, h: H - 40 - 110 };

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const doc = new CadDocument();
  sc.build(doc);

  drawChrome(ctx as any, W, H, sc, region);

  // render CAD viewport clipped into the central region
  const vp = new Viewport();
  vp.resize(region.w, region.h);
  const bb = doc.bounds();
  if (boundsValid(bb)) vp.fit(bb, 0.18);
  const renderer = new Renderer(ctx as any, doc, vp);
  const selection = new Set<string>();
  if (sc.select) {
    const ids = doc.entities.slice(-sc.select).map((e) => e.id);
    ids.forEach((id) => selection.add(id));
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.translate(region.x, region.y);
  renderer.render({
    selection,
    hover: null,
    snap: null,
    cursor: null,
    preview: [],
    band: null,
    showGrid: true,
  });
  ctx.restore();

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("wrote", out, fs.statSync(out).size, "bytes");
}

main();
