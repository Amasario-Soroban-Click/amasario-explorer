/**
 * The overview.
 *
 * Two things it does deliberately. It states where every document on the site came from
 * and at which commit, because a viewer is exactly the place where provenance stops being
 * visible - and second, it repeats what the engine will *not* claim, in the engine's own
 * words, because a graph with arrows on it is more persuasive than a JSON document and
 * therefore more able to imply an assurance nobody made.
 */

import { loadManifest } from "../data.js";
import { element, replace, withText } from "../ui.js";

const ENGINE_URL = "https://github.com/Amasario-Soroban-Click/amasario-provenance-engine";

/** Renders the overview. */
export async function renderOverview(container: HTMLElement): Promise<void> {
  const manifest = await loadManifest();

  const counts = [
    { label: "Graph documents", value: manifest.graphs.length },
    { label: "Snapshot pair", value: manifest.snapshots.length },
    { label: "Reference modules", value: manifest.reference.length },
    { label: "Documentation pages", value: manifest.docs.length },
  ];

  replace(container, [
    withText("h1", "Amasario Explorer"),
    element("p", { class: "lede" }, [
      "Every document on this site was produced by the Amasario provenance engine or is a \
fixture it is asserted against. Nothing is fetched at runtime, nothing is sampled, and \
nothing is summarised: the graphs, the snapshot diff and the reference contract's records \
are the engine's own files, rendered.",
    ]),

    withText("h2", "Where the data comes from"),
    element("p", {}, [
      "Copied from ",
      link(manifest.source, `${ENGINE_URL}/tree/${manifest.sourceCommit}`),
      " at commit ",
      withText("code", manifest.sourceCommit.slice(0, 12)),
      ". The digest of every copied file is recorded in ",
      withText("code", "public/data/manifest.json"),
      " and checked on every CI run, so \"this is the engine's output\" is a checked claim \
rather than a caption.",
    ]),

    element(
      "dl",
      { class: "stat-row" },
      counts.flatMap(({ label, value }) => [
        withText("dt", String(value)),
        withText("dd", label),
      ]),
    ),

    withText("h2", "What the engine does not claim"),
    element("p", {}, [
      "This is not a security scanner and no output is a security opinion. No term in any \
of these documents means \"trustworthy\", \"safe\" or \"vulnerable\".",
    ]),
    element("ul", { class: "limits" }, [
      item(
        "VERIFIED means the stated evidence is consistent with the stated claim.",
        "It describes evidence completeness, never the trustworthiness of a contract.",
      ),
      item(
        "An address is not an identity.",
        "A Soroban address survives an upgrade unchanged and says nothing about origin.",
      ),
      item(
        "A relationship that does not state its basis is not reported confidently.",
        "Declared, resolved, observed, embedded, configured or attested — never quietly inferred.",
      ),
      item(
        "A contradiction must be representable.",
        "When a claimed revision rebuilds to a different digest, the answer is CONFLICTING or a bug.",
      ),
      item(
        "A bounded search must say it was bounded.",
        "“The search stopped” and “there was nothing left” are different results.",
      ),
    ]),

    withText("h2", "Start here"),
    element("ul", { class: "limits" }, [
      item("Graphs", "Five documents, including a cycle and a disconnected node."),
      item("Snapshots", "One contract at two boundaries, and the diff between them."),
      item("Reference contract", "Two modules this project built and deploys as fixtures."),
      item("Documentation", "The engine's own pages about what each layer will and will not say."),
    ]),
  ]);
}

function item(term: string, detail: string): HTMLElement {
  return element("li", {}, [
    withText("strong", term),
    " ",
    withText("span", detail),
  ]);
}

function link(text: string, href: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.textContent = text;
  anchor.href = href;
  return anchor;
}
