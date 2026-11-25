# Maintainer decisions (short, dated)

One line per decision the maintainer made, newest first. **Never re-flag these.** Details, sources and the reasoning live in `documentation-map.md`; record a new decision here *and* there.

## 2026-11-25
- **Istio on Kubernetes (answer from CAST support, relayed by the maintainer):** `UseIstioGateway: true` is the right setting for chart 3.6.9; `CreateIstioGateway` (still in the online Option C) is a leftover from chart 3.5.3 and older that the chart **ignores silently** (no error, no gateway); `ExistingIstioGatewayName` is optional (`<namespace>/<gateway-name>`, e.g. `asm-gateways/istio-gateway`; empty = the chart creates `castimaging-gateway` in the Imaging namespace); only one of `CreateIngress`, `UseIstioGateway`, `UseGatewayAPI`, `UseApplicationGateway` may be enabled; `CreateLoadBalancer` is not part of that check, defaults to `true`, and **`false` is recommended for production with Istio**; CAST R&D is correcting the online page.

## 2026-11-24
- The Kubernetes topology that distributes nothing is labelled **"Shared nodes"** (was "Single node pool"; the other choice stays "Isolated nodes").
- No private-registry box in the diagram for air-gapped installs (the Section 6 image list covers it).
- Monthly freshness check of the CAST pages: a scheduled task (report only, 5th of each month) plus a non-blocking monthly link check in GitHub Actions.
- Windows PostgreSQL port is **2284**; Docker/Podman/Kubernetes keep 2285.
- Supported PostgreSQL range is **15.x–18.x** (was 14.x–18.x) — follow CAST's Windows scenario and database pages.
- Headless scenarios (analysis-only) **keep the browser path** to Console and Control Panel (conditional browser → IdP row, diagram entry "API client / Browser").
- The AI / MCP option is **hidden and ignored on every platform** when the scenario has no Viewer.
- CloudFront (EKS) and Application Gateway (AKS) combined with "No HTTPS" or a self-signed certificate **warn**; nothing is forced or ignored.
- Istio, Amazon CloudFront (EKS only) and Azure Application Gateway (AKS only) are offered in question 5.
- Provider-specific content never leaks across providers (no Azure text on GKE).
- The `k8s-etc-cast-imaging` item stays on every Kubernetes flavour; client-facing text never says "confirmed by the maintainer".
- OpenShift is Kubernetes + provider `openshift`; OKD included; Kubernetes ≥ 1.31 for the on-premises flavour.
- Highlight hosts: `rpa.casthighlight.com`, `cloud.casthighlight.com`, `auth.casthighlight.com`.
- Single-machine topology on VMs is called "single machine".
- Windows with HTTPS follows CAST's Windows procedure (TLS at the Gateway on 443).

- The shared-folder "only SMB" statement is attributed to *an earlier version* of CAST's documentation (not found on the current hardware page) until CAST answers; Windows stays SMB only.

## Still open
- Windows + HTTPS: does "Gateway :8090" become 443? (the tool states both CAST sources and asks to confirm)
- Shared folder on Linux: SMB only (an earlier version of the documentation) or NAS/SAN / NFS (current Docker pages)? (the tool shows both)
