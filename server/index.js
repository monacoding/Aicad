// AiCAD backend: a thin proxy that turns natural language into CAD ops via
// Claude, keeping the API key server-side. The browser never sees the key.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { opSchema } from "./opSchema.js";

dotenv.config();

const PORT = process.env.PORT || 8787;
const MODEL = process.env.AICAD_MODEL || "claude-opus-4-8";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;
const BASE_URL = process.env.ANTHROPIC_BASE_URL; // optional local gateway/proxy
const CLAUDE_BIN = process.env.AICAD_CLAUDE_CLI || "claude"; // local Claude Code CLI
const FORCE_PROVIDER = process.env.AICAD_PROVIDER; // "api" | "cli" (else auto)

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" })); // images arrive as base64 data URLs

const clientOpts = {};
if (API_KEY) clientOpts.apiKey = API_KEY;
else if (AUTH_TOKEN) clientOpts.authToken = AUTH_TOKEN;
if (BASE_URL) clientOpts.baseURL = BASE_URL;
const client = API_KEY || AUTH_TOKEN ? new Anthropic(clientOpts) : null;

// Detect a locally-installed Claude Code CLI (uses the user's login/subscription
// — no API key needed). Lets the NL feature work via `claude -p` headless mode.
function detectCli() {
  try {
    const r = spawnSync(CLAUDE_BIN, ["--version"], { timeout: 5000, encoding: "utf8" });
    return r.status === 0 ? (r.stdout || "").trim() : null;
  } catch {
    return null;
  }
}
const CLI_VERSION = detectCli();
const CLI_AVAILABLE = !!CLI_VERSION;

/** Resolve which backend to use: explicit override, else API key, else CLI. */
function provider() {
  if (FORCE_PROVIDER === "api") return client ? "api" : "none";
  if (FORCE_PROVIDER === "cli") return CLI_AVAILABLE ? "cli" : "none";
  if (client) return "api";
  if (CLI_AVAILABLE) return "cli";
  return "none";
}

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
  const p = provider();
  res.json({
    ok: true,
    model: MODEL,
    provider: p, // "api" | "cli" | "none"
    configured: p !== "none",
    cli: CLI_AVAILABLE ? CLI_VERSION : null,
    auth: API_KEY ? "api_key" : AUTH_TOKEN ? "auth_token" : "none",
    baseURL: BASE_URL ?? "https://api.anthropic.com",
  });
});

/** Low-level: run the local Claude Code CLI headlessly, return its text result. */
function runCli(args, stdin, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const killer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(killer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(killer);
      if (code !== 0) return reject(new Error(`claude CLI exited ${code}: ${err.slice(0, 300)}`));
      let text = out;
      try {
        const env = JSON.parse(out);
        if (env && typeof env === "object") {
          if (env.is_error) return reject(new Error(String(env.result || "claude CLI error")));
          if (typeof env.result === "string") text = env.result;
        }
      } catch {
        /* not a JSON envelope — use raw stdout */
      }
      resolve(text);
    });
    if (stdin != null) child.stdin.write(stdin);
    child.stdin.end();
  });
}

/** NL via CLI: no tools needed, single turn. */
async function callCli(userContent) {
  const sys = SYSTEM_PROMPT + "\n\nRespond with ONLY the JSON object — no prose, no code fences.";
  const args = [
    "-p", "--output-format", "json", "--model", MODEL,
    "--append-system-prompt", sys, "--max-turns", "1",
    "--disallowed-tools", "Bash Edit Write Read WebSearch WebFetch",
  ];
  return { mode: "cli", text: await runCli(args, userContent) };
}

/** Dispatch to the active provider (API key SDK or local CLI). */
async function generate(userContent) {
  const p = provider();
  if (p === "api") return callClaude(userContent);
  if (p === "cli") return callCli(userContent);
  throw Object.assign(new Error("no provider"), { noProvider: true });
}

const IMAGE_SYSTEM =
  SYSTEM_PROMPT +
  `\n\nThe user provides an IMAGE of a drawing, sketch, or diagram. Reproduce it as
faithfully as possible using the op vocabulary: trace each line / rectangle /
circle / arc / polyline, use add_symbol for recognizable P&ID components
(valves, pumps, tanks, heat exchangers, instruments), add_text for visible
labels, and add_dimension where dimensions are shown. Preserve relative
positions and proportions; scale the whole drawing to roughly fit a ~40-unit
canvas centered near the origin. Output ONLY the JSON object.`;

/** Parse a data URL "data:image/png;base64,..." into {mediaType, base64}. */
function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) return null;
  return { mediaType: m[1], base64: m[2] };
}

/** Image -> ops via the API (vision content block). */
async function imageViaApi(mediaType, base64, userText) {
  const content = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    { type: "text", text: userText },
  ];
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: opSchema } },
      system: IMAGE_SYSTEM,
      messages: [{ role: "user", content }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw Object.assign(new Error("refusal"), { refusal: true });
    return { mode: "api", text: textFrom(message) };
  } catch (err) {
    if (err?.refusal) throw err;
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: IMAGE_SYSTEM + "\n\nRespond with ONLY the JSON object.",
      messages: [{ role: "user", content }],
    });
    return { mode: "api", text: textFrom(message) };
  }
}

