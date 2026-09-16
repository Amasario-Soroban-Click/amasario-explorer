#!/usr/bin/env node
/**
 * Checks that the vendored documents are what the manifest says they are.
 *
 * # What this is for
 *
 * The site claims, on its front page, that every document it shows is a byte-for-byte copy
 * of one the engine produced at a named commit. That is a claim, and a claim nothing
 * checks is a caption. This recomputes the digest of every copied file and compares it with
 * the manifest, and it also reports files that are present but unlisted and listed but
 * absent - because a copy that was edited in place and a fixture that was dropped both
 * produce the same symptom, a page that quietly shows the wrong thing.
 *
 * It reads no network and needs no engine checkout, so it runs on every CI run.
 *
 * # Usage
 *
 *   node scripts/verify-manifest.mjs
 */

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "public/data/manifest.json");

const LISTS = ["graphs", "snapshots", "reference", "docs"];

/** Where each list lives on disk, so a listed name can be turned into a path. */
const DIRECTORIES = {
  graphs: "public/data/graphs",
  snapshots: "public/data/snapshots",
  reference: "public/data/reference",
  docs: "public/docs",
};

const problems = [];

function fail(message) {
  problems.push(message);
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function present(directory) {
  try {
    if (!(await stat(directory)).isDirectory()) return null;
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return null;
  }
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    fail(`public/data/manifest.json could not be read: ${String(error)}`);
    return;
  }

  if (typeof manifest.sourceCommit !== "string" || manifest.sourceCommit.length !== 40) {
    fail(
      "the manifest does not record a full 40-character source commit, so the copies cannot " +
        "be attributed to a revision",
    );
  }

  const listed = new Set();

  for (const key of LISTS) {
    const names = manifest[key];
    if (!Array.isArray(names) || names.length === 0) {
      fail(`the manifest lists no \`${key}\`; an empty list is a defect rather than a state`);
      continue;
    }

    const directory = join(root, DIRECTORIES[key]);
    const onDisk = await present(directory);
    if (onDisk === null) {
      fail(`${DIRECTORIES[key]} is missing`);
      continue;
    }

    for (const name of names) {
      const path = join(directory, name);
      const manifestKey = `${relative(join(root, "public"), path)}`;
      listed.add(manifestKey);

      if (!onDisk.includes(name)) {
        fail(`${manifestKey} is listed in the manifest but is not on disk`);
        continue;
      }

      const recorded = manifest.digests?.[manifestKey];
      if (typeof recorded !== "string") {
        fail(`${manifestKey} has no recorded digest`);
        continue;
      }

      const actual = await sha256(path);
      if (actual !== recorded) {
        fail(
          `${manifestKey} does not match its recorded digest\n` +
            `      recorded ${recorded}\n` +
            `      actual   ${actual}`,
        );
      }
    }

    for (const name of onDisk) {
      const extra = relative(join(root, "public"), join(directory, name));
      if (!listed.has(extra)) {
        fail(`${extra} is on disk but not listed in the manifest`);
      }
    }
  }

  for (const key of Object.keys(manifest.digests ?? {})) {
    if (!listed.has(key)) {
      fail(`${key} has a recorded digest but is not listed under any document list`);
    }
  }

  if (problems.length > 0) {
    console.error("the vendored documents do not match the manifest:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      `\nRe-vendor from a chosen engine checkout with:\n` +
        `  node scripts/vendor.mjs /path/to/amasario-provenance-engine`,
    );
    process.exitCode = 1;
    return;
  }

  const total = [...listed].length;
  console.log(
    `${total} vendored file(s) match the manifest at ${manifest.sourceCommit.slice(0, 12)}`,
  );
}

await main();
