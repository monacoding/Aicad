// Bill-of-materials extraction: scan the drawing's placed symbols and pipes and
// produce valve / pipe (line) / instrument / equipment lists, exportable as CSV.
import { CadDocument } from "./document";
import { Entity } from "./entities";
import { dist } from "./geometry";

const VALVE_KINDS = new Set([
  "gate_valve",
  "globe_valve",
  "check_valve",
  "ball_valve",
  "butterfly_valve",
  "control_valve",
]);

const KIND_LABEL: Record<string, string> = {
  gate_valve: "Gate Valve",
  globe_valve: "Globe Valve",
  check_valve: "Check Valve",
  ball_valve: "Ball Valve",
  butterfly_valve: "Butterfly Valve",
  control_valve: "Control Valve",
  pump: "Pump",
  motor: "Motor",
  vessel: "Vessel",
  tank: "Tank",
  heat_exchanger: "Heat Exchanger",
  strainer: "Strainer",
  reducer: "Reducer",
  flange: "Flange",
  arrow: "Flow Arrow",
  instrument: "Instrument",
};

export interface ValveRow {
  [k: string]: string | number;
  tag: string;
  type: string;
  size: string;
  service: string;
  layer: string;
}
export interface PipeRow {
  [k: string]: string | number;
  tag: string;
  size: string;
  service: string;
  layer: string;
  length: number;
}
export interface ItemRow {
  [k: string]: string | number;
  tag: string;
  type: string;
  service: string;
  layer: string;
}

/** Collapse a placed symbol (a group of entities) to one representative entity. */
function groups(doc: CadDocument): Entity[] {
  const seen = new Set<string>();
  const reps: Entity[] = [];
  for (const e of doc.entities) {
    if (!e.kind || e.kind === "pipe" || e.kind === "signal") continue;
    const key = e.group ?? e.id;
    if (seen.has(key)) continue;
    seen.add(key);
    reps.push(e);
  }
  return reps;
}

const label = (kind: string) => KIND_LABEL[kind] ?? kind;
const sortByTag = <T extends { tag: string }>(rows: T[]) =>
  rows.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

export function valveList(doc: CadDocument): ValveRow[] {
  const rows = groups(doc)
    .filter((e) => VALVE_KINDS.has(e.kind!))
    .map((e, i) => ({
      tag: e.tag || `V-${i + 1}`,
      type: label(e.kind!),
      size: e.size || "-",
      service: e.service || "-",
      layer: e.layer,
    }));
  return sortByTag(rows);
}

export function instrumentList(doc: CadDocument): ItemRow[] {
  const rows = groups(doc)
    .filter((e) => e.kind === "instrument")
    .map((e, i) => ({ tag: e.tag || `I-${i + 1}`, type: "Instrument", service: e.service || "-", layer: e.layer }));
  return sortByTag(rows);
}

export function equipmentList(doc: CadDocument): ItemRow[] {
  const exclude = new Set([...VALVE_KINDS, "instrument", "arrow", "flange", "reducer"]);
  const rows = groups(doc)
    .filter((e) => !exclude.has(e.kind!))
    .map((e, i) => ({ tag: e.tag || `E-${i + 1}`, type: label(e.kind!), service: e.service || "-", layer: e.layer }));
  return sortByTag(rows);
}

function polylineLength(e: Entity): number {
  if (e.type === "polyline") {
    let L = 0;
    for (let i = 0; i < e.points.length - 1; i++) L += dist(e.points[i], e.points[i + 1]);
    return L;
  }
  if (e.type === "line") return dist(e.a, e.b);
  return 0;
}

export function pipeList(doc: CadDocument): PipeRow[] {
  const rows = doc.entities
    .filter((e) => e.kind === "pipe")
    .map((e, i) => ({
      tag: e.tag || `LINE-${String(i + 1).padStart(3, "0")}`,
      size: e.size || "-",
      service: e.service || "-",
      layer: e.layer,
      length: Math.round(polylineLength(e) * 100) / 100,
    }));
  return rows.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
}

/** Serialize an array of row objects to CSV (RFC-4180-ish). */
export function toCSV<T extends Record<string, string | number>>(rows: T[], headers: (keyof T)[]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

export interface Bom {
  valves: ValveRow[];
  pipes: PipeRow[];
  instruments: ItemRow[];
  equipment: ItemRow[];
}

export function extractBom(doc: CadDocument): Bom {
  return {
    valves: valveList(doc),
    pipes: pipeList(doc),
    instruments: instrumentList(doc),
    equipment: equipmentList(doc),
  };
}
