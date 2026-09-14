# CAST Imaging documentation map

Every URL below is under `https://doc.castsoftware.com/imaging/`. This file exists so an audit
doesn't have to guess which doc page covers which part of `index.html` — go straight to the
row that matches the section you're checking. `WebFetch` on this domain is blocked by network
egress in this environment on every attempt so far; don't spend more than one try confirming
that before falling back to `WebSearch` (which reaches cached snippets of the same pages) or
asking the user to paste the page content directly.

| index.html section | What to verify there | Doc page(s) |
|---|---|---|
| §1 Platform & topology — platform choice | OS/runtime support per platform | `install/global/windows/`, `install/global/docker/`, `install/global/podman/`, `install/global/kubernetes/` |
| §1 Platform & topology — Docker specifics | Compose version, install commands, `.env` layout | `install/global/docker/reference/config-examples/` |
| §1 Platform & topology — deployment scenario / component split | Which components a scenario installs (imaging-services, analysis-node, imaging-viewer, dashboards) | `install/before-you-start/deployment-options/`, `install/global/docker/` ("choose your deployment" step) |
| §1 Platform & topology — multi-machine, analysis-node scaling | Horizontal scaling model, shared storage requirement | `install/global/docker/reference/config-examples/`, `install/requirements/disk/storage-locations/` |
| §1 Platform & topology — Kubernetes cluster sizing (node-count floor, per-node CPU/RAM, isolation flags) | User-supplied PDF of CAST's "What hardware do I need?" doc page confirmed: VM-based (Windows/Docker/Podman) floors are 1 CPU/2 cores min (1 CPU/4 cores recommended), 16 GB RAM/node min (32 GB recommended) in a distributed deployment or 32 GB min standalone, 256 GB disk min — already reflected in `SIZING`. Kubernetes is sized separately at the **cluster** level, not per-VM: 2 nodes minimum, 4 vCPU/node minimum, 32 GB RAM/node minimum (64 GB recommended, 128 GB for multiple complex/large applications), scaling via `AnalysisNodeReplicaCount` (+1 node per replica beyond the first) and `EnforceAnalysisNodeIsolation`/`EnforceNeo4jIsolation`/`EnforcePostgresIsolation` Helm flags (each isolates that pod onto its own dedicated node; `EnforceBalancedAffinity: true` is required for any of them). index.html's `k8sMinNodes` formula in `render()` models the base-2 + isolation(+1) + replica-scaling(+1/replica) part; it does **not** model `EnforcePostgresIsolation` (no corresponding tool input) — the sizing callout says so explicitly rather than guessing. The same PDF's TCP-port section contains two internally inconsistent port tables (different analysis-node/Neo4j port numbers between them) — left alone pending clarification; don't use it as a source for port numbers without asking the user which table applies. | `install/requirements/hardware/` |
| §2 Project scale — user/scale bands | Sizing bands aren't CAST-published tiers — treat as internal planning heuristics, not doc-sourced facts | — (no direct doc source; label accordingly) |
| §3 Database — PostgreSQL | Supported/minimum versions, hosting options | `install/requirements/db/` |
| §3 Database — disk floors, storage locations | 256GB floor, RAM floors, per-platform storage paths | `install/requirements/disk/`, `install/requirements/disk/storage-locations/`, `install/requirements/disk/storage-locations/docker/`, `install/requirements/disk/storage-locations/windows/`, `install/requirements/disk/storage-locations/cloud/` |
| §3 Database — hardware sizing | CPU/RAM baselines | `install/requirements/hardware/` |
| §3 Database — OS/software versions | Supported distros, glibc, Docker Compose version, JDK version | `install/requirements/software/` |
| §1 Named components / §3 Network ports — exact ports and container names (Gateway, Console, Auth service, SSO Service, Control Panel, Viewer, Viewer-APIs, ETL service, AI-service, Dashboards, Neo4j, PostgreSQL, extend-proxy) | The definitive TCP port list per component | `install/requirements/hardware/#tcp-ports` — confirmed against CAST's own architecture reference diagram (user-supplied); notably PostgreSQL's default is **2285**, not the community default 5432, and Gateway:8090 is the single customer-facing entry point (everything else is internal-only, path-routed through Gateway). A later `WebSearch` pass (two independent queries) surfaced snippets claiming CAST's documented default is **2284**, not 2285 — the user was asked directly and confirmed **2285 stands** (the diagram-sourced, user-supplied fact outranks a secondhand search snippet here). Don't re-flag this in a future audit without new evidence; if you find a *primary* doc.castsoftware.com source stating 2284 (not just a search-engine paraphrase), raise that specifically rather than repeating the same ambiguous WebSearch finding. |
| §4 Network egress | Air-gapped / CAST Extend Local Update Server model (extend-proxy container, port 8085 internally) | `install/global/` (general install prerequisites) |
| §5 Reverse proxy | Mandatory reverse-proxy/Ingress-in-front-of-Gateway requirement, independent of HTTPS | `install/global/` (general install prerequisites), `install/https-ssl/` (proxy header/config guidance shared with HTTPS) |
| §6 HTTPS | Certificate requirements, reverse-proxy configuration, `KC_PROXY`/context-URL settings | `install/https-ssl/` |
| §7 Authentication | Local / SAML / LDAP setup, brokered through the embedded SSO Service (8096, /auth) and Auth service (8092, /oauth2) — not "Keycloak"; that was this tool's own earlier guess at the underlying broker's identity, superseded by the architecture diagram's own component names | `install/authentication/`, `install/authentication/local/`, `install/authentication/saml/`, `install/authentication/ldap/` |
| §8 Optional integrations — MCP / AI | MCP Server, Gatekeeper, OAuth module | `mcp-server/`, `mcp-server/imaging/`, `mcp-server/gatekeeper/`, `mcp-server/oauth/` |
| §8 Optional integrations — CAST Highlight | SaaS integration prerequisites (not covered under `install/imaging/` — this is a separate CAST product's docs) | CAST Highlight's own documentation, not `doc.castsoftware.com/imaging/` |
| §9 Source code access | Git/SVN/DevOps/SMB delivery prerequisites | `install/global/docker/reference/config-examples/`, `install/requirements/disk/storage-locations/` |
| §10 Deployment context (audit, …) — CAST Report Generator | Install/version prerequisites for the report-export tool referenced on the end-user workstation and the corresponding §3 network row | `install/report-generator/`, and CAST Export's own doc site: `doc.castsoftware.com/export-v2/doccom/cast-report-generator/` (a different CAST product's doc tree, not under `imaging/`) — user-supplied PDF exports of both pages, confirmed: standalone tool (not bundled), interactive UI variant is Windows-only (a CLI-only "Report Generator for Dashboards" variant also runs on Linux), requires Microsoft .NET 8 SDK (auto-installed by the installer) and an API key from the CAST Imaging user profile, connects to Gateway's `/dashboards/rest` path (same entry point as browser traffic), does NOT require Microsoft Office to generate reports (only to open/edit output or customize templates), minimum versions CAST Imaging 3.4.0-funcrel / CAST Report Generator 1.29.0-funcrel |
| §10 Deployment context (audit, …) — the audit-tooling list (VS Code, Notepad++, Office, DBeaver, Python) | Not a `doc.castsoftware.com` concept at all — this is user-supplied engagement/desktop-tooling context, not a CAST-published client-side requirement. Don't search for a doc page to back it; label it in the tool's own text as given, not confirmed | — (no CAST doc source; user-supplied fact) |

