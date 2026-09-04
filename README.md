# CAST Imaging Prerequisites — Requirements Builder

An interactive tool that helps you **define the architecture and installation
prerequisites for your specific CAST Imaging deployment**, instead of handing you a
generic, one-size-fits-all checklist.

Open **`index.html`** in a browser. Answer the questions on the left (project scale,
platform, topology, database, network egress, HTTPS, authentication, optional MCP/AI
and CAST Highlight integrations, source-code access methods) and the document on the
right regenerates live:

- Hardware sizing for exactly the profile you selected (not every possible combination).
- A network ports / FQDN allowlist matrix filtered to the flows your configuration
  actually needs — no unused rows, no wildcards.
- Database requirements matched to your chosen engine and hosting model.
- HTTPS/TLS guidance matched to your certificate source and termination point.
- Authentication prerequisites for the exact method you picked (Local / SAML / LDAP).
- CAST Extend access and licensing steps, adapted for direct/proxy/air-gapped egress.
- MCP Server (AI) prerequisites, only shown if you enable that integration.
- A pre-installation checklist built from your actual answers.

Both the tailored ports matrix and the tailored sizing table can be exported as CSV
directly from the page, and the whole result can be printed / saved as PDF (the
questionnaire pane is hidden from the print output).

Everything runs client-side in the browser — no data leaves the page.

> **Validation notice.** Recommendations are derived from CAST Imaging's published
> documentation structure and standard CAST Software deployment practices. Always
> confirm exact minimum versions, default ports, and sizing against the current
> [doc.castsoftware.com/imaging/install](https://doc.castsoftware.com/imaging/install/)
> for the CAST Imaging release you are deploying.
