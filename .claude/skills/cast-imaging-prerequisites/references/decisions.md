# Maintainer decisions (short, dated)

One line per decision the maintainer made, newest first. **Never re-flag these.** Details, sources and the reasoning live in `documentation-map.md`; record a new decision here *and* there.

## 2026-11-24
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

## Still open
- Windows + HTTPS: does "Gateway :8090" become 443? (the tool states both CAST sources and asks to confirm)
- Shared folder on Linux: SMB only (hardware page) or NAS/SAN / NFS (Docker pages)? (the tool shows both)
- "Single node pool" label for a Kubernetes topology that distributes nothing.
- Private-registry box in the diagram for air-gapped installs (content needed).