## Already-cited pages

These appear as live links inside `index.html` itself — if you're auditing the section that
cites one, that's the exact page whose content the surrounding text claims to reflect:

- `install/` (general validation notice)
- `install/requirements/db/`
- `install/requirements/software/`
- `install/requirements/disk/storage-locations/` (+ `/docker/`, `/windows/`, `/cloud/` variants)
- `install/requirements/hardware/#tcp-ports` (the "Named components (architecture overview)" table in §1 and most of the port numbers in §3)
- `install/report-generator/` and `export-v2/doccom/cast-report-generator/` (CAST Report Generator, §2 client-side requirements)

## Using this map

1. Find the row matching the section you're auditing.
2. Try fetching the listed page(s) once each.
3. If blocked, search for the same page's content, or ask the user to paste it.
4. Compare what you find against the specific claim in `index.html` — don't treat "the topic is
   generally covered by this doc" as verification of a specific number, port, or version; find
   the actual sentence that supports (or contradicts) the claim.
5. If a section touches something outside CAST's `imaging` docs entirely (e.g. Docker Hub's own
   pull-path hostnames, generic Kubernetes networking, Neo4j's default Bolt port), say so — it's
   fine for a claim's source to be "Docker's own documentation" or "generic technical fact," but
   don't imply it came from `doc.castsoftware.com` when it didn't.
