// AutoCAD-style text command parser. Drives the engine directly.
import { CadEngine, ToolName } from "./engine";
import { Op } from "./ops";

const TOOLS: ToolName[] = [
  "select",
  "line",
  "polyline",
  "rectangle",
  "circle",
  "arc",
  "ellipse",
  "point",
  "text",
  "dimension",
  "move",
  "copy",
  "rotate",
  "scale",
  "mirror",
  "offset",
  "fillet",
  "chamfer",
  "trim",
  "extend",
  "hatch",
  "measure",
  "erase",
];

const ALIASES: Record<string, ToolName> = {
  l: "line",
  pl: "polyline",
  rec: "rectangle",
  rect: "rectangle",
  c: "circle",
  a: "arc",
  el: "ellipse",
  pt: "point",
  t: "text",
  dim: "dimension",
  m: "move",
  co: "copy",
  cp: "copy",
  ro: "rotate",
  sc: "scale",
  mi: "mirror",
  o: "offset",
  f: "fillet",
  cha: "chamfer",
  tr: "trim",
  ex: "extend",
  h: "hatch",
  me: "measure",
  e: "erase",
  s: "select",
};

/**
 * Parse a coordinate token relative to `last`. Supports:
 *   "x,y"        absolute cartesian
 *   "@dx,dy"     relative cartesian (from last point)
 *   "d<a"        absolute polar (distance d, angle a° from origin)
 *   "@d<a"       relative polar (from last point)
 */
function parsePoint(tok: string, last: { x: number; y: number }): [number, number] | null {
  let rel = false;
  let s = tok;
  if (s.startsWith("@")) {
    rel = true;
    s = s.slice(1);
  }
  if (s.includes("<")) {
    const [d, a] = s.split("<").map(Number);
    if (!Number.isFinite(d) || !Number.isFinite(a)) return null;
    const base = rel ? last : { x: 0, y: 0 };
    const r = (a * Math.PI) / 180;
    return [base.x + d * Math.cos(r), base.y + d * Math.sin(r)];
  }
  const parts = s.split(",").map(Number);
  if (parts.length >= 2 && parts.every(Number.isFinite)) {
    return rel ? [last.x + parts[0], last.y + parts[1]] : [parts[0], parts[1]];
  }
  return null;
}

/** Single absolute/polar point (no relative context). */
function pt(tok: string): [number, number] | null {
  return parsePoint(tok, { x: 0, y: 0 });
}

/** Parse a sequence of points, threading each as the next "last" for @/polar. */
function parseSequence(toks: string[]): [number, number][] {
  const out: [number, number][] = [];
  let last = { x: 0, y: 0 };
  for (const tk of toks) {
    const p = parsePoint(tk, last);
    if (!p) break;
    out.push(p);
    last = { x: p[0], y: p[1] };
  }
  return out;
}

function tokenize(line: string): string[] {
  // split on whitespace but keep "x,y" pairs together
  return line.trim().split(/\s+/).filter(Boolean);
}

export interface CommandResult {
  ok: boolean;
  message: string;
}

