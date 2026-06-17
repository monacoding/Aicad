// Natural-language test harness: feed ~100 prompts through the interpreter,
// apply the resulting ops, and validate the pipeline. Offline by default
// (local interpreter); pass --live to hit a running server's /api/nl (Claude).
//   tsx scripts/nltest.mts            # offline, local interpreter
//   tsx scripts/nltest.mts --live     # requires server on :8787 + API key
import { CadDocument } from "../src/cad/document.ts";
import { applyOps, type Op } from "../src/cad/ops.ts";
import { interpretLocal } from "../src/cad/nlLocal.ts";
import { entityBounds, type Entity } from "../src/cad/entities.ts";
import { boundsValid } from "../src/cad/geometry.ts";
import { compositeToFile } from "./render.mts";

const PROMPTS: string[] = [
  // shapes
  "반지름 5 원", "중심 3,2 반지름 4 원", "가로 10 세로 6 사각형", "한 변 8 정사각형",
  "정삼각형 반지름 5", "정오각형 반지름 4", "정육각형 반지름 6", "팔각형 반지름 5",
  "12각형 반지름 4", "타원 가로 8 세로 4", "선 0,0 에서 10,5", "길이 12 선",
  "호 반지름 5 0 270", "점 2,3", '문자 "AiCAD" 1.5', "별 반지름 6", "집 그려줘",
  "동그라미 반지름 2", "박스 4 4", "직사각형 20 10 위치 -5,-5", "정사각형 한 변 5",
  "선 -10,0 에서 10,0", "오각형 반지름 3", "삼각형 반지름 4", '텍스트 "PUMP-101"',
  // dimensions
  "치수 0,0 에서 10,0", "치수선 -5,0 5,0", "치수 0,0 0,8",
  // transforms (act on seeded selection)
  "오른쪽으로 10 이동", "왼쪽으로 5 이동", "위로 8 옮겨", "아래로 4 이동",
  "선택한 것 90도 회전", "45도 회전", "2배 확대", "절반으로 축소",
  "Y축 대칭", "X축 대칭", "바깥으로 1 간격띄우기", "안쪽으로 0.5 오프셋",
  "3행 4열 배열 간격 2", "격자 5 5 간격 1.5", "원형 배열 8개", "원형 배열 6개",
  "오른쪽으로 5 복사", "위로 3 복사", "채우기", "해치", "선택 삭제",
  "30도 회전", "3배 확대", "왼쪽으로 12 복사",
  // layers
  "레이어 walls", "레이어 piping", "레이어 instrument",
  // P&ID symbols
  "펌프", "게이트 밸브", "체크 밸브", "볼 밸브", "버터플라이 밸브", "제어 밸브 5,0",
  "글로브 밸브", "탱크", "베셀", "열교환기", "계기 FT-101", "스트레이너", "리듀서",
  "플랜지", "모터", "화살표", "펌프 P-201", "밸브 V-12", "나비 밸브 3,0",
  "여과기", "게이지 PT-205",
  // P&ID lines
  "파이프 0,0 10,0", "배관 -10,0 0,0 0,5", "신호 5,5 5,0", "파이프 0,0 8,0 8,4 16,4",
  // composite / scenes
  "반지름 5 원 그리고 가로 4 세로 4 사각형", "펌프 그리고 게이트 밸브",
  "정육각형 반지름 4 그리고 채우기", "별 반지름 6 그리고 2배 확대",
  "선 0,0 10,0 그리고 위로 5 복사", "탱크 -10,0 그리고 펌프 0,0 그리고 파이프 -10,0 0,0",
  "원 반지름 3 그리고 원형 배열 6개", "사각형 8 8 그리고 안쪽으로 1 간격띄우기",
  "집 그려줘 그리고 오른쪽으로 15 복사", "정오각형 반지름 5 그리고 채우기",
  // varied phrasings / numbers in words-ish
  "큰 원 반지름 12", "작은 사각형 2 2", "수평선 길이 20", "반지름 7 원을 5,5 에 그려줘",
  "가로 15 세로 3 직사각형", "삼각형 반지름 6 채우기", "원 반지름 4 위로 10 복사",
  "펌프 0,0 배율 2", "체크 밸브 -5,0 회전 90", "계기 LT-300 0,6",
  // edge cases (some intentionally vague to measure unhandled rate)
  "멋지게 그려줘", "아무거나", "복잡한 도면", "엔진 룸 배치도", "P&ID 전체 시스템",
  "원", "사각형", "선", "정십각형 반지름 5", "치수 추가",
];

