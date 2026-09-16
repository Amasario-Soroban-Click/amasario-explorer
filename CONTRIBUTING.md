# Contributing

## What this repository is

A viewer. It renders documents the engine committed, and it does three things it must never
stop doing: it **does not analyse**, it **does not fetch anything**, and it **does not
compute a fact that is not already in the file it is displaying**.

That third one is the rule that gets broken by accident rather than on purpose. One
convenient `parseInt` of a digest, one re-derived edge, one default supplied for a field the
document left absent, and the diagram has become a second implementation — with none of the
engine's discipline about bounds, refusals and bases. If a view needs a value that is not in
the document, the change belongs in the engine, in an issue there, and not here.

## Before you push

```bash
npm ci
npm run typecheck
npm test
npm run build
node scripts/verify-manifest.mjs
```

The last one is the important one: it re-hashes every vendored document against
`public/data/manifest.json`. If it fails, either a vendored file was edited by hand — which is
always wrong, because these files are evidence — or the manifest is out of date.

## Re-vendoring

The documents come from the engine's fixtures at a recorded commit. To pick up new ones:

```bash
node scripts/vendor.mjs
```

then commit the changed files and the manifest together. Do not edit a vendored file, and do
not delete one to make a check pass; if a fixture moved in the engine, it moved for a reason
and the change should say which.

## Style

`type(scope): what changed, stated as a fact`, with a body that says why. Types and scopes
follow the engine repository. A change that alters what a view shows should paste the before
and after, because a review of a rendering that cannot be seen is a review of the diff's
shape.

## Issues

Every issue names a view or a script, says what the current behaviour is, and says what a
reader should be able to do instead. An issue that is only an adjective — "slow", "confusing"
— is one the author will have to re-derive later, so it is worth spending two minutes on the
reproduction while the details are still in hand.
