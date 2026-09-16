/**
 * The app shell and its router.
 *
 * A hash router on a static host, because there is no server to rewrite paths: Vercel
 * serves `index.html` for the root and for nothing else, so a real path like `/graphs/`
 * would 404 on a refresh. A hash never reaches the server, so a reload always works - and
 * on a site whose entire value is that its links can be shared, that is not a detail.
 */

import { element, replace, withText } from "./ui.js";
import { renderContracts } from "./views/contracts.js";
import { renderDocs } from "./views/docs.js";
import { renderGraphs } from "./views/graphs.js";
import { renderOverview } from "./views/overview.js";
import { renderSnapshots } from "./views/snapshots.js";

/** A route: a hash prefix, a label and the function that fills the viewport. */
interface Route {
  readonly path: string;
  readonly label: string;
  readonly render: (container: HTMLElement, parameter?: string) => Promise<void>;
}

const ROUTES: readonly Route[] = [
  { path: "", label: "Overview", render: renderOverview },
  { path: "graphs", label: "Graphs", render: renderGraphs },
  { path: "snapshots", label: "Snapshots", render: renderSnapshots },
  { path: "contracts", label: "Reference contract", render: renderContracts },
  { path: "docs", label: "Documentation", render: renderDocs },
];

const LINK = (segment: string): string => (segment.length === 0 ? "#/" : `#/${segment}`);

function parse(hash: string): { route: Route; parameter?: string } {
  const trimmed = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const [head, ...rest] = trimmed.split("/");
  const segment = head ?? "";
  const parameter = rest.length > 0 ? decodeURIComponent(rest.join("/")) : undefined;
  const route = ROUTES.find((candidate) => candidate.path === segment) ?? ROUTES[0];
  if (route === undefined) throw new Error("the route table is empty");
  return parameter === undefined ? { route } : { route, parameter };
}

/** Renders one navigation item, marking the active one without removing its link. */
function navLink(route: Route, active: boolean): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.textContent = route.label;
  anchor.href = LINK(route.path);
  if (active) anchor.setAttribute("aria-current", "page");
  anchor.className = active ? "nav-link nav-link-active" : "nav-link";
  return anchor;
}

async function route(): Promise<void> {
  const app = document.getElementById("app");
  if (app === null) return;

  const { route: current, parameter } = parse(window.location.hash);
  const viewport = element("main", { class: "viewport" });

  const header = element("header", { class: "masthead" }, [
    element("a", { class: "brand", href: "#/" }, [
      withText("span", "Amasario", { class: "brand-name" }),
      withText("span", "Explorer", { class: "brand-suffix" }),
    ]),
    element(
      "nav",
      { class: "nav" },
      ROUTES.map((candidate) => navLink(candidate, candidate === current)),
    ),
  ]);

  const footer = element("footer", { class: "footer" }, [
    withText(
      "p",
      "A viewer for documents the Amasario provenance engine produced. It is not a security " +
        "scanner, it is not affiliated with a contract it describes, and no output here is a " +
        "security opinion.",
    ),
    element("p", {}, [
      anchored("Engine", "https://github.com/Amasario-Soroban-Click/amasario-provenance-engine"),
      " · ",
      anchored("Specification", "https://github.com/Amasario-Soroban-Click/amasario-provenance-spec"),
      " · ",
      anchored("Documentation", "https://github.com/Amasario-Soroban-Click/amasario-docs"),
    ]),
  ]);

  replace(app, [header, viewport, footer]);
  viewport.append(withText("p", "Loading…", { class: "loading" }));

  try {
    await current.render(viewport, parameter);
  } catch (error) {
    // A failed read is reported as a failed read. Rendering an empty graph instead would
    // look like a contract with no dependencies, which is the one output this whole
    // project exists to avoid producing by accident.
    replace(viewport, [
      withText("h1", "This page could not be loaded"),
      withText("p", error instanceof Error ? error.message : String(error), { class: "lede" }),
      withText("p", "The documents are plain JSON under `public/data/` and can be read directly."),
    ]);
  }
}

function anchored(text: string, href: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.textContent = text;
  anchor.href = href;
  return anchor;
}

window.addEventListener("hashchange", () => {
  void route();
});

void route();
