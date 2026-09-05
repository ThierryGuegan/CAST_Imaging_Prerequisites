---
name: cast-imaging-prerequisites
description: Audit and fix a section of index.html, the interactive CAST Imaging deployment-requirements builder in this repo. Use this whenever the user says "check the network ports for X", "check the hardware sizing for X", "check X" for any platform/scenario/section of the tool (docker, podman, kubernetes, windows, authentication, MCP, source code access, email, extensions, database, HTTPS, etc.), or otherwise asks you to review, audit, verify, or double-check part of the requirements builder against CAST's documentation. Also use it any time you're about to edit index.html's JS logic for correctness, since it captures the verify-fix-test-ship loop this repo expects.
---

# CAST Imaging tool audit

## Goal

This tool derives recommendations from CAST Imaging's published documentation structure and
standard CAST deployment practices — that sentence is index.html's own validation notice to its
users, and it is the bar every claim in the file has to clear. This skill's job is to keep that
promise true: every fact the tool asserts (a port, a supported engine, a mandatory-vs-optional
label, a component name) should trace back to a CAST doc, a directly-confirmed correction, or a
clearly-labeled inference — never to an invented plausible-sounding detail. When you can't verify
something, the fix is to say so in the tool's own text (see the "not independently verified"
precedent already in the file), not to silently assert it.

index.html is a single-file, client-side requirements builder: a questionnaire on the left (platform, scenario, topology, database hosting, egress, auth, integrations...) drives JS in `render()` that generates sizing tables, a network-port/FQDN matrix, and prerequisite checklists on the right. Every section is supposed to react correctly to every combination of answers. Because it's one big file that's grown incrementally, the most valuable thing you can do when asked to "check X" is hunt for places where a row or number reflects a *stale* assumption instead of the *current* combination of answers on screen.

This is a repeatable audit-and-fix loop, not a one-off task — apply it fresh each time, even for a topic you've checked before, since fixes elsewhere in the file can introduce new inconsistencies.

## 1. Read before you judge

Find every place in index.html that touches the topic you were asked about — the questionnaire HTML, the relevant part of `render()` or `buildPortRows()`, and any shared helpers it calls (`hasAnalysis`, `hasViewer`, `hasNeo4j`, `coreComponentList`, etc.). Don't just read the one line that looks relevant; read how that value flows in from `state()` and out into the displayed HTML. Most real bugs here are about *wiring*, not facts: a row that's missing a condition it should have, or built from the wrong variable.

## 2. Verify against the primary source, but don't let a dead end stop you

The user's info comes from `doc.castsoftware.com`. In this environment that domain is blocked at the network egress level for direct fetch — expect `WebFetch` to fail with `EGRESS_BLOCKED` on every attempt, not just some. Don't waste more than one try confirming that before falling back to `WebSearch`, which reaches the same content via cached snippets and usually surfaces enough to work with.

Don't guess which doc page might be relevant — `references/documentation-map.md` maps every
section of index.html to the specific `doc.castsoftware.com` page(s) that should back its
claims (plus which pages are already cited as live links inside the file itself). Read it before
searching so you're verifying against the right page on the first try, not a plausible-sounding
wrong one.

Hold every claim to a clear bar:
- **Confirmed** — a search snippet states it directly. Fine to assert as fact.
- **Reasonable inference** — implied by confirmed facts plus general technical knowledge (e.g., rootless Podman can't bind privileged ports — that's general Linux behavior, not something you need CAST to confirm). Fine to include, but say why you believe it.
- **Unverifiable** — you can't find it and it's not inferable. Don't guess a number or invent a port. Either leave it out, or state clearly in the tool's own text that it's unconfirmed and link the doc page to check (the tool already has precedent for this — search for "not independently verified" or "not confirmed").

The user sometimes hands you facts directly (exact port numbers, component names) rather than asking you to search. Treat that as ground truth and skip the search step — but still sanity-check it against how the rest of the file is wired (does this port belong on one row or several? does it need gating like the others?).

