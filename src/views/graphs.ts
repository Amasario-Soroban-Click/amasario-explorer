/**
 * The graph explorer.
 *
 * A picture of a dependency graph is the most persuasive thing this site can show, which
 * is the reason the edge table sits directly under it rather than behind a disclosure:
 * every arrow in the picture appears in the table with its confidence, its basis, its
 * observation status and its evidence count, so the picture cannot say more than the
 * table. A graph rendered without that column would be a drawing of an assurance nobody
 * made.
 */

import { loadGraph, loadManifest } from "../data.js";
import { confidenceTone, renderGraph } from "../graph/render.js";
import { humaniseLevel, pluralise, shortenEntity } from "../format.js";
import { element, replace, withText } from "../ui.js";
import type { GraphDocument } from "../types.js";

/** Renders the graph list, or one graph when `file` is given. */
export async function renderGraphs(container: HTMLElement, file?: string): Promise<void> {
  const manifest = await loadManifest();
  const chosen = file !== undefined && manifest.graphs.includes(file) ? file : first(manifest.graphs);
  if (chosen === undefined) {
    replace(container, [
      withText("h1", "Graphs"),
      withText("p", "The manifest lists no graph documents.", { class: "lede" }),
    ]);
    return;
  }

  const document = await loadGraph(chosen);
  replace(container, [
    withText("h1", "Graphs"),
    element("p", { class: "lede" }, [
      "Each document below is one `amasario graph` result, committed as a fixture and \
asserted against by the engine's own test suite.",
    ]),
    picker(manifest.graphs, chosen),
    summary(document),
    graphFigure(document),
    edgeTable(document),
    nodeList(document),
  ]);
}

function picker(files: string[], chosen: string): HTMLElement {
  const select = element("select", { class: "picker", "aria-label": "Graph document" });
  for (const name of files) {
    const option = withText("option", name.replace(/\.json$/, ""), { value: name });
    if (name === chosen) option.selected = true;
    select.append(option);
  }
  select.addEventListener("change", () => {
    window.location.hash = `#/graphs/${select.value}`;
  });
  return select;
}

function summary(document: GraphDocument): HTMLElement {
  const levels = new Map<string, number>();
  for (const edge of document.edges) {
    levels.set(edge.confidence.level, (levels.get(edge.confidence.level) ?? 0) + 1);
  }
  const observed = document.edges.filter((edge) => edge.observed === true).length;

  const rows = [
    ["Document", document.id],
    ["Specification", `${document.apiVersion}, spec ${document.specVersion}`],
    ["Entities", String(document.nodes.length)],
    ["Relationships", String(document.edges.length)],
    ["Observed", `${observed} of ${document.edges.length}`],
  ];

  return element("dl", { class: "detail-grid" }, [
    ...rows.flatMap(([term, value]) => [withText("dt", term ?? ""), withText("dd", value ?? "")]),
    withText("dt", "Confidence"),
    element(
      "dd",
      {},
      [...levels.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([level, count]) =>
          withText("span", `${count} ${humaniseLevel(level)}`, {
            class: `chip ${confidenceTone(level)}`,
          }),
        ),
    ),
  ]);
}

function graphFigure(document: GraphDocument): HTMLElement {
  const figure = element("figure", { class: "graph-figure" });
  figure.append(renderGraph(document));
  figure.append(
    withText(
      "figcaption",
      `${pluralise(document.nodes.length, "entity", "entities")} and ` +
        `${pluralise(document.edges.length, "relationship", "relationships")}. Arrows run from the
subject of a relationship to its object, so the leftmost entities are the ones that
invoke the rest.`,
    ),
  );
  return figure;
}

function edgeTable(document: GraphDocument): HTMLElement {
  const head = element("tr", {}, [
    withText("th", "Subject"),
    withText("th", "Relationship"),
    withText("th", "Object"),
    withText("th", "Confidence"),
    withText("th", "Observed"),
    withText("th", "Basis"),
    withText("th", "Evidence"),
  ]);

  const rows = document.edges
    .slice()
    .sort((left, right) => left.source.localeCompare(right.source) || left.target.localeCompare(right.target))
    .map((edge) =>
      element("tr", {}, [
        withText("td", shortenEntity(edge.source), { title: edge.source }),
        withText("td", edge.relationship),
        withText("td", shortenEntity(edge.target), { title: edge.target }),
        withText("td", edge.confidence.level, { class: `chip ${confidenceTone(edge.confidence.level)}` }),
        withText("td", edge.observed === true ? "yes" : "no"),
        withText("td", edge.basis ?? "unstated"),
        withText("td", pluralise(edge.evidence.length, "citation")),
      ]),
    );

  return element("table", { class: "edge-table" }, [element("thead", {}, [head]), element("tbody", {}, rows)]);
}

function nodeList(document: GraphDocument): HTMLElement {
  const items = document.nodes
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) =>
      element("li", {}, [
        withText("span", node.kind, { class: "node-kind" }),
        " ",
        withText("code", node.id),
      ]),
    );
  return element("section", {}, [withText("h2", "Entities"), element("ul", { class: "entity-list" }, items)]);
}

function first(values: string[]): string | undefined {
  return values[0];
}