export function runCommand(engine: CadEngine, raw: string): CommandResult {
  const line = raw.trim();
  if (!line) return { ok: true, message: "" };
  const toks = tokenize(line);
  const cmd = toks[0].toLowerCase();
  const rest = toks.slice(1);
  const ops: Op[] = [];

  const resolved = ALIASES[cmd] ?? (TOOLS.includes(cmd as ToolName) ? (cmd as ToolName) : null);

  try {
    switch (cmd) {
      case "zoom":
      case "z":
        engine.zoomFit();
        return { ok: true, message: "전체 보기" };
      case "undo":
      case "u":
        engine.undo();
        return { ok: true, message: "실행 취소" };
      case "redo":
        engine.redo();
        return { ok: true, message: "다시 실행" };
      case "clear":
        engine.applyOperations([{ op: "clear" }]);
        return { ok: true, message: "도면 초기화" };
      case "snap":
        engine.toggleSnap();
        return { ok: true, message: "스냅 토글" };
      case "grid":
        engine.toggleGrid();
        return { ok: true, message: "그리드 토글" };
    }

    switch (cmd) {
      case "line":
      case "l": {
        const seq = parseSequence(rest);
        if (seq.length >= 2) {
          for (let i = 0; i < seq.length - 1; i++) ops.push({ op: "add_line", a: seq[i], b: seq[i + 1] });
        } else return startTool();
        break;
      }
      case "circle":
      case "c": {
        const center = pt(rest[0]);
        const r = Number(rest[1]);
        if (center && Number.isFinite(r)) ops.push({ op: "add_circle", center, radius: r });
        else return startTool();
        break;
      }
      case "rect":
      case "rectangle":
      case "rec": {
        const a = pt(rest[0]);
        const b = pt(rest[1]);
        if (a && b)
          ops.push({
            op: "add_rectangle",
            corner: [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
            width: Math.abs(b[0] - a[0]),
            height: Math.abs(b[1] - a[1]),
          });
        else return startTool();
        break;
      }
      case "arc":
      case "a": {
        const center = pt(rest[0]);
        const r = Number(rest[1]);
        const s = Number(rest[2]);
        const e = Number(rest[3]);
        if (center && [r, s, e].every(Number.isFinite))
          ops.push({ op: "add_arc", center, radius: r, startAngle: s, endAngle: e });
        else return startTool();
        break;
      }
      case "polyline":
      case "pl": {
        const closed = rest[rest.length - 1]?.toLowerCase() === "close";
        const pointToks = closed ? rest.slice(0, -1) : rest;
        const points = parseSequence(pointToks);
        if (points.length >= 2) ops.push({ op: "add_polyline", points, closed });
        else return startTool();
        break;
      }
      case "point":
      case "pt": {
        const at = pt(rest[0]);
        if (at) ops.push({ op: "add_point", at });
        else return startTool();
        break;
      }
      case "text":
      case "t": {
        const at = pt(rest[0]);
        const h = Number(rest[1]);
        const txt = rest.slice(2).join(" ");
        if (at && txt) ops.push({ op: "add_text", at, height: Number.isFinite(h) ? h : 0.8, text: txt });
        else return startTool();
        break;
      }
      case "move":
      case "m": {
        const d = pt(rest[0]);
        if (d) ops.push({ op: "move", selector: "selected", delta: d });
        else return startTool();
        break;
      }
      case "copy":
      case "co":
      case "cp": {
        const d = pt(rest[0]);
        if (d) ops.push({ op: "copy", selector: "selected", delta: d });
        else return startTool();
        break;
      }
      case "rotate":
      case "ro": {
        const o = pt(rest[0]);
        const ang = Number(rest[1]);
        if (o && Number.isFinite(ang)) ops.push({ op: "rotate", selector: "selected", origin: o, angle: ang });
        else return startTool();
        break;
      }
      case "scale":
      case "sc": {
        const o = pt(rest[0]);
        const f = Number(rest[1]);
        if (o && Number.isFinite(f)) ops.push({ op: "scale", selector: "selected", origin: o, factor: f });
        else return startTool();
        break;
      }
      case "ellipse":
      case "el": {
        const center = pt(rest[0]);
        const rx = Number(rest[1]);
        const ry = Number(rest[2]);
        const rot = Number(rest[3]);
        if (center && Number.isFinite(rx) && Number.isFinite(ry))
          ops.push({ op: "add_ellipse", center, rx, ry, rotation: Number.isFinite(rot) ? rot : 0 });
        else return startTool();
        break;
      }
      case "mirror":
      case "mi": {
        const a = pt(rest[0]);
        const b = pt(rest[1]);
        if (a && b) ops.push({ op: "mirror", selector: "selected", a, b, keepOriginal: true });
        else return startTool();
        break;
      }
      case "offset":
      case "o": {
        const d = Number(rest[0]);
        if (Number.isFinite(d)) ops.push({ op: "offset", selector: "selected", distance: d });
        else return startTool();
        break;
      }
      case "arrayrect":
      case "ar": {
        const rows = Number(rest[0]);
        const cols = Number(rest[1]);
        const dx = Number(rest[2]);
        const dy = Number(rest[3]);
        if ([rows, cols, dx, dy].every(Number.isFinite))
          ops.push({ op: "array_rect", selector: "selected", rows, cols, dx, dy });
        else return { ok: false, message: "사용법: ARRAYRECT <행> <열> <dx> <dy>" };
        break;
      }
      case "arraypolar":
      case "ap": {
        const center = pt(rest[0]);
        const count = Number(rest[1]);
        const ang = Number(rest[2]);
        if (center && Number.isFinite(count))
          ops.push({ op: "array_polar", selector: "selected", center, count, angle: Number.isFinite(ang) ? ang : 360 });
        else return { ok: false, message: "사용법: ARRAYPOLAR <cx,cy> <개수> [각도]" };
        break;
      }
      case "fillet":
      case "f": {
        const r = Number(rest[0]);
        if (Number.isFinite(r)) engine.filletRadius = r;
        engine.setTool("fillet");
        return { ok: true, message: `모깎기 r=${engine.filletRadius} — 선 두 개를 클릭` };
      }
      case "chamfer":
      case "cha": {
        const d = Number(rest[0]);
        if (Number.isFinite(d)) engine.chamferDist = d;
        engine.setTool("chamfer");
        return { ok: true, message: `모따기 d=${engine.chamferDist} — 선 두 개를 클릭` };
      }
      case "hatch":
      case "h":
        if (engine.selection.size) {
          ops.push({ op: "hatch", selector: "selected" });
        } else {
          return startTool();
        }
        break;
      case "delete":
      case "erase":
      case "e":
        ops.push({ op: "delete", selector: "selected" });
        break;
      case "symbol":
      case "sym": {
        const name = rest[0];
        const at = pt(rest[1]);
        const scale = Number(rest[2]);
        const rot = Number(rest[3]);
        const tag = rest.slice(4).join(" ") || undefined;
        if (name && at)
          ops.push({
            op: "add_symbol",
            symbol: name,
            at,
            scale: Number.isFinite(scale) ? scale : 1,
            rotation: Number.isFinite(rot) ? rot : 0,
            tag,
          });
        else return { ok: false, message: "사용법: SYMBOL <이름> <x,y> [배율] [각도] [태그]" };
        break;
      }
      case "pipe": {
        const points = parseSequence(rest);
        if (points.length >= 2) ops.push({ op: "add_pipe", points });
        else return { ok: false, message: "사용법: PIPE x,y x,y ..." };
        break;
      }
      case "signal": {
        const a = pt(rest[0]);
        const b = pt(rest[1]);
        if (a && b) ops.push({ op: "add_signal", a, b });
        else return { ok: false, message: "사용법: SIGNAL <x,y> <x,y>" };
        break;
      }
      case "layer":
      case "la": {
        const name = rest[0];
        const color = rest.find((t) => t.startsWith("#"));
        if (name) ops.push({ op: "set_layer", name, color, current: true });
        else return { ok: false, message: "사용법: LAYER <이름> [#색상]" };
        break;
      }
      default:
        if (resolved) return startTool();
        return { ok: false, message: `알 수 없는 명령: ${cmd}` };
    }

    if (ops.length) {
      engine.applyOperations(ops);
      return { ok: true, message: `${cmd.toUpperCase()} 실행` };
    }
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: `오류: ${(err as Error).message}` };
  }

  function startTool(): CommandResult {
    if (resolved) {
      engine.setTool(resolved);
      return { ok: true, message: `${resolved} 도구 — 화면에서 입력하세요` };
    }
    return { ok: false, message: `사용법 오류: ${cmd}` };
  }
}
