# Security

## What this deployment is

A static site on Vercel: HTML, CSS, JavaScript and the engine's committed JSON and Markdown.
There is no server, no database, no authentication, no user account and no user input that is
stored anywhere. It holds no key and it contacts no network other than to load its own assets.

## In scope

Reports that concern this repository:

- **Injection through rendered content.** The explorer renders Markdown and JSON that were
  produced elsewhere. If a document can cause script execution when rendered, that is a real
  vulnerability in this code, and the fact that the content came from a trusted source is not
  a defence — the source is a repository, and repositories get changed.
- **A way to make a displayed fact disagree with the vendored file.** The digest check in CI
  is the mechanism that keeps the display honest. A path that renders a value not present in
  the document it claims to be rendering is a security-relevant defect here, not a cosmetic
  one, because the project's whole claim is that the picture cannot say more than the data.
- **A dependency with a known advisory** that is reachable from the built site.

## Out of scope

- The correctness of an analysis, or of any document. That is
  [`amasario-provenance-engine`](https://github.com/Amasario-Soroban-Click/amasario-provenance-engine),
  and a wrong result belongs there with the input attached.
- The Vercel platform, its TLS configuration, or its dashboard access.
- Anything requiring an attacker to already have commit access to this repository — a
  contribution under that assumption is a change proposal, not a vulnerability report.

## Reporting

Open a private security advisory on this repository, or email the maintainer address in the
organisation profile. Please include the document or the URL that triggers the behaviour, and
what you expected to happen instead. A report about a rendering that overstates what the data
supports is treated as a security report here, and it is welcome even when it is not
technically an exploit.
