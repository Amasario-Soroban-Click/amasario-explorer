/**
 * The shapes of the documents this site reads.
 *
 * These are transcriptions of the specification's schemas, not an independent model. The
 * schemas set `additionalProperties: false` and name their fields in camelCase, so a
 * document here is either exactly this shape or it is not one of the engine's documents
 * at all - and `parseGraphDocument` below is where that has to be decided, because a
 * viewer is the last place a malformed document could be quietly repaired into something
 * that renders.
 */

/** One entity in a graph document. */
export interface GraphNode {
  id: string;
  kind: string;
}

/** How a relationship was established. Absent only where the document omits it. */
export interface Confidence {
  level: string;
  evidence: string[];
  rationale: string;
}

/** The observation boundary an edge was observed within. */
export interface Boundary {
  network?: { id: string; type: string; passphrase?: string };
  ledger?: number;
  observedAt?: string;
}

/** One typed edge, with the evidence that supports it. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  evidence: string[];
  confidence: Confidence;
  boundary?: Boundary;
  observed?: boolean;
  basis?: string;
}

/** A graph document, as `amasario graph` emits it. */
export interface GraphDocument {
  apiVersion: string;
  specVersion: string;
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  boundary?: unknown;
  metadata?: unknown;
}

/** A digest with its algorithm stated, because a bare hex string states nothing. */
export interface Digest {
  algorithm: string;
  value: string;
}

/** The module a contract address hosts, as the snapshot records it. */
export interface SnapshotWasm {
  digest: Digest;
  artifactType: string;
  byteSize: number;
  evidence?: unknown;
}

/** A snapshot, as `amasario snapshot create` emits it. */
export interface SnapshotDocument {
  apiVersion: string;
  specVersion: string;
  id: string;
  capturedAt: string;
  boundary?: unknown;
  network?: { id: string; type: string; passphrase?: string };
  ledgerBoundary?: unknown;
  contract: { contractId: string; networkId: string; passphrase?: string; executable?: unknown };
  wasm?: SnapshotWasm;
  provenance?: unknown;
  dependencies?: unknown;
  graph?: GraphDocument;
  evidence?: unknown;
  confidence?: Confidence;
  impact?: unknown;
  attestations?: unknown;
  engineVersion?: string;
  contentDigest?: Digest;
  volatileFields?: string[];
  truncated?: boolean;
}

/** The provenance record committed beside a reference contract module. */
export interface ReferenceRecord {
  name: string;
  note: string;
  buildsFrom: string;
  toolchain: { sorobanSdk: string; rustc: string; target: string };
  moduleFile: string;
  byteSize: number;
  digest: string;
  digestAlgorithm: string;
}

/** The manifest the vendored data was shipped with. */
export interface DataManifest {
  source: string;
  sourceCommit: string;
  note: string;
  graphs: string[];
  snapshots: string[];
  reference: string[];
  docs: string[];
  digests: Record<string, string>;
}

/**
 * Reads a graph document, refusing anything that is not one.
 *
 * # Why this validates rather than casts
 *
 * A cast is a promise that the file is what its name says, and the failure mode of a
 * broken promise here is the one this whole project exists to avoid: a viewer that
 * rendered an empty graph would look like a contract with no dependencies rather than
 * like a broken reader. So the shape is checked, and a document that fails is reported as
 * a failure to read rather than drawn as a result.
 */
export function parseGraphDocument(value: unknown): GraphDocument {
  if (!isRecord(value)) {
    throw new Error("a graph document must be a JSON object");
  }
  const { apiVersion, specVersion, id, nodes, edges } = value;
  if (typeof apiVersion !== "string" || typeof specVersion !== "string" || typeof id !== "string") {
    throw new Error("a graph document must state apiVersion, specVersion and id");
  }
  if (!Array.isArray(nodes) || !nodes.every(isNode)) {
    throw new Error("a graph document's `nodes` must be an array of { id, kind }");
  }
  if (!Array.isArray(edges) || !edges.every(isEdge)) {
    throw new Error(
      "a graph document's `edges` must be an array of edges carrying a confidence and its evidence",
    );
  }
  return value as unknown as GraphDocument;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNode(value: unknown): boolean {
  return isRecord(value) && typeof value["id"] === "string" && typeof value["kind"] === "string";
}

function isEdge(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const confidence = value["confidence"];
  return (
    typeof value["id"] === "string" &&
    typeof value["source"] === "string" &&
    typeof value["target"] === "string" &&
    typeof value["relationship"] === "string" &&
    Array.isArray(value["evidence"]) &&
    isRecord(confidence) &&
    typeof confidence["level"] === "string" &&
    Array.isArray(confidence["evidence"]) &&
    typeof confidence["rationale"] === "string"
  );
}

/**
 * Reads a snapshot document, refusing anything that is not one.
 *
 * Less thorough than the graph check on purpose: a snapshot carries fifteen sections this
 * site shows one at a time, and a section it cannot render is reported where it is shown
 * rather than making the whole document unreadable.
 */
export function parseSnapshotDocument(value: unknown): SnapshotDocument {
  if (!isRecord(value)) {
    throw new Error("a snapshot must be a JSON object");
  }
  const contract = value["contract"];
  if (
    typeof value["id"] !== "string" ||
    typeof value["capturedAt"] !== "string" ||
    !isRecord(contract) ||
    typeof contract["contractId"] !== "string"
  ) {
    throw new Error("a snapshot must state `id`, `capturedAt` and a `contract.contractId`");
  }
  return value as unknown as SnapshotDocument;
}

/** Reads a reference-contract provenance record. */
export function parseReferenceRecord(value: unknown): ReferenceRecord {
  if (!isRecord(value)) {
    throw new Error("a provenance record must be a JSON object");
  }
  const toolchain = value["toolchain"];
  if (
    typeof value["name"] !== "string" ||
    typeof value["buildsFrom"] !== "string" ||
    typeof value["moduleFile"] !== "string" ||
    typeof value["digest"] !== "string" ||
    typeof value["byteSize"] !== "number" ||
    !isRecord(toolchain) ||
    typeof toolchain["sorobanSdk"] !== "string"
  ) {
    throw new Error("a provenance record must name its module, its source, its toolchain and its digest");
  }
  return value as unknown as ReferenceRecord;
}
