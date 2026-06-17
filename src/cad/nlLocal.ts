// Local (offline) natural-language interpreter. A rule-based fallback so the
// "draw with words" feature still works without a Claude API key. It is
// best-effort: it understands common Korean/English CAD phrasings and returns
// an Op[]; unknown input yields []. When the API key is present the server's
// Claude path is used instead (and is far more flexible).
import { Op, XY } from "./ops";
import { SymbolName } from "./pid";
import { buildBallastSystem } from "./templates";

export interface LocalResult {
  ops: Op[];
  note: string;
}

const NUM = /-?\d+(?:\.\d+)?/g;
const nums = (s: string): number[] => (s.match(NUM) ?? []).map(Number);
const coord = (s: string): XY | null => {
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w));

// Korean / English n-gon names -> side count
const NGON: Record<string, number> = {
  삼각형: 3, 삼각: 3, triangle: 3,
  사각형: 4, 정사각형: 4, square: 4,
  오각형: 5, pentagon: 5,
  육각형: 6, hexagon: 6,
  칠각형: 7, heptagon: 7,
  팔각형: 8, octagon: 8,
  오각: 5, 육각: 6, 팔각: 8,
  구각형: 9, 십각형: 10, 십이각형: 12,
};

function polygon(n: number, cx: number, cy: number, r: number, rot = -90): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

