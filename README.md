# CAST Imaging Prerequisites

Architecture and installation prerequisites for CAST Imaging and its associated modules,
compiled from the structure of the official documentation at
[doc.castsoftware.com/imaging/install](https://doc.castsoftware.com/imaging/install/).

## Contents

- **`index.html`** — single-page HTML application covering: deployment options (platform /
  scenario / topology decision matrix), hardware / software / database / disk requirements
  refined per topology, MCP servers (Imaging, Gatekeeper, OAuth), per-platform installation
  references (Windows, Docker, Podman, Kubernetes), HTTPS/SSL, authentication (Local, SAML,
  LDAP), CAST Extend access and API key, outbound flows and exact FQDN allowlisting, the full
  network ports matrix, licensing, and a consolidated pre-installation checklist. Open it
  directly in a browser.
- **`CAST-Imaging-Architecture-Installation-Prerequisites.pdf`** — printable export of the
  same content (31 pages).
- **`network-and-ports-matrix.csv`** — machine-readable inbound / internal / outbound port
  and FQDN matrix.
- **`sizing-requirements-matrix.csv`** — machine-readable hardware sizing matrix by scenario
  and topology.

> **Validation notice.** This document was compiled from CAST Imaging's published
> documentation structure and standard CAST Software deployment practices. Version-specific
> figures (minimum OS/DB versions, default ports, sizing) should be verified against the
> current `doc.castsoftware.com/imaging/install` for the exact CAST Imaging release being
> deployed before use in infrastructure sizing or firewall change requests.
