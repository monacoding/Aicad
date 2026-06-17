// Drawing document: entities, layers, undo/redo, and change notification.
import { Entity, entityBounds } from "./entities";
import { Bounds, emptyBounds, growBounds, boundsValid } from "./geometry";

export interface Layer {
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

interface Snapshot {
  entities: Entity[];
  layers: Layer[];
  current: string;
}

export class CadDocument {
  entities: Entity[] = [];
  layers: Layer[] = [
    { name: "0", color: "#e6e6e6", visible: true, locked: false },
    { name: "dimensions", color: "#33cc99", visible: true, locked: false },
    { name: "construction", color: "#888888", visible: true, locked: false },
  ];
  currentLayer = "0";

  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    this.listeners.forEach((l) => l());
  }

  private snapshot(): Snapshot {
    return {
      entities: this.entities.map((e) => structuredClone(e)),
      layers: this.layers.map((l) => ({ ...l })),
      current: this.currentLayer,
    };
  }

  /** Wrap a mutation so it becomes a single undoable step. */
  transact(mut: () => void): void {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    mut();
    this.notify();
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.snapshot());
    this.restore(prev);
    this.notify();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.snapshot());
    this.restore(next);
    this.notify();
  }

  private restore(s: Snapshot): void {
    this.entities = s.entities.map((e) => structuredClone(e));
    this.layers = s.layers.map((l) => ({ ...l }));
    this.currentLayer = s.current;
  }

  add(...es: Entity[]): void {
    this.entities.push(...es);
  }

  remove(ids: Set<string>): void {
    this.entities = this.entities.filter((e) => !ids.has(e.id));
  }

  replace(id: string, e: Entity): void {
    const i = this.entities.findIndex((x) => x.id === id);
    if (i >= 0) this.entities[i] = e;
  }

  layer(name: string): Layer | undefined {
    return this.layers.find((l) => l.name === name);
  }

  ensureLayer(name: string, color = "#e6e6e6"): Layer {
    let l = this.layer(name);
    if (!l) {
      l = { name, color, visible: true, locked: false };
      this.layers.push(l);
    }
    return l;
  }

  colorOf(e: Entity): string {
    if (e.color) return e.color;
    return this.layer(e.layer)?.color ?? "#e6e6e6";
  }

  isVisible(e: Entity): boolean {
    return this.layer(e.layer)?.visible ?? true;
  }

  bounds(): Bounds {
    const bb = emptyBounds();
    for (const e of this.entities) {
      const eb = entityBounds(e);
      if (boundsValid(eb)) {
        growBounds(bb, eb.min);
        growBounds(bb, eb.max);
      }
    }
    return bb;
  }

  clear(): void {
    this.entities = [];
  }
}
