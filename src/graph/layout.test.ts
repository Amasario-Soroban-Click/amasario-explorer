import { describe, expect, it } from "vitest";

import { layoutGraph, LAYER_STEP, MARGIN, ROW_STEP } from "./layout.js";

function layersOf(layout: ReturnType<typeof layoutGraph>): Record<string, number> {
  return Object.fromEntries(layout.nodes.map((node) => [node.id, node.layer]));
}

describe("layoutGraph", () => {
  it("gives every entity its own layer in a chain", () => {
    const layout = layoutGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    );
    expect(layersOf(layout)).toEqual({ a: 0, b: 1, c: 2 });
    expect(layout.layers).toBe(3);
  });

  it("puts the deepest path in charge when a node is reachable two ways", () => {
    // `d` is one hop from `a` and two from the chain, and the longer route decides the
    // layer. A shortest-path layering would draw the long edge as a forward arrow across
    // a column it should have been pushed past.
    const layout = layoutGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
        { source: "a", target: "d" },
      ],
    );
    expect(layersOf(layout)).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });

  it("produces the same picture when the input arrays are reordered", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
      { source: "c", target: "d" },
    ];

    const first = layoutGraph(nodes, edges);
    const second = layoutGraph(
      [...nodes].reverse(),
      [...edges].reverse(),
    );

    expect(second).toEqual(first);
  });

  it("terminates on a cycle and keeps every layer inside the bound", () => {
    const layout = layoutGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
      ],
    );
    expect(layout.nodes).toHaveLength(3);
    for (const node of layout.nodes) {
      expect(node.layer).toBeGreaterThanOrEqual(0);
      expect(node.layer).toBeLessThan(3);
    }
  });

  it("places a disconnected node without inventing an edge for it", () => {
    const layout = layoutGraph(
      [{ id: "a" }, { id: "b" }, { id: "island" }],
      [{ source: "a", target: "b" }],
    );
    expect(layersOf(layout)).toEqual({ a: 0, b: 1, island: 0 });
    expect(layout.nodes).toHaveLength(3);
  });

  it("ignores an edge whose endpoint is not a node, rather than throwing", () => {
    // A dangling edge is a malformed document, and `parseGraphDocument` is where that is
    // refused. The layout must still be total, because it is also used for the two-node
    // call graph built here from records rather than from a document.
    const layout = layoutGraph(
      [{ id: "a" }],
      [{ source: "a", target: "ghost" }],
    );
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]?.layer).toBe(0);
  });

  it("reports the box the drawing needs", () => {
    const layout = layoutGraph(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
    );
    expect(layout.width).toBe(MARGIN * 2 + LAYER_STEP);
    expect(layout.height).toBe(MARGIN * 2);
  });

  it("returns an empty layout for an empty graph rather than an error", () => {
    const layout = layoutGraph([], []);
    expect(layout.nodes).toEqual([]);
    expect(layout.layers).toBe(0);
    expect(layout.height).toBe(MARGIN * 2);
  });

  it("orders nodes within a layer by identifier, not by insertion", () => {
    const layout = layoutGraph(
      [{ id: "z" }, { id: "a" }, { id: "m" }],
      [],
    );
    const rows = layout.nodes
      .slice()
      .sort((left, right) => left.x - right.x || left.y - right.y)
      .map((node) => node.id);
    expect(rows).toEqual(["a", "m", "z"]);
    expect(layout.height).toBe(MARGIN * 2 + 2 * ROW_STEP);
  });

  it("de-duplicates a node listed twice", () => {
    const layout = layoutGraph([{ id: "a" }, { id: "a" }], []);
    expect(layout.nodes).toHaveLength(1);
  });
});
