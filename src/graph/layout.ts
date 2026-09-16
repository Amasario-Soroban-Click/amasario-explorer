/**
 * Laying out a dependency graph deterministically.
 *
 * # Why this is a pure function with no physics in it
 *
 * A force-directed layout produces a different picture on every render, which makes two
 * screenshots of the same graph incomparable and a regression impossible to see. Every
 * result this project produces is required to be reproducible from the same input, and a
 * viewer that reordered its own picture on every load would be the one place that
 * requirement was not met - so the layout is a pure function of the nodes and edges, and
 * it is tested as one.
 *
 * # The algorithm
 *
 * Longest-path layering: a node's layer is one more than the deepest layer among the
 * nodes that reach it. Relaxation rather than a topological sort, because the corpus
 * contains cycles by design (a graph document with a cycle is a case the engine has to
 * report rather than refuse), and a topological sort has nothing to say about one. The
 * relaxation is bounded by the node count, so a cycle stops rather than growing without
 * limit, and ties are broken by identifier so the answer does not depend on map ordering.
 */

/** The minimum of what a node has to provide: an identifier to sort by. */
export interface NodeLike {
  id: string;
}

/** The minimum of what an edge has to provide: the two endpoints. */
export interface EdgeLike {
  source: string;
  target: string;
}

/** A node with its computed position. */
export interface PositionedNode {
  id: string;
  layer: number;
  order: number;
  x: number;
  y: number;
}

/** A laid-out graph and the box it needs. */
export interface GraphLayout {
  nodes: PositionedNode[];
  width: number;
  height: number;
  layers: number;
  rows: number;
}

/** Horizontal distance between layers. */
export const LAYER_STEP = 260;

/** Vertical distance between nodes in the same layer. */
export const ROW_STEP = 104;

/** Space left around the drawing. */
export const MARGIN = 56;

/**
 * Places every node, and reports the box the result needs.
 *
 * A node range of zero produces an empty layout rather than an error: a graph with no
 * nodes is a valid document, and drawing nothing is the right answer to it.
 */
export function layoutGraph(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
): GraphLayout {
  if (nodes.length === 0) {
    return { nodes: [], width: MARGIN * 2, height: MARGIN * 2, layers: 0, rows: 0 };
  }

  // Canonical order first, so every later step can index into arrays and rely on the
  // order without sorting again. Sorting by identifier rather than by document order
  // means a reordered `nodes` array produces the same picture.
  const ids = [...new Set(nodes.map((node) => node.id))].sort();
  const position = new Map<string, number>(ids.map((id, at) => [id, at]));

  const endpoints = edges
    .map((edge) => ({
      from: position.get(edge.source),
      to: position.get(edge.target),
    }))
    .filter(
      (edge): edge is { from: number; to: number } =>
        edge.from !== undefined && edge.to !== undefined && edge.from !== edge.to,
    )
    .sort((left, right) => left.from - right.from || left.to - right.to);

  const layer = new Array<number>(ids.length).fill(0);

  // `ids.length` passes is enough to settle the longest path over any acyclic graph, and
  // is the bound that stops a cycle from relaxing forever.
  for (let pass = 0; pass < ids.length; pass += 1) {
    let changed = false;
    for (const edge of endpoints) {
      const candidate = (layer[edge.from] ?? 0) + 1;
      if (candidate > (layer[edge.to] ?? 0) && candidate < ids.length) {
        layer[edge.to] = candidate;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Group by layer, ordered by identifier within each one.
  const byLayer = new Map<number, string[]>();
  ids.forEach((id, at) => {
    const key = layer[at] ?? 0;
    const bucket = byLayer.get(key);
    if (bucket === undefined) byLayer.set(key, [id]);
    else bucket.push(id);
  });

  const layerKeys = [...byLayer.keys()].sort((left, right) => left - right);
  const layers = layerKeys.length;
  let rows = 0;
  const positioned: PositionedNode[] = [];

  layerKeys.forEach((key, column) => {
    const bucket = (byLayer.get(key) ?? []).slice().sort();
    rows = Math.max(rows, bucket.length);
    bucket.forEach((id, row) => {
      positioned.push({
        id,
        layer: key,
        order: row,
        x: MARGIN + column * LAYER_STEP,
        y: MARGIN + row * ROW_STEP,
      });
    });
  });

  return {
    nodes: positioned,
    width: MARGIN * 2 + Math.max(layers - 1, 0) * LAYER_STEP,
    height: MARGIN * 2 + Math.max(rows - 1, 0) * ROW_STEP,
    layers,
    rows,
  };
}
