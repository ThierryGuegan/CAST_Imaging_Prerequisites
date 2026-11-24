# CAST Imaging Prerequisites — Requirements Builder

An interactive tool that helps you **define the architecture and installation
prerequisites for your specific CAST Imaging deployment**, instead of handing you a
generic, one-size-fits-all checklist.

Open **`cast-imaging-requirements-builder.html`** in a browser. Optionally name the **client / project** at the top of
the left pane (it appears in the generated page, the printed copy and the saved files), then
answer the questions on the left — platform &
topology, deployment scenario (which components you need: analysis, Viewer, Dashboards —
five scenarios, from *Full* to *Analysis only, headless*), project scale, database,
network egress, reverse proxy, HTTPS, authentication, optional MCP/AI and CAST Highlight
integrations, how source code reaches the analysis-nodes, the deployment context
(standard or audit engagement) and a few advanced options (a custom URL path, certificate-based PostgreSQL
connections) — and the document on the right regenerates live, starting with an **At a glance** summary, a short
"How to read this document" and a box naming **where CAST's own pages disagree** for your answers; every section can be folded:

- Hardware sizing for exactly the profile you selected (not every possible combination),
  composed from your answers rather than a fixed table per scenario — including the
  Kubernetes cluster-node minimum, an architecture diagram of the components and network
  paths that apply, and the OS/runtime and storage requirements.
- A network ports / FQDN allowlist matrix filtered to the flows your configuration
  actually needs — no unused rows, no wildcards, each row confidence-labeled as
  mandatory, conditional, optional, or recommended.
- Database requirements (CAST Imaging supports PostgreSQL only) matched to your chosen
  hosting model, plus Neo4j requirements when your scenario includes the Viewer.
- Reverse proxy (a mandatory prerequisite — Kubernetes Gateway API is preselected on
  Kubernetes, with the legacy NGINX Ingress, Istio, CloudFront (EKS only) and Azure Application Gateway (AKS only) also offered; an OpenShift Route on OpenShift, chosen as the provider under Kubernetes) and HTTPS/TLS guidance matched to your certificate source.
- Exports and helpers: a collapsible **Points to confirm with CAST** list (every statement the tool itself labels as inference or unconfirmed), the ports matrix as **CSV** for your network team, a commented **values.yaml starting point** on Kubernetes/OpenShift, a **comparison** of your answers with a saved file, clickable answer chips and a short in-page changelog, a **share link** that carries your answers in the URL fragment (nothing is sent anywhere) and an **installer-variables worksheet** for Windows / Docker / Podman (the share link leaves the client / project name out unless you tick the box), and collapsible sections, a checklist you can read **by phase** (decide, prepare, install, after) as well as by machine / role, and an **Advanced options** question for a custom URL path and certificate-based PostgreSQL connections.
- Everything runs client-side in one HTML file; `tests/` holds the regression checks (syntax, lint, combination sweep, fact fixtures, features, diagram geometry, accessibility) run by the GitHub Action.
- Authentication prerequisites for the exact method you picked (Local / SAML / OpenID Connect / LDAP),
  all brokered through CAST's embedded SSO Service and Auth service.
- CAST Extend access and licensing steps, adapted for direct/proxy/air-gapped egress.
- MCP Server (AI) prerequisites, only shown if you enable that integration.
- A pre-installation checklist built from your actual answers, grouped by the machine or
  role responsible for each item. Ticks are remembered in your browser.

The whole result can be printed / saved as PDF (the questionnaire pane and the
"generated live" wording are hidden from the print output), or saved with **Save as HTML**
as a standalone page. The **Export checklist as HTML** button downloads just the checklist,
with your profile and your current ticks, as a standalone page you can hand to the teams
that own each server. **Save answers (JSON)** downloads everything you filled in — the questionnaire
and the checklist ticks — and **Import answers (JSON)** loads it back later (or on another machine), so a
configuration can be reused, compared or shared; the file is validated and unknown values are ignored.
In air-gapped mode the document also lists the container images to
download and how to carry them to the servers. Everything runs
client-side in the browser — no data leaves the page.

