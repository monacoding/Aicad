// Minimal DXF (R12 ASCII) export/import — the interchange format LibreCAD/QCAD
// and AutoCAD read natively. Supports LINE, LWPOLYLINE, CIRCLE, ARC, POINT, TEXT.
import { CadDocument } from "./document";
import { Entity, newId } from "./entities";
import { Layer } from "./document";
import { deg, rad } from "./geometry";

function g(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

export function exportDXF(doc: CadDocument): string {
  let s = "";
  // header
  s += g(0, "SECTION") + g(2, "HEADER") + g(0, "ENDSEC");

  // tables: layers
  s += g(0, "SECTION") + g(2, "TABLES");
  s += g(0, "TABLE") + g(2, "LAYER") + g(70, doc.layers.length);
  for (const l of doc.layers) {
    s += g(0, "LAYER") + g(2, l.name) + g(70, l.locked ? 4 : 0) + g(62, aciFromHex(l.color)) + g(6, "CONTINUOUS");
  }
  s += g(0, "ENDTAB") + g(0, "ENDSEC");

  // entities
  s += g(0, "SECTION") + g(2, "ENTITIES");
  for (const e of doc.entities) s += entityToDXF(e);
  s += g(0, "ENDSEC");

  s += g(0, "EOF");
  return s;
}

function entityToDXF(e: Entity): string {
  const layer = e.layer || "0";
  switch (e.type) {
    case "line":
      return (
        g(0, "LINE") + g(8, layer) + g(10, e.a.x) + g(20, e.a.y) + g(30, 0) + g(11, e.b.x) + g(21, e.b.y) + g(31, 0)
      );
    case "polyline": {
      let s = g(0, "LWPOLYLINE") + g(8, layer) + g(90, e.points.length) + g(70, e.closed ? 1 : 0);
      for (const p of e.points) s += g(10, p.x) + g(20, p.y);
      return s;
    }
    case "circle":
      return g(0, "CIRCLE") + g(8, layer) + g(10, e.center.x) + g(20, e.center.y) + g(30, 0) + g(40, e.radius);
    case "arc":
      return (
        g(0, "ARC") +
        g(8, layer) +
        g(10, e.center.x) +
        g(20, e.center.y) +
        g(30, 0) +
        g(40, e.radius) +
        g(50, deg(e.startAngle)) +
        g(51, deg(e.endAngle))
      );
    case "point":
      return g(0, "POINT") + g(8, layer) + g(10, e.at.x) + g(20, e.at.y) + g(30, 0);
    case "text":
      return (
        g(0, "TEXT") +
        g(8, layer) +
        g(10, e.at.x) +
        g(20, e.at.y) +
        g(30, 0) +
        g(40, e.height) +
        g(50, deg(e.rotation)) +
        g(1, e.text)
      );
    case "dimension":
      // export the measured segment as a LINE on its layer (portable fallback)
      return g(0, "LINE") + g(8, layer) + g(10, e.a.x) + g(20, e.a.y) + g(30, 0) + g(11, e.b.x) + g(21, e.b.y) + g(31, 0);
  }
}

// --- import ----------------------------------------------------------------

interface Pair {
  code: number;
  value: string;
}

function parsePairs(text: string): Pair[] {
  const lines = text.split(/\r?\n/);
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    if (Number.isNaN(code)) continue;
    pairs.push({ code, value: lines[i + 1] });
  }
  return pairs;
}

export interface ImportResult {
  entities: Entity[];
  layers: Layer[];
}

export function importDXF(text: string): ImportResult {
  const pairs = parsePairs(text);
  const entities: Entity[] = [];
  const layers: Layer[] = [];
  let i = 0;

  // find ENTITIES section
  while (i < pairs.length && !(pairs[i].code === 2 && pairs[i].value.trim() === "ENTITIES")) {
    // collect layer table entries along the way
    if (pairs[i].code === 0 && pairs[i].value.trim() === "LAYER") {
      let j = i + 1;
      let name = "";
      let color = "#e6e6e6";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 2) name = pairs[j].value.trim();
        if (pairs[j].code === 62) color = hexFromAci(parseInt(pairs[j].value, 10));
        j++;
      }
      if (name) layers.push({ name, color, visible: true, locked: false });
    }
    i++;
  }
  i++; // skip the ENTITIES marker pair value index

  while (i < pairs.length) {
    if (pairs[i].code !== 0) {
      i++;
      continue;
    }
    const kind = pairs[i].value.trim();
    if (kind === "ENDSEC" || kind === "EOF") break;
    i++;
    const fields: Record<number, string[]> = {};
    while (i < pairs.length && pairs[i].code !== 0) {
      (fields[pairs[i].code] ??= []).push(pairs[i].value);
      i++;
    }
    const num = (code: number, idx = 0, def = 0) =>
      fields[code]?.[idx] !== undefined ? parseFloat(fields[code][idx]) : def;
    const layer = (fields[8]?.[0] ?? "0").trim();

    switch (kind) {
      case "LINE":
        entities.push({
          id: newId(),
          type: "line",
          layer,
          a: { x: num(10), y: num(20) },
          b: { x: num(11), y: num(21) },
        });
        break;
      case "CIRCLE":
        entities.push({ id: newId(), type: "circle", layer, center: { x: num(10), y: num(20) }, radius: num(40) });
        break;
      case "ARC":
        entities.push({
          id: newId(),
          type: "arc",
          layer,
          center: { x: num(10), y: num(20) },
          radius: num(40),
          startAngle: rad(num(50)),
          endAngle: rad(num(51)),
        });
        break;
      case "POINT":
        entities.push({ id: newId(), type: "point", layer, at: { x: num(10), y: num(20) } });
        break;
      case "TEXT":
        entities.push({
          id: newId(),
          type: "text",
          layer,
          at: { x: num(10), y: num(20) },
          height: num(40, 0, 1),
          rotation: rad(num(50)),
          text: (fields[1]?.[0] ?? "").trim(),
        });
        break;
      case "LWPOLYLINE":
      case "POLYLINE": {
        const xs = fields[10] ?? [];
        const ys = fields[20] ?? [];
        const points = xs.map((x, k) => ({ x: parseFloat(x), y: parseFloat(ys[k] ?? "0") }));
        const closed = (num(70) & 1) === 1;
        if (points.length >= 2) entities.push({ id: newId(), type: "polyline", layer, points, closed });
        break;
      }
    }
  }

  return { entities, layers };
}

// --- AutoCAD Color Index <-> hex (coarse mapping for common colors) --------

const ACI: Record<number, string> = {
  1: "#ff0000",
  2: "#ffff00",
  3: "#00ff00",
  4: "#00ffff",
  5: "#0000ff",
  6: "#ff00ff",
  7: "#ffffff",
  8: "#808080",
  9: "#c0c0c0",
};

function hexFromAci(aci: number): string {
  return ACI[aci] ?? "#e6e6e6";
}

function aciFromHex(hex: string): number {
  let best = 7;
  let bestD = Infinity;
  const target = hexToRgb(hex);
  for (const [k, v] of Object.entries(ACI)) {
    const c = hexToRgb(v);
    const d = (c.r - target.r) ** 2 + (c.g - target.g) ** 2 + (c.b - target.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = Number(k);
    }
  }
  return best;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}
