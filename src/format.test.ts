import { describe, expect, it } from "vitest";

import { entityKind, formatBytes, humaniseLevel, pluralise, shortenEntity } from "./format.js";
import { parseGraphDocument, parseReferenceRecord, parseSnapshotDocument } from "./types.js";

describe("shortenEntity", () => {
  const id = "CONTRACT:CCQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2CNSG";

  it("keeps the head and the tail, because the tail is what distinguishes two ids", () => {
    const short = shortenEntity(id);
    expect(short.startsWith("CONTRACT:CCQ2DINBUG")).toBe(true);
    // Sliced from the input rather than written out, because a literal here is a second
    // transcription of the same constant and the two can disagree - which is how the
    // first version of this assertion came to name the wrong six characters.
    expect(short.endsWith(id.slice(-6))).toBe(true);
    expect(short).toContain("…");
    expect(short.length).toBeLessThan(id.length);
  });

  it("leaves an identifier alone when shortening it would lose nothing", () => {
    expect(shortenEntity("CONTRACT:ABCDEF")).toBe("CONTRACT:ABCDEF");
  });

  it("leaves a string with no kind prefix alone", () => {
    expect(shortenEntity("short")).toBe("short");
  });
});

describe("entityKind", () => {
  it("returns the part before the colon", () => {
    expect(entityKind("CONTRACT:CABC")).toBe("CONTRACT");
    expect(entityKind("PACKAGE:soroban-sdk")).toBe("PACKAGE");
  });

  it("returns the whole string when there is no kind", () => {
    expect(entityKind("CONTRACT")).toBe("CONTRACT");
  });
});

describe("humaniseLevel", () => {
  it("turns a wire name into prose", () => {
    expect(humaniseLevel("LOW_CONFIDENCE")).toBe("Low Confidence");
    expect(humaniseLevel("VERIFIED")).toBe("Verified");
  });
});

describe("pluralise", () => {
  it("agrees with its count", () => {
    expect(pluralise(1, "citation")).toBe("citation");
    expect(pluralise(0, "citation")).toBe("citations");
    expect(pluralise(3, "citation")).toBe("citations");
    expect(pluralise(2, "entity", "entities")).toBe("entities");
  });
});

describe("formatBytes", () => {
  it("states the unit alongside the count", () => {
    expect(formatBytes(13895)).toBe("13,895 bytes");
  });
});

describe("parseGraphDocument", () => {
  const valid = {
    apiVersion: "amasario.dev/v1",
    specVersion: "1.0.0",
    id: "amasario.direct",
    nodes: [{ id: "CONTRACT:A", kind: "CONTRACT" }],
    edges: [
      {
        id: "e1",
        source: "CONTRACT:A",
        target: "CONTRACT:B",
        relationship: "INVOCATES",
        evidence: ["e"],
        confidence: { level: "VERIFIED", evidence: ["e"], rationale: "observed" },
      },
    ],
  };

  it("accepts a document that states what it is", () => {
    expect(parseGraphDocument(valid).id).toBe("amasario.direct");
  });

  it("refuses an edge with no confidence, because such an edge states nothing", () => {
    const broken = { ...valid, edges: [{ ...valid.edges[0], confidence: undefined }] };
    expect(() => parseGraphDocument(broken)).toThrow(/confidence/);
  });

  it("refuses a document with no nodes array rather than drawing an empty graph", () => {
    const broken: Record<string, unknown> = { ...valid };
    delete broken["nodes"];
    expect(() => parseGraphDocument(broken)).toThrow(/nodes/);
  });

  it("refuses something that is not an object at all", () => {
    expect(() => parseGraphDocument([])).toThrow(/JSON object/);
  });
});

describe("parseSnapshotDocument", () => {
  it("requires an identifier, a capture time and a contract", () => {
    expect(() => parseSnapshotDocument({ id: "a", capturedAt: "b" })).toThrow(/contract/);
    expect(() =>
      parseSnapshotDocument({ id: "a", capturedAt: "b", contract: { contractId: "C" } }),
    ).not.toThrow();
  });
});

describe("parseReferenceRecord", () => {
  it("requires the module, its source and its toolchain", () => {
    expect(() =>
      parseReferenceRecord({
        name: "reference-callee",
        buildsFrom: "reference-contract/callee",
        moduleFile: "reference-callee.wasm",
        digest: "ab",
        byteSize: 1,
        toolchain: { sorobanSdk: "27.0.6", rustc: "1.98.1", target: "wasm32v1-none" },
      }),
    ).not.toThrow();
    expect(() => parseReferenceRecord({ name: "x" })).toThrow(/toolchain/);
  });
});