## 3. Hunt for these specific bug shapes

These are the categories that have repeatedly turned out to hide real bugs in this file. Check all of them for the section you're auditing, not just the one the user named:

- **Missing gates.** A row or section appears regardless of `platform`/`scenario`/`topology`/`dbHosting` when it should only apply to some of them. Cross-check against `hasAnalysis(a)`, `hasViewer(a)`, `hasDashboards(a)`, `hasNeo4j(a)` — a row about analysis, source code, or the Viewer that isn't gated on the matching `has*()` helper is a strong signal something's wrong.
- **Terminology drift.** VM language ("host", "machine", "node") surviving in a spot that's actually about Kubernetes pods, or vice versa. Check whether the section already has an `isK8s`/`unitWord`/`coreWord`-style variable elsewhere that this spot should be reusing instead of a hardcoded string.
- **Self-contradiction.** A hardcoded number in a table that violates a floor or rule stated in a callout elsewhere in the same section (e.g., a sizing row below the disk/RAM minimum the tool itself claims to enforce). Search for related callouts/constraints before trusting a hardcoded value.
- **Vague or duplicated source/purpose text.** A row whose `src` is generic ("CAST Imaging") when a specific component is more accurate and more consistent with neighboring rows (`imaging-services`, `analysis-node`, `Keycloak`, `imaging-viewer`...). If two rows share a purpose but one is more specific, prefer the specific one and ask whether the vague one should be split or removed.
- **Silent conflation.** A single row bundling several distinct options as if all were simultaneously required (e.g., listing three alternative SMTP ports as "needed" instead of "pick one").

## 4. Fix it

Edit index.html directly. Keep changes scoped to what the audit actually found — don't refactor unrelated code or invent new features while you're in there. When a fix affects wording used in multiple places (e.g., a shared label), check whether other rows reference the same concept and keep them consistent.

## 5. Test before you trust it

Playwright + Chromium are pre-installed for this: `NODE_PATH=/opt/node22/lib/node_modules node -e "..."` with `chromium.launch({executablePath:'/opt/pw-browsers/chromium'})`. Every fix needs two things:

1. **A targeted check** — render the specific rows/tables your fix touches, across the combinations that exercise the new condition (e.g., if you gated something on `hasAnalysis(a)`, check it with a scenario that has analysis and one that doesn't).
2. **A full sweep for regressions** — loop over platform × scenario × topology (add dbHosting/egress/auth when the fix touches those), clicking through the relevant inputs, with `page.on('pageerror', ...)` and `page.on('console', msg => msg.type()==='error' ...)` counters. Zero errors is the bar; don't ship on a hunch.

Print the rendered table/section text for a couple of representative combinations so you can eyeball the actual wording, not just the error count — a fix can run error-free and still read wrong.

## 6. Ship it: commit, catch the branch up, then PR

Work happens on the existing branch for this task (check `git branch` / recent commits if unsure which one). Commit with a message that explains *why* the change matters, ending with:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: <this session's URL, if known>
```

Before opening a PR, this repo has a real quirk worth knowing: PRs here tend to get merged (auto-merge or a very fast manual merge) within moments of opening — sometimes before you've finished pushing related follow-up commits. So every time, before opening a PR:

```bash
git fetch origin main
git log --oneline origin/main..HEAD   # anything here is genuinely unmerged
```

If your branch has diverged from `origin/main` (which it will, once a previous PR merged), reconcile with a real merge rather than a fast-forward or force-push — `git merge origin/main -m "..."` — then push. Only open a new PR if `origin/main..HEAD` still shows commits; if a previous PR already swallowed everything, there's nothing to open. This isn't optional bookkeeping — skipping it means work silently never reaches `main`.

Write the PR body to actually explain the bug and the fix (what was wrong, why it mattered, how you verified it), not just "fixed X" — future readers of this repo's PR history are relying on it, since this tool keeps evolving section by section.
