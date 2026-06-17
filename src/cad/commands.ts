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
  "point",
  "text",
  "dimension",
  "move",
  "copy",
  "rotate",
  "scale",
  "erase",
];

const ALIASES: Record<string, ToolName> = {
  l: "line",
  pl: "polyline",
  rec: "rectangle",
  rect: "rectangle",
  c: "circle",
  a: "arc",
  pt: "point",
  t: "text",
  dim: "dimension",
  m: "move",
  co: "copy",
  cp: "copy",
  ro: "rotate",
  sc: "scale",
  e: "erase",
  s: "select",
};

/** Parse "x,y" or "x y" into [x, y]. */
function pt(tok: string): [number, number] | null {
  const m = tok.split(/[, ]+/).map(Number);
  if (m.length >= 2 && m.every((n) => Number.isFinite(n))) return [m[0], m[1]];
  return null;
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
        const a = pt(rest[0]);
        const b = pt(rest[1]);
        if (a && b) ops.push({ op: "add_line", a, b });
        else return startTool();
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
        const points = rest.map(pt).filter((p): p is [number, number] => !!p);
        if (points.length >= 2) ops.push({ op: "add_polyline", points });
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
      case "delete":
      case "erase":
      case "e":
        ops.push({ op: "delete", selector: "selected" });
        break;
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
