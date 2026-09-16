/**
 * The reference contract.
 *
 * Two contracts this project builds from its own source, deliberately: every other module
 * the engine is tested against is either hand-assembled or borrowed from a chain somebody
 * else controls, and a test whose failure has to be triaged into "the engine changed" or
 * "the world changed" is a weak oracle. The caller invokes the callee across contracts, so
 * the expected dependency edge is written down here rather than observed hopefully.
 *
 * What is shown is the provenance record committed beside each module - the toolchain that
 * built it, its size, and the digest of its bytes - plus the call graph those two records
 * describe. The digest is the claim; `scripts/build-reference-contract.sh` rebuilds the
 * modules and a CI job requires the result to match, so the claim is checkable.
 */

import { loadManifest, loadReference } from "../data.js";
import { layoutGraph, ROW_STEP } from "../graph/layout.js";
import { formatBytes } from "../format.js";
import { element, replace, withText } from "../ui.js";
import type { ReferenceRecord } from "../types.js";

const ENGINE_URL = "https://github.com/Amasario-Soroban-Click/amasario-provenance-engine";

/** Renders the reference contract's records. */
export async function renderContracts(container: HTMLElement): Promise<void> {
  const manifest = await loadManifest();
  const records = await Promise.all(manifest.reference.map((file) => loadReference(file)));
  records.sort((left, right) => left.name.localeCompare(right.name));

  replace(container, [
    withText("h1", "Reference contract"),
    element("p", { class: "lede" }, [
      "Two Soroban contracts built from source in ",
      anchored("the engine's repository", `${ENGINE_URL}/tree/${manifest.sourceCommit}/reference-contract`),
      ` by `,
      withText("code", "scripts/build-reference-contract.sh"),
      `. Their compiled modules are committed under `,
      withText("code", "fixtures/reference/"),
      " and the engine's test suite asserts its module analysis against those bytes rather \
than against hand-assembled ones.",
    ]),

    recordsTable(records),
    callGraph(records[0]?.name, records[1]?.name),
    ...records.map(recordPanel),
  ]);
}

function recordsTable(records: ReferenceRecord[]): HTMLElement {
  const head = element("tr", {}, [
    withText("th", "Module"),
    withText("th", "Built from"),
    withText("th", "soroban-sdk"),
    withText("th", "rustc"),
    withText("th", "Target"),
    withText("th", "Size"),
    withText("th", "Digest (sha256)"),
  ]);
  const rows = records.map((record) =>
    element("tr", {}, [
      withText("td", record.moduleFile),
      withText("td", record.buildsFrom, { class: "mono" }),
      withText("td", record.toolchain.sorobanSdk),
      withText("td", record.toolchain.rustc),
      withText("td", record.toolchain.target, { class: "mono" }),
      withText("td", formatBytes(record.byteSize)),
      withText("td", record.digest, { class: "mono digest" }),
    ]),
  );
  return element("table", { class: "edge-table" }, [
    element("thead", {}, [head]),
    element("tbody", {}, rows),
  ]);
}

/**
 * Draws the call graph the two contracts describe.
 *
 * Built from the records rather than from a document, because there is no graph document
 * for two contracts the project owns - the edge is a fact about the source, which is
 * exactly why it was worth constructing. It goes through the same layout function as every
 * other graph on the site, so the picture is deterministic here too.
 */
function callGraph(caller: string | undefined, callee: string | undefined): HTMLElement {
  const section = element("section", {});
  section.append(withText("h2", "Call graph"));

  if (caller === undefined || callee === undefined) {
    section.append(
      element("p", { class: "empty" }, ["The manifest lists fewer than two modules."]),
    );
    return section;
  }

  const layout = layoutGraph(
    [{ id: caller }, { id: callee }],
    [{ source: caller, target: callee }],
  );
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));
  const from = positions.get(caller);
  const to = positions.get(callee);

  const figure = element("figure", { class: "graph-figure" });
  if (from !== undefined && to !== undefined) {
    const svg = svgElement(
      "svg",
      {
        viewBox: `0 0 ${layout.width} ${layout.height}`,
        class: "graph-canvas call-graph",
        role: "img",
        "aria-label": `${caller} invokes ${callee}`,
      },
      [
        svgElement("path", {
          d: `M ${from.x + 168} ${from.y + 22} C ${from.x + 168 + ROW_STEP} ${from.y + 22}, ${to.x - ROW_STEP} ${to.y + 22}, ${to.x} ${to.y + 22}`,
          class: "edge-line",
        }),
        ...[from, to].flatMap((node) => {
          const group = svgElement("g", { transform: `translate(${node.x}, ${node.y})` });
          group.append(svgElement("rect", { width: 168, height: 44, rx: 10, class: "node-box" }));
          const label = svgElement("text", { x: 14, y: 27, class: "node-label" });
          label.textContent = node.id;
          group.append(label);
          return [group];
        }),
      ],
    );
    figure.append(svg);
  }

  figure.append(
    withText(
      "figcaption",
      `The caller reaches the callee through a client generated from the callee's compiled \
module at build time. The call is read-only, so the expected INVOCATES edge can be \
established without an account's signature; the authenticated path exists too and is \
exercised by the contracts' own tests.`,
    ),
  );
  section.append(figure);
  return section;
}

function recordPanel(record: ReferenceRecord): HTMLElement {
  return element("section", { class: "record" }, [
    withText("h2", record.name),
    element("p", {}, [record.note]),
    element("dl", { class: "detail-grid" }, [
      withText("dt", "Module file"),
      withText("dd", record.moduleFile, { class: "mono" }),
      withText("dt", "Built from"),
      withText("dd", record.buildsFrom, { class: "mono" }),
      withText("dt", "Byte size"),
      withText("dd", formatBytes(record.byteSize)),
      withText("dt", "Digest"),
      withText("dd", `${record.digestAlgorithm}: ${record.digest}`, { class: "mono digest" }),
      withText("dt", "Toolchain"),
      withText(
        "dd",
        `soroban-sdk ${record.toolchain.sorobanSdk}, rustc ${record.toolchain.rustc}, ${record.toolchain.target}`,
      ),
    ]),
  ]);
}

function svgElement(
  tag: string,
  attributes: Record<string, string | number>,
  children: SVGElement[] = [],
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  for (const child of children) node.append(child);
  return node;
}

function anchored(text: string, href: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.textContent = text;
  anchor.href = href;
  return anchor;
}
