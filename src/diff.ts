/**
 * Comparing two graph documents, edge by edge.
 *
 * # What is identity here, and why it is not the edge's `id`
 *
 * An edge carries a digest as its `id`, computed over its own contents. Comparing by that
 * field would report every edge whose confidence moved as one removal and one addition,
 * which buries the thing a reader is looking for - the same relationship, differently
 * evidenced - inside a pair of unrelated-looking changes. So identity is the triple that
 * actually identifies a relationship: the two endpoints and the relationship between
 * them. What changed about it is then the diff's subject rather than its disguise.
 *
 * # Every entry states why
 *
 * A change with no reason is a claim a reader cannot check, which is the same objection
 * the engine raises against a confidence with no evidence. So each entry carries the
 * fields that differ, named with both values, and `CHANGED` is never emitted for a pair
 * that is in fact identical.
 */

import type { GraphEdge } from "./types";

/** What happened to one relationship between the two documents. */
export type ChangeType = "ADDED" | "REMOVED" | "CHANGED";

/** One relationship's change, with the reason it is a change. */
export interface DiffEntry {
  /** `source -RELATIONSHIP-> target`, so the entry names itself. */
  key: string;
  changeType: ChangeType;
  before?: GraphEdge;
  after?: GraphEdge;
  reason: string;
}

/** The identity of a relationship: its two endpoints and what joins them. */
export function edgeKey(edge: GraphEdge): string {
  return `${edge.source} -${edge.relationship}-> ${edge.target}`;
}

/**
 * Every difference between two edge sets, in a canonical order.
 *
 * Order is by `key` rather than by discovery, so the diff of the same pair is the same
 * list on every run - which is what makes two diff outputs comparable at all.
 */
export function diffEdges(
  before: readonly GraphEdge[],
  after: readonly GraphEdge[],
): DiffEntry[] {
  const previous = new Map<string, GraphEdge>();
  for (const edge of before) previous.set(edgeKey(edge), edge);

  const current = new Map<string, GraphEdge>();
  for (const edge of after) current.set(edgeKey(edge), edge);

  const keys = [...new Set([...previous.keys(), ...current.keys()])].sort();
  const entries: DiffEntry[] = [];

  for (const key of keys) {
    const was = previous.get(key);
    const now = current.get(key);

    if (was === undefined && now !== undefined) {
      entries.push({ key, changeType: "ADDED", after: now, reason: "absent from the before graph" });
      continue;
    }
    if (was !== undefined && now === undefined) {
      entries.push({ key, changeType: "REMOVED", before: was, reason: "absent from the after graph" });
      continue;
    }
    if (was === undefined || now === undefined) continue;

    const fields = changedFields(was, now);
    if (fields.length > 0) {
      entries.push({
        key,
        changeType: "CHANGED",
        before: was,
        after: now,
        reason: fields.join("; "),
      });
    }
  }

  return entries;
}

/** The fields that differ between two edges with the same identity. */
function changedFields(before: GraphEdge, after: GraphEdge): string[] {
  const fields: string[] = [];

  if (before.confidence.level !== after.confidence.level) {
    fields.push(
      `confidence ${before.confidence.level} to ${after.confidence.level}`,
    );
  }
  if (Boolean(before.observed) !== Boolean(after.observed)) {
    fields.push(
      `observed ${String(Boolean(before.observed))} to ${String(Boolean(after.observed))}`,
    );
  }
  if (before.basis !== after.basis) {
    fields.push(`basis ${before.basis ?? "unstated"} to ${after.basis ?? "unstated"}`);
  }
  if (before.evidence.length !== after.evidence.length) {
    fields.push(`evidence ${before.evidence.length} to ${after.evidence.length} citations`);
  } else if (before.evidence.join(",") !== after.evidence.join(",")) {
    // Same count, different citations: worth reporting, and easy to miss.
    fields.push(`evidence citations changed, ${before.evidence.length} either side`);
  }
  if (before.confidence.rationale !== after.confidence.rationale) {
    fields.push("rationale reworded");
  }

  return fields;
}

/** The counts a diff is summarised by. */
export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

/** Counts the diff, given both sides so `unchanged` can be reported honestly. */
export function summarise(
  entries: readonly DiffEntry[],
  before: readonly GraphEdge[],
): DiffSummary {
  const added = entries.filter((entry) => entry.changeType === "ADDED").length;
  const removed = entries.filter((entry) => entry.changeType === "REMOVED").length;
  const changed = entries.filter((entry) => entry.changeType === "CHANGED").length;
  const touched = new Set(entries.map((entry) => entry.key));
  const unchanged = before.filter((edge) => !touched.has(edgeKey(edge))).length;
  return { added, removed, changed, unchanged };
}
