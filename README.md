# CAST Imaging Prerequisites — Requirements Builder

An interactive tool that helps you **define the architecture and installation
prerequisites for your specific CAST Imaging deployment**, instead of handing you a
generic, one-size-fits-all checklist.

Open **`index.html`** in a browser. Answer the questions on the left — platform &
topology, deployment scenario (which components you need: analysis, Viewer,
Dashboards), project scale, database, network egress, HTTPS, authentication, optional
MCP/AI and CAST Highlight integrations, source-code access methods — and the document on
the right regenerates live:

- Hardware sizing for exactly the profile you selected (not every possible combination),
  composed from your answers rather than a fixed table per scenario.
- A network ports / FQDN allowlist matrix filtered to the flows your configuration
  actually needs — no unused rows, no wildcards, each row confidence-labeled as
  mandatory, conditional, optional, or recommended.
- Database requirements (CAST Imaging supports PostgreSQL only) matched to your chosen
  hosting model, plus Neo4j requirements when your scenario includes the Viewer.
- HTTPS/TLS guidance matched to your certificate source and termination point.
- Authentication prerequisites for the exact method you picked (Local / SAML / LDAP),
  all brokered through CAST's embedded Keycloak.
- CAST Extend access and licensing steps, adapted for direct/proxy/air-gapped egress.
- MCP Server (AI) prerequisites, only shown if you enable that integration.
- A pre-installation checklist built from your actual answers.

The whole result can be printed / saved as PDF (the questionnaire pane is hidden from
the print output). Everything runs client-side in the browser — no data leaves the page.

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
> structure and standard CAST deployment practices — that sentence is `index.html`'s own
> validation notice to its users, and it is the bar every claim in the file has to clear.
> The skill's job is to keep that promise true: every fact the tool asserts (a port, a
> supported engine, a mandatory-vs-optional label, a component name) should trace back to
> a CAST doc, a directly-confirmed correction, or a clearly-labeled inference — never to
> an invented plausible-sounding detail.

Concretely, the skill:

- **Audits and fixes** any section of `index.html` against
  [`references/documentation-map.md`](.claude/skills/cast-imaging-prerequisites/references/documentation-map.md),
  which maps every questionnaire section to the specific `doc.castsoftware.com` page(s)
  that should back its claims — and hunts for the recurring bug shapes this file has
  produced before (missing gates on `has*(a)` predicates, terminology drift between VM
  and Kubernetes language, self-contradicting a stated sizing floor, vague source text,
  silently bundling alternatives as if all were required).
- **Can build `index.html` from scratch**, using
  [`references/architecture-spec.md`](.claude/skills/cast-imaging-prerequisites/references/architecture-spec.md)
  as the blueprint for the tool's converged shape (two-pane layout, the state model, the
  predicate pattern, the sizing/ports data shapes, the confidence-labeling convention) —
  without exempting a fresh build from the same fact-checking and testing discipline
  applied to a one-line fix.
- **Tests every change** with Playwright across the input matrix before shipping, and
  reconciles with `origin/main` before opening a PR, since PRs on this repo tend to merge
  fast.

See the skill's `SKILL.md` for the full workflow.
