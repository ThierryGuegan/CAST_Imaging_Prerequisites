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
  const link = await page.evaluate(() => { let u = ''; const orig = window.prompt; window.prompt = (m, v) => { u = v; return null; }; Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.getElementById('share-link').click(); window.prompt = orig; return u; });
  ok(/#a=/.test(link), 'share link not produced');
  await page.goto(link); await page.reload();
  const back = await page.evaluate(() => ({ p: document.querySelector('input[name=platform]:checked').value, s: document.querySelector('input[name=scenario]:checked').value, n: document.getElementById('clientProject').value }));
  ok(back.p === 'podman' && back.s === 'viewer-readonly' && back.n === 'ACME – test', 'share link did not restore the answers: ' + JSON.stringify(back));
  await L.set(page, { platform: 'docker', scenario: 'full', auth: 'local', reverseProxy: 'nginx' });

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
