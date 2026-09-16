/**
 * Snapshots and the diff between them.
 *
 * The pair committed in the engine is two captures of one contract at two boundaries, and
 * what changed between them is the subject. Two things are shown beside each other on
 * purpose: the module digest the capture recorded, and the relationships. A change in a
 * dependency graph without a change in the module is a change in what was *observed*,
 * which is a different claim from a change in the contract - and the engine keeps those
 * apart in its own output, so the viewer must not merge them back together.
 */

import { diffEdges, summarise, type DiffEntry } from "../diff.js";
import { loadManifest, loadSnapshot } from "../data.js";
import { confidenceTone } from "../graph/render.js";
import { element, replace, withText } from "../ui.js";
import type { SnapshotDocument } from "../types.js";

/** Renders the snapshot pair and the diff between the two documents. */
export async function renderSnapshots(container: HTMLElement): Promise<void> {
  const manifest = await loadManifest();
  const beforeFile = manifest.snapshots.find((name) => name.includes("before"));
  const afterFile = manifest.snapshots.find((name) => name.includes("after"));

  if (beforeFile === undefined || afterFile === undefined) {
    replace(container, [
      withText("h1", "Snapshots"),
      withText("p", "The manifest does not list a before and after pair.", { class: "lede" }),
    ]);
    return;
  }

  const [before, after] = await Promise.all([
    loadSnapshot(beforeFile),
    loadSnapshot(afterFile),
  ]);

  const beforeEdges = before.graph?.edges ?? [];
  const afterEdges = after.graph?.edges ?? [];
  const entries = diffEdges(beforeEdges, afterEdges);
  const counts = summarise(entries, beforeEdges);

  replace(container, [
    withText("h1", "Snapshots and diffs"),
    element("p", { class: "lede" }, [
      "Two captures of one contract at two boundaries, and the relationships that differ \
between them. A snapshot is what every later step reads, so the comparison is over \
documents rather than over a live chain — it needs no network and gives the same answer \
on every run.",
    ]),

    element("div", { class: "snapshot-pair" }, [
      capture("Before", before),
      capture("After", after),
    ]),

    withText("h2", "What changed"),
    element("dl", { class: "detail-grid" }, [
      withText("dt", "Added"),
      withText("dd", String(counts.added)),
      withText("dt", "Removed"),
      withText("dd", String(counts.removed)),
      withText("dt", "Changed"),
      withText("dd", String(counts.changed)),
      withText("dt", "Unchanged"),
      withText("dd", String(counts.unchanged)),
    ]),

    diffTable(entries),
    moduleComparison(before, after),
  ]);
}

function capture(label: string, snapshot: SnapshotDocument): HTMLElement {
  const digest = snapshot.wasm?.digest;
  const rows: [string, string][] = [
    ["Captured", snapshot.capturedAt],
    ["Network", snapshot.network?.id ?? snapshot.contract.networkId],
    ["Contract", snapshot.contract.contractId],
    ["Module digest", digest === undefined ? "not recorded" : `${digest.value}`],
    ["Module size", snapshot.wasm === undefined ? "not recorded" : `${snapshot.wasm.byteSize} bytes`],
    ["Engine", snapshot.engineVersion ?? "not recorded"],
    ["Truncated", snapshot.truncated === true ? "yes" : "no"],
  ];
  return element("section", { class: "capture" }, [
    withText("h2", label),
    element(
      "dl",
      { class: "detail-grid" },
      rows.flatMap(([term, value]) => [withText("dt", term), withText("dd", value)]),
    ),
  ]);
}

function diffTable(entries: DiffEntry[]): HTMLElement {
  if (entries.length === 0) {
    return element("p", { class: "empty" }, [
      "No relationship differs between the two captures.",
    ]);
  }

  const head = element("tr", {}, [
    withText("th", "Change"),
    withText("th", "Relationship"),
    withText("th", "Confidence then"),
    withText("th", "Confidence now"),
    withText("th", "Why"),
  ]);

  const rows = entries.map((entry) => {
    const from = entry.before?.confidence.level ?? "—";
    const to = entry.after?.confidence.level ?? "—";
    return element("tr", {}, [
      withText("td", entry.changeType, { class: `change change-${entry.changeType.toLowerCase()}` }),
      withText("td", entry.key, { title: entry.key }),
      from === "—"
        ? withText("td", "—")
        : withText("td", from, { class: `chip ${confidenceTone(from)}` }),
      to === "—"
        ? withText("td", "—")
        : withText("td", to, { class: `chip ${confidenceTone(to)}` }),
      withText("td", entry.reason),
    ]);
  });

  return element("table", { class: "edge-table" }, [
    element("thead", {}, [head]),
    element("tbody", {}, rows),
  ]);
}

function moduleComparison(before: SnapshotDocument, after: SnapshotDocument): HTMLElement {
  const wasDigest = before.wasm?.digest.value;
  const nowDigest = after.wasm?.digest.value;
  const same = wasDigest !== undefined && wasDigest === nowDigest;

  // The distinction this section exists to make: the relationships below changed, and
  // whether the module changed as well decides which of two very different questions the
  // diff answers.
  const verdict = same
    ? "The module digest is identical in both captures. The graph changed because what was \
observed changed, not because the contract did — which is a statement about the observation \
boundary rather than about the contract."
    : "The module digest differs between the captures, so the executable the address hosts \
changed between them.";

  return element("section", {}, [
    withText("h2", "Module"),
    element("p", {}, [verdict]),
    element("dl", { class: "detail-grid" }, [
      withText("dt", "Before"),
      withText("dd", wasDigest ?? "not recorded", { class: "mono" }),
      withText("dt", "After"),
      withText("dd", nowDigest ?? "not recorded", { class: "mono" }),
      withText("dt", "Relationships then"),
      withText("dd", String((before.graph?.edges ?? []).length)),
      withText("dt", "Relationships now"),
      withText("dd", String((after.graph?.edges ?? []).length)),
    ]),
    element("p", { class: "footnote" }, [
      "A relationship is matched between the two captures by the triple of subject, " +
        "relationship and object — not by the edge's own identifier, which is a digest over " +
        "its contents and therefore changes whenever its evidence does. Matching on the " +
        "identifier would report a confidence that moved as one removal and one addition.",
    ]),
  ]);
}
