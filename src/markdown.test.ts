import { describe, expect, it } from "vitest";

import { docTitle, renderMarkdown, rewriteDocLink } from "./markdown.js";

const ENGINE = "https://github.com/Amasario-Soroban-Click/amasario-provenance-engine";

describe("rewriteDocLink", () => {
  it("keeps an in-page anchor as it is", () => {
    expect(rewriteDocLink("#exit-codes", ENGINE)).toBe("#exit-codes");
  });

  it("keeps an external URL as it is", () => {
    expect(rewriteDocLink("https://example.com/x", ENGINE)).toBe("https://example.com/x");
    expect(rewriteDocLink("mailto:x@example.com", ENGINE)).toBe("mailto:x@example.com");
  });

  it("turns a sibling page into a route inside the docs browser", () => {
    expect(rewriteDocLink("snapshots.md", ENGINE)).toBe("#/docs/snapshots");
    expect(rewriteDocLink("./snapshots.md", ENGINE)).toBe("#/docs/snapshots");
  });

  it("keeps an anchor on a sibling page", () => {
    expect(rewriteDocLink("./snapshots.md#digest", ENGINE)).toBe("#/docs/snapshots#digest");
  });

  it("sends a repository path to the engine repository, not to a route", () => {
    expect(rewriteDocLink("../fixtures/README.md", ENGINE)).toBe(
      `${ENGINE}/blob/main/../fixtures/README.md`,
    );
    expect(rewriteDocLink("crates/amasario-core/src/lib.rs", ENGINE)).toBe(
      `${ENGINE}/blob/main/crates/amasario-core/src/lib.rs`,
    );
  });
});

describe("renderMarkdown", () => {
  it("renders headings and rewrites their links", () => {
    const html = renderMarkdown("## See [snapshots](./snapshots.md)\n", ENGINE);
    expect(html).toContain("<h2");
    expect(html).toContain('href="#/docs/snapshots"');
  });
});

describe("docTitle", () => {
  it("reads the first level-one heading", () => {
    expect(docTitle("# Snapshots\n\nbody", "snapshots")).toBe("Snapshots");
  });

  it("falls back to the file name when there is no heading", () => {
    expect(docTitle("body only", "snapshots")).toBe("snapshots");
  });
});