interface Sample {
  i: number;
  prompt: string;
}

async function getOps(prompt: string, live: boolean): Promise<Op[]> {
  if (live) {
    const res = await fetch("http://localhost:8787/api/nl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context: {} }),
    });
    const data = await res.json();
    return Array.isArray(data.ops) ? data.ops : [];
  }
  return interpretLocal(prompt).ops;
}

function entityPoints(e: Entity): { x: number; y: number }[] {
  switch (e.type) {
    case "line":
      return [e.a, e.b];
    case "polyline":
      return e.points;
    case "circle":
    case "arc":
    case "ellipse":
      return [e.center];
    case "point":
    case "text":
      return [e.at];
    case "dimension":
      return [e.a, e.b];
  }
}

const MODIFY = new Set(["move", "copy", "rotate", "scale", "mirror", "offset", "array_rect", "array_polar", "hatch", "delete"]);

async function main() {
  const live = process.argv.includes("--live");
  const opCount: Record<string, number> = {};
  const unhandled: string[] = [];
  let nan = 0;
  let applied = 0;
  const t0 = Date.now();

  // a few clean draw-only prompts to render as samples
  const sampleIdx = new Set([0, 1, 6, 15, 16, 55, 79, 84, 104]);
  const samples: Sample[] = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    let ops: Op[] = [];
    try {
      ops = await getOps(prompt, live);
    } catch (err) {
      console.error(`[${i}] "${prompt}" error:`, (err as Error).message);
    }
    if (ops.length === 0) {
      unhandled.push(prompt);
      continue;
    }
    for (const op of ops) opCount[op.op] = (opCount[op.op] ?? 0) + 1;

    // seed a base shape + selection if any op is a modify op
    const doc = new CadDocument();
    const seedSel: string[] = [];
    if (ops.some((o) => MODIFY.has(o.op))) {
      const seed = applyOps(
        doc,
        [
          { op: "add_rectangle", corner: [-3, -3], width: 6, height: 6 },
          { op: "add_circle", center: [0, 0], radius: 2 },
        ],
        { selection: new Set(), lastCreated: [] },
      );
      seedSel.push(...seed.created);
    }
    applyOps(doc, ops, { selection: new Set(seedSel), lastCreated: seedSel });
    applied++;

    let bad = false;
    for (const e of doc.entities) for (const p of entityPoints(e)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) bad = true;
    if (bad) {
      nan++;
      console.error(`[${i}] "${prompt}" produced NaN`);
    }
    void boundsValid(doc.bounds());
    void entityBounds;

    if (sampleIdx.has(i)) {
      const sdoc = new CadDocument();
      applyOps(sdoc, interpretLocal(prompt).ops, { selection: new Set(), lastCreated: [] });
      compositeToFile(sdoc, `scripts/out/nl_${i}.png`, {
        tool: "선택",
        note: `"${prompt}"  →  ${ops.length}개 연산`,
        cmd: prompt,
      });
      samples.push({ i, prompt });
    }
  }

  const dt = Date.now() - t0;
  console.log(`\n=== NL test (${live ? "LIVE Claude" : "offline interpreter"}) — ${PROMPTS.length} prompts in ${dt} ms ===`);
  console.log(`handled: ${PROMPTS.length - unhandled.length}/${PROMPTS.length}  (${unhandled.length} unhandled)  applied:${applied}  NaN:${nan}`);
  console.log("op coverage:", JSON.stringify(opCount));
  console.log("unhandled:", unhandled.map((u) => `"${u}"`).join(", "));
  console.log("samples:", samples.map((s) => `#${s.i}`).join(", "));
}

main();
