// JSON Schema for the natural-language -> CAD op list. Kept in sync with
// src/cad/ops.ts (the TypeScript Op union). Used as a structured-output format
// so Claude returns strictly-shaped JSON we can apply directly.

const XY = { type: "array", items: { type: "number" }, description: "[x, y] in world units" };

const withLayer = (props) => ({
  ...props,
  layer: { type: "string", description: "target layer name (optional)" },
  color: { type: "string", description: "hex color override like #ff8800 (optional)" },
});

const selector = {
  type: "string",
  enum: ["all", "selected", "last"],
  description: "which entities to act on; defaults to 'selected'",
};

function variant(op, required, properties) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...required],
    properties: { op: { const: op }, ...properties },
  };
}

const variants = [
  variant("add_line", ["a", "b"], withLayer({ op: {}, a: XY, b: XY })),
  variant("add_polyline", ["points"], withLayer({
    op: {},
    points: { type: "array", items: XY },
    closed: { type: "boolean" },
  })),
  variant("add_rectangle", ["corner", "width", "height"], withLayer({
    op: {},
    corner: XY,
    width: { type: "number" },
    height: { type: "number" },
  })),
  variant("add_circle", ["center", "radius"], withLayer({ op: {}, center: XY, radius: { type: "number" } })),
  variant("add_arc", ["center", "radius", "startAngle", "endAngle"], withLayer({
    op: {},
    center: XY,
    radius: { type: "number" },
    startAngle: { type: "number", description: "degrees, CCW from +X" },
    endAngle: { type: "number", description: "degrees, CCW from +X" },
  })),
  variant("add_point", ["at"], withLayer({ op: {}, at: XY })),
  variant("add_text", ["at", "text"], withLayer({
    op: {},
    at: XY,
    text: { type: "string" },
    height: { type: "number" },
    rotation: { type: "number", description: "degrees" },
  })),
  variant("add_dimension", ["a", "b"], {
    op: {},
    a: XY,
    b: XY,
    offset: { type: "number" },
    layer: { type: "string" },
  }),
  variant("move", ["delta"], { op: {}, selector, delta: XY }),
  variant("copy", ["delta"], { op: {}, selector, delta: XY, count: { type: "number" } }),
  variant("rotate", ["origin", "angle"], { op: {}, selector, origin: XY, angle: { type: "number", description: "degrees" } }),
  variant("scale", ["origin", "factor"], { op: {}, selector, origin: XY, factor: { type: "number" } }),
  variant("delete", [], { op: {}, selector }),
  variant("set_layer", ["name"], {
    op: {},
    name: { type: "string" },
    color: { type: "string" },
    visible: { type: "boolean" },
    current: { type: "boolean" },
  }),
  variant("clear", [], { op: {} }),
];

// each variant's `op` const must be set explicitly (the spread above left it {})
const opConsts = [
  "add_line",
  "add_polyline",
  "add_rectangle",
  "add_circle",
  "add_arc",
  "add_point",
  "add_text",
  "add_dimension",
  "move",
  "copy",
  "rotate",
  "scale",
  "delete",
  "set_layer",
  "clear",
];
variants.forEach((vrt, i) => {
  vrt.properties.op = { const: opConsts[i] };
});

export const opSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ops"],
  properties: {
    note: { type: "string", description: "short explanation in the user's language" },
    ops: { type: "array", items: { anyOf: variants } },
  },
};
