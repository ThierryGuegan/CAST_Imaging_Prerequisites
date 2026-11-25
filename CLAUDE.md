# CLAUDE.md

Interactive **CAST Imaging requirements builder**: one self-contained, client-side HTML file
(`cast-imaging-requirements-builder.html`, no build step, no dependencies — `package.json` only lists the test tooling). The questionnaire on the
left regenerates a sizing / ports / checklist document on the right. See `README.md` for what it does.

## Working with the maintainer
- The maintainer writes in **French** — reply in French. Code, tool text, docs and commit messages are in English.
- Open a PR / merge only when asked. They usually answer "oui, ouvre la PR et merge-la" once the work is pushed.

## Before touching the tool
- Use the **`cast-imaging-prerequisites` skill** (`.claude/skills/cast-imaging-prerequisites/`): audit → verify → fix → test → ship. It carries the bug shapes to hunt, the confidence bar, how CAST pages are read, and the test recipe.
- `references/decisions.md` = the short, dated list of **maintainer decisions and open questions** — read it first, never re-flag a decision on it, add new ones.
  `references/documentation-map.md` = which CAST doc page backs which section, the facts and findings of each reading pass.
  `references/sources.md` = every CAST page read, its status (verbatim / summary) and its "Updated" date.
  `references/architecture-spec.md` = how the file is built (predicates, sizing, diagram, ports matrix, checklist, phases, exports, tests).
- Every fact the tool states must be **Confirmed** (a page read verbatim, listed in `sources.md`, or a CAST-support answer pasted by the maintainer, listed in its support table), a labelled **inference**, or flagged as **unconfirmed** — never an invented port, image name or path, and never a statement credited to a page you can't re-find ("an earlier version of CAST's documentation said…").
- `doc.castsoftware.com` is read through the **`web-fetch` agent** (`offset=80000`, raw text, full report in the agent's final message, one agent per area); a direct `WebFetch` from the main session may be refused. Pages the site truncates or doesn't serve (Windows 3.6.7–3.6.0 release notes, the `highlight2mri` page) must be pasted by the maintainer.

## Conventions that were learned the hard way
- Gate on the `has*(a)` predicates (`hasAnalysis`, `hasViewer`, `hasDashboards`, `hasNeo4j`, `hasDistributedNodes`…), never on raw `a.scenario` / `a.topology` comparisons.
- Single-choice question → radio option cards (no `<select>`); checkboxes only for independent toggles.
- In generated text, "Section N" = a *results* section, "question N" = a *questionnaire* fieldset.
- Checklist items have stable ids (`item(id, html)`); keep ids unique and put the answer in the id when the wording depends on it. Add every new id to `CHECKLIST_PHASES` (decide / prepare / install / after; an unlisted id lands in "prepare").
- Keep provider-specific text to the selected provider (no Azure text on GKE), and gate text on `hasAnalysis` / `hasViewer` / `hasNeo4j` / `a.dbHosting` so it never names a component the answers exclude.
- Pair controls by `data-check-key` / id, never by position; interactive controls inside the results carry `export-hide` so exports drop them.
- Free text from the user (client/project name, imported JSON) always goes through `esc()` / `textContent` / `.value`, never into HTML. New questionnaire controls go inside `#form-pane` with a `name`/`id` so Save/Import answers (JSON) picks them up; bump `ANSWERS_SCHEMA` if a value's meaning changes.
- Diagram: no line may cross a box; check dark *and* light screenshots after touching it.
- Bump `TOOL_VERSION` when a fact the tool asserts changes, and add a line to the in-page `CHANGELOG` array; record the decision in `references/decisions.md`.
- `index_ref.html` and `index_test.html` are frozen validation snapshots — do not edit them. The two PDFs are CAST reference material supplied by the maintainer.

## Testing
`tests/` holds the regression suite (Playwright + Chromium preinstalled): run from the repo root with `CHROMIUM_PATH=/opt/pw-browsers/chromium` and `NODE_PATH` pointing at a folder with `playwright`, `eslint`, `globals`, `axe-core` (`npm install`, or a scratch folder):
`node tests/syntax.js`, `lint.js`, `sweep.js [--quick]`, `facts.js`, `features.js`, `consistency.js [--quick]`, `profiles.js`, `a11y.js`, `diagram.js [--quick]` (`npm test` = the quick set, `npm run test:full` = the long sweeps). Zero failures is the bar; the GitHub Action `regression-sweep` runs the quick set on every PR and push.
`tests/profiles.js` compares eight profile snapshots (`tests/snapshots/*.txt`): when a change legitimately alters the generated text, review the diff and refresh with `node tests/profiles.js --update` in the same commit. Details in the skill's step 5–6.

## Git
- Develop on the branch the session names; commit messages say *why*, then the attribution lines the session provides.
- Before a PR: `git fetch origin main`, merge it into the branch if it moved (real merge, no rebase/force-push), push, then open the PR with a body that explains the problem, the fix and how it was verified.
- Update the `.md` files (README, skill, references, `decisions.md`, `sources.md`) and `sharepoint-documentation-cast-imaging-requirements-builder.html` in the same change as behaviour they describe.
- A scheduled task re-reads the pages of `sources.md` on the 5th of each month (report only) and a monthly workflow checks the documentation links; act on their reports, they change nothing themselves.