> **Validation notice.** Recommendations are derived from CAST Imaging's published
> documentation structure and standard CAST Software deployment practices. Wherever a
> specific fact couldn't be verified, the tool says so directly in its own text (e.g.
> "not independently confirmed against CAST's docs") rather than presenting a guess as confirmed. Always
> confirm exact minimum versions, default ports, and sizing against the current
> [doc.castsoftware.com/imaging/install](https://doc.castsoftware.com/imaging/install/)
> for the CAST Imaging release you are deploying.

## For contributors: the `cast-imaging-prerequisites` skill

This repo ships a [Claude Code skill](.claude/skills/cast-imaging-prerequisites/) that
exists to keep the validation notice above true, not just printed. Its goal, verbatim
from the skill itself:

> This tool derives recommendations from CAST Imaging's published documentation
> structure and standard CAST deployment practices — that sentence is `cast-imaging-requirements-builder.html`'s own
> validation notice to its users, and it is the bar every claim in the file has to clear.
> The skill's job is to keep that promise true: every fact the tool asserts (a port, a
> supported engine, a mandatory-vs-optional label, a component name) should trace back to
> a CAST doc, a directly-confirmed correction, or a clearly-labeled inference — never to
> an invented plausible-sounding detail.

Concretely, the skill:

- **Audits and fixes** any section of `cast-imaging-requirements-builder.html` — or the whole tool, as parallel
  read-only passes followed by a second pass on the fix's own diff — against
  [`references/documentation-map.md`](.claude/skills/cast-imaging-prerequisites/references/documentation-map.md),
  which maps every questionnaire section to the specific `doc.castsoftware.com` page(s)
  that should back its claims — and hunts for the recurring bug shapes this file has
  produced before (missing gates on `has*(a)` predicates, terminology drift between VM
  and Kubernetes language, self-contradicting a stated sizing floor, vague source text,
  silently bundling alternatives as if all were required).
- **Can build `cast-imaging-requirements-builder.html` from scratch**, using
  [`references/architecture-spec.md`](.claude/skills/cast-imaging-prerequisites/references/architecture-spec.md)
  as the blueprint for the tool's converged shape (two-pane layout, the state model, the
  predicate pattern, the sizing/ports data shapes, the confidence-labeling convention) —
  without exempting a fresh build from the same fact-checking and testing discipline
  applied to a one-line fix.
- **Tests every change** with the suite in [`tests/`](tests/) before shipping — inline-script syntax and ESLint,
  the input-matrix sweep (JS errors, garbage text, duplicate checklist ids, text leaking across cloud providers),
  fact fixtures taken from CAST's own tables, feature checks of the exports, cross-checks between diagram, text and
  references, snapshots of eight realistic profiles (`tests/snapshots/`, refreshed with `node tests/profiles.js --update`
  after reviewing the diff), an axe-core accessibility scan and a diagram geometry check — run by the GitHub Action on every
  PR; and reconciles with `origin/main` before opening a PR, since PRs on this repo tend to merge fast.
- **Remembers decisions and sources.** Choices the maintainer made and the questions still open (e.g. the Gateway port
  on Windows with HTTPS, SMB versus NFS for the Linux shared folder) are in
  [`references/decisions.md`](.claude/skills/cast-imaging-prerequisites/references/decisions.md); every CAST page read, whether it
  was read verbatim, and its "Updated" date are in `references/sources.md`; the facts and findings of each reading pass are in
  `references/documentation-map.md` — so the next audit doesn't re-ask or silently "fix" them. A scheduled task re-reads those
  pages monthly and reports which ones changed; a monthly workflow checks the documentation links.

See the skill's `SKILL.md` for the full workflow.

### `index_ref.html` and `index_test.html`

These are **frozen snapshots from one validation run**, not live copies of the tool — do
not edit them, and do not treat them as ground truth going forward. `index_ref.html` was
a copy of `cast-imaging-requirements-builder.html` at that point in time; `index_test.html` was built from scratch by
an agent with access to *only* the skill's three reference files, to check whether the
skill alone is sufficient to reproduce the real tool. That comparison found a real gap
(the six fixed output sections weren't enumerated anywhere, so the blind build invented
its own taxonomy and never produced a "CAST Extend access & licensing" section at all),
which is now fixed in `architecture-spec.md`. Both files are kept only as a record of
that finding — `cast-imaging-requirements-builder.html` has moved on since and these two intentionally have not.
