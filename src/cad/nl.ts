// Natural-language client. Sends the user's prompt + lightweight drawing
// context to the backend, which calls Claude and returns a validated Op[].
import { CadEngine } from "./engine";
import { Op } from "./ops";
import { Entity } from "./entities";
import { boundsValid, Vec2 } from "./geometry";

export interface NlResponse {
  ops: Op[];
  note?: string;
  error?: string;
}

function buildContext(engine: CadEngine) {
  const doc = engine.doc;
  const bb = doc.bounds();
  return {
    currentLayer: doc.currentLayer,
    layers: doc.layers.map((l) => l.name),
    entityCount: doc.entities.length,
    selectionCount: engine.selection.size,
    bounds: boundsValid(bb) ? { min: [bb.min.x, bb.min.y], max: [bb.max.x, bb.max.y] } : null,
    // a compact summary of existing entities so the model can reference them
    summary: doc.entities.slice(0, 40).map((e) => summarize(e)),
  };
}

function summarize(e: Entity): string {
  switch (e.type) {
    case "line":
      return `line ${fmt(e.a)}→${fmt(e.b)}`;
    case "circle":
      return `circle c=${fmt(e.center)} r=${e.radius}`;
    case "arc":
      return `arc c=${fmt(e.center)} r=${e.radius}`;
    case "ellipse":
      return `ellipse c=${fmt(e.center)} rx=${e.rx} ry=${e.ry}`;
    case "polyline":
      return `polyline ${e.points.length}pts${e.closed ? " closed" : ""}`;
    case "text":
      return `text "${e.text}" @${fmt(e.at)}`;
    case "point":
      return `point ${fmt(e.at)}`;
    case "dimension":
      return `dim ${fmt(e.a)}→${fmt(e.b)}`;
  }
}

function fmt(p: Vec2): string {
  return `(${round(p.x)},${round(p.y)})`;
}
const round = (n: number) => Math.round(n * 100) / 100;

export async function runNaturalLanguage(engine: CadEngine, prompt: string): Promise<NlResponse> {
  const res = await fetch("/api/nl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context: buildContext(engine) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ops: [], error: `서버 오류 (${res.status}): ${text.slice(0, 200)}` };
  }
  const data = (await res.json()) as NlResponse;
  if (data.error) return { ops: [], error: data.error };
  const ops = Array.isArray(data.ops) ? data.ops.filter(isValidOp) : [];
  return { ops, note: data.note };
}

const OP_NAMES = new Set([
  "add_line",
  "add_polyline",
  "add_rectangle",
  "add_circle",
  "add_arc",
  "add_ellipse",
  "add_point",
  "add_text",
  "add_dimension",
  "move",
  "copy",
  "rotate",
  "scale",
  "mirror",
  "offset",
  "array_rect",
  "array_polar",
  "hatch",
  "add_symbol",
  "add_pipe",
  "add_signal",
  "delete",
  "set_layer",
  "clear",
]);

function isValidOp(o: unknown): o is Op {
  return !!o && typeof o === "object" && OP_NAMES.has((o as { op?: string }).op ?? "");
}
