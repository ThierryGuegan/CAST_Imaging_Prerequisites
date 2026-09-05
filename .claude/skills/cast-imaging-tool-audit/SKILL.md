---
name: cast-imaging-tool-audit
description: Audits index.html in the CAST Imaging Prerequisites requirements-builder tool against the official CAST documentation at doc.castsoftware.com/imaging/install/ to find outdated, incorrect, or unsupported claims — e.g. supported database engines, default ports, mandatory-vs-optional labeling, architecture component names (imaging-services, imaging-viewer, dashboards, analysis-node, PostgreSQL), topology descriptions, and sizing guidance. Use this whenever the user asks to "audit", "verify", "fact-check", "double-check accuracy", or "sanity-check" this tool against the docs, mentions the tool might be stale or out of date, pastes content from a doc.castsoftware.com page for comparison, or wants to reconcile the tool with a specific CAST Imaging documentation URL. Also trigger proactively after any edit to index.html that encodes a factual claim about CAST Imaging (a version number, a port, a supported/unsupported technology, a mandatory/optional distinction) so drift gets caught early.
---

# CAST Imaging Tool Audit

`index.html` in this repo is a requirements-builder: every sentence it generates is a factual
claim about how CAST Imaging actually works (which database it supports, which ports are
needed, whether HTTPS is mandatory, how multi-machine topology is structured, and so on). Those
claims came from a mix of the official docs and corrections the repo owner supplied directly in
conversation. Over time the underlying product and its docs change, and mistakes creep in. This
skill's job is to catch drift between what `index.html` asserts and what CAST's own documentation
(or the user, standing in for it) actually says — and only then fix it.

## Why fetching often fails, and what to do about it

`doc.castsoftware.com` is frequently blocked by this environment's network egress proxy. Don't
waste turns retrying an identical fetch that already failed — a blocked domain does not become
reachable by asking again in the same session. Follow this order every time:

1. **Try the fetch once** (`WebFetch` or the equivalent tool) for each doc page relevant to the
   audit's scope.
2. **If it succeeds**, use the returned content as ground truth.
3. **If it's blocked** (egress error, 403, timeout), say so plainly and ask the user to paste the
   page content instead — they may have it open, or may be the one who told you the URL in the
   first place. Do not guess at doc content from training knowledge and present it as verified;
   label anything not sourced from a fetch or a user paste as "unverified, needs confirmation."
4. If the user has a way to fetch it themselves (browser, another session with a Custom network
   allowlist), suggest that as an alternative, but don't block the audit on it — work with
   whatever source material you have.

## Audit procedure

1. **Scope the audit.** If the user names a specific page, section, or claim (e.g. "check the
   database section against the requirements/db page"), scope to that — don't re-audit the whole
   file every time. If they ask for a full audit, work through `index.html` section by section
   (deployment options, hardware/software/DB/disk requirements, MCP servers, HTTPS, auth,
   licensing, ports matrix).

2. **Extract the claims.** Read the relevant part of `index.html` and list out the concrete,
   checkable assertions it makes — not vague prose, but specific facts: "PostgreSQL is the only
   supported database engine", "port 5432", "HTTPS is recommended, not mandatory", "analysis-node
   can be scaled horizontally", etc. Note the line number for each so any discrepancy report can
   point straight at the source.

3. **Get the ground truth** for each claim, per the fetch-or-paste rule above. Match each claim
   to what the doc (or the user's correction) actually says.

4. **Report discrepancies as a table**, not prose paragraphs — the user needs to scan this
   quickly:

   | Claim in tool (file:line) | What the doc/user says | Verdict |
   |---|---|---|
   | `index.html:174` "PostgreSQL — port 5432 (the only database engine supported)" | doc confirms PostgreSQL-only, port 5432 | ✅ Correct |
   | `index.html:390` "Container image registry pull required" | user said this row should be removed; not present in current file | — (already fixed) |

   Use ✅ Correct, ⚠️ Outdated/Incorrect, or ❓ Unverified (couldn't source ground truth) as the
   verdict. If everything checks out, say so clearly and briefly — don't manufacture findings to
   seem thorough.

5. **Propose fixes, don't apply them silently.** For each ⚠️ finding, show the specific text
   change you'd make (old → new) and wait for the user to confirm before editing `index.html`.
   This tool has been shaped by many small, deliberate corrections from the repo owner — an
   unrequested rewrite of a section is more disruptive than a wrong port number left one more day.
   Exception: if the user's own request was "audit and fix", apply changes directly but still
   summarize what changed.

6. **After applying any fix**, verify `index.html` still renders without JS errors the same way
   prior edits in this repo have been checked — e.g. render it headlessly and grep the output for
   the corrected text and for `uncaught|referenceerror|typeerror` in the console log. Don't skip
   this: a text edit to a JS template string is an easy place to introduce a syntax error.

7. **Commit and push only if the user's request implied it** (e.g. they said "fix and push", or
   this is a repo where direct pushes to `main` have been the established pattern in this
   conversation). If unsure, ask, or just leave the fix staged/uncommitted and say so.

## What NOT to do

- Don't treat your own training knowledge of CAST Imaging as ground truth equal to a fetched page
  or the user's direct correction — training data can be stale or wrong, which is the whole
  reason this skill exists.
- Don't pad the discrepancy report with stylistic nitpicks (wording, tone) — this is a factual
  accuracy audit, not a copyedit. If the user wants copyediting, that's a separate ask.
- Don't re-fetch a URL that already failed in this same session without a reason to believe the
  network policy changed (e.g. the user confirms they updated the environment's egress allowlist
  and this is a fresh session).
