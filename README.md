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
integrations, how source code reaches the analysis-nodes, and the deployment context
(standard or audit engagement) — and the document on the right regenerates live:

- Hardware sizing for exactly the profile you selected (not every possible combination),
  composed from your answers rather than a fixed table per scenario — including the
  Kubernetes cluster-node minimum, an architecture diagram of the components and network
  paths that apply, and the OS/runtime and storage requirements.
- A network ports / FQDN allowlist matrix filtered to the flows your configuration
  actually needs — no unused rows, no wildcards, each row confidence-labeled as
  mandatory, conditional, optional, or recommended.
- Database requirements (CAST Imaging supports PostgreSQL only) matched to your chosen
  hosting model, plus Neo4j requirements when your scenario includes the Viewer.
- Reverse proxy (a mandatory prerequisite — Kubernetes Ingress is preselected on
  Kubernetes) and HTTPS/TLS guidance matched to your certificate source.
- Authentication prerequisites for the exact method you picked (Local / SAML / LDAP),
  all brokered through CAST's embedded SSO Service and Auth service.
- CAST Extend access and licensing steps, adapted for direct/proxy/air-gapped egress.
- MCP Server (AI) prerequisites, only shown if you enable that integration.
- A pre-installation checklist built from your actual answers, grouped by the machine or
  role responsible for each item. Ticks are remembered in your browser.

The whole result can be printed / saved as PDF (the questionnaire pane and the
"generated live" wording are hidden from the print output), or saved with **Save as HTML**
as a standalone page. The **Export checklist as HTML** button downloads just the checklist,
with your profile and your current ticks, as a standalone page you can hand to the teams
that own each server. In air-gapped mode the document also lists the container images to
download and how to carry them to the servers. Everything runs
client-side in the browser — no data leaves the page.

> **Validation notice.** Recommendations are derived from CAST Imaging's published
> documentation structure and standard CAST Software deployment practices. Wherever a
> specific fact couldn't be verified, the tool says so directly in its own text (e.g.
> "not independently verified here") rather than presenting a guess as confirmed. Always
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
- **Tests every change** with Playwright across the input matrix before shipping (JS
  errors, garbage text, duplicate checklist ids, diagram screenshots in both themes, print
  and export), and reconciles with `origin/main` before opening a PR, since PRs on this
  repo tend to merge fast.
- **Remembers decisions.** Facts the user supplied, choices they made (e.g. the scenario
  list stays as is) and questions that are still open (e.g. the analysis-node port on
  Windows) are recorded in `references/documentation-map.md` so the next audit doesn't
  re-ask or silently "fix" them.

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
