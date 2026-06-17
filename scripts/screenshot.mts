// Per-feature screenshots. Usage: tsx scripts/screenshot.mts <scenario> <out.png>
import { CadDocument } from "../src/cad/document.ts";
import { applyOps, type Op } from "../src/cad/ops.ts";
import { compositeToFile } from "./render.mts";

interface Scenario {
  tool: string;
  note: string;
  build: (doc: CadDocument) => void;
  select?: number;
}

const apply = (doc: CadDocument, ops: Op[], sel: string[] = []) =>
  applyOps(doc, ops, { selection: new Set(sel), lastCreated: sel }).created;

const scenarios: Record<string, Scenario> = {
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
  polar: {
    tool: "폴리",
    note: "상대·극좌표 입력: 0,0 @5<0 @5<120 (정삼각형)",
    build: (doc) =>
      apply(doc, [{ op: "add_polyline", points: [[0, 0], [5, 0], [2.5, 4.33]], closed: true }]),
  },
  ellipse: {
    tool: "타원",
    note: "타원 엔티티: rx=6 ry=3, 회전 30°",
    build: (doc) =>
      apply(doc, [
        { op: "add_ellipse", center: [0, 0], rx: 6, ry: 3, rotation: 30 },
        { op: "add_ellipse", center: [0, 0], rx: 3, ry: 6 },
      ]),
  },
  hatch: {
    tool: "채움",
    note: "닫힌 객체 채우기(HATCH)",
    build: (doc) => {
      apply(doc, [{ op: "add_polyline", points: [[-6, -4], [6, -4], [4, 4], [-4, 4]], closed: true }]);
      apply(doc, [{ op: "add_circle", center: [0, 0], radius: 2 }]);
      apply(doc, [{ op: "hatch", selector: "all", color: "#4da3ff55" }]);
    },
  },
  mirror: {
    tool: "대칭",
    note: "Y축 대칭 복사",
    build: (doc) => {
      const ids = apply(doc, [{ op: "add_polyline", points: [[1, 0], [5, 0], [4, 3], [2, 5]] }]);
      apply(doc, [{ op: "mirror", selector: "selected", a: [0, 0], b: [0, 1], keepOriginal: true }], ids);
      apply(doc, [{ op: "add_line", a: [0, -2], b: [0, 6] }]);
    },
  },
  offset: {
    tool: "간격",
    note: "간격띄우기(OFFSET): 안팎 0.8",
    build: (doc) => {
      const a = apply(doc, [{ op: "add_rectangle", corner: [-6, -4], width: 12, height: 8 }]);
      apply(doc, [{ op: "offset", selector: "selected", distance: -0.8 }], a);
      const b = apply(doc, [{ op: "add_circle", center: [0, 0], radius: 2 }]);
      apply(doc, [{ op: "offset", selector: "selected", distance: 0.8 }], b);
    },
  },
  array: {
    tool: "선택",
    note: "직사각형 배열 5×3 + 원형 배열 8개",
    build: (doc) => {
      const a = apply(doc, [{ op: "add_circle", center: [-9, -4], radius: 0.6 }]);
      apply(doc, [{ op: "array_rect", selector: "selected", rows: 3, cols: 5, dx: 2, dy: 2 }], a);
      const b = apply(doc, [{ op: "add_circle", center: [6, 2], radius: 0.5 }]);
      apply(doc, [{ op: "array_polar", selector: "selected", center: [4, 2], count: 8, angle: 360 }], b);
    },
  },
  fillet: {
    tool: "모깎",
    note: "모깎기·모따기로 모서리 처리",
    build: (doc) =>
      apply(doc, [
        { op: "add_line", a: [-8, 4], b: [-2, 4] },
        { op: "add_arc", center: [-2, 2.5], radius: 1.5, startAngle: 90, endAngle: 0 },
        { op: "add_line", a: [-0.5, 2.5], b: [-0.5, -4] },
        { op: "add_line", a: [2, 4], b: [7, 4] },
        { op: "add_line", a: [8.5, 2.5], b: [8.5, -4] },
        { op: "add_line", a: [7, 4], b: [8.5, 2.5] },
      ]),
  },
  trim: {
    tool: "자름",
    note: "자르기·연장: 교차선 정리",
    build: (doc) =>
      apply(doc, [
        { op: "add_line", a: [-8, 0], b: [8, 0] },
        { op: "add_line", a: [-4, -5], b: [-4, 5] },
        { op: "add_line", a: [4, -5], b: [4, 5] },
        { op: "add_line", a: [-4, 3], b: [4, 3] },
      ]),
  },
  grips: {
    tool: "선택",
    note: "그립 편집: 선택 객체의 점을 드래그",
    select: 1,
    build: (doc) => apply(doc, [{ op: "add_polyline", points: [[-6, -3], [-2, 4], [3, -1], [6, 4]] }]),
  },
  house: {
    tool: "선택",
    note: "자연어 결과 예시: 집 도면 + 치수",
    build: (doc) =>
      apply(doc, [
        { op: "add_polyline", points: [[-6, -5], [6, -5], [6, 3], [-6, 3]], closed: true },
        { op: "add_polyline", points: [[-7, 3], [0, 8], [7, 3]], closed: true, color: "#ff8a5c" },
        { op: "add_rectangle", corner: [-1.5, -5], width: 3, height: 4, color: "#ffd24d" },
        { op: "add_rectangle", corner: [-4.5, -1], width: 2.5, height: 2.5 },
        { op: "add_rectangle", corner: [2, -1], width: 2.5, height: 2.5 },
        { op: "add_dimension", a: [-6, -5], b: [6, -5], offset: -1.5 },
        { op: "add_dimension", a: [6, -5], b: [6, 3], offset: 1.5 },
      ]),
  },
};

const name = process.argv[2] ?? "base";
const out = process.argv[3] ?? `scripts/out/${name}.png`;
const sc = scenarios[name];
if (!sc) {
  console.error("unknown scenario:", name, "—", Object.keys(scenarios).join(", "));
  process.exit(1);
}
const doc = new CadDocument();
sc.build(doc);
compositeToFile(doc, out, { tool: sc.tool, note: sc.note, select: sc.select });
console.log("wrote", out);
