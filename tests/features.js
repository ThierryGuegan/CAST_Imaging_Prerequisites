// Feature checks for the exports and helpers: ports CSV, values.yaml starting point, comparison, clickable chips,
// "points to confirm" list. Usage: node tests/features.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./lib');

(async () => {
  const { browser, page, errors } = await L.open();
  const ctx = page.context();
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  async function download(click) {
    const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
    const file = path.join(os.tmpdir(), 'dl-' + Date.now() + '-' + dl.suggestedFilename());
    await dl.saveAs(file);
    return { name: dl.suggestedFilename(), text: fs.readFileSync(file, 'utf8') };
  }

  // points to confirm + chips
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'aks', reverseProxy: 'appgw', scenario: 'full', egress: 'airgapped' });
  ok(await page.$('#confirm-box'), 'points-to-confirm box missing');
  ok(await page.evaluate(() => document.querySelectorAll('#confirm-box li').length) > 0, 'points-to-confirm list empty');
  await page.click('.chip[data-q="reverseProxy"]');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.name === 'reverseProxy'), 'chip did not focus its question');

  // headless scenario keeps the browser path (Console / Control Panel) incl. the identity-provider redirect
  await L.set(page, { platform: 'docker', scenario: 'analysis-only', auth: 'saml' });
  const hl = await L.resultsText(page);
  ok(/End-user browser\s+SAML Identity Provider/.test(hl) && /Headless scenario — only if staff sign in/.test(hl), 'headless SAML browser -> IdP row missing');
  await L.set(page, { scenario: 'full', auth: 'local' });

  // MCP is hidden without a Viewer on every platform
  await L.set(page, { platform: 'docker', scenario: 'analysis-only' });
  ok(await page.evaluate(() => document.getElementById('mcp').closest('label').style.display === 'none'), 'MCP option still offered on Docker without a Viewer');
  await L.set(page, { platform: 'windows', scenario: 'full' });
  ok(await page.evaluate(() => document.getElementById('mcp').closest('label').style.display !== 'none'), 'MCP option hidden on Windows with a Viewer');
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local' });

  // CloudFront / Application Gateway with a certificate answer that doesn't fit: warn
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'eks', reverseProxy: 'cloudfront', certSource: 'none' });
  ok(/does not describe this setup/.test(await L.resultsText(page)), 'no warning for CloudFront + No HTTPS');
  await L.set(page, { k8sProvider: 'aks', reverseProxy: 'appgw', certSource: 'self-signed' });
  ok(/POC only/.test(await L.resultsText(page)), 'no warning for Application Gateway + self-signed');
  await L.set(page, { certSource: 'ca-issued' });
  ok(!/does not describe this setup|POC only/.test(await L.resultsText(page)), 'warning shown with a CA-issued certificate');
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local', reverseProxy: 'nginx' });

  // Kubernetes: the entry option's prerequisites live in the k8s-prep item, not in duplicate rp-* items
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'gke', reverseProxy: 'gatewayapi', certSource: 'ca-issued' });
  let keys = await L.checkKeys(page);
  ok(!keys.some(k => /^rp-deployed|^rp-tls/.test(k)) && keys.some(k => /^k8s-prep/.test(k)), 'duplicate rp-* items on Kubernetes with Gateway API');
  await L.set(page, { reverseProxy: 'nginx' });
  keys = await L.checkKeys(page);
  ok(keys.some(k => /^rp-deployed/.test(k)), 'rp-deployed missing for an external reverse proxy on Kubernetes');
  await L.set(page, { k8sProvider: 'aks', reverseProxy: 'appgw' });
  keys = await L.checkKeys(page);
  ok(keys.some(k => /^rp-tls/.test(k)), 'rp-tls missing for Application Gateway');
  // Windows install items
  await L.set(page, { platform: 'windows', scenario: 'dashboards-only', reverseProxy: 'nginx' });
  keys = await L.checkKeys(page);
  ok(keys.includes('win-dashboards-standalone') && keys.includes('win-install-media'), 'Windows dashboards-only items missing');
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local', reverseProxy: 'nginx' });

  // Windows service count per scenario, Kubernetes backup item
  await L.set(page, { platform: 'windows', scenario: 'full', topology: 'single' });
  ok((await L.checkKeys(page)).includes('win-services:full') && /14<\/b> services|14 services/.test(await page.evaluate(() => document.querySelector('[data-check-key="win-services:full"]').closest('li,label,div').innerText)) , 'Windows services count item');
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'gke', scenario: 'full' });
  ok((await L.checkKeys(page)).some(k => /^k8s-backup:k8s/.test(k)), 'Kubernetes backup item missing');
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'single' });

  // Windows items from the remaining install pages
  await L.set(page, { platform: 'windows', scenario: 'full', topology: 'multi', dbHosting: 'dedicated' });
  keys = await L.checkKeys(page);
  ok(keys.includes('win-imaging-core') && keys.includes('win-prechecks') && keys.includes('win-config-variables') && keys.includes('win-multi-install') && keys.includes('pg-config:self'), 'Windows multi-machine items missing');
  const cfg = await page.evaluate(() => document.querySelector('[data-check-key="win-config-variables"]').closest('li,label,div').innerText);
  ok(/2284/.test(cfg) && !/2285/.test(cfg), 'Windows CSS_INFOS port not translated');
  await L.set(page, { scenario: 'dashboards-only', topology: 'single', dbHosting: 'colocated' });
  keys = await L.checkKeys(page);
  ok(!keys.includes('win-imaging-core') && keys.includes('win-readonly-source:dashboards-only'), 'Core item shown without analysis, or read-only item missing');
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'single', dbHosting: 'colocated' });

  // Firewall / NAT, startup checker, Windows HTTPS port note
  await L.set(page, { platform: 'docker', scenario: 'full' });
  ok((await L.checkKeys(page)).includes('fw-docker-nat'), 'Docker NAT firewall item missing');
  await L.set(page, { platform: 'windows', certSource: 'ca-issued', reverseProxy: 'nginx' });
  ok(/moves the Gateway itself to port 443/.test(await L.resultsText(page)) && !/undefined/.test(await L.resultsText(page)), 'Windows HTTPS Gateway-port note');
  ok(/CAST-Imaging-sync-all-services-on-startup\.bat/.test(await L.resultsText(page)), 'startup checker path');
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local', reverseProxy: 'nginx' });

  // Docker items, installer variables worksheet, share link
  await L.set(page, { platform: 'docker', scenario: 'dashboards-only', topology: 'single', dbHosting: 'colocated' });
  keys = await L.checkKeys(page);
  ok(keys.some(k => /^dk-install-plan/.test(k)) && keys.includes('dk-config') && keys.includes('dk-prechecks') && keys.includes('dk-dashboards-standalone'), 'Docker items missing');
  const dk = await download(() => page.click('#export-conf'));
  ok(/DB_MODE=embedded/.test(dk.text) && /DASHBOARD_STANDALONE_ENABLED=true/.test(dk.text) && !/undefined/.test(dk.text), 'Docker worksheet');
  await L.set(page, { platform: 'windows', scenario: 'full', topology: 'multi', dbHosting: 'dedicated' });
  const wn = await download(() => page.click('#export-conf'));
  ok(/CSS_INFOS=<database host>:2284/.test(wn.text) && /SHARED_FOLDER=/.test(wn.text) && /config-imaging-viewer\.conf/.test(wn.text), 'Windows worksheet');
  ok(await page.evaluate(() => document.getElementById('export-conf').hidden === false), 'worksheet button hidden on Windows');
  await L.set(page, { platform: 'kubernetes' });
  ok(await page.evaluate(() => document.getElementById('export-conf').hidden === true), 'worksheet button shown on Kubernetes');
  // share link: build in the page, reload with the fragment, answers come back
  await L.set(page, { platform: 'podman', scenario: 'viewer-readonly', clientProject: 'ACME – test' });
  await page.check('#share-with-name');
  const link = await page.evaluate(() => { let u = ''; const orig = window.prompt; window.prompt = (m, v) => { u = v; return null; }; Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.getElementById('share-link').click(); window.prompt = orig; return u; });
  ok(/#a=/.test(link), 'share link not produced');
  await page.goto(link); await page.reload();
  const back = await page.evaluate(() => ({ p: document.querySelector('input[name=platform]:checked').value, s: document.querySelector('input[name=scenario]:checked').value, n: document.getElementById('clientProject').value }));
  ok(back.p === 'podman' && back.s === 'viewer-readonly' && back.n === 'ACME – test', 'share link did not restore the answers: ' + JSON.stringify(back));
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local', reverseProxy: 'nginx' });

  // Advanced options: URL path and certificate-based database connections
  await L.set(page, { platform: 'docker', scenario: 'full', dbHosting: 'dedicated', ctxUrl: true, dbTls: true });
  keys = await L.checkKeys(page);
  ok(keys.includes('ctx-url:vm') && keys.includes('db-tls'), 'advanced option items missing on Docker with an external database');
  await L.set(page, { dbHosting: 'colocated' });
  ok(!(await L.checkKeys(page)).includes('db-tls'), 'database TLS item shown with the bundled database');
  await L.set(page, { platform: 'windows', dbHosting: 'colocated' });
  ok((await L.checkKeys(page)).includes('db-tls') && (await L.checkKeys(page)).includes('ctx-url:win'), 'database TLS / URL path missing on Windows');
  await L.set(page, { platform: 'docker', ctxUrl: false, dbTls: false, dbHosting: 'colocated' });
  // authentication sources
  await L.set(page, { auth: 'ldap' });
  ok(/5,000/.test(await L.resultsText(page)), 'LDAP size limit missing');
  await L.set(page, { auth: 'saml', certSource: 'ca-issued' });
  ok(/Advanced Attribute to Group/.test(await L.resultsText(page)) && (await L.checkKeys(page)).includes('kc-accounts'), 'SAML group mapper or Keycloak accounts item missing');
  await L.set(page, { auth: 'local' });

  // mandatory-only filter on the ports table
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'multi' });
  await page.check('#ports-mandatory');
  const vis = await page.evaluate(() => [...document.querySelectorAll('#results-content tr[data-tag]')].filter(tr => tr.style.display !== 'none').map(tr => tr.getAttribute('data-tag')));
  ok(vis.length > 0 && vis.every(t => t === 'mandatory'), 'mandatory-only filter shows other rows: ' + [...new Set(vis)].join(','));
  await page.uncheck('#ports-mandatory');

  // checklist export keeps the right tick (keyed by item id) with the ports filter and the view switch present in the page
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'single' });
  await page.evaluate(() => { try { Object.keys(localStorage).filter(k => /checklist/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {} });
  await L.set(page, { scale: 'poc' });
  await page.evaluate(() => { const b = document.querySelector('[data-check-key="tmp-exec"]'); b.click(); });
  const exp = await download(() => page.click('#export-html'));
  const tickedKeys = [...exp.text.matchAll(/<input type="checkbox"[^>]*data-check-key="([^"]+)"[^>]*checked/g)].map(m => m[1]);
  ok(tickedKeys.length === 1 && tickedKeys[0] === 'tmp-exec', 'checklist export ticks: ' + tickedKeys.join(','));
  ok(!/ports-mandatory|name="checklist-view"/.test(exp.text), 'interactive controls left in the export');
  // phase view
  await page.check('input[name=checklist-view][value=phase]');
  ok(await page.evaluate(() => [...document.querySelectorAll('#checklist-section h4')].map(h => h.textContent).join('|').includes('Decide with your teams') && document.querySelector('[data-check-key="tmp-exec"]').checked), 'phase view missing or tick lost');
  await page.check('input[name=checklist-view][value=role]');

  // At a glance, conflicts box, MCP install item, install-fixed item
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'multi', ctxUrl: true, mcp: true, certSource: 'ca-issued', reverseProxy: 'nginx' });
  ok(await page.evaluate(() => !!document.getElementById('at-a-glance') && /to decide/.test(document.getElementById('at-a-glance').textContent)), 'at a glance missing');
  ok(await page.evaluate(() => !!document.getElementById('disagree-box') && /Shared folder protocol/.test(document.getElementById('disagree-box').textContent)), 'conflicts box missing');
  keys = await L.checkKeys(page);
  ok(keys.includes('mcp-install:docker') && keys.includes('install-fixed:docker'), 'MCP install / install-fixed items missing');
  await L.set(page, { platform: 'docker', ctxUrl: false, mcp: false, topology: 'single' });
  ok(await page.evaluate(() => !document.getElementById('disagree-box')), 'conflicts box shown without a conflict');

  // collapsible sections: fold all, the state survives a re-render, exports show every section
  await L.set(page, { platform: 'docker', scenario: 'full', topology: 'single' });
  await page.click('#collapse-all');
  ok(await page.evaluate(() => [...document.querySelectorAll('details.section-box')].every(d => !d.open) && document.querySelectorAll('details.section-box').length >= 6), 'collapse all');
  await L.set(page, { scale: 'enterprise' });
  ok(await page.evaluate(() => [...document.querySelectorAll('details.section-box')].every(d => !d.open)), 'folded state lost on re-render');
  const full = await download(() => page.click('#save-html'));
  ok(!/<details class="section-box"(?![^>]*\bopen)/.test(full.text), 'a section is folded in the exported file');
  ok(/docker-full-\d{4}-/.test(full.name), 'export file name lacks the profile: ' + full.name);
  await page.click('#expand-all');
  ok(await page.evaluate(() => [...document.querySelectorAll('details.section-box')].every(d => d.open)), 'expand all');
  await L.set(page, { scale: 'poc' });

  // Highlight, e-mail, proxy and source-folder items from CAST's administration pages
  await L.set(page, { platform: 'windows', scenario: 'full', egress: 'proxy', highlight: true, email: true, repoSmb: true });
  keys = await L.checkKeys(page);
  ok(['highlight:v2', 'smtp:v2', 'proxy-settings', 'source-folder:win'].every(k => keys.includes(k)), 'administration items missing: ' + keys.filter(k => /highlight|smtp|proxy|source-folder/.test(k)).join(','));
  await L.set(page, { platform: 'docker', egress: 'direct', highlight: false, email: false, repoSmb: false });

  // MCP health-check conflict is a Windows-only line (the Neo4j port is not a conflict)
  await L.set(page, { platform: 'windows', scenario: 'full', topology: 'single', mcp: true, certSource: 'none' });
  const dis = await page.evaluate(() => { const b = document.getElementById('disagree-box'); return b ? b.textContent : ''; });
  ok(/MCP health check on Windows/.test(dis) && !/7687/.test(dis.replace(/7697/g, '')), 'Windows MCP health-check line missing or still mentions the Neo4j port as a conflict');
  await L.set(page, { platform: 'docker', mcp: true });
  ok(!(await page.evaluate(() => { const b = document.getElementById('disagree-box'); return b ? /MCP health check/.test(b.textContent) : false; })), 'MCP health-check conflict shown on Docker');
  await L.set(page, { platform: 'docker', mcp: false });

  // CSV
  let d = await download(() => page.click('#export-ports-csv'));
  ok(/^﻿?"Source","Destination","Port"/.test(d.text), 'CSV header');
  ok(d.text.split('\r\n').length > 5, 'CSV has too few rows');
  await L.set(page, { platform: 'windows' });
  d = await download(() => page.click('#export-ports-csv'));
  ok(!/"2285[ "]|"8089[ "]|"8083[ "]|"9001[ "]/.test(d.text) && /"2284 \(default/.test(d.text), 'Windows ports not translated in the CSV');

  // values.yaml: visible on Kubernetes/OpenShift only
  ok(await page.evaluate(() => document.getElementById('export-values').hidden), 'values button visible on Windows');
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'eks', reverseProxy: 'gatewayapi', egress: 'airgapped', mcp: true });
  ok(!(await page.evaluate(() => document.getElementById('export-values').hidden)), 'values button hidden on Kubernetes');
  d = await download(() => page.click('#export-values'));
  ok(/K8SProvider: EKS/.test(d.text) && /UseGatewayAPI: true/.test(d.text) && /ExtendProxy:/.test(d.text) && /McpServer:/.test(d.text), 'values.yaml content (EKS, Gateway API, air-gapped, MCP)');
  ok(!/Azure|AKS|UseApplicationGateway: true/.test(d.text), 'provider leak in values.yaml');
  await L.set(page, { k8sProvider: 'openshift', reverseProxy: 'route' });
  d = await download(() => page.click('#export-values'));
  ok(/Routes:/.test(d.text) && !/K8SProvider/.test(d.text), 'OpenShift values.yaml');

  // comparison with a saved file
  const saved = await download(() => page.click('#save-json'));
  const file = path.join(os.tmpdir(), 'cmp-' + Date.now() + '.json');
  fs.writeFileSync(file, saved.text);
  await L.set(page, { scale: 'enterprise' });
  await page.setInputFiles('#compare-json-file', file);
  await page.waitForTimeout(300);
  const cmp = await page.evaluate(() => document.getElementById('compare-result').innerText);
  ok(/difference/.test(cmp) && /scale/.test(cmp), 'comparison did not list the changed answer: ' + cmp.slice(0, 80));

  errors.forEach(e => fails.push(e));
  console.log('feature checks', fails.length ? 'FAILED' : 'passed');
  fails.forEach(f => console.log(' -', f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
