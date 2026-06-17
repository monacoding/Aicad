// Render the ballast water system P&ID template. Usage: tsx scripts/ballast.mts
import { CadDocument } from "../src/cad/document.ts";
import { applyOps } from "../src/cad/ops.ts";
import { buildBallastSystem } from "../src/cad/templates.ts";
import { compositeToFile } from "./render.mts";

const doc = new CadDocument();
const ops = buildBallastSystem();
const res = applyOps(doc, ops, { selection: new Set(), lastCreated: [] });
console.log(`ballast P&ID: ${ops.length} ops, ${doc.entities.length} entities, ${res.created.length} created`);

compositeToFile(doc, "scripts/out/ballast.png", {
  tool: "선택",
  note: '"발라스트 시스템 그려줘" → 해수흡입·펌프2대·BWTS(필터+UV)·밸러스트 메인·탱크 분기',
  cmd: "발라스트 시스템 그려줘",
  layers: [["0", "#e6e6e6"], ["process", "#7bd88f"], ["equipment", "#ffb454"], ["instrument", "#5cc8ff"]],
});
console.log("wrote scripts/out/ballast.png");
