# index.html architecture spec

Use this when index.html doesn't exist yet, or you've been asked to rebuild it from scratch. It
describes the shape the tool has converged on through many audit-and-fix passes — not because the
shape is sacred, but because each piece exists to solve a real problem that showed up during
those passes. If you deviate from something here, know *why* the original version did it that way
first (grep the git history for the commit that introduced it if the reason isn't obvious).

Building from scratch does not exempt you from the rest of this skill: once you have a first
draft, run the full loop in `SKILL.md` — verify against `references/documentation-map.md`, test
with Playwright across the input matrix, and only then ship. A freshly-built file has had zero
audit passes against it; treat your own first draft with exactly as much suspicion as an old
section you're auditing for the first time.

## What the tool is

A single self-contained HTML file — no build step, no framework, no external dependencies. It's a
two-pane app: a questionnaire on the left drives plain JS that regenerates a results document on
the right, live, on every input change. The whole point is captured in the validation notice that
must appear in the results pane: *"This tool derives recommendations from CAST Imaging's published
documentation structure and standard CAST deployment practices."* Every fact the generated
document states has to earn that sentence — see the Goal section of `SKILL.md`.

## Layout

- `<header class="app-header">` — title + one-line pitch ("generate the exact ... for **your**
  deployment — not a generic checklist").
- `.layout` — flex row containing:
  - `.form-pane` (fixed width, sticky, scrolls independently) — the questionnaire, organized into
    numbered `<fieldset>` sections (see below).
  - `.results-pane` (flex:1, scrolls independently) — a "Generated {date} at {time}" timestamp,
    profile chips, a `.toolbar` with two buttons (**Print / Save as PDF** and **Export checklist as
    HTML** — see "Checklist HTML export" below), a validation-notice callout, a `#results-content`
    div that `render()` overwrites wholesale on every change, and a footer. The timestamp is set from inside `render()`
    (see Content freshness marker below), not just once at load — it exists to tell the reader when
    the *currently-displayed* content was produced, which is only true if it updates every time the
    content actually changes.
- A `@media print` block hides the form pane, the toolbar and every `.screen-only` element so
  "Print / Save as PDF" produces a clean document of just the generated content. `.screen-only`
  marks wording that only makes sense on the live page — the header pitch ("Answer the questions on
  the left…"), "Generated live from the answers on the left" and the footer's "Regenerated live in
  your browser" — and the HTML export strips those same elements. `h3, h4 {break-after:avoid}`
  keeps headings from being orphaned at the bottom of a printed page. (The validation notice is
  `.callout.warn.no-print`, but the print block only hides the header/toolbar/form pane, so it does
  still print — an open choice, not an accident to "fix" silently.) It also redefines the same `:root` custom properties to
  a light palette (see below) — print is this tool's only non-dark rendering context, and it went
  a long time silently broken: the print block only ever set `body{background:#fff}`, leaving
  every fieldset/callout/table/chip/diagram box on its own dark `var(--panel*)` background with
  hardcoded `color:#fff` text sitting on top — readable on screen, largely invisible once the page
  background actually turned white. Since almost everything in this file is built on the `:root`
  custom properties, redefining them inside `@media print` fixes most of the page in one place;
  the remaining literal hex colors (`h1`, `h2.page-title`, `h3`, `.chip b`, `.callout b`,
  `thead th`, `p`, `ul`/`ol`, `.chip`, `tbody td`, and the four `.tag.*` variants) need their own
  print overrides listed right there in the same block — if you add a new element with a literal
  (non-`var()`) text color, add its print override alongside these, in the same edit.
- Dark theme by default, plus an interactive light-mode toggle (`#theme-toggle` in the header,
  `data-theme="light"` on `<html>`, persisted in `localStorage['theme']`). Two hardcoded-color
  problems had to be solved once, not twice, to add this cleanly:
  - **Text colors that weren't already a variable.** `h1`/`h2.page-title`/`h3`/`.chip b`/
    `.callout b`/`thead th` were hardcoded `color:#fff`, and `p`/`ul`/`ol`/`.chip`/`tbody td` were
    hardcoded `color:#cfd8e2` — both fine on the one dark background they were written for, both
    invisible-or-wrong on a light one. Introduced two new semantic variables for exactly this,
    `--heading` and `--body-text`, defined in the dark `:root` (`#fff` / `#cfd8e2`, i.e. unchanged
    visually) and redefined under `:root[data-theme="light"]` (`#111827` / `#374151`). Every rule
    above now reads through the variable instead of the literal hex. If you add a new rule with a
    literal text color instead of `var(--heading)`/`var(--body-text)`/an existing variable, you've
    reintroduced this exact bug for light mode.
  - **The `@media print` block** used to hardcode its own light-mode overrides for this same set of
    selectors (see the earlier note about print's default palette). Once `--heading`/`--body-text`
    existed, print's `:root` override could just set them too and delete the parallel literal-color
    ruleset — one light palette definition, reused by both the print block and the interactive
    toggle, instead of two that could drift apart.
  - A couple of non-text rules needed their own light variant since a literal white/black overlay
    doesn't invert automatically: `.opt:hover`'s `rgba(255,255,255,.03)` highlight is invisible on
    a white background, so `:root[data-theme="light"] .opt:hover` overrides it to
    `rgba(0,0,0,.04)`.
- **Tag pills and the Gateway box have light-theme variants of their own.** The four `.tag.*`
  badges use light-on-dark colours by default (`#ff9c92`, `#f2b84b`, `#59d0a0`, `#7cc4ff`), which are
  washed out on white — the print block overrides them, and so does `:root[data-theme="light"]`
  (copy of the print rules). The Gateway box is filled with `var(--accent)`, so its text uses the
  `--on-accent` token (`#04101c` in dark, `#ffffff` in light and in print) instead of a literal hex.
- The architecture diagram's `box()` helper defaults its title-text fill to `var(--text)` (not a
  hardcoded `#fff`) for exactly this reason: it's visually identical to `#fff` against the normal
  dark `--text` value (`#e6edf3`, off-white), but automatically goes dark in print *and* in the
  interactive light toggle once `--text` is redefined there — no per-box-type override needed
  either place. Any new box-title color should default through a variable the same way; a literal
  hex here is the same trap the rest of the page fell into.

## Profile chips

`#profile-chips` shows one chip per questionnaire answer that shapes the output, in form order, so
the profile (which also heads the HTML checklist export) fully identifies the configuration it was
built from: scale, users, platform, scenario, topology (via `topologyLabel(a)`), then conditionally
the analysis-node count (multi + analysis) and "Neo4j: dedicated" (multi + Viewer + dedicated), then
database hosting, egress, reverse proxy, HTTPS, auth, and the optional chips (MCP/AI with provider,
Highlight, email, source code access when analysis is in scope and a method is ticked, and the
deployment context). Build them through the small `chip(label, value)` helper; when you add a
questionnaire answer that changes the output, add its chip in the same edit.

## Questionnaire controls: one rule

Single-choice questions are **radio option cards** (`.opt-row` of `label.opt`, bold title plus a
one-line description) — platform, scenario, topology, analysis-node count, scale, users,
database hosting, egress, reverse proxy, certificate source, authentication, LLM provider, audit
context. **Checkboxes are only for independent yes/no toggles** (the integrations, the two
source-code methods, dedicated Neo4j), and each such group says "tick every … that applies". An
earlier build mixed `<select>`s, radios and checkboxes for the same kind of question; don't
reintroduce a `<select>`. `state()` reads every single-choice control with
`document.querySelector('input[name=…]:checked').value`; to set one programmatically (the
reverse-proxy default, tests) check the radio and dispatch `change`.

**Client / Project** — an unnumbered fieldset at the very top (so questionnaire numbering and every
"question N" reference stay put) holds a text input `#clientProject`. `state()` exposes it as
`a.clientProject` (whitespace-collapsed). It appears under the results title, as the first profile
chip, in `document.title`, and in both HTML exports (page title, file name slug). It is kept in
`localStorage['castImagingClientProject']`, always through `esc()`/`textContent` — it is free text.

## Questionnaire sections (numbered fieldsets)

These are the sections as of the current build. If requirements change, renumber consistently —
render() references section numbers in generated text (e.g. "see Section 3"), so a renumber has to
be a search-and-fix pass, not a rename in isolation.

1. **Platform & topology** — host platform (Docker / Podman / Kubernetes / Windows Server, radio),
   deployment scenario (select: which components exist — this is what later drives every
   `has*(a)` predicate), topology (single machine / multi-machine, radio), plus conditional
   sub-blocks that only show when relevant (analysis-node count when topology is multi and the
   scenario includes analysis; a Neo4j-dedicated-machine checkbox when topology is multi and the
   scenario includes the Viewer). On Kubernetes the two topology options are relabelled by
   `render()` — **Single node pool** (no dedicated-node isolation, still 2 cluster nodes minimum)
   and **Isolated nodes** (analysis-node, and optionally Neo4j, pods isolated on their own cluster
   nodes) — because "single/multi pod" was never what the choice meant there; `topologyLabel(a)`
   returns the same words for the chips and callouts.

   The scenario `<select>` has exactly these five `value`s — don't infer a different set from the
   predicates alone; the predicates are derived from these five, not the other way around:

   | `value` | Meaning | Components | `hasAnalysis` | `hasViewer` | `hasDashboards` |
   |---|---|---|---|---|---|
   | `full` | Everything | imaging-services, analysis-node, imaging-viewer, dashboards | ✓ | ✓ | ✓ |
   | `analysis-dashboards` | Analysis + KPIs, no graph drill-down | imaging-services, analysis-node, dashboards (no Viewer, no Neo4j) | ✓ | | ✓ |
   | `viewer-readonly` | Browse existing results only | imaging-services, imaging-viewer, dashboards (no analysis-node) | | ✓ | ✓ |
   | `dashboards-only` | KPIs only, no graph drill-down | imaging-services, dashboards (no Viewer, no analysis-node) | | | ✓ |
   | `analysis-only` | Headless, API/CI-driven | imaging-services, analysis-node (no UI at all) | ✓ | | |

   `hasNeo4j(a)` is just `hasViewer(a)` (Neo4j only exists to serve the Viewer, so don't give it
   an independent definition). If you ever add another scenario, add its row to this table first,
   then work out which predicates it should satisfy — don't reverse-engineer a scenario from
   predicate behavior you want.
2. **Project scale** — application count band (drives sizing baseline) and concurrent-user band
   (drives a RAM/CPU bonus on the UI-serving node, only when the scenario actually has a UI). Both
   are `opt-row` radio groups (like Platform/Topology), not `<select>`s — read via
   `document.querySelector('input[name=scale]:checked')` in `state()`. The radio options show only
   the bare range (e.g. "50–150 applications") — no category name (Small Team/Standard Production/
   etc.) or descriptive tagline; `LABELS.scale` holds the same bare range strings so the profile chip
   ("scale: 50–150 applications") stays consistent with the selector instead of surfacing an internal
   tier name nothing else in the UI shows. `render()` builds a `scaleProfileHtml` callout at the top
   of the sizing section combining the app-count and concurrent-user ranges into one line — see the
   Sizing model section below for how the underlying numbers are derived (the explanatory callout
   that used to cite CAST's documented anchor point here was removed per user request; the anchoring
   still lives only in `SIZING`'s actual values and in the reference docs, not in the tool's own UI).
3. **Database** — RDBMS is a fixed fact (PostgreSQL only — CAST doesn't support alternatives, so
   don't build this as a choice), plus a hosting model choice (co-located / dedicated / managed).
4. **Network egress** — direct outbound / via proxy / air-gapped. This alone reshapes several rows
   in the ports matrix (CAST Extend path, Docker Hub pull path, LLM/Highlight rows needing an
   explicit air-gap exception).
5. **Reverse proxy** — which reverse proxy/Ingress is in front of Gateway (or "not decided yet").
   This is a **mandatory prerequisite independent of HTTPS** — CAST Imaging is not intended to run
   with Gateway directly internet-facing, so don't fold this into the HTTPS section or make it
   conditional on HTTPS being enabled. Kept as its own section (split out from HTTPS after an
   earlier draft combined them and blurred that independence). The select **defaults to the
   platform's natural choice** — Kubernetes Ingress on Kubernetes, an external reverse proxy
   elsewhere — via `syncReverseProxyDefault()`, which keeps following the platform until the user
   changes the select themselves (`reverseProxyTouched`), after which their choice is never
   overwritten. Impossible pairs (IIS + ARR off Windows, Ingress off Kubernetes) aren't blocked;
   the HTTPS section shows a warning callout (`proxyMismatchHtml`) and the checklist item says
   "incompatible with your platform".
6. **HTTPS** — certificate source and TLS termination point. Kept separate from egress (Section 4)
   and from Reverse proxy (Section 5) because all three are orthogonal decisions a reader might
   answer differently. The certificate-source choice includes a real "no HTTPS — serve over plain
   HTTP" option, not just CA-issued/self-signed — HTTPS itself is highly recommended but not
   mandatory (unlike the reverse proxy). The one hard exception: **SAML SSO requires HTTPS** (the
   browser/IdP redirect flow needs an HTTPS callback URL), so if `a.auth==='saml'` and the cert
   source is "none", surface that as an explicit conflict in the HTTPS section's own output — don't
   let the two answers silently contradict each other.
7. **User authentication** — how *users* sign in: Local / SAML / LDAP, radio (the legend, the chip and the
   results heading say "User authentication" to distinguish it from service-to-service auth). All three are brokered through CAST's embedded
   **SSO Service** (8096, `/auth`) and **Auth service** (8092, `/oauth2`) — not "Keycloak"; that was
   this tool's own earlier incorrect guess at the underlying broker's identity before a user-supplied
   architecture diagram confirmed the real component names. Don't build rows that bypass Gateway's
   `/auth`/`/oauth2` routing to reach these directly (a past bug: a headless API-client row sent
   traffic straight to "Auth service" on its own port instead of through Gateway).
8. **Optional integrations** — MCP/AI (with LLM provider sub-select), CAST Highlight, email
   notifications. Each is a checkbox that adds rows/sections conditionally rather than replacing
   anything.
9. **Source code access** — how source reaches the analysis-nodes. CAST Imaging v3 takes source as
   a **ZIP upload** through the Console (no extra port — it uses the normal reverse-proxy entry
   point) or from a **source folder location** every analysis-node can read (CAST recommends a
   shared network drive). The two checkboxes therefore mean: *Git/SVN/DevOps clones prepared by
   your own tooling* (`repoHttps` — port 443 from the customer's clone/CI host, tagged
   `conditional`, explicitly **not** a CAST Imaging component: CAST doesn't pull from repositories
   itself) and *Source folder on SMB file shares* (`repoSmb` — 445 from every analysis-node,
   `mandatory`). Both only produce rows when the scenario includes analysis — gate on
   `hasAnalysis(a)`; the hint under the legend always explains the ZIP-or-folder model, and says
   so explicitly when the options are inert for the current scenario.
10. **Deployment context (audit, …)** — currently just the Audit context field (`hasAuditContext(a)`,
    standard vs. audit/structural-analysis engagement), named generically since more
    non-architectural, client-side deployment-context flags may join it here later —
    deliberately placed last, after every other questionnaire section, since it's a client-side-only
    add-on rather than a deployment-architecture decision like Sections 1-9. Standard deployments
    only need CAST Report Generator on the end-user workstation; an audit engagement additionally
    needs the `AUDIT_WORKSTATION_TOOLS` list (VS Code, Notepad++, KDiff3, Word/Excel/PowerPoint,
    DBeaver, Python 3.15) — user-supplied desktop tooling for analysts, labeled as given rather than
    CAST-confirmed since `doc.castsoftware.com` has no opinion on it.

    CAST Report Generator itself, unlike the audit-tooling list, *is* CAST-published (confirmed via
    user-supplied PDF exports of `install/report-generator/` and
    `export-v2/doccom/cast-report-generator/`): a standalone tool, not bundled with CAST Imaging.
    The interactive UI variant is Windows-only; a separate CLI-only "Report Generator for
    Dashboards" variant also runs on Linux. It requires Microsoft .NET 8 SDK (its installer offers
    to install this automatically) and an API key generated from the CAST Imaging user profile, and
    connects to Gateway's `/dashboards/rest` path — gated on
    `hasDashboards(a)` in both `buildPortRows()` and `buildArchitectureDiagram(a)`, which draws it
    as its own box (`reportGenBox`, positioned mirror-image to the Tester/admin workstation box on
    the other side of Browser) with a solid `FLOW` line straight into Gateway, since it reuses the
    exact same network entry point as the End-user browser rows rather than being a distinct path.
    Microsoft Office is *not* required to generate reports, only to open/edit the output or
    customize templates — don't conflate this with the audit-tooling list's separate
    Word/Excel/PowerPoint requirement, even though in practice one satisfies the other when both
    apply.

Two numbering schemes coexist and must never be mixed in prose. **"Section N" always means a
*results* section** (1 Hardware sizing, 2 Database, 3 Network ports, 4 Reverse Proxy & HTTPS,
5 Authentication, 6 CAST Extend, 7 MCP when enabled, then the checklist); **questionnaire
fieldsets are always written "question N"** (e.g. "see question 9", "the HTTPS answer (question
6)"). An early build wrote "Section 7" for the authentication *questionnaire* fieldset inside
results text, which pointed at the MCP/checklist section instead. If you ever renumber either
scheme, grep the whole file for `Section \d` and `question \d` and fix every reference in the same
pass — a renumber that only touches headings or `<legend>` tags leaves the prose pointing at the
wrong place.

## State model

One `state()` function reads every form control by ID/name and returns a flat plain object. Every
other function takes that object (conventionally named `a`) as its only argument — no globals, no
hidden state, no reading the DOM anywhere except inside `state()` itself. This is what makes the
tool testable by just calling `render()` after mutating inputs, and what makes an audit tractable:
you can trace any generated sentence back to the exact input that produced it.

## The `has*(a)` predicate pattern

Don't scatter `a.scenario === 'full' || a.scenario === 'analysis-only'` inline through the file —
name the concept once as a function and call it everywhere:

```js
function hasAnalysis(a){ return a.scenario === 'full' || a.scenario === 'analysis-dashboards' || a.scenario === 'analysis-only'; }
function hasViewer(a){ return a.scenario === 'full' || a.scenario === 'viewer-readonly'; }
function hasDashboards(a){ return a.scenario !== 'analysis-only'; }
function hasNeo4j(a){ return hasViewer(a); }
function hasUiScenario(a){ return hasViewer(a) || hasDashboards(a); }
// multi topology only distributes anything when there's an analysis-node or a dedicated Neo4j to move
function hasDistributedNodes(a){ return a.topology === 'multi' && (hasAnalysis(a) || (hasNeo4j(a) && a.neo4jDedicated)); }
```

Gate multi-server-only requirements (shared storage, inter-node paths, UID/service-account
alignment, the "every server" admin rows) on `hasDistributedNodes(a)`, not on
`a.topology === 'multi'` — a multi topology with a scenario that has nothing to move off the core
node still yields one CAST server, and `render()` says so in a "Nothing to distribute in this
scenario" callout. Two more small shared helpers follow the same rule of being named once:
`needsSharedStorage(a)` (VM platforms: `hasDistributedNodes(a)`; Kubernetes: only when several
analysis-node pods run, since CAST defaults to per-node block storage there) and
`clientPort(a)`/`clientProto(a)` (443/HTTPS, or 80/HTTP when the HTTPS answer is "none" — the port
clients use to reach the reverse proxy).

Every row or sizing entry that depends on "does this deployment have a UI at all", "does it run
analysis", etc. must call the predicate, not re-derive the condition. The single worst bug class
this tool has produced (found twice in audits) is a row that reads a raw `a.scenario` comparison
instead of the matching predicate, so it silently falls out of sync when the predicate's
definition changes. If you add a new cross-cutting concept (a new component, a new mode), add a
predicate for it before you use it in more than one place.

## Sizing model

`SIZING` is a plain object keyed by scale band, each holding baseline `{cpu, ram, disk}` specs for
the roles that can exist (`single` for all-in-one, `core`/`analysis`/`neo4j` for multi-machine
roles, `postgresDedicated`/`postgresManaged` for a non-co-located PostgreSQL — these used to be
hardcoded flat numbers outside `SIZING` entirely, at every scale, which is what let them fall below
CAST's own documented floor; see the anchor note below), plus a `singleWarnLevel` ('', 'discouraged',
or 'strongly-discouraged') for scale bands where
all-in-one is discouraged — `render()` turns that into the actual annotation text, since the wording
needs `isK8s` (a hardcoded "prefer multi-machine" string was a real bug found auditing: it survived
unchanged even when `platform === 'kubernetes'`, so it told a Kubernetes user to "use multi-machine/
Kubernetes" while already on Kubernetes). Don't put full sentences needing `isK8s` back into `SIZING`
itself — keep it a plain data table and do platform-aware phrasing in `render()`.
`render()` composes the actual sizing table from these baselines plus the current `has*(a)`
answers — it does not hardcode a table per scenario. Component labels for each row are built by
small `*ComponentList(a)` helper functions that push component names conditionally, so the label
always reflects exactly what's running, not a guess.

Two floors get asserted as callouts on every render, not just baked silently into the numbers:
disk (an absolute per-node minimum) and RAM (different floors for standalone vs. distributed
topology). If you add sizing rows, make sure they still respect — or explicitly justify not
respecting — whatever floors are already asserted; a hardcoded number below an asserted floor is
a self-contradiction an audit will (and has) caught.

**The `standard`/`small`/`enterprise` disk numbers are anchored to one real CAST data point, not
invented.** A user-supplied PDF of CAST's "What hardware do I need?" doc gives a concrete example:
managing up to 50 applications with up to 5 parallel analyses on one node needs 32 GB RAM / 2048 GB
disk for that node, and 64 GB RAM / 3072 GB disk for its PostgreSQL instance. The `small` tier (whose
app-count band spans 50) uses this anchor directly; `standard`/`enterprise` are simple, explicitly-
labeled multiples of it (2x/4x) rather than a researched figure, because CAST states there is no
linear formula relating app count to sizing — don't tighten those without new primary evidence. The
tool used to show a `sizingHtml` callout citing this anchor and calling out the extrapolation
explicitly; it was removed from the UI per user request (2026-09-17) and **re-added by mistake
during an audit, then removed again** — so this reasoning lives only here and in
`documentation-map.md`. Don't re-add it, and don't silently drift `standard`/`enterprise` away
from "2x/4x of the small-tier anchor" just because the UI no longer states the rule out loud.
PostgreSQL disk is exactly 3072 / 6144 / 12288 GB for `small` / `standard` / `enterprise`; the
`poc` band (< 50 applications) deliberately sits below CAST's "up to 50 applications" example
because it assumes only one or two parallel analyses. Before this fix, `postgresDedicated`/
`postgresManaged` were flat numbers (512 GB / 1024 GB) applied at every scale — below the anchor's
3072 GB even at `enterprise`, a self-contradiction against the tool's own cited source that an
audit caught.

**Three adjustments are applied to `sizingRows[0]` (the all-in-one or core row) after the rows are
built, in this order:** (1) when `dbHosting === 'colocated'`, the row also carries
`postgresDedicated` CPU/RAM/disk — without this the all-in-one server was *smaller* than CAST's
own figure for the PostgreSQL instance alone — and a short callout says so; (2) when topology is
`multi` but `!hasDistributedNodes(a)`, RAM is raised to the standalone 32 GB floor (that one row is
the only CAST server, so the 16 GB "distributed" floor doesn't apply); (3) the concurrent-user
bonus (UI scenarios only). The **MCP servers** (2 vCPU / 4 GB / 20 GB) are then folded into the same
row and named in its label — CAST allows co-locating them with other components — rather than
listed as a separate server, which used to produce a sub-floor "extra machine" and a nonsensical
"2 servers" footprint on a single-machine topology.

**Kubernetes cluster-node floor is a separate model from the pod-request rows above it** — a real
gap found auditing against CAST's own "What hardware do I need?" doc (user-supplied PDF). The
`SIZING`-derived rows in the sizing table are per-*pod* resource requests; Kubernetes is additionally
sized at the *cluster* level (how many underlying nodes the pool needs), which per that doc is 2
nodes minimum, 4 vCPU/node minimum, 32 GB RAM/node minimum (64 GB recommended, 128 GB for multiple
complex/large applications), scaling via `AnalysisNodeReplicaCount` (+1 node per analysis-node
replica beyond the first) and the `EnforceAnalysisNodeIsolation`/`EnforceNeo4jIsolation` Helm flags
(+1 node total for isolating that workload onto its own dedicated node — the doc only ever shows
these two enabled together, so don't assume they're independently additive without new evidence).
`render()` computes this as `k8sMinNodes = max(k8sFloorNodes, k8sCapacityNodes)`: the floor is base 2
+ isolation bonus + replica-count bonus (the replica count only counts in `multi` topology — a
hidden analysis-node answer must not leak into a single node pool), and the capacity term is the
number of 4 vCPU / 32 GB nodes needed to hold the listed pod requests (`ceil(ΣRAM/32)`,
`ceil(ΣvCPU/4)`) — otherwise the default profile asked for 96 GB of pods on a "2 node" cluster. A
PostgreSQL that is dedicated or managed sits *outside* the cluster, so `k8sPodRequestCount`
excludes its row. It is surfaced in both the `isK8s` branch of `machineSummaryHtml` and a dedicated
callout in `sizingHtml` — don't let the two drift, same discipline as the machine-count summary
below. `EnforcePostgresIsolation` (isolating the *embedded* PostgreSQL pod onto its own
node) is **not** modeled in `k8sMinNodes` — this tool has no input representing it — so the callout
says so explicitly rather than silently under-counting; don't add it without first adding a real
input for it.

## Architecture diagram conventions

`buildArchitectureDiagram(a)` renders an inline SVG that answers one question: *what actually
needs a network path to what, for this exact combination of answers.* It went through roughly
fifteen audit rounds (one per component box) before converging on the rules below — the single
most common finding across those rounds was a **diagram/text mismatch** (see the matching bug
shape in `SKILL.md` step 3): a connection or port the ports table/component list already asserted
as fact, silently missing from the picture. When you touch this function, re-derive every line it
should contain from `componentRows`/`buildPortRows()` for the box you're changing, not just from
what already happens to be drawn.

- **Layout is computed, not hardcoded.** A small `layoutRow(items, width)` helper takes an array of
  `{key, label, sub}` box specs and returns them centered as a group at a given box width (shrunk
  to `(W-40-gaps)/n` when the row would overflow the viewBox — eight routed boxes with MCP enabled
  used to be clipped on both edges); a row with no items doesn't reserve vertical space either
  (`dashboards-only` has no supporting services) — every
  row (routed services, supporting services, data tier) is built by pushing conditional items onto
  an array *before* calling `layoutRow`, the same way `buildPortRows()` pushes conditional rows.
  This is what makes boxes that don't apply to the current answers disappear and the *remaining*
  ones re-center, instead of leaving a gap or requiring hardcoded per-scenario coordinates.
- **Four line colors, one meaning each** (declared once as `FLOW`/`ROUTE`/`SHARED`/`TESTONLY`
  locals): `FLOW` (`var(--text-dim)`, solid) = a confirmed direct internal call; `ROUTE`
  (`var(--accent)`, dashed) = Gateway's confirmed URL-path routing; `SHARED` (`var(--accent-2)`,
  dashed) = shared-storage read/write; `TESTONLY` (`var(--warn)`, dashed) = a setup/testing-only
  bypass that must be closed before production. Don't reuse `ROUTE`'s dashed-blue styling for a
  relationship that isn't actually URL-path routing through Gateway — that's what caused the
  AI-service line to overstate its own confirmed-ness (see the next point).
- **Box fill must contrast with the diagram background, not match it.** `box(b, yy, opts)`'s
  default fill is `var(--panel-2)`, a shade lighter than `.arch-diagram-frame`'s own
  `var(--panel-alt)` background — they used to be the same color, which meant every default box
  was distinguishable only by its faint `var(--border)` outline and effectively invisible as a
  distinct "card." If you add a new default-styled box, don't fill it with `--panel-alt` again.
- **Three categorical colors mark which boxes run on their own machine**, applied via the
  `machineBoxOpts(strokeColor, fillColor, dashed)` helper (a tinted fill plus a matching border/
  sub-text color, `dashed` for "not actually your infrastructure" like a managed DBaaS): violet
  `--m-analysis`/`--m-analysis-fill` for Analysis-node(s) when `a.topology==='multi'`, pink
  `--m-neo4j`/`--m-neo4j-fill` for a dedicated Neo4j, orange `--m-db`/`--m-db-fill` for a dedicated
  or managed PostgreSQL (dashed only for `managed`, since that's a cloud service not a machine).
  The Extend Local Server does *not* get one of these — see the machine-count note below for why —
  it keeps its own plain `stroke:'var(--accent-2)'` highlight instead, same as before machine
  colors existed. These colors are in addition to, not instead of, the existing "· own machine"
  text on the box's `sub` — color alone isn't accessible to colorblind readers or screen readers.
  Each color has a matching conditional entry in the `.arch-legend` block (a small `i.box` swatch)
  — add one whenever you add a new machine color, gated on the same condition that triggers the
  box styling.
- **Confidence in the line must match confidence in the text.** If `componentRows` or a nearby
  callout says a relationship "is not confirmed by the source diagram," the line for it must look
  less certain than a confirmed one — not just carry a caveat label next to an otherwise-identical
  line. The convention: a fine dotted stroke (`stroke-dasharray="2 3"`) at reduced opacity (`.55`)
  plus a small "link not confirmed" label. Don't route a *separately confirmed* fact (like the core
  node's confirmed `:8085` path to the Extend Local Server) through a box whose *own* link is
  unconfirmed just because it's nearby — that borrows uncertainty the fact doesn't have. Route
  confirmed facts from Gateway directly instead, even if that means a longer line. Gateway → AI-
  service used to be the worked example of this ("link not confirmed" dashed line) until a
  user-supplied architecture diagram confirmed the real connection: Viewer → AI-service (`http
  :8082`), not Gateway → AI-service at all — AI-service is only reached through the Viewer, so it
  now draws as a solid `FLOW` line from `viewerBox`, gated on `viewerBox` existing (no Viewer, no
  line at all — an unconnected box is more honest than a fabricated Gateway link). AI-service
  is part of imaging-viewer (alongside ETL, imaging-apis and Neo4j), so the box itself, its
  `componentRows` entry and its line are all gated on `hasViewer(a)`; Gateway's routed-path list
  likewise names `/imaging` and `/dashboards` only when those components exist. The same diagram
  also confirmed the two MCP ports (Imaging MCP `:8282`, Gatekeeper MCP `:8283`), both reached
  through Gateway path-routing (`/mcp`, `/mcp/gatekeeper`) exactly like every other routed
  component — they're pushed into `routedItems` alongside Console/Auth/SSO/Admin/Viewer/Dashboards,
  not modeled as a separate direct connection the way the network-ports table used to (before this
  diagram, the MCP client's port was itself marked "not confirmed").
- **Every line states its port.** Every connector in the diagram has a label naming the port it
  uses (`label(x, y, text, color)`), even ones that look self-explanatory from the box text alone —
  this was violated and then fixed for the PostgreSQL↔ETL↔Neo4j chain and for Viewer→Viewer-APIs.
  When you add a new connector, add its label in the same edit; don't leave it for a later pass.
- **Long or crowded connections route through the margin, not through the middle.** A straight line
  between two boxes that aren't vertically adjacent will cut through whatever box sits between them
  (this happened to Viewer→Neo4j through Viewer-APIs, and to the Gateway→shared-storage/Extend/
  PostgreSQL "core node" lines, which all travel between rows far apart). The fix used throughout:
  route via an empty margin — `M{start} L{marginX},{startY} L{marginX},{endY} L{end}` for an
  orthogonal path down the left margin (`marginX` around 20–40, each core-node line at its own
  `marginX` so parallel ones stay visually distinct), or a bezier that bulges past the obstructing
  box's far edge for a shorter diagonal hop. Never let two independent lines share the exact same
  start point *and* nearly the same path — the one drawn later will visually swallow the earlier
  one (this happened to Analysis-node's lines to the Extend Local Server and to shared storage
  until their start x-offsets were separated). **No line may cross a box**: an audit screenshotted
  every combination and found the analysis-node links cutting through SSO Service, AI-service,
  Viewer-APIs and PostgreSQL. The current routes: Gateway → analysis-node is drawn as one path
  through the 16 px gap between two routed boxes nearest the analysis box (two-way arrow in multi
  topology — see the return-path row in the ports matrix); the analysis-node's links to the Extend
  box and to shared storage leave from its *bottom* edge into the lane between rows
  (`bottomLane(...)`), then run down a right-hand margin lane (`laneR`, each link on its own
  x-offset) and enter the target from the side. Check both a dark and a light screenshot of a
  full+MCP+multi+air-gapped diagram and a headless one after touching any line.
- **Boxes present regardless of scenario need a connection drawn for every confirmed relationship,
  not just the most obvious one.** Gateway/imaging-services connects to PostgreSQL unconditionally
  (`buildPortRows()` has always had this row with no gate) — the diagram went a long time only
  showing the conditional Analysis-node→PostgreSQL line, so any scenario without analysis
  (`dashboards-only`, `viewer-readonly`) showed PostgreSQL with zero connections at all. When a
  component is always present, check `buildPortRows()` for *every* row naming it, not just the one
  that happens to already have a line.
- **A box only gets a line for a relationship the current answers actually create.** The inverse of
  the point above: Neo4j only needs its own shared-storage line when `a.neo4jDedicated` is true (a
  co-located Neo4j is already covered by the core node's line) — drawing it unconditionally implied
  a separate machine that, per the user's own answers, doesn't exist. Match every connection's
  condition to the same predicate that gates the fact it represents, not just to "does this box
  exist."
- **The Tester/admin workstation box and its three bypass lines** (Gateway `:8090` always —
  including headless scenarios —, Control Panel `:8098–2381` always, SSO Service `:8096` only when
  `hasUiScenario(a)`) must mirror `buildPortRows()`'s own tester rows exactly, including the gate on
  the SSO Service line. (A fix PR once moved the Gateway line inside the UI gate and made the
  headless diagram disagree with the ports table; the next audit caught it.) The "Browser" box
  becomes "API client / CI" when `!hasUiScenario(a)`, and the CAST Report Generator box connects to
  the **reverse proxy**, not straight to Gateway, like every other client. Position this box independently from Browser (don't put them in the same
  `layoutRow` call) — centering them as a pair shifts Browser off the vertical axis it needs to
  share with Reverse proxy and Gateway below it.
- **The Extend Local Server is optional, `extend.castsoftware.com` is not — except offline.** In
  `direct`/`proxy` egress the core node *and the analysis-node(s)* connect to
  `extend.castsoftware.com` directly (solid lines, margin-routed); `airgapped` egress instead shows
  the Local Server as the intermediate hop (the core node and analysis-node(s) both reach it on
  `:8085`), and its own link to `extend.castsoftware.com` is **dashed and labelled "online mode
  only"** because CAST documents an offline mode (no external connection, extensions uploaded
  manually). On Windows the Local Server is the `CAST_ExtendProxy` service, elsewhere the
  `extend-proxy` container — use the right word in box subtitles and row destinations. The caption
  lists only the egress exceptions the answers actually create (Highlight, an external SAML IdP),
  never a generic "other exceptions you selected".
  Gating the whole `extend.castsoftware.com` box on `a.egress==='airgapped'` — so it disappeared
  entirely for the two more common egress modes — was a real bug found auditing this box.
- **Machine-count summary — derive it from `sizingRows`, never recompute it separately.**
  `render()` computes `serverMachineCount` (`sizingRows.length`, minus 1 if `dbHosting==='managed'`
  since that row is a cloud service you don't provision; on Kubernetes the pod count is
  `k8sPodRequestCount`, which also leaves out a dedicated database — the Extend Local Server is never counted
  here, since it's co-located with whichever host runs Gateway/imaging-services, not a separately
  provisioned machine) and `workstationRoleCount` (1 for the end-user workstation, +1 when
  `hasAnalysis(a)` for the delivery/analyst workstation; note `workstationMachineCount` is always
  `1` since one physical workstation can cover multiple roles — `workstationDesc` is the
  human-readable string built from these two) right after `sizingRows` is finalized (MCP is already
  folded into row 0 by then), then passes both into `buildArchitectureDiagram(a, counts)` and into the
  `<h3>1. Hardware sizing...</h3>` callout. Don't add a second, independent count inside the diagram
  function itself — that's exactly the kind of drift that produces a diagram/text mismatch when
  `sizingRows`'s composition changes later. The diagram renders the totals as its own header line
  (`counts.serverMachineCount` / `counts.workstationRoleCount`) and appends `· own {machine|pod}` to
  the `sub` text of every box that isn't part of the implicit core/all-in-one node (Analysis-node(s),
  a dedicated Neo4j, a dedicated/managed PostgreSQL — "outside the cluster" instead of "own pod" for
  a dedicated database on Kubernetes). On Kubernetes the header and caption say "pod resource
  request(s)" and "core pods", never "server machine(s)" or "core/all-in-one machine". This per-box annotation, not a bounding
  rectangle around groups of boxes, is the safe way to show grouping: a single rectangle spanning
  multiple rows can't correctly exclude one box sitting inside a row it otherwise needs to enclose
  (e.g. Analysis-node sits in the same row as AI-service/Viewer-APIs, which *are* part of the core
  node), so don't attempt that without solving the exclusion problem first.

## Ports/FQDN matrix

**Database links.** Beyond imaging-services' and the analysis-node's own rows, the table has a row for
the **SSO Service** (a dedicated `keycloak` database on the same PostgreSQL — documented, tagged
`mandatory`) and one conditional row for **Console, Control Panel and Dashboards** (inferred from
older Console docs' `aip-config`/`aip-node` schemas and the Measurement Service schema — *not*
confirmed for v3). The diagram draws SSO as a solid stub and the other three as **dotted,
reduced-opacity** stubs ("inferred, not confirmed" legend entry), both tee-ing into the core-node
lane to PostgreSQL. No database link was found for Auth service, Gateway, AI-service, Viewer-APIs,
Viewer or the MCP servers — don't add one without a source.

**Extend Local Server feed.** Online: it pulls extensions on demand from `extend.castsoftware.com`
(HTTPS 443). Offline: it is populated manually — an `.extarchive` bundle prepared with ExtendCli on an
internet-connected host is uploaded to `host:8085` (`POST /api/synchronization/bundle/upload`, API key
header — documented for the older CAST Extend Offline, shown for the Local Server in search results,
**not verified** for the current release, and labelled so). The diagram adds an "Offline feed host"
box under the Local Server (air-gapped only) and the table an "Admin / feed host (offline mode)" row.

The matrix models the **mandatory reverse proxy** explicitly: every client flow (End-user browser,
API client, CAST Report Generator, MCP client) targets *"Reverse proxy (<chosen kind>)"* on
`clientPort(a)`, followed by one mandatory **reverse proxy → Gateway :8090** row — Gateway never
appears as the destination of a client flow. (An early version listed `443` and `8090` as two
browser alternatives straight to Gateway, which skipped the proxy the tool itself calls mandatory.)
Other conventions worth keeping: the **return path** analysis-node → imaging-services/Gateway is its
own mandatory row in multi topology, labelled as an inference (CAST's multi-machine pages say to
open the hardware-page ports on each machine, but the exact ports aren't itemised) next to the
core → analysis-node `:8089` row; with the `proxy` egress answer a mandatory
**servers → corporate HTTP(S) proxy** row (port "per your proxy") notes that the container engine
needs its own `HTTP(S)_PROXY` for image pulls; the LLM row's source is the **MCP client host**, not
the CAST servers; the Gatekeeper → IdP row only applies to an *external* IdP; SSH/RDP admin rows say
"every CAST Imaging machine" when `hasDistributedNodes(a)`; Kubernetes tester rows mention
`kubectl port-forward`.

`buildPortRows(a)` returns an array of row objects: `{src, dst, port, proto, purpose, tag, note}`.
`tag` is one of `mandatory` / `conditional` / `optional` / `recommended` and drives both a visual
badge and the reader's sense of how firm the claim is. Build the array by starting from what's
always true for the platform (admin access, DB access) and pushing additional rows behind
`if(...)` guards keyed off the `has*(a)` predicates and the relevant answer — never emit a row
unconditionally if there's any input combination where it wouldn't apply. Two disciplines from
past audits, worth repeating because they're easy to forget under a deadline:

- **A row's `note` should travel with the fact it modifies.** If a port has a platform-specific
  caveat (e.g. rootless Podman can't bind privileged ports), every row that uses that port needs
  the caveat appended — not just the first row that happened to introduce it. When you add an
  alternative/replacement row for a different branch (like the headless API-access row that
  replaces the browser rows), copy forward every note that still applies, don't just copy the
  purpose text. The rootless-Podman note belongs on every row that reaches the reverse proxy on
  80/443 (browser, API/OAuth2, Report Generator, MCP client) — and *not* on Gateway's 8090, which
  is above 1024; an earlier version had it exactly backwards.
- **No wildcards, no bundling alternatives as if simultaneous.** If three ports are alternatives
  (pick one), say "pick one" explicitly (see the SMTP row) — don't list all three as if all were
  required. If several FQDNs are genuinely all required together, it's fine to list them in one
  row, but say so, and prefer one row per exact FQDN when the audience is a firewall admin who
  needs to allowlist by exact host.

## Confidence labeling

Every non-obvious factual claim needs an implicit or explicit confidence level, consistent with
`SKILL.md`'s Confirmed / Reasonable inference / Unverifiable bar:

- **Confirmed** facts read as plain assertions: `"CAST Imaging supports PostgreSQL only"`.
- **Reasonable inferences** say why: `"CAST's REST APIs may still require a token even without a
  human browser session"` — plausible, stated as such, not asserted as fact.
- **Unverifiable** claims say so explicitly in the generated text, e.g. `"not independently
  verified here (network egress to doc.castsoftware.com is blocked)"` or `"exact port not
  confirmed — verify against your CAST Imaging release"`. Never silently omit an unverifiable
  detail if a reader would reasonably expect it to be covered — flag the gap instead of hiding it.

## Output document sections (fixed, in order)

The results pane always has exactly these six sections, in this order, before any optional
section or the checklist. Don't invent a different taxonomy (e.g. a separate "profile" section,
or a "network egress" section split out from ports/extend) — a blind rebuild done from an earlier
draft of this spec did exactly that, because only the *numbering mechanic* below was documented,
not *what the six fixed sections actually are*. Egress, HTTPS, and auth are questionnaire
*inputs* that reshape content inside several of these sections — they are not sections of their
own.

1. **Hardware sizing for your profile** (`sizingHtml`) — the machine-count summary callout
   (`machineSummaryHtml`, see below), a **Server components** table (the `sizingRows` vCPU/RAM/Disk
   table), an inline SVG **architecture diagram** (`buildArchitectureDiagram(a)` — see
   "Architecture diagram conventions" below for the full set of rules this has converged on) and
   the **named components table** it illustrates (every container/service by name and port —
   Gateway, Console, Auth service, SSO Service, Control Panel, analysis-node, Viewer, Viewer-APIs,
   ETL service, AI-service, Dashboards, Neo4j, PostgreSQL, extend-proxy — gated by the same
   `has*(a)` predicates as everything else), OS/runtime version requirements, storage locations,
   and a **Workstation components** table (End-user + Delivery/analyst workstation, with their own
   Operating system / Hardware / Software columns — the OS column is where any platform constraint
   from an optional add-on surfaces, e.g. CAST Report Generator's Windows-only UI or Notepad++
   having no cross-platform build when Audit context is selected). Server and Workstation
   components are two separate tables, not one — don't fold workstation rows back into the sizing
   table's vCPU/RAM/Disk columns; workstations don't have a meaningful vCPU/RAM/Disk figure the way
   server components do.

   **Machine-count model**: `serverMachineCount` counts server-side machines/pods 1:1 (each row in
   `sizingRows`, adjusted for the managed-DBaaS row — see the "Architecture diagram conventions"
   section below). Workstations are different: `hasAnalysis(a)`
   adds a second *role* (delivery/analyst) alongside the always-present end-user role, but the two
   roles don't need two separate physical machines — the same person can cover both. So
   `workstationMachineCount` is always `1` regardless of role count; `workstationRoleCount` (still
   tracked separately, e.g. for the diagram's role count) is not added again on top of it. The
   "Minimum footprint" callout names the roles a single workstation needs to cover
   (`workstationDesc`) rather than implying one machine per role.
2. **Database requirements** (`dbHtml`) — PostgreSQL configuration/version/hosting, and Neo4j
   requirements **only when the scenario includes the Viewer** (the whole "Neo4j (graph store)"
   subsection is omitted otherwise — an earlier "Not required" row was noise). The Version row branches: embedded
   `postgres:15` container (Docker/Podman co-located only), Helm-chart pod (Kubernetes co-located,
   version "not confirmed here"), self-installed EnterpriseDB (Windows co-located), a managed
   DBaaS pick, or a self-provisioned instance — always with the supported 14.x–18.x range (18.x
   recommended). High availability at enterprise scale is labelled as this tool's heuristic, not a
   CAST rule.
3. **Network ports & FQDN allowlist** (`netHtml`) — the full `buildPortRows(a)` table. This is
   where egress mode (direct/proxy/air-gapped) actually shows its effects — as row content and
   notes, not as a separate section.
4. **Reverse Proxy & HTTPS / TLS** (`httpsHtml`) — in air-gapped mode a bullet states that CAST
   documents **no reverse-proxy path or Gateway route for the Extend Local Server** (it is reached
   directly on `host:8085`, feed included), with a not-CAST-documented tip for fronting it anyway;
   don't invent a URI for it — the mandatory-proxy callout, platform/proxy
   mismatch warnings, certificate source, termination point, and platform-specific proxy detail:
   the self-signed trust bullet follows `certSource === 'self-signed'` on every platform, the Nginx
   vHost guidance covers Docker, Podman *and* Windows, and the "disable plain HTTP" advice targets
   the proxy's own port-80 listener — **never Gateway's 8090, which is the proxy's upstream**
   (the original text told users to disable 8090, which would have broken the deployment).
5. **Authentication prerequisites** (`authHtml`) — prerequisites for whichever of Local/SAML/LDAP
   was selected.
6. **CAST Extend access & licensing** (`extendHtml`) — in air-gapped mode it ends with an
   **"Air-gapped installation — container images to download"** subsection (`airgapImagesHtml()`),
   which lists CAST's own images (table of the "Air-gapped installation" section of the Docker S1
   page, pasted verbatim by the user, 2026-10-06) as **Component · Image only** — the user
   explicitly does *not* want the pull/save/load commands or `.tar` names reproduced — filtered to
   the scenario and shown for **Docker, Podman and Kubernetes alike**: imaging-services images always
   (`gateway`, `admin-center`, `sso-service`, `auth-service`, `console`), `dashboards-v3` with Dashboards,
   `analysis-node` with analysis, the imaging-viewer group (`etl-service`, `ai-service`, `imaging-apis`,
   `viewer`, `neo4j`) with the Viewer, `postgres:15` when PostgreSQL is co-located (embedded; not on
   Kubernetes, where the chart's PostgreSQL version isn't confirmed), `alpine/psql` for a dedicated/managed
   one (`DB_MODE=external`), `curlimages/curl` and `castimaging/extend-proxy` always, and the two MCP
   images (`castimaging/imaging-mcp-server`, `castimaging/gatekeeper-mcp-server`, Docker Hub pages given by
   the user) when `a.mcp`. A short note explains the tag (`<ver>` = release installed; curl has its own
   versions); Kubernetes adds a private-registry note (no CAST procedure found); Windows has no images.
   The Docker/Podman network table has no registry row, since CAST's procedure is `save`/`load` Update the table when the doc text is
   pasted in verbatim — outbound access to CAST's extension/update
   service (direct or via the air-gapped Local Update Server), generating an **API key from the
   CAST Extend website**, and obtaining a **CAST Imaging license key** (a key, not a file) that
   covers the selected optional modules. This section's content doesn't map onto any single
   questionnaire answer the way the others do, which makes it the easiest of the six to forget
   entirely when building bottom-up from the state model — write it deliberately, don't expect it
   to fall out of the `has*(a)` predicates.

After these six, truly optional sections (MCP when `a.mcp` is set — CAST Highlight and email
notifications are *not* separate sections; they add conditional rows to the ports matrix and stay
there) get appended, followed by the checklist.

## Rendering

`render()` is one function that reads `state()`, builds the HTML string fragments above plus any
optional section HTML and `checklistHtml`, concatenates them, and sets `#results-content.innerHTML`
once. Section numbers in headings (`<h3>3. Network ports...`) are hand-maintained (1 through 6 are
always present, so they're always the same number) except for the truly optional trailing
sections, which use a `{N}` placeholder resolved by a running counter. The exact mechanic, in
order:

```js
var mcpHtml = '';
if(a.mcp){ mcpHtml = '<h3>{N}. MCP Servers (AI features) — enabled</h3>...'; }

var optionalSections = [mcpHtml].filter(function(h){ return h; });   // build strings first, filter blanks
var nextNum = 7;                                                      // one past the last fixed section (6)
var optionalHtml = optionalSections.map(function(h){
  return h.replace('{N}', String(nextNum++));                        // resolve {N} left-to-right, advancing the counter
}).join('');
var checklistHtml = '<h3>'+nextNum+'. Pre-installation checklist...';  // whatever nextNum ended on
```

Each optional section's own logic (e.g. `if(a.mcp){...}`) decides whether its string exists at
all — build the string with a literal `{N}` placeholder in it *before* you know whether it'll be
included, put it in the `optionalSections` array alongside the other optional section variables,
filter out the empty ones, and only then resolve the placeholders by mapping the array with an
incrementing counter that starts at (fixed section count + 1). The checklist heading always uses
whatever `nextNum` ended on after that map runs — never hardcode the checklist's number, since it
has to shift depending on how many optional sections actually rendered. If you add a second
optional section, add its (empty-string-by-default) variable to the `optionalSections` array in
the order you want it numbered — order in that array is numbering order, not declaration order
elsewhere in the function.

### The checklist

The pre-installation checklist is grouped by **machine/role**, not by topic — `groups` is an array
of `{title, items}` (e.g. "Core node (imaging-services...)", "Analysis-node machine(s)",
"Reverse proxy", "End-user workstation"), each pushed conditionally on the same `has*(a)` /
`a.topology` gates as everything else, so a group for a machine that doesn't exist in this
configuration simply isn't pushed. Each item is built with `item(id, html)` and renders as a real
`<input type="checkbox" data-check-key="{id}">`, not a decorative `:before` glyph — checked state
is persisted to `localStorage` under `checklistStorageKey(id)` via a single delegated `change`
listener registered once on `#results-content` (outside `render()`, so it survives every
re-render), and restored by `restoreChecklistState()` called at the end of `render()`. The id is a
short, globally unique, stable slug (`curl`, `server-sizing`, `rp-tls`…), never a position: an
earlier `group.key + ':' + index` scheme made ticks jump to a different item whenever answers
added, removed or moved items between groups (e.g. single↔multi, Docker→Windows, enabling SAML).
New items need a new unique id; never reuse an id for a different item. The storage key is
`castImagingChecklist:v2:<id>` — bump the version if ids are ever re-meant wholesale. Where an
item's *meaning* depends on an answer, put the answer in the id (`pg-hosting:<dbHosting>`,
`rp-deployed:<reverseProxy>`, `rp-tls:<certSource>`) so a tick for "co-located" doesn't silently
carry over to "managed". Group rules that audits had to fix: the separate **"Every server machine"**
group exists only on VM platforms with `hasDistributedNodes(a)` (otherwise its items fold into the
core/single group, and on Kubernetes they're cluster-wide, not per pod — no `curl` item there);
Extend access and image-pull items belong to that "every server" group, since analysis-nodes need
them too; MCP client → LLM reachability goes in the End-user workstation group; the Delivery/
analyst workstation group and the Report Generator item exist only with analysis / dashboards; and
every requirement a results section states as mandatory (PostgreSQL version/HA, self-signed trust,
HTTPS-for-SAML, LDAPS CA trust) needs an item — check this whenever you add a requirement to a
section. Group titles follow the same wording rules as the rest of the file ("Cluster / core pods",
"Single node pool", and a multi topology with nothing to distribute is titled like single).

### HTML exports

Two buttons sit beside **Print / Save as PDF**: **Save as HTML** (the whole report, validation
notice included) and **Export checklist as HTML** (header, chips and checklist only). Both go
through `exportHtml(mode)` — details below describe the checklist mode; the full mode simply keeps
every results section.

### Checklist HTML export

`exportHtml()` (the **Export checklist as HTML** button) downloads
`cast-imaging-checklist-YYYY-MM-DD.html`, a self-contained page for handing the checklist to the
teams that own each server: it clones `main.results-pane`, removes the toolbar, every `.screen-only`
and `.callout.no-print` element, and everything in `#results-content` except `#checklist-section`;
retitles the page; strips the section number from the checklist heading; rewrites the live-note and
the persistence note (ticks made in the exported file are not saved, and "Section N" references point
to the full report); copies each checkbox's current `checked` state to the `checked` attribute
*by index* (so every checkbox in the results pane must be a checklist checkbox); and inlines the
page's `<style>` blocks and current `data-theme`. It contains no script. Test it with
`acceptDownloads` + `waitForEvent('download')`, reopen the file, and check there are no tables/SVG,
the ticks survived, and no live-page wording remains.

## Content freshness marker

A `TOOL_VERSION` constant near the top of the `<script>` block (a plain date string) is displayed
in the footer as "Tool content last updated {date}", via a small `stampGeneratedDate()` function
called from the *top of `render()` itself* — not just once at page load. It has to re-run on every
regeneration for the same reason the "Generated {timestamp}" line in the layout above does: a tool
whose whole premise is "regenerates live on every answer" can't have either timestamp go stale the
moment the user actually interacts with it. `TOOL_VERSION` and the "Generated" timestamp answer
different questions — one says when a fact in the tool was last verified/changed by a maintainer,
the other says when the currently-displayed content was produced — but both need to update on
every render for their own label to stay true. Bump `TOOL_VERSION` to today's date whenever a
content-affecting fix ships (see `SKILL.md` step 6) — a stale `TOOL_VERSION` is worse than none,
since it actively tells the reader the content is fresher than it is.

Wire `render()` to fire on both `input` and `change` events delegated from the form pane (covers
text/select/radio/checkbox uniformly), plus once on load.

## Shipping a from-scratch build

Same as any other change to this file: verify claims against
`references/documentation-map.md`, test with Playwright across a real spread of the input matrix
(platform × scenario × topology at minimum) with zero console/page errors as the bar, then follow
`SKILL.md`'s commit/reconcile-before-PR workflow. A from-scratch build touches every section at
once, so the regression sweep matters more here than for a single-section fix — don't skip
combinations just because the file is new.
