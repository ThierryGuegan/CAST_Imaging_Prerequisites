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
