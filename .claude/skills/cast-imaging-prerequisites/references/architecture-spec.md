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
  - `.results-pane` (flex:1, scrolls independently) — profile chips, a validation-notice callout,
    a `#results-content` div that `render()` overwrites wholesale on every change, and a
    print/PDF button.
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
2. **Project scale** — application count band (drives sizing baseline) and concurrent-user band
   (drives a RAM/CPU bonus on the UI-serving node, only when the scenario actually has a UI).
3. **Database** — RDBMS is a fixed fact (PostgreSQL only — CAST doesn't support alternatives, so
   don't build this as a choice), plus a hosting model choice (co-located / dedicated / managed).
4. **Network egress** — direct outbound / via proxy / air-gapped. This alone reshapes several rows
   in the ports matrix (CAST Extend path, Docker Hub pull path, LLM/Highlight rows needing an
   explicit air-gap exception).
5. **HTTPS** — certificate source and TLS termination point. Kept separate from egress because
   they're orthogonal decisions a reader might answer differently.
6. **Authentication** — Local / SAML / LDAP, radio. All three are brokered through CAST's embedded
   Keycloak, not the application service directly — don't build rows that bypass Keycloak here.
7. **Optional integrations** — MCP/AI (with LLM provider sub-select), CAST Highlight, email
   notifications. Each is a checkbox that adds rows/sections conditionally rather than replacing
   anything.
8. **Source code access** — which delivery protocols are in play (HTTPS / SMB). These only
   produce port rows when the scenario actually includes analysis — gate on `hasAnalysis(a)`, and
   show an explanatory hint (not just silently hide the checkboxes) when they're inert for the
   current scenario, so the user isn't left wondering why nothing changed.

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
- **Reasonable inferences** say why: `"CAST's REST APIs may still require a Keycloak-issued OAuth2
  token even without a human browser session"` — plausible, stated as such, not asserted as fact.
- **Unverifiable** claims say so explicitly in the generated text, e.g. `"not independently
  verified here (network egress to doc.castsoftware.com is blocked)"` or `"exact port not
  confirmed — verify against your CAST Imaging release"`. Never silently omit an unverifiable
  detail if a reader would reasonably expect it to be covered — flag the gap instead of hiding it.

## Rendering

`render()` is one function that reads `state()`, builds a handful of HTML string fragments
(`sizingHtml`, `dbHtml`, `netHtml`, `httpsHtml`, `authHtml`, `extendHtml`, optional section HTML,
`checklistHtml`), concatenates them, and sets `#results-content.innerHTML` once. Section numbers
in headings (`<h3>3. Network ports...`) are hand-maintained (1 through 6 are always present, so
they're always the same number) except for the truly optional trailing sections, which use a
`{N}` placeholder resolved by a running counter. The exact mechanic, in order:

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

## Content freshness marker

A `TOOL_VERSION` constant near the top of the `<script>` block (a plain date string) is displayed
in the footer as "Tool content last updated {date}" — set once by a small function alongside
`stampGeneratedDate()`. This is deliberately separate from the "Generated {timestamp}" line near
the top of the results pane: that one just reflects the viewer's own clock at page-load time and
says nothing about the content, while `TOOL_VERSION` is a human-maintained marker of when a fact
in the tool last actually changed. Bump it to today's date whenever a content-affecting fix ships
(see `SKILL.md` step 6) — a stale `TOOL_VERSION` is worse than none, since it actively tells the
reader the content is fresher than it is.

Wire `render()` to fire on both `input` and `change` events delegated from the form pane (covers
text/select/radio/checkbox uniformly), plus once on load.

## Shipping a from-scratch build

Same as any other change to this file: verify claims against
`references/documentation-map.md`, test with Playwright across a real spread of the input matrix
(platform × scenario × topology at minimum) with zero console/page errors as the bar, then follow
`SKILL.md`'s commit/reconcile-before-PR workflow. A from-scratch build touches every section at
once, so the regression sweep matters more here than for a single-section fix — don't skip
combinations just because the file is new.
