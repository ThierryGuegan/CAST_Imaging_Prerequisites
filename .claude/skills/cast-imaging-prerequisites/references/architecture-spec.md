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
    profile chips, a validation-notice callout, a `#results-content` div that `render()` overwrites
    wholesale on every change, and a print/PDF button. The timestamp is set from inside `render()`
    (see Content freshness marker below), not just once at load — it exists to tell the reader when
    the *currently-displayed* content was produced, which is only true if it updates every time the
    content actually changes.
- A `@media print` block hides the form pane and toolbar so "Print / Save as PDF" produces a clean
  document of just the generated content.
- Dark theme by CSS custom properties on `:root`; no light/dark toggle needed since this is a
  planning tool, not a public artifact — keep it simple unless asked otherwise.

## Questionnaire sections (numbered fieldsets)

These are the sections as of the current build. If requirements change, renumber consistently —
render() references section numbers in generated text (e.g. "see Section 3"), so a renumber has to
be a search-and-fix pass, not a rename in isolation.

1. **Platform & topology** — host platform (Docker / Podman / Kubernetes / Windows Server, radio),
   deployment scenario (select: which components exist — this is what later drives every
   `has*(a)` predicate), topology (single machine / multi-machine, radio), plus conditional
   sub-blocks that only show when relevant (analysis-node count when topology is multi and the
   scenario includes analysis; a Neo4j-dedicated-machine checkbox when topology is multi and the
   scenario includes the Viewer).

   The scenario `<select>` has exactly these four `value`s — don't infer a different set from the
   predicates alone; the predicates are derived from these four, not the other way around:

   | `value` | Meaning | Components | `hasAnalysis` | `hasViewer` | `hasDashboards` |
   |---|---|---|---|---|---|
   | `full` | Everything | imaging-services, analysis-node, imaging-viewer, dashboards | ✓ | ✓ | ✓ |
   | `viewer-readonly` | Browse existing results only | imaging-services, imaging-viewer, dashboards (no analysis-node) | | ✓ | ✓ |
   | `dashboards-only` | KPIs only, no graph drill-down | imaging-services, dashboards (no Viewer, no analysis-node) | | | ✓ |
   | `analysis-only` | Headless, API/CI-driven | imaging-services, analysis-node (no UI at all) | ✓ | | |

   `hasNeo4j(a)` is just `hasViewer(a)` (Neo4j only exists to serve the Viewer, so don't give it
   an independent definition). If you ever add a fifth scenario, add its row to this table first,
   then work out which predicates it should satisfy — don't reverse-engineer a scenario from
   predicate behavior you want.
2. **Project scale** — application count band (drives sizing baseline), concurrent-user band
   (drives a RAM/CPU bonus on the UI-serving node, only when the scenario actually has a UI), and
   **Audit context** (`hasAuditContext(a)`, standard vs. audit/structural-analysis engagement) —
   a client-side-only flag, not a CAST-published requirement. Standard deployments only need
   CAST Report Generator on the end-user workstation; an audit engagement additionally needs the
   `AUDIT_WORKSTATION_TOOLS` list (VS Code, Notepad++, Word/Excel/PowerPoint, DBeaver, Python) —
   user-supplied desktop tooling for analysts, labeled as given rather than CAST-confirmed since
   `doc.castsoftware.com` has no opinion on it.

   CAST Report Generator itself, unlike the audit-tooling list, *is* CAST-published (confirmed via
   user-supplied PDF exports of `install/report-generator/` and
   `export-v2/doccom/cast-report-generator/`): a standalone tool, not bundled with CAST Imaging.
   The interactive UI variant is Windows-only; a separate CLI-only "Report Generator for
   Dashboards" variant also runs on Linux. It requires Microsoft .NET 8 SDK (its installer offers
   to install this automatically — no Java JRE/JDK needed) and an API key generated from the CAST
   Imaging user profile, and connects to Gateway's `/dashboards/rest` path — gated on
   `hasDashboards(a)` in both `buildPortRows()` and `buildArchitectureDiagram(a)`, which draws it
   as its own box (`reportGenBox`, positioned mirror-image to the Tester/admin workstation box on
   the other side of Browser) with a solid `FLOW` line straight into Gateway, since it reuses the
   exact same network entry point as the End-user browser rows rather than being a distinct path.
   Microsoft Office is *not* required to generate reports,
   only to open/edit the output or customize templates — don't conflate this with the
   audit-tooling list's separate Word/Excel/PowerPoint requirement, even though in practice one
   satisfies the other when both apply.
