/**
 * The documentation browser.
 *
 * It renders the engine's own pages, vendored at a recorded commit, rather than a
 * paraphrased version of them. A second copy of documentation is a second place for it to
 * be wrong, and the pages that matter most here - what the engine will not claim - are the
 * ones a paraphrase is most likely to soften.
 */

import { loadDoc, loadManifest } from "../data.js";
import { docTitle, renderMarkdown } from "../markdown.js";
import { element, replace, withText } from "../ui.js";

/** The engine repository's web URL, used to resolve links that leave the browser. */
const ENGINE_URL = "https://github.com/Amasario-Soroban-Click/amasario-provenance-engine";

/** Renders the docs index, or one page when `page` is given. */
export async function renderDocs(container: HTMLElement, page?: string): Promise<void> {
  const manifest = await loadManifest();

  if (page === undefined) {
    replace(container, [
      withText("h1", "Documentation"),
      element("p", { class: "lede" }, [
        "The engine's own pages, copied from ",
        link(
          `${manifest.source.replace("Amasario-Soroban-Click/", "")}@${manifest.sourceCommit.slice(0, 7)}`,
          `${ENGINE_URL}/tree/${manifest.sourceCommit}/docs`,
        ),
        ". Each is rendered from the Markdown source rather than paraphrased, and links \
that leave this browser point at the engine repository.",
      ]),
      list(manifest.docs),
    ]);
    return;
  }

  const file = `${page}.md`;
  if (!manifest.docs.includes(file)) {
    replace(container, [
      withText("h1", "Not found"),
      withText("p", `There is no documentation page named \`${page}\`.`, { class: "lede" }),
      element("p", {}, [link("All documentation", "#/docs")]),
    ]);
    return;
  }

  const source = await loadDoc(file);
  const article = element("article", { class: "markdown" });
  // The HTML comes from a committed file, never from the URL - see `src/markdown.ts` for
  // why that distinction is the whole reason this assignment is safe.
  article.innerHTML = renderMarkdown(source, ENGINE_URL);

  replace(container, [
    element("p", { class: "breadcrumb" }, [
      link("Documentation", "#/docs"),
      " / ",
      withText("span", docTitle(source, file)),
    ]),
    article,
  ]);
}

function list(docs: string[]): HTMLElement {
  const items = docs.map((file) => {
    const name = file.replace(/\.md$/, "");
    const item = element("li", {}, [link(name, `#/docs/${name}`)]);
    return item;
  });
  return element("ul", { class: "doc-list" }, items);
}

function link(text: string, href: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.textContent = text;
  anchor.href = href;
  return anchor;
}
