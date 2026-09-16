/**
 * Rendering the engine's Markdown.
 *
 * # Why this is allowed to produce HTML
 *
 * Every string that reaches `innerHTML` on this site comes from a file committed in this
 * repository: the copies under `public/docs/` are the engine's own documentation pages,
 * vendored by `scripts/verify-manifest.mjs`'s counterpart at the engine's commit. There is
 * no user input and no remote fetch, so the trust boundary is the one `git clone` already
 * crosses - and it is worth saying that explicitly, because "Markdown to HTML" is the
 * shape of a great many injection bugs and this one is only safe because of where the
 * input comes from. A page that took a document from a query string would need a
 * sanitiser; this one must not grow that ability without one.
 *
 * # Why the output is post-processed
 *
 * The engine's pages cross-reference each other with relative links like `./snapshots.md`
 * and `../fixtures/README.md`. Inside the explorer the first belongs in the docs browser
 * and the second belongs on GitHub. Rewriting them here - rather than in the vendored
 * copies - keeps the copies byte-identical to their sources, so the digest in the manifest
 * still means what it says.
 */

import { marked } from "marked";

/** Rewrites a link inside a documentation page to something the browser can follow. */
export function rewriteDocLink(href: string, engineUrl: string): string {
  if (href.startsWith("#")) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;

  const [path, anchor] = href.split("#");
  const suffix = anchor === undefined ? "" : `#${anchor}`;
  if (path === undefined || path.length === 0) return href;

  // The leading `./` has to come off before anything else is decided. It was checked for
  // after the sibling test at first, and that made the test unreachable for the form the
  // engine's pages actually use: `./snapshots.md` contains a slash, so it failed the
  // "is this a bare sibling file" check and was sent to the repository instead.
  const cleaned = path.replace(/^\.\//, "");

  if (cleaned.endsWith(".md") && !cleaned.includes("/")) {
    // A sibling page: it is in the docs browser, so it becomes a hash route.
    return `#/docs/${cleaned.slice(0, -".md".length)}${suffix}`;
  }

  // Anything else is a path in the engine repository, which is where it resolves.
  return `${engineUrl}/blob/main/${cleaned}${suffix}`;
}

/**
 * Renders a documentation page, rewriting its links.
 *
 * `engineUrl` is the engine repository's web URL, from the manifest, so the links point at
 * the commit the copies came from rather than at a hard-coded guess.
 */
export function renderMarkdown(source: string, engineUrl: string): string {
  const html = marked.parse(source, { async: false, gfm: true }) as string;

  // A small string pass over the anchors rather than a DOM round-trip: `marked` emits
  // well-formed anchors for its own output, and parsing and re-serialising the whole page
  // would rewrite more than the links.
  return html.replace(/href="([^"]*)"/g, (_match, href: string) => {
    const rewritten = rewriteDocLink(href, engineUrl);
    return `href="${rewritten}"`;
  });
}

/** The title of a page: its first level-one heading, or the file name. */
export function docTitle(source: string, fallback: string): string {
  for (const line of source.split("\n")) {
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return fallback;
}
