/**
 * Drawing a graph document as SVG.
 *
 * The geometry is computed by `layoutGraph`, which is pure and tested; this module only
 * turns that geometry into elements. Splitting it that way is deliberate: a test that
 * asserted a node's position by reading it back out of the DOM would be testing the DOM,
 * and the property worth testing - that the same input produces the same picture - is a
 * property of the layout function alone.
 *
 * Nothing here invents a value. An edge with no `basis` renders as "basis unstated"
 * rather than as a guess at what the basis was, because the engine's own rule is that a
 * relationship which does not state how it was established is not one it will report
 * confidently - and a viewer that filled the gap would be reporting it for the engine.
 */

import { layoutGraph, MARGIN, ROW_STEP, type PositionedNode } from "./layout.js";
import { entityKind, shortenEntity } from "../format.js";
import type { GraphDocument, GraphEdge } from "../types.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** The width of a node box. */
const NODE_WIDTH = 168;

/** The height of a node box. */
const NODE_HEIGHT = 44;

/** Colours per confidence level, so the picture and the table agree. */
const CONFIDENCE_TONE: Record<string, string> = {
  VERIFIED: "tone-verified",
  PARTIALLY_VERIFIED: "tone-partial",
  OBSERVED: "tone-observed",
  INFERRED: "tone-inferred",
  UNVERIFIED: "tone-unverified",
  CONFLICTING: "tone-conflicting",
  UNKNOWN: "tone-unknown",
};

/** The class a confidence level renders with, defaulting to the unknown tone. */
export function confidenceTone(level: string): string {
  return CONFIDENCE_TONE[level] ?? "tone-unknown";
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

/**
 * Draws a graph document.
 *
 * The returned element is sized by `viewBox` rather than by fixed width and height, so it
 * scales to its container without either cropping a wide graph or stretching a small one.
 */
export function renderGraph(document: GraphDocument): SVGSVGElement {
  const layout = layoutGraph(document.nodes, document.edges);
  const root = svg("svg", {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    class: "graph-canvas",
    role: "img",
    "aria-label": `${document.id}: ${document.nodes.length} entities and ${document.edges.length} relationships`,
  });

  // The marker is defined once and referenced by every edge, rather than being drawn per
  // edge: an arrowhead is the same shape every time, and duplicating it 900 times is how a
  // graph of a busy contract becomes slow to open.
  const defs = svg("defs");
  for (const [name, tone] of Object.entries(CONFIDENCE_TONE)) {
    const marker = svg("marker", {
      id: `arrow-${name}`,
      viewBox: "0 0 10 10",
      refX: "10",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse",
    });
    marker.append(svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `edge-arrow ${tone}` }));
    defs.append(marker);
  }
  root.append(defs);

  const positions = new Map<string, PositionedNode>(
    layout.nodes.map((node) => [node.id, node]),
  );

  const edgeLayer = svg("g", { class: "edges" });
  for (const edge of document.edges) {
    const line = renderEdge(edge, positions);
    if (line !== undefined) edgeLayer.append(line);
  }
  root.append(edgeLayer);

  const nodeLayer = svg("g", { class: "nodes" });
  for (const node of layout.nodes) {
    nodeLayer.append(renderNode(node));
  }
  root.append(nodeLayer);

  return root;
}

function renderEdge(
  edge: GraphEdge,
  positions: Map<string, PositionedNode>,
): SVGElement | undefined {
  const from = positions.get(edge.source);
  const to = positions.get(edge.target);
  if (from === undefined || to === undefined) return undefined;

  const tone = confidenceTone(edge.confidence.level);
  const group = svg("g", { class: `edge ${tone}` });

  // A self-edge would have no line to draw, and the layout already excludes one from
  // layering. It is drawn as nothing rather than as a line from a node to itself, which
  // would read as a relationship with a direction it does not have.
  if (from.id === to.id) return undefined;

  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;

  const path = svg("path", {
    d: `M ${startX} ${startY} C ${startX + ROW_STEP} ${startY}, ${endX - ROW_STEP} ${endY}, ${endX} ${endY}`,
    class: "edge-line",
    "marker-end": `url(#arrow-${edge.confidence.level in CONFIDENCE_TONE ? edge.confidence.level : "UNKNOWN"})`,
  });
  group.append(path);

  const title = svg("title");
  title.textContent = [
    `${entityKind(edge.source)} -${edge.relationship}-> ${entityKind(edge.target)}`,
    `confidence: ${edge.confidence.level}`,
    `observed: ${edge.observed === true ? "yes" : "no"}`,
    `basis: ${edge.basis ?? "unstated"}`,
    `evidence: ${edge.evidence.length} citation(s)`,
    edge.confidence.rationale,
  ].join("\n");
  group.append(title);

  return group;
}

function renderNode(node: PositionedNode): SVGElement {
  const group = svg("g", { class: "node", transform: `translate(${node.x}, ${node.y})` });

  group.append(
    svg("rect", {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      rx: 10,
      class: "node-box",
    }),
  );

  const kind = entityKind(node.id);
  const kindLabel = svg("text", { x: 14, y: 19, class: "node-kind" });
  kindLabel.textContent = kind;
  group.append(kindLabel);

  const label = svg("text", { x: 14, y: 35, class: "node-label" });
  label.textContent = shortenEntity(node.id);
  group.append(label);

  const title = svg("title");
  title.textContent = node.id;
  group.append(title);

  return group;
}

/** The vertical space a graph needs, used to size the scroll container before it loads. */
export function estimatedHeight(document: GraphDocument): number {
  const layout = layoutGraph(document.nodes, document.edges);
  return Math.max(layout.height, MARGIN + ROW_STEP);
}
