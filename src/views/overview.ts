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

/**
 * The pitch video.
 *
 * Served from this deployment rather than embedded from a third party, so the page makes
 * no request to a host outside the project until a reader chooses to press play - which is
 * the same rule every other asset here follows.
 *
 * The poster is a link and not a player. A viewer that autoplayed a video would be the one
 * thing on this site that acted before it was asked to, and the caption states plainly
 * that this is a recording rather than one of the engine's documents, because a page whose
 * whole claim is that nothing here is invented should not leave a reader to guess which
 * panel is evidence and which is a production.
 */
const PITCH = {
  video: "./pitch/amasario-pitch-v1.mp4",
  poster: "./pitch/amasario-pitch-thumbnail.png",
  title: "The five-minute walkthrough",
};

function pitch(): HTMLElement {
  const anchor = element(
    "a",
    { class: "pitch", href: PITCH.video, target: "_blank", rel: "noreferrer" },
    [
      element("img", {
        src: PITCH.poster,
        alt:
          "The walkthrough's opening frame, showing the engine's verification statuses " +
          "rendered in this browser",
        width: 1280,
        height: 720,
        loading: "lazy",
      }),
      withText("span", "Play the five-minute walkthrough", { class: "pitch-play" }),
    ],
  );

  return element("section", {}, [
    withText("h2", PITCH.title),
    element("p", {}, [
      "A recording of this project end to end: what the engine observes, what it refuses \
to claim, the four layers it is built from, and the deployment this page is. It is a \
production about the project rather than one of its documents, and it is said here so that \
nothing below is mistaken for it.",
    ]),
    anchor,
    element("p", { class: "footnote" }, [
      "Five minutes, narrated. The file is served from this deployment, so pressing play \
contacts no third party.",
    ]),
  ]);
}

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

    pitch(),

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
