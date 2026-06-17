// JSON Schema for the natural-language -> CAD op list. Kept in sync with
// src/cad/ops.ts (the TypeScript Op union). Used as a structured-output format
// so Claude returns strictly-shaped JSON we can apply directly.

const XY = { type: "array", items: { type: "number" }, description: "[x, y] in world units" };

const layerProps = {
  layer: { type: "string", description: "target layer name (optional)" },
  color: { type: "string", description: "hex color override like #ff8800 (optional)" },
};

const selector = {
  type: "string",
  enum: ["all", "selected", "last"],
  description: "which entities to act on; defaults to 'selected'",
};

function variant(op, required, properties, withLayer = false) {
  const props = { op: { const: op }, ...properties };
  if (withLayer) Object.assign(props, layerProps);
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...required],
    properties: props,
  };
}

const variants = [
  variant("add_line", ["a", "b"], { a: XY, b: XY }, true),
  variant("add_polyline", ["points"], { points: { type: "array", items: XY }, closed: { type: "boolean" } }, true),
  variant("add_rectangle", ["corner", "width", "height"], { corner: XY, width: { type: "number" }, height: { type: "number" } }, true),
  variant("add_circle", ["center", "radius"], { center: XY, radius: { type: "number" } }, true),
  variant("add_arc", ["center", "radius", "startAngle", "endAngle"], {
    center: XY,
    radius: { type: "number" },
    startAngle: { type: "number", description: "degrees CCW from +X" },
    endAngle: { type: "number", description: "degrees CCW from +X" },
  }, true),
  variant("add_ellipse", ["center", "rx", "ry"], {
    center: XY,
    rx: { type: "number", description: "semi-major radius" },
    ry: { type: "number", description: "semi-minor radius" },
    rotation: { type: "number", description: "degrees" },
  }, true),
  variant("add_point", ["at"], { at: XY }, true),
  variant("add_text", ["at", "text"], {
    at: XY,
    text: { type: "string" },
    height: { type: "number" },
    rotation: { type: "number", description: "degrees" },
  }, true),
  variant("add_dimension", ["a", "b"], { a: XY, b: XY, offset: { type: "number" }, layer: { type: "string" } }),
  variant("move", ["delta"], { selector, delta: XY }),
  variant("copy", ["delta"], { selector, delta: XY, count: { type: "number" } }),
  variant("rotate", ["origin", "angle"], { selector, origin: XY, angle: { type: "number", description: "degrees" } }),
  variant("scale", ["origin", "factor"], { selector, origin: XY, factor: { type: "number" } }),
  variant("mirror", ["a", "b"], { selector, a: XY, b: XY, keepOriginal: { type: "boolean" } }),
  variant("offset", ["distance"], { selector, distance: { type: "number" } }),
  variant("array_rect", ["rows", "cols", "dx", "dy"], {
    selector,
    rows: { type: "number" },
    cols: { type: "number" },
    dx: { type: "number" },
    dy: { type: "number" },
  }),
  variant("array_polar", ["center", "count"], {
    selector,
    center: XY,
    count: { type: "number" },
    angle: { type: "number", description: "total sweep degrees, default 360" },
  }),
  variant("hatch", [], { selector, color: { type: "string" } }),
  variant("delete", [], { selector }),
  variant("set_layer", ["name"], {
    name: { type: "string" },
    color: { type: "string" },
    visible: { type: "boolean" },
    current: { type: "boolean" },
  }),
  variant("clear", [], {}),
];

export const opSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ops"],
  properties: {
    note: { type: "string", description: "short explanation in the user's language" },
    ops: { type: "array", items: { anyOf: variants } },
  },
};
