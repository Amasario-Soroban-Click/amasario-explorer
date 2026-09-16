/**
 * Reading the vendored documents.
 *
 * # Where the data comes from
 *
 * Every file under `public/data/` is a copy of a document the engine produced or of a
 * fixture it is asserted against. They are committed here rather than fetched from the
 * engine repository at runtime for the same reason the engine commits its own fixtures:
 * a page that read a live repository would show whatever that repository says today, and
 * a screenshot of it would not be reproducible. `public/data/manifest.json` records the
 * engine commit the copies were taken from and the digest of each one, and
 * `scripts/verify-manifest.mjs` checks both - so "this is the engine's output" is a
 * checked claim rather than a caption.
 *
 * # Why a manifest at all
 *
 * A static site cannot list a directory. Without a manifest the file names would have to
 * be written into the code, and a fixture added to the engine would be invisible here
 * with nothing to notice it. The manifest is generated once from the engine and verified
 * on every CI run.
 */

import type {
  DataManifest,
  GraphDocument,
  ReferenceRecord,
  SnapshotDocument,
} from "./types.js";
import { parseGraphDocument, parseReferenceRecord, parseSnapshotDocument } from "./types.js";

// Relative, because the built site is served from the domain root on one deployment and
// from a deployment-specific hostname on a preview. `import.meta.env.BASE_URL` is what
// Vite derived from the `base` setting and is the only path this code may assume.
const ROOT = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

async function fetchText(relativePath: string): Promise<string> {
  const response = await fetch(`${ROOT}${relativePath}`);
  if (!response.ok) {
    throw new Error(
      `${relativePath} could not be read (HTTP ${response.status}). The documents under \
public/data/ are committed copies of the engine's output; a missing one means the \
checkout or the deployment is incomplete rather than that there is nothing to show.`,
    );
  }
  return response.text();
}

async function fetchJson(relativePath: string): Promise<unknown> {
  const text = await fetchText(relativePath);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${String(error)}`);
  }
}

let manifest: Promise<DataManifest> | undefined;

/** The manifest, read once per page load. */
export function loadManifest(): Promise<DataManifest> {
  manifest ??= fetchJson("data/manifest.json").then((value) => value as DataManifest);
  return manifest;
}

/** One graph document, validated. */
export async function loadGraph(file: string): Promise<GraphDocument> {
  return parseGraphDocument(await fetchJson(`data/graphs/${file}`));
}

/** One snapshot, validated. */
export async function loadSnapshot(file: string): Promise<SnapshotDocument> {
  return parseSnapshotDocument(await fetchJson(`data/snapshots/${file}`));
}

/** One reference-contract provenance record, validated. */
export async function loadReference(file: string): Promise<ReferenceRecord> {
  return parseReferenceRecord(await fetchJson(`data/reference/${file}`));
}

/** A documentation page's Markdown source. */
export async function loadDoc(file: string): Promise<string> {
  return fetchText(`docs/${file}`);
}