function star(points: number, cx: number, cy: number, ro: number, ri: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = ((-90 + (180 / points) * i) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

const SYMBOL_WORDS: [RegExp, SymbolName][] = [
  [/게이트\s*밸브|gate/i, "gate_valve"],
  [/글로브\s*밸브|globe/i, "globe_valve"],
  [/체크\s*밸브|check/i, "check_valve"],
  [/볼\s*밸브|ball/i, "ball_valve"],
  [/버터플라이|butterfly|나비/i, "butterfly_valve"],
  [/제어\s*밸브|컨트롤|control/i, "control_valve"],
  [/펌프|pump/i, "pump"],
  [/베셀|vessel/i, "vessel"],
  [/탱크|tank/i, "tank"],
  [/열교환기|heat\s*exchanger|exchanger/i, "heat_exchanger"],
  [/계기|instrument|게이지|gauge/i, "instrument"],
  [/리듀서|reducer|환원/i, "reducer"],
  [/플랜지|flange/i, "flange"],
  [/스트레이너|strainer|여과/i, "strainer"],
  [/모터|motor/i, "motor"],
  [/화살표|arrow/i, "arrow"],
  [/밸브|valve/i, "gate_valve"], // generic valve last
];

/** Interpret one clause into ops. */
function clause(text: string): Op[] {
  const s = text.trim();
  const sl = s.toLowerCase();
  if (!s) return [];
  const c = coord(s) ?? [0, 0];
  const n = nums(s);

  // clear
  if (has(s, "전체 삭제", "모두 삭제", "다 지워", "초기화", "비우") || /\bclear\b/.test(sl))
    return [{ op: "clear" }];

  // system templates (learned diagrams)
  if (has(s, "발라스트", "밸러스트", "평형수") || /ballast/i.test(s)) return buildBallastSystem();

  // layer
  const layerM = s.match(/레이어\s*([A-Za-z0-9_가-힣]+)/);
  if (layerM) return [{ op: "set_layer", name: layerM[1], current: true }];

  // P&ID symbol (explicit)
  for (const [re, sym] of SYMBOL_WORDS) {
    if (re.test(s)) {
      const tagM = s.match(/[A-Z]{1,3}-?\d{1,3}/);
      return [
        {
          op: "add_symbol",
          symbol: sym,
          at: coord(s) ?? [0, 0],
          scale: n.find((x) => x > 0 && x < 5) && has(s, "배율", "scale") ? n[0] : 1.4,
          tag: tagM ? tagM[0] : undefined,
        },
      ];
    }
  }

  // pipe / signal
  if (has(s, "파이프", "배관") || /\bpipe\b/.test(sl)) {
    const pts: XY[] = [];
    const re = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) pts.push([Number(m[1]), Number(m[2])]);
    if (pts.length >= 2) return [{ op: "add_pipe", points: pts }];
    return [{ op: "add_pipe", points: [[0, 0], [10, 0]] }];
  }
  if (has(s, "신호", "signal")) {
    const re = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
    const pts: XY[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) pts.push([Number(m[1]), Number(m[2])]);
    if (pts.length >= 2) return [{ op: "add_signal", a: pts[0], b: pts[1] }];
  }

  // scenes
  if (has(s, "집", "주택", "house")) {
    return [
      { op: "add_polyline", points: [[-6, -5], [6, -5], [6, 3], [-6, 3]], closed: true },
      { op: "add_polyline", points: [[-7, 3], [0, 8], [7, 3]], closed: true, color: "#ff8a5c" },
      { op: "add_rectangle", corner: [-1.5, -5], width: 3, height: 4, color: "#ffd24d" },
    ];
  }
  if (has(s, "별", "star")) {
    const r = n[0] || 5;
    return [{ op: "add_polyline", points: star(5, 0, 0, r, r * 0.4), closed: true }];
  }
  // canned P&ID demo for broad requests ("P&ID", "공정도", "시스템", "엔진 룸")
  if (/p&?id/i.test(s) || has(s, "공정", "계통", "시스템", "배치도", "엔진 룸", "엔진룸")) {
    return [
      { op: "add_symbol", symbol: "tank", at: [-12, 0], scale: 1.6, tag: "T-1", layer: "equipment" },
      { op: "add_symbol", symbol: "strainer", at: [-5, 0], scale: 0.9, tag: "ST-1", layer: "equipment" },
      { op: "add_symbol", symbol: "pump", at: [0, 0], scale: 1, tag: "P-1", layer: "equipment" },
      { op: "add_symbol", symbol: "check_valve", at: [4, 0], scale: 0.9, tag: "CV-1", layer: "equipment" },
      { op: "add_symbol", symbol: "gate_valve", at: [8, 0], scale: 0.9, tag: "V-1", layer: "equipment" },
      { op: "add_symbol", symbol: "tank", at: [13, 0], scale: 1.6, tag: "T-2", layer: "equipment" },
      { op: "add_pipe", points: [[-10.5, 0], [11.5, 0]] },
      { op: "add_symbol", symbol: "instrument", at: [0, 5], scale: 1.1, tag: "PT1", layer: "instrument" },
      { op: "add_signal", a: [0, 4.4], b: [0, 0.5] },
    ];
  }

  // n-gon / polygon
  for (const [word, sides] of Object.entries(NGON)) {
    if (s.includes(word)) {
      const r = (has(s, "반지름", "radius", "r") && n.length ? n.find((x) => x > 0) : undefined) ?? n.find((x) => x > 0) ?? 4;
      // square via rectangle when "정사각형 한 변 N"
      if (sides === 4 && has(s, "한 변", "변", "side")) {
        const side = n.find((x) => x > 0) ?? 4;
        return [{ op: "add_rectangle", corner: [-side / 2, -side / 2], width: side, height: side }];
      }
      return [{ op: "add_polyline", points: polygon(sides, c[0], c[1], r), closed: true }];
    }
  }
  if (/(\d+)\s*각형/.test(s)) {
    const sides = Number(RegExp.$1);
    const r = n.find((x) => x !== sides && x > 0) ?? 4;
    if (sides >= 3) return [{ op: "add_polyline", points: polygon(sides, c[0], c[1], r), closed: true }];
  }

  // circle
  if (has(s, "원", "circle", "동그라")) {
    const r = (has(s, "반지름", "radius") ? n.find((x) => x > 0) : undefined) ?? n.find((x) => x > 0) ?? 3;
    return [{ op: "add_circle", center: coord(s) ?? [0, 0], radius: r }];
  }

  // ellipse
  if (has(s, "타원", "ellipse")) {
    const [w, h] = [n[0] ?? 6, n[1] ?? 3];
    return [{ op: "add_ellipse", center: coord(s) ?? [0, 0], rx: w / 2, ry: h / 2 }];
  }

  // rectangle
  if (has(s, "사각형", "직사각형", "rectangle", "rect", "박스", "box")) {
    const w = n[0] ?? 10;
    const h = n[1] ?? n[0] ?? 6;
    const at = coord(s) ?? [0, 0];
    return [{ op: "add_rectangle", corner: at, width: w, height: h }];
  }

  // arc
  if (has(s, "호", "arc")) {
    const r = n.find((x) => x > 0) ?? 3;
    return [{ op: "add_arc", center: coord(s) ?? [0, 0], radius: r, startAngle: n[1] ?? 0, endAngle: n[2] ?? 180 }];
  }

  // line
  if (has(s, "선", "line", "직선")) {
    const re = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
    const pts: XY[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) pts.push([Number(m[1]), Number(m[2])]);
    if (pts.length >= 2) return [{ op: "add_line", a: pts[0], b: pts[1] }];
    const len = n.find((x) => x > 0) ?? 10;
    return [{ op: "add_line", a: [0, 0], b: [len, 0] }];
  }

  // text
  const txtM = s.match(/["“']([^"”']+)["”']/);
  if (txtM || has(s, "문자", "텍스트", "글자", "text")) {
    const t = txtM ? txtM[1] : s.replace(/문자|텍스트|글자|text|쓰기|추가|넣어|써/gi, "").trim() || "TEXT";
    return [{ op: "add_text", at: coord(s) ?? [0, 0], text: t, height: n.find((x) => x > 0) ?? 1 }];
  }

  // point
  if (has(s, "점", "point")) return [{ op: "add_point", at: coord(s) ?? [0, 0] }];

  // dimension
  if (has(s, "치수", "dimension", "dim")) {
    const re = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
    const pts: XY[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) pts.push([Number(m[1]), Number(m[2])]);
    if (pts.length >= 2) return [{ op: "add_dimension", a: pts[0], b: pts[1] }];
  }

  // transforms (on current selection)
  if (has(s, "지우", "삭제", "delete", "erase")) return [{ op: "delete", selector: "selected" }];
  if (has(s, "채우", "채움", "해치", "fill", "hatch"))
    return [{ op: "hatch", selector: "selected" }];
  if (has(s, "대칭", "mirror")) {
    // axis: Y축 -> x=0 vertical; X축 -> y=0 horizontal
    if (has(s, "y", "Y", "세로")) return [{ op: "mirror", selector: "selected", a: [0, 0], b: [0, 1], keepOriginal: true }];
    return [{ op: "mirror", selector: "selected", a: [0, 0], b: [1, 0], keepOriginal: true }];
  }
  if (has(s, "간격", "오프셋", "offset")) {
    const d = n.find((x) => x !== 0) ?? 1;
    return [{ op: "offset", selector: "selected", distance: has(s, "안", "inside", "안쪽") ? -Math.abs(d) : d }];
  }
  if (has(s, "원형 배열", "polar") || (has(s, "배열", "array") && has(s, "원"))) {
    const cnt = n.find((x) => x >= 2) ?? 6;
    return [{ op: "array_polar", selector: "selected", center: coord(s) ?? [0, 0], count: cnt, angle: 360 }];
  }
  if (has(s, "배열", "array", "격자", "grid")) {
    const rows = n[0] ?? 3;
    const cols = n[1] ?? n[0] ?? 3;
    const sp = n[2] ?? 2;
    return [{ op: "array_rect", selector: "selected", rows, cols, dx: sp, dy: sp }];
  }
  if (has(s, "회전", "rotate", "돌려")) {
    const ang = n.find((x) => x !== 0) ?? 90;
    return [{ op: "rotate", selector: "selected", origin: coord(s) ?? [0, 0], angle: ang }];
  }
  if (has(s, "축척", "scale", "확대", "축소", "크기")) {
    const f = n.find((x) => x > 0) ?? 2;
    return [{ op: "scale", selector: "selected", origin: coord(s) ?? [0, 0], factor: has(s, "축소") ? 1 / f : f }];
  }
  if (has(s, "복사", "copy")) {
    const dxy = directional(s, n);
    return [{ op: "copy", selector: "selected", delta: dxy, count: n.find((x) => x >= 2 && x < 50) ?? 1 }];
  }
  if (has(s, "이동", "move", "옮겨")) {
    return [{ op: "move", selector: "selected", delta: directional(s, n) }];
  }

  return [];
}

/** Resolve a directional phrase ("오른쪽으로 10") into a delta vector. */
function directional(s: string, n: number[]): XY {
  const d = n.find((x) => x !== 0) ?? 5;
  if (has(s, "오른", "right", "동")) return [Math.abs(d), 0];
  if (has(s, "왼", "left", "서")) return [-Math.abs(d), 0];
  if (has(s, "위", "up", "북")) return [0, Math.abs(d)];
  if (has(s, "아래", "down", "남")) return [0, -Math.abs(d)];
  const xy = coord(s);
  if (xy) return xy;
  return [d, 0];
}

export function interpretLocal(prompt: string): LocalResult {
  // Split compound sentences on connectors only. IMPORTANT: never split on a
  // bare comma — that would tear apart coordinate pairs like "3,2".
  const parts = prompt.split(/\s*(?:그리고|그 다음|그다음|그리고나서|;|→|and then| and )\s*/i).filter(Boolean);
  const ops: Op[] = [];
  for (const p of parts) ops.push(...clause(p));
  // de-dupe accidental empties
  return { ops, note: ops.length ? `로컬 해석: ${ops.length}개 연산` : "" };
}
