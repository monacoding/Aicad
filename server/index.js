// AiCAD backend: a thin proxy that turns natural language into CAD ops via
// Claude, keeping the API key server-side. The browser never sees the key.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { opSchema } from "./opSchema.js";

dotenv.config();

const PORT = process.env.PORT || 8787;
const MODEL = process.env.AICAD_MODEL || "claude-opus-4-8";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client =
  API_KEY || AUTH_TOKEN
    ? new Anthropic(API_KEY ? { apiKey: API_KEY } : { authToken: AUTH_TOKEN })
    : null;

const SYSTEM_PROMPT = `You are the drawing engine of AiCAD, a 2D CAD program. You translate a user's
natural-language request into a precise list of drawing operations.

Coordinate system:
- World units are abstract (treat them like millimeters or meters; be consistent).
- X increases to the right, Y increases UP. Angles are in DEGREES, measured counter-clockwise from +X.
- The origin (0,0) is a reasonable default anchor unless the drawing already has content.

You output a JSON object: { "ops": [ ... ], "note": "<one short sentence in the user's language>" }.
Each op is one of the documented shapes: add_line, add_polyline, add_rectangle, add_circle,
add_arc, add_ellipse, add_point, add_text, add_dimension, move, copy, rotate, scale, mirror,
offset, array_rect, array_polar, hatch (fill), delete, set_layer, clear.

Rules:
- Produce real, buildable geometry. Compute exact coordinates yourself — never leave placeholders.
- For closed shapes (rooms, plates, polygons) use add_polyline with closed:true, or add_rectangle.
- Approximate curves/fillets with add_arc; approximate freeform outlines with multi-point polylines.
- Respect the existing drawing: if the user says "next to", "inside", "twice as big", reason from
  the provided context (bounds, summary, current layer) and place geometry sensibly.
- Use move/copy/rotate/scale/delete with selector "selected" (default), "all", or "last" when the
  user refers to existing objects. Only use "clear" when they explicitly ask to erase everything.
- Group related geometry on sensible layers via set_layer when it helps (e.g. walls, dimensions).
- Keep the op list minimal but complete. Prefer parametric correctness over visual guessing.

Examples:
- "draw a 10x5 rectangle at the origin" -> add_rectangle corner [0,0] width 10 height 5.
- "circle radius 3 centered at 5,5" -> add_circle center [5,5] radius 3.
- "a hexagon with radius 4 at origin" -> add_polyline with 6 computed vertices, closed:true.
- "move everything 10 to the right" -> move selector "all" delta [10,0].
- "make a simple house" -> a closed polyline for walls + a polyline/triangle roof + a rectangle door.
- "mirror the selection across the Y axis" -> mirror a [0,0] b [0,1].
- "offset selected outward by 0.5" -> offset distance 0.5.
- "5x3 grid spaced 2 apart" -> array_rect rows 3 cols 5 dx 2 dy 2.
- "8 holes in a circle of radius 10" -> add_circle (hole) then array_polar center [0,0] count 8.
- "fill the selected shape" -> hatch with an optional color.
- "ellipse 6 wide 3 tall at origin" -> add_ellipse center [0,0] rx 3 ry 1.5.

P&ID / ship process diagrams:
- Use add_symbol for equipment and fittings. Symbols: gate_valve, globe_valve, check_valve,
  ball_valve, butterfly_valve, control_valve, pump, vessel, tank, heat_exchanger, instrument,
  reducer, flange, arrow, strainer, motor. Give each a tag (e.g. "P-201", "FT-101", "V-12").
- Symbols are ~1 unit; space equipment 4-8 units apart along a horizontal process header.
- Connect equipment with add_pipe (heavy solid polyline). Route orthogonally (right-angle bends).
- Use add_signal (dashed) from an instrument bubble to the device it measures/controls.
- rotation aligns a symbol to its pipe (0 = along +X). Put pumps/valves inline on the pipe.
- Example "fuel oil transfer P&ID": a tank (left) -> pipe -> strainer -> pump (with motor) ->
  check_valve -> gate_valve -> service tank (right); instrument bubbles (LT, PT, FT) with
  signal lines to a control_valve; tags on every item.
- Example "ballast system": sea chests (high/low) + sea valves -> strainer -> two ballast
  pumps in parallel (motor-driven) with discharge check_valves -> BWTS (a filter box then a
  UV reactor box) -> flow meter -> ballast main header -> branch butterfly_valves down to
  ballast tanks (FPT, double-bottom P/S, APT); add an overboard branch with a valve + arrow
  and pressure/flow/level instruments with signal lines.`;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, configured: !!client });
});

app.post("/api/nl", async (req, res) => {
  const { prompt, context } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ ops: [], error: "프롬프트가 비어 있습니다." });
  }
  if (!client) {
    return res.json({
      ops: [],
      error:
        "Claude API 키가 설정되지 않았습니다. 서버에 ANTHROPIC_API_KEY 환경변수를 설정한 뒤 다시 시도하세요.",
    });
  }

  const userContent =
    `현재 도면 컨텍스트(JSON):\n${JSON.stringify(context ?? {}, null, 0)}\n\n` +
    `사용자 요청:\n${prompt}`;

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: opSchema },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return res.json({ ops: [], error: "요청이 정책에 의해 거부되었습니다." });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || !("text" in textBlock)) {
      return res.json({ ops: [], error: "모델이 유효한 응답을 반환하지 않았습니다." });
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return res.json({ ops: [], error: "응답 JSON 파싱에 실패했습니다." });
    }

    return res.json({ ops: parsed.ops ?? [], note: parsed.note });
  } catch (err) {
    console.error("NL error:", err);
    const status = err?.status ?? 500;
    return res.status(500).json({ ops: [], error: `모델 호출 오류 (${status}): ${err?.message ?? err}` });
  }
});

app.listen(PORT, () => {
  console.log(`AiCAD API listening on :${PORT} (model: ${MODEL}, configured: ${!!client})`);
});