/** Image -> ops via the local CLI (writes a temp file, reads it with the Read tool). */
async function imageViaCli(mediaType, base64, userText) {
  const dir = mkdtempSync(join(tmpdir(), "aicad-img-"));
  const ext = mediaType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const file = join(dir, `paste.${ext}`);
  writeFileSync(file, Buffer.from(base64, "base64"));
  try {
    const args = [
      "-p", "--output-format", "json", "--model", MODEL,
      "--append-system-prompt", IMAGE_SYSTEM,
      "--allowed-tools", "Read", "--add-dir", dir, "--max-turns", "4",
    ];
    const prompt = `Read the image file at ${file} and reproduce the drawing as ops JSON.\n${userText}`;
    const text = await runCli(args, prompt, 240000);
    return { mode: "cli", text };
  } finally {
    try {
      unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

async function generateFromImage(dataUrl, context) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("이미지 형식을 인식하지 못했습니다 (PNG/JPEG 데이터 URL 필요).");
  const userText = `현재 도면 컨텍스트(JSON): ${JSON.stringify(context ?? {}, null, 0)}\nOutput ONLY the JSON object.`;
  const p = provider();
  if (p === "api") return imageViaApi(parsed.mediaType, parsed.base64, userText);
  if (p === "cli") return imageViaCli(parsed.mediaType, parsed.base64, userText);
  throw Object.assign(new Error("no provider"), { noProvider: true });
}

function textFrom(message) {
  const block = message.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "";
}

/** Strip ```json fences and parse the first JSON object in the text. */
function parseOps(text) {
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("no JSON found");
  }
}

// Primary call uses structured output + adaptive thinking. If the account/model
// rejects those features, fall back to a plain prompt that asks for JSON only.
async function callClaude(userContent) {
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: opSchema } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw Object.assign(new Error("refusal"), { refusal: true });
    return { mode: "structured", text: textFrom(message) };
  } catch (err) {
    if (err?.refusal) throw err;
    // retry without structured output / thinking for maximum compatibility
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT + "\n\nRespond with ONLY the JSON object, no prose, no code fences.",
      messages: [{ role: "user", content: userContent }],
    });
    return { mode: "compat", text: textFrom(message) };
  }
}

app.post("/api/nl", async (req, res) => {
  const { prompt, context } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ ops: [], error: "프롬프트가 비어 있습니다." });
  }
  if (provider() === "none") {
    return res.json({
      ops: [],
      error: "Claude 백엔드가 없습니다. 로컬 Claude CLI 로그인(claude) 또는 .env의 ANTHROPIC_API_KEY가 필요합니다.",
    });
  }

  const userContent =
    `현재 도면 컨텍스트(JSON):\n${JSON.stringify(context ?? {}, null, 0)}\n\n사용자 요청:\n${prompt}`;

  try {
    const { mode, text } = await generate(userContent);
    if (!text) return res.json({ ops: [], error: "모델이 빈 응답을 반환했습니다." });
    let parsed;
    try {
      parsed = parseOps(text);
    } catch {
      return res.json({ ops: [], error: "응답 JSON 파싱에 실패했습니다." });
    }
    return res.json({ ops: parsed.ops ?? [], note: parsed.note, mode });
  } catch (err) {
    if (err?.refusal) return res.json({ ops: [], error: "요청이 정책에 의해 거부되었습니다." });
    console.error("NL error:", err);
    const status = err?.status ?? 500;
    return res.status(500).json({ ops: [], error: `모델 호출 오류 (${status}): ${err?.message ?? err}` });
  }
});

app.post("/api/image", async (req, res) => {
  const { image, context } = req.body ?? {};
  if (!image || typeof image !== "string") {
    return res.status(400).json({ ops: [], error: "이미지 데이터가 없습니다." });
  }
  if (provider() === "none") {
    return res.json({
      ops: [],
      error: "이미지 인식은 Claude 백엔드가 필요합니다 (로컬 claude CLI 로그인 또는 ANTHROPIC_API_KEY).",
    });
  }
  try {
    const { mode, text } = await generateFromImage(image, context);
    if (!text) return res.json({ ops: [], error: "모델이 빈 응답을 반환했습니다." });
    let parsed;
    try {
      parsed = parseOps(text);
    } catch {
      return res.json({ ops: [], error: "이미지 응답 JSON 파싱에 실패했습니다." });
    }
    return res.json({ ops: parsed.ops ?? [], note: parsed.note, mode });
  } catch (err) {
    if (err?.refusal) return res.json({ ops: [], error: "요청이 정책에 의해 거부되었습니다." });
    console.error("image error:", err);
    return res.status(500).json({ ops: [], error: `이미지 인식 오류: ${err?.message ?? err}` });
  }
});

app.listen(PORT, () => {
  console.log(
    `AiCAD API on :${PORT}  model=${MODEL}  provider=${provider()}  cli=${CLI_VERSION ?? "none"}  baseURL=${BASE_URL ?? "default"}`,
  );
});
