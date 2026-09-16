// From `vitest/config` rather than `vite`: the two export the same function, and only the
// first types the `test` block below. Importing from `vite` compiles the app and then
// fails the type check on a key the test runner reads, which is the kind of error that
// only shows up in whichever of the two commands runs first.
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative rather than absolute, so the built site works at any path: the Vercel
  // deployment serves it from the domain root, but a preview deployment serves it from a
  // deployment-specific hostname and a local `vite preview` serves it from `/`. An
  // absolute `/assets/...` base is the usual cause of a site that works in production and
  // 404s everywhere else.
  base: "./",

  build: {
    outDir: "dist",
    // The source maps are committed to the deployment rather than hidden, because this is
    // a viewer for documents whose whole value is that a reader can check them, and a
    // stack trace naming a minified variable is not a check anyone can perform.
    sourcemap: true,
    target: "es2022",
  },

  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
