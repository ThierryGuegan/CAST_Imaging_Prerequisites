# CAST pages read (status and "Updated" date)

One line per CAST documentation page read for this tool. **V** = body read verbatim (raw text), **S** = only a model summary reached me, **P** = partly verbatim. The date is the page's own "Updated" line when it was read. Re-read a page (and note the new date here) before changing a fact that rests on it; details of what each page says are in `documentation-map.md`. Site: `doc.castsoftware.com` (only reachable through the `web-fetch` agents, raw text from `offset=80000`).

| Area | Page | Read | Status | Updated |
|---|---|---|---|---|
| Windows | `install/global/windows/` hub, S1 single, S3 single + multi, S5 single + multi, S1 multi, S2, S4 | 2026-11-24 | V | 5–11 Nov 2026 |
| Windows | reference: variables, imaging-core, reverse-proxy (context URL), service-startup-checker | 2026-11-24 | V | 22 Oct – 5 Nov 2026 |
| Windows | `imaging/install/https-ssl/windows/` | 2026-11-24 | V | 27 Oct 2026 |
| Windows | `imaging/install/db/windows/`, `db/post-install/`, `requirements/db/` | 2026-11-24 | V | 29 Oct – 10 Jun 2026 |
| Docker / Podman | `install/global/docker/` hub, S1–S5 (single + multi), `dedicated-neo4j/` | 2026-11-24 | V | 4 Aug – 11 Nov 2026 |
| Docker / Podman | reference: variables, reverse-proxy, shared-folder (NFS); `https-ssl/docker/` | 2026-11-24 | V | 5 Nov 2026 and earlier |
| Docker / Podman | `install/global/podman/` | 2026-11-24 | V | 22 Oct 2026 |
| Requirements | `imaging/install/requirements/precheck/` | 2026-11-24 | P (first groups V, rest S) | 29 Oct 2026 |
| Requirements | `imaging/install/requirements/software/`, `hardware/` | 2026-11-24 / earlier | V (software), P (hardware) | — |
| Network | `imaging/install/network-access/` | 2026-11-24 | V | 9 Nov 2026 |
| Database | `imaging/install/db/encrypted/*` | 2026-11-24 | V | 30 Jul – 22 Oct 2026 |
| Authentication | `imaging/install/authentication/` hub, redirect-uris, ldap, saml, oidc, accounts-and-passwords | 2026-11-24 | V (accounts page: ~90 characters missing) | 24 Jul – 5 Nov 2026 |
| Kubernetes | `install/global/kubernetes/aws/`, `gcp/`, `azure/` (Step 3 networking, values reference) | 2026-11-22 / 24 | P (values reference partly S) | 4 Nov 2026 (AKS) |
| Kubernetes | chart repository `kubernetessetup` (README, `ImagingBackupRestore.md`, `Azure-ApplicationGateway-for-CastImaging.pdf`) | 2026-11-24 | V | branch at clone time |
| MCP | `imaging/mcp-server/admin/install-imaging/docker/` and `/windows/` | 2026-11-24 | V (≈ 86 characters missing each) | 9 Nov 2026 |
| MCP | `…/install-imaging/architecture/`, `install-gatekeeper/*`, `security-oauth/` | 2026-11-24 | V | 9–17 Nov 2026 |
| MCP | `…/update-troubleshoot/` | 2026-11-24 | P | — |
| Extend | `imaging/install/extend-local/` | 2026-11-24 | V | 22 Oct 2026 |
| Update | `imaging/install/update/docker/`, `/windows/` | 2026-11-24 | V | 29–30 Oct 2026 |
| Update | `imaging/install/update/podman/`, `/kubernetes/` | 2026-11-24 | V | 4 Aug / 22 Oct 2026 |
| Release notes | Linux installer 3.6 (3.6.0–3.6.9) | 2026-11-24 | V | 14 Oct 2026 |
| Release notes | Windows installer 3.6 | 2026-11-24 | P (3.6.9 and most of 3.6.8 only — the source truncates the page; no per-version subpages) | — |
| Release notes | Linux / Windows 3.5 | 2026-11-24 | P (3.5.9–3.5.6 V, rest S) | — |

| Administration | `imaging/administer/system-settings/` (index, `highlight/`, `proxy/`), `administer/manage-access/profile/email-notifications/` | 2026-11-24 | V | 14 Sep – 30 Oct 2026 |
| Source code | `imaging/onboard/register-deliver-source-code/`, `administer/global-configuration/source-folder-location/`, `…/maven-repos/` | 2026-11-24 | V | 8 Jul – 30 Oct 2026 |

| Sizing | `imaging/install/requirements/hardware/` (parent page, **V**, 17 Nov 2026), `…/sizing-calculator/` and `…/how-it-works/` (**V**, beta, 16 Oct / 4 Nov 2026) | 2026-11-24 | V | — |

The sizing calculator pages contain **no usable formula, table or example** (the widget did not render; the method page gives no numbers); per-component figures exist only as the fixed tables of the parent hardware page, which the tool follows (VM floors 1 CPU / 2 cores minimum, 16 GB distributed / 32 GB single machine, 256 GB disk; Kubernetes 2 nodes minimum, 4 vCPU and 32 GB per node, +1 node per extra analysis-node; isolation examples 2 / 3 / 4 / 6 nodes). Nothing to compare the tool's sizing against.

## CAST support answers (relayed by the maintainer — not pages)
| Topic | Date | What it settles |
|---|---|---|
| Istio on Kubernetes | 2026-11-25 | `UseIstioGateway: true`; `CreateIstioGateway` ignored silently (≤ 3.5.3 leftover); `ExistingIstioGatewayName` optional; `CreateLoadBalancer: false` recommended for production with Istio |
| `CreateLoadBalancer` | 2026-11-25 | Outside the single-option check (`CreateIngress`, `UseIstioGateway`, `UseGatewayAPI`, `UseApplicationGateway`); default `true`; left on = a separate load balancer next to the chosen option |
| Neo4j Bolt port | 2026-11-25 | 7697 = Windows default, 7687 = Docker/Linux default; both correct |
| MCP health check | 2026-11-25 | `/mcpserver/healthcheck` (current) = `/mcp/healthcheck` (older, supported) on every platform; `GET /mcp/status` 200 healthy / 503 degraded |

These count as **Confirmed** (the maintainer pasted the answer); quote them as "CAST support", never as a page.

## Not read (yet)
Windows release notes 3.6.7–3.6.0; MCP Podman and air-gapped pages (documented for 3.0.x only); the `highlight2mri` extension page itself (its body was never reached); Docker `dedicated-neo4j` Podman page; the security-fix subpages of the release notes.
