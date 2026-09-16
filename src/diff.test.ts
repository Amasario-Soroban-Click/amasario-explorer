import { describe, expect, it } from "vitest";

import { diffEdges, edgeKey, summarise } from "./diff.js";
import type { GraphEdge } from "./types.js";

function edge(
  source: string,
  target: string,
  overrides: Partial<GraphEdge> = {},
): GraphEdge {
  return {
    id: `id-${source}-${target}`,
    source,
    target,
    relationship: "INVOCATES",
    evidence: ["e1"],
    confidence: { level: "VERIFIED", evidence: ["e1"], rationale: "observed" },
    observed: true,
    basis: "OBSERVED_INVOCATION",
    ...overrides,
  };
}

describe("edgeKey", () => {
  it("names a relationship by its endpoints and what joins them", () => {
    expect(edgeKey(edge("A", "B"))).toBe("A -INVOCATES-> B");
  });
});

describe("diffEdges", () => {
  it("reports an added relationship with a reason", () => {
    const entries = diffEdges([], [edge("A", "B")]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.changeType).toBe("ADDED");
    expect(entries[0]?.reason).toBe("absent from the before graph");
  });

  it("reports a removed relationship with a reason", () => {
    const entries = diffEdges([edge("A", "B")], []);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.changeType).toBe("REMOVED");
    expect(entries[0]?.reason).toBe("absent from the after graph");
  });

  it("matches a moved confidence as CHANGED rather than as a removal and an addition", () => {
    // The whole reason identity is not the edge's own digest. The identifier differs
    // between the two below because the contents did, and a diff keyed on it would report
    // two unrelated entries for one relationship that got less confident.
    const before = edge("A", "B", {
      id: "digest-one",
      confidence: { level: "VERIFIED", evidence: ["e1"], rationale: "observed" },
    });
    const after = edge("A", "B", {
      id: "digest-two",
      confidence: { level: "INFERRED", evidence: ["e2"], rationale: "transitive" },
    });

    const entries = diffEdges([before], [after]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.changeType).toBe("CHANGED");
    expect(entries[0]?.reason).toContain("confidence VERIFIED to INFERRED");
    expect(entries[0]?.reason).toContain("rationale reworded");
  });

  it("names every field that differs, not just the first", () => {
    const before = edge("A", "B", { evidence: ["e1"], observed: true });
    const after = edge("A", "B", {
      evidence: ["e1", "e2", "e3"],
      observed: false,
      basis: "INFERRED_TRANSITIVE",
    });

    const entries = diffEdges([before], [after]);
    const reason = entries[0]?.reason ?? "";
    expect(reason).toContain("observed true to false");
    expect(reason).toContain("basis OBSERVED_INVOCATION to INFERRED_TRANSITIVE");
    expect(reason).toContain("evidence 1 to 3 citations");
  });

  it("reports a citation swap that keeps the count", () => {
    const before = edge("A", "B", { evidence: ["e1"] });
    const after = edge("A", "B", { evidence: ["e9"] });
    const entries = diffEdges([before], [after]);
    expect(entries[0]?.changeType).toBe("CHANGED");
    expect(entries[0]?.reason).toContain("evidence citations changed");
  });

  it("emits nothing for a pair that is identical", () => {
    const one = edge("A", "B");
    const two = edge("A", "B");
    expect(diffEdges([one], [two])).toEqual([]);
  });

  it("is ordered by key so two runs agree", () => {
    const entries = diffEdges(
      [],
      [edge("C", "D"), edge("A", "B"), edge("A", "C")],
    );
    expect(entries.map((entry) => entry.key)).toEqual([
      "A -INVOCATES-> B",
      "A -INVOCATES-> C",
      "C -INVOCATES-> D",
    ]);
  });

  it("treats a relationship change as distinct from a change of confidence", () => {
    const before = edge("A", "B", { relationship: "INVOCATES" });
    const after = edge("A", "B", { relationship: "DEPENDS_ON" });
    const entries = diffEdges([before], [after]);
    expect(entries.map((entry) => entry.changeType)).toEqual(["ADDED", "REMOVED"]);
  });
});

describe("summarise", () => {
  it("counts the unchanged relationships as well as the changes", () => {
    const before = [edge("A", "B"), edge("A", "C"), edge("A", "D")];
    const after = [edge("A", "B"), edge("A", "C")];
    const counts = summarise(diffEdges(before, after), before);
    expect(counts).toEqual({ added: 0, removed: 1, changed: 0, unchanged: 2 });
  });
});
