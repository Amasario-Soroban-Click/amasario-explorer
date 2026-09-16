/**
 * Small DOM helpers.
 *
 * Text goes in through `textContent` and never through `innerHTML`, which is why
 * `element` takes children as nodes rather than as markup. The one exception is the
 * documentation renderer, which produces HTML from Markdown - and that Markdown is
 * committed in this repository rather than supplied by a reader, so the trust boundary is
 * the same one `git clone` already crosses.
 */

/** The attributes an element may be given. */
export type Attributes = Record<string, string | number | boolean | undefined>;

/** Creates an element with attributes, children and optional text. */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue;
    if (value === true) node.setAttribute(name, "");
    else node.setAttribute(name, String(value));
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/** An element whose text is set directly, so no value is ever parsed as markup. */
export function withText<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  attributes: Attributes = {},
): HTMLElementTagNameMap[K] {
  const node = element(tag, attributes);
  node.textContent = text;
  return node;
}

/** A definition-list pair, which most of the detail panels are made of. */
export function definition(term: string, value: Node | string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(element("dt", {}, [term]));
  fragment.append(element("dd", {}, [value]));
  return fragment;
}

/** Replaces a container's contents. */
export function replace(container: HTMLElement, children: (Node | string)[]): void {
  container.replaceChildren(...children);
}

/** A status chip. `tone` selects the colour, and the text always says the same thing. */
export function chip(text: string, tone: string): HTMLElement {
  return withText("span", text, { class: `chip chip-${tone}` });
}
