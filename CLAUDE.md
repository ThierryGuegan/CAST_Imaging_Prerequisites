# CLAUDE.md

Interactive **CAST Imaging requirements builder**: one self-contained, client-side HTML file
(`cast-imaging-requirements-builder.html`, no build step, no dependencies). The questionnaire on the
left regenerates a sizing / ports / checklist document on the right. See `README.md` for what it does.

## Working with the maintainer
- The maintainer writes in **French** — reply in French. Code, tool text, docs and commit messages are in English.
- Open a PR / merge only when asked. They usually answer "oui, ouvre la PR et merge-la" once the work is pushed.

## Before touching the tool
- Use the **`cast-imaging-prerequisites` skill** (`.claude/skills/cast-imaging-prerequisites/`): audit → verify → fix → test → ship. It carries the bug shapes to hunt, the confidence bar, and the test recipe.
- `references/architecture-spec.md` = how the file is built (predicates, sizing, diagram, ports matrix, checklist, exports).
  `references/documentation-map.md` = which CAST doc page backs which section, **facts the maintainer confirmed, decisions already made, and open questions**. Read it first and never re-flag a recorded decision; record new answers there.
- Every fact the tool states must be **Confirmed**, a labelled **inference**, or flagged as **unconfirmed** — never an invented port, image name or path. `doc.castsoftware.com` is blocked for `WebFetch` here: use `WebSearch`, or ask the maintainer to paste the page.

## Conventions that were learned the hard way
- Gate on the `has*(a)` predicates (`hasAnalysis`, `hasViewer`, `hasDashboards`, `hasNeo4j`, `hasDistributedNodes`…), never on raw `a.scenario` / `a.topology` comparisons.
- Single-choice question → radio option cards (no `<select>`); checkboxes only for independent toggles.
- In generated text, "Section N" = a *results* section, "question N" = a *questionnaire* fieldset.
- Checklist items have stable ids (`item(id, html)`); keep ids unique and put the answer in the id when the wording depends on it.
- Free text from the user (client/project name, imported JSON) always goes through `esc()` / `textContent` / `.value`, never into HTML. New questionnaire controls go inside `#form-pane` with a `name`/`id` so Save/Import answers (JSON) picks them up; bump `ANSWERS_SCHEMA` if a value's meaning changes.
- Diagram: no line may cross a box; check dark *and* light screenshots after touching it.
- Bump `TOOL_VERSION` when a fact the tool asserts changes.
- `index_ref.html` and `index_test.html` are frozen validation snapshots — do not edit them. The two PDFs are CAST reference material supplied by the maintainer.

## Testing
Playwright + Chromium are preinstalled:
`NODE_PATH=/opt/node22/lib/node_modules node script.js` with `chromium.launch({executablePath:'/opt/pw-browsers/chromium'})`.
Sweep platform × scenario × topology × egress × auth (rotate DB hosting / certificate / MCP / project name) counting `pageerror` and console errors, and scan the rendered text for `undefined`, `NaN`, `[object` and duplicate `data-check-key`. Zero errors is the bar. Details in the skill's step 5.

## Git
- Develop on the branch the session names; commit messages say *why*, then the attribution lines the session provides.
- Before a PR: `git fetch origin main`, merge it into the branch if it moved (real merge, no rebase/force-push), push, then open the PR with a body that explains the problem, the fix and how it was verified.
- Update the `.md` files (README, skill, references) in the same change as behaviour they describe.
