# AMASARIO — Explorer

[![CI](https://github.com/Amasario-Soroban-Click/amasario-explorer/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Amasario-Soroban-Click/amasario-explorer/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**A browser over the [Amasario provenance engine](https://github.com/Amasario-Soroban-Click/amasario-provenance-engine)'s own documents.**

This repository is the **presentation layer** of Amasario. It performs no analysis, holds
no keys, contacts no network, and computes nothing about any contract. It reads documents
the engine already produced and draws them.

## What it shows

| View | What it is |
| --- | --- |
| **Graphs** | Five committed `amasario graph` documents, drawn with a deterministic layout and listed underneath with each relationship's confidence, observation status, basis and evidence count. |
| **Snapshots** | One contract captured at two boundaries, and the relationships that differ — with the module digests beside them, because a changed graph over an unchanged module is a different claim from a changed contract. |
| **Reference contract** | The two Soroban contracts this project builds from source, their recorded digests and toolchains, and the cross-contract call they were constructed to produce. |
| **Documentation** | The engine's own pages, rendered from their Markdown sources, with links that leave the browser pointing at the engine repository. |

## Where the data comes from

Nothing is fetched at runtime. Every file under `public/data/` and `public/docs/` is a
byte-for-byte copy of a file in the engine, taken at a commit recorded in
`public/data/manifest.json` — and every one of those digests is re-checked on every CI run
by `scripts/verify-manifest.mjs`.

That check is the point rather than a nicety. A viewer is the last place a viewer's claims
can go unchecked, and "this is the engine's output" is exactly the kind of caption that
stays true until it doesn't. The check fails if a copied file is edited in place, if one is
dropped, or if one appears that the manifest does not list — because a missing fixture and
an altered one both produce the same symptom, a page that quietly shows the wrong thing.

To re-vendor from a chosen engine checkout:

```bash
node scripts/vendor.mjs /path/to/amasario-provenance-engine
```

## What this is not

This is not a security scanner, and no output here is a security opinion. The vocabulary
is deliberately narrow and the viewer keeps it that way:

- `VERIFIED` means *the stated evidence is consistent with the stated claim*. It describes
  evidence completeness, never the trustworthiness of a contract.
- An address is not an identity. A Soroban address survives an upgrade unchanged.
- A relationship that does not state its basis is rendered as "basis unstated" rather than
  as a guess at what the basis was.
- A failed read is reported as a failed read. An empty graph is drawn as an empty graph,
  never as the result of a read that did not happen.

The explorer does not add a word to any of that. Where the engine's document declines to
say something, the page shows that it declined.

## Building

```bash
npm ci
npm run typecheck   # strict TypeScript, no emit
npm test            # vitest, over the layout, diff, formatting and link rewriting
npm run build       # emits dist/
npm run preview     # serves dist/ locally
npm run verify:manifest
```

The layout and the diff are pure functions in `src/graph/layout.ts` and `src/diff.ts`, and
they are the two things the tests are mostly about. Everything the site asserts about a
document is decided there; the rest of the code turns decisions into elements. A test that
checked a node's position by reading it back out of the DOM would be testing the DOM, and
a layout that rearranged itself between two renders would make two screenshots of the same
graph incomparable — which is why there is no force simulation anywhere in the tree.

## Deployment

Deployed to Vercel as a static site. `vercel.json` sets the build command, the output
directory and the response headers; there is no server, no function and no environment
variable, because there is nothing a server would add to a site that reads committed files.

## Licence

Apache-2.0. See [`LICENSE`](LICENSE).
