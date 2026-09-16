/**
 * Formatting, kept pure and separate so it can be tested without a DOM.
 *
 * The entity shortening below is the only place this site alters a value it was given,
 * and it is worth being explicit about what it does and does not do: a Soroban strkey is
 * 56 characters and does not fit in a graph node, so the middle is elided. The full
 * identifier is always available - in a `title` attribute and in the detail panel - and
 * the abbreviation is never used as a lookup key, so nothing can be matched against the
 * shortened form. An identifier that had been shortened for display *and* used for
 * comparison would be two different contracts rendered as the same label.
 */

/** The number of leading characters kept when an identifier is shortened. */
const ID_PREFIX = 10;

/** The number of trailing characters kept. */
const ID_SUFFIX = 6;

/**
 * Shortens an entity identifier for display, keeping the head and the tail.
 *
 * `CONTRACT:CCQ2DINBUGQ2...CNVKZ4YP` rather than `CONTRACT:CCQ2DINBUGQ2DINB…`, because
 * the tail is what distinguishes two identifiers that share a prefix, and a graph whose
 * nodes all read the same is worse than one with no labels.
 */
export function shortenEntity(id: string): string {
  const [kind, ...rest] = id.split(":");
  const value = rest.join(":");
  if (value.length === 0) return id;
  if (value.length <= ID_PREFIX + ID_SUFFIX + 1) return id;
  const head = value.slice(0, ID_PREFIX);
  const tail = value.slice(-ID_SUFFIX);
  return `${kind}:${head}…${tail}`;
}

/** The kind part of an entity identifier, or the whole string when it has none. */
export function entityKind(id: string): string {
  const colon = id.indexOf(":");
  return colon === -1 ? id : id.slice(0, colon);
}

/** A byte count with its unit, in the form the engine's own records use. */
export function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString("en-US")} bytes`;
}

/** A confidence level as prose: `LOW_CONFIDENCE` reads better than `LOW_CONFIDENCE`. */
export function humaniseLevel(level: string): string {
  return level
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Pluralises a count, so a rendered sentence does not say "1 edges". */
export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Escapes text for a `title` attribute or a text node. */
export function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
