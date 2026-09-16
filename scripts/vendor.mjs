#!/usr/bin/env node
/**
 * Copies the engine's documents into `public/` and writes the manifest.
 *
 * # Why this is a script with an argument rather than a download
 *
 * The argument is a path to an engine checkout, so the copies come from a tree somebody
 * chose and can inspect, and the commit recorded in the manifest is read from that tree
 * rather than typed. A script that fetched from a URL would produce copies nobody could
 * point at a revision, which is the property the manifest exists to provide.
 *
 * # Usage
 *
 *   node scripts/vendor.mjs /path/to/amasario-provenance-engine
 *
 * Running it twice on the same checkout writes the same bytes, because every copy is of a
 * committed file and nothing here is generated.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const engine = resolve(process.argv[2] ?? "../amasario-provenance-engine");

/** The letter-and-digit lists the manifest is built from. */
const SOURCES = [
  { key: "graphs", from: "fixtures/graphs", to: "public/data/graphs", match: /\.json$/ },
  { key: "snapshots", from: "fixtures/snapshots", to: "public/data/snapshots", match: /\.json$/ },
  { key: "reference", from: "fixtures/reference", to: "public/data/reference", match: /\.json$/ },
  { key: "docs", from: "docs", to: "public/docs", match: /\.md$/ },
];

async function list(directory, match) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && match.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const commit = execFileSync("git", ["-C", engine, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  const manifest = {
    source: "Amasario-Soroban-Click/amasario-provenance-engine",
    sourceCommit: commit,
    note:
      "Every file under public/data and public/docs is a byte-for-byte copy of a file in " +
      "the engine at sourceCommit. Checked by scripts/verify-manifest.mjs on every CI run.",
    graphs: [],
    snapshots: [],
    reference: [],
    docs: [],
    digests: {},
  };

  for (const source of SOURCES) {
    const from = join(engine, source.from);
    const to = join(process.cwd(), source.to);
    await mkdir(to, { recursive: true });

    const names = await list(from, source.match);
    for (const name of names) {
      await copyFile(join(from, name), join(to, name));
      const bytes = await readFile(join(to, name));
      manifest.digests[`${source.to.replace(/^public\//, "")}/${name}`] = sha256(bytes);
    }
    manifest[source.key] = names;
    console.log(`${source.key}: ${names.length} file(s) from ${source.from}`);
  }

  const manifestPath = join(process.cwd(), "public/data/manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`manifest written: ${basename(manifestPath)} at ${commit.slice(0, 12)}`);
}

await main();
