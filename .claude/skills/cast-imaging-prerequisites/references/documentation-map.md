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
| §2 Project scale | Sizing bands aren't CAST-published tiers — treat as internal planning heuristics, not doc-sourced facts | — (no direct doc source; label accordingly) |
| §3 Database — PostgreSQL | Supported/minimum versions, hosting options | `install/requirements/db/` |
| §3 Database — disk floors, storage locations | 256GB floor, RAM floors, per-platform storage paths | `install/requirements/disk/`, `install/requirements/disk/storage-locations/`, `install/requirements/disk/storage-locations/docker/`, `install/requirements/disk/storage-locations/windows/`, `install/requirements/disk/storage-locations/cloud/` |
| §3 Database — hardware sizing | CPU/RAM baselines | `install/requirements/hardware/` |
| §3 Database — OS/software versions | Supported distros, glibc, Docker Compose version, JDK version | `install/requirements/software/` |
| §4 Network egress | Air-gapped / CAST Extend Local Update Server model | `install/global/` (general install prerequisites) |
| §5 HTTPS | Certificate requirements, reverse-proxy configuration, `KC_PROXY`/context-URL settings | `install/https-ssl/` |
| §6 Authentication | Local / SAML / LDAP setup, Keycloak's role as the embedded broker | `install/authentication/`, `install/authentication/local/`, `install/authentication/saml/`, `install/authentication/ldap/` |
| §7 Optional integrations — MCP / AI | MCP Server, Gatekeeper, OAuth module | `mcp-server/`, `mcp-server/imaging/`, `mcp-server/gatekeeper/`, `mcp-server/oauth/` |
| §7 Optional integrations — CAST Highlight | SaaS integration prerequisites (not covered under `install/imaging/` — this is a separate CAST product's docs) | CAST Highlight's own documentation, not `doc.castsoftware.com/imaging/` |
| §8 Source code access | Git/SVN/DevOps/SMB delivery prerequisites | `install/global/docker/reference/config-examples/`, `install/requirements/disk/storage-locations/` |

## Already-cited pages

These appear as live links inside `index.html` itself — if you're auditing the section that
cites one, that's the exact page whose content the surrounding text claims to reflect:

- `install/` (general validation notice)
- `install/requirements/db/`
- `install/requirements/software/`
- `install/requirements/disk/storage-locations/` (+ `/docker/`, `/windows/`, `/cloud/` variants)

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