3. **Database** — RDBMS is a fixed fact (PostgreSQL only — CAST doesn't support alternatives, so
   don't build this as a choice), plus a hosting model choice (co-located / dedicated / managed).
4. **Network egress** — direct outbound / via proxy / air-gapped. This alone reshapes several rows
   in the ports matrix (CAST Extend path, Docker Hub pull path, LLM/Highlight rows needing an
   explicit air-gap exception).
5. **Reverse proxy** — which reverse proxy/Ingress is in front of Gateway (or "not decided yet").
   This is a **mandatory prerequisite independent of HTTPS** — CAST Imaging is not intended to run
   with Gateway directly internet-facing, so don't fold this into the HTTPS section or make it
   conditional on HTTPS being enabled. Kept as its own section (split out from HTTPS after an
   earlier draft combined them and blurred that independence).
6. **HTTPS** — certificate source and TLS termination point. Kept separate from egress (Section 4)
   and from Reverse proxy (Section 5) because all three are orthogonal decisions a reader might
   answer differently. The certificate-source choice includes a real "no HTTPS — serve over plain
   HTTP" option, not just CA-issued/self-signed — HTTPS itself is highly recommended but not
   mandatory (unlike the reverse proxy). The one hard exception: **SAML SSO requires HTTPS** (the
   browser/IdP redirect flow needs an HTTPS callback URL), so if `a.auth==='saml'` and the cert
   source is "none", surface that as an explicit conflict in the HTTPS section's own output — don't
   let the two answers silently contradict each other.
7. **Authentication** — Local / SAML / LDAP, radio. All three are brokered through CAST's embedded
   **SSO Service** (8096, `/auth`) and **Auth service** (8092, `/oauth2`) — not "Keycloak"; that was
   this tool's own earlier incorrect guess at the underlying broker's identity before a user-supplied
   architecture diagram confirmed the real component names. Don't build rows that bypass Gateway's
   `/auth`/`/oauth2` routing to reach these directly (a past bug: a headless API-client row sent
   traffic straight to "Auth service" on its own port instead of through Gateway).
8. **Optional integrations** — MCP/AI (with LLM provider sub-select), CAST Highlight, email
   notifications. Each is a checkbox that adds rows/sections conditionally rather than replacing
   anything.
9. **Source code access** — which delivery protocols are in play (HTTPS / SMB). These only
   produce port rows when the scenario actually includes analysis — gate on `hasAnalysis(a)`, and
   show an explanatory hint (not just silently hide the checkboxes) when they're inert for the
   current scenario, so the user isn't left wondering why nothing changed.

Section numbers appear throughout the generated output as literal text ("see Section 3", "see
Section 5"). If you ever renumber a fieldset, grep the whole file for `Section \d` and fix every
reference in the same pass — a renumber that only touches the `<legend>` tags leaves the prose
pointing at the wrong section.

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
function hasAnalysis(a){ return a.scenario === 'full' || a.scenario === 'analysis-only'; }
function hasViewer(a){ return a.scenario === 'full' || a.scenario === 'viewer-readonly'; }
function hasDashboards(a){ return a.scenario !== 'analysis-only'; }
function hasNeo4j(a){ return hasViewer(a); }
```

Every row or sizing entry that depends on "does this deployment have a UI at all", "does it run
analysis", etc. must call the predicate, not re-derive the condition. The single worst bug class
this tool has produced (found twice in audits) is a row that reads a raw `a.scenario` comparison
instead of the matching predicate, so it silently falls out of sync when the predicate's
definition changes. If you add a new cross-cutting concept (a new component, a new mode), add a
predicate for it before you use it in more than one place.

## Sizing model

`SIZING` is a plain object keyed by scale band, each holding baseline `{cpu, ram, disk}` specs for
the roles that can exist (`single` for all-in-one, `core`/`analysis`/`neo4j` for multi-machine
roles), plus a `singleNote` annotation string for scale bands where all-in-one is discouraged.
`render()` composes the actual sizing table from these baselines plus the current `has*(a)`
answers — it does not hardcode a table per scenario. Component labels for each row are built by
small `*ComponentList(a)` helper functions that push component names conditionally, so the label
always reflects exactly what's running, not a guess.

Two floors get asserted as callouts on every render, not just baked silently into the numbers:
disk (an absolute per-node minimum) and RAM (different floors for standalone vs. distributed
topology). If you add sizing rows, make sure they still respect — or explicitly justify not
respecting — whatever floors are already asserted; a hardcoded number below an asserted floor is
a self-contradiction an audit will (and has) caught.

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
  `{key, label, sub}` box specs and returns them centered as a group at a given box width — every
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
- **Confidence in the line must match confidence in the text.** If `componentRows` or a nearby
  callout says a relationship "is not confirmed by the source diagram," the line for it must look
  less certain than a confirmed one — not just carry a caveat label next to an otherwise-identical
  line. The convention: a fine dotted stroke (`stroke-dasharray="2 3"`) at reduced opacity (`.55`)
  plus a small "link not confirmed" label, as used for Gateway → AI-service. Don't route a
  *separately confirmed* fact (like the core node's confirmed `:8085` path to the Extend Local
  Server) through a box whose *own* link is unconfirmed just because it's nearby — that borrows
  uncertainty the fact doesn't have. Route confirmed facts from Gateway directly instead, even if
  that means a longer line.
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
  until their start x-offsets were separated).
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
- **The Tester/admin workstation box and its three bypass lines** (Gateway `:8090` always,
  Control Panel `:8098–2381` always, SSO Service `:8096` only when `hasDashboards(a)||hasViewer(a)`)
  must mirror `buildPortRows()`'s own tester rows exactly, including the `hasUi`-style gate on the
  SSO Service line. Position this box independently from Browser (don't put them in the same
  `layoutRow` call) — centering them as a pair shifts Browser off the vertical axis it needs to
  share with Reverse proxy and Gateway below it.
- **The Extend Local Server is optional, `extend.castsoftware.com` is not.** Every egress mode
  needs a path to `extend.castsoftware.com` — `direct`/`proxy` egress connects the core node to it
  directly (solid line, via the same margin-routing pattern), `airgapped` egress instead shows the
  optional Local Server (dashed border, "air-gapped only" in its label) as an intermediate hop.
  Gating the whole `extend.castsoftware.com` box on `a.egress==='airgapped'` — so it disappeared
  entirely for the two more common egress modes — was a real bug found auditing this box.

## Ports/FQDN matrix

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
  purpose text.
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

1. **Hardware sizing for your profile** (`sizingHtml`) — the composed sizing table, an inline SVG
   **architecture diagram** (`buildArchitectureDiagram(a)` — see "Architecture diagram
   conventions" below for the full set of rules this has converged on) and the **named components
   table** it illustrates (every container/service by name and port — Gateway, Console, Auth
   service, SSO Service, Control Panel, analysis-node, Viewer, Viewer-APIs, ETL service,
   AI-service, Dashboards, Neo4j, PostgreSQL, extend-proxy — gated by the same `has*(a)`
   predicates as everything else), OS/runtime version requirements, storage locations, and
   client-side (end-user + delivery workstation) requirements.
2. **Database requirements** (`dbHtml`) — PostgreSQL configuration/version/hosting, and Neo4j
   requirements when the scenario includes the Viewer.
3. **Network ports & FQDN allowlist** (`netHtml`) — the full `buildPortRows(a)` table. This is
   where egress mode (direct/proxy/air-gapped) actually shows its effects — as row content and
   notes, not as a separate section.
4. **HTTPS / TLS** (`httpsHtml`) — certificate source, termination point, and any platform-specific
   reverse-proxy configuration detail.
5. **Authentication prerequisites** (`authHtml`) — prerequisites for whichever of Local/SAML/LDAP
   was selected.
6. **CAST Extend access & licensing** (`extendHtml`) — outbound access to CAST's extension/update
   service (direct or via the air-gapped Local Update Server), generating an **API key from the
   CAST Extend website**, obtaining a **CAST Imaging license file** that covers the selected
   optional modules, and storing both outside plain configuration files. This section's content
   doesn't map onto any single questionnaire answer the way the others do, which makes it the
   easiest of the six to forget entirely when building bottom-up from the state model — write it
   deliberately, don't expect it to fall out of the `has*(a)` predicates.

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
of `{title, key, items}` (e.g. "Core node (imaging-services...)", "Analysis-node machine(s)",
"Reverse proxy", "End-user workstation"), each pushed conditionally on the same `has*(a)` /
`a.topology` gates as everything else, so a group for a machine that doesn't exist in this
configuration simply isn't pushed. Each item renders as a real
`<input type="checkbox" data-check-key="{group.key}:{index}">`, not a decorative `:before` glyph —
checked state is persisted to `localStorage` under `checklistStorageKey(key)` via a single
delegated `change` listener registered once on `#results-content` (outside `render()`, so it
survives every re-render), and restored by `restoreChecklistState()` called at the end of
`render()`. If you add a new checklist group or reorder items within one, remember the storage key
is `group.key + ':' + index` — inserting an item in the middle of an existing group's `items` array
shifts every later item's persisted key, silently "forgetting" what the user had already checked.
Append new items to the end of a group's array, or give the item its own stable key, rather than
inserting in the middle.

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
