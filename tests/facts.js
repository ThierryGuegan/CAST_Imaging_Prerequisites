// Fact fixtures: values taken from CAST's own pages (read in full on 2026-11-24) that the generated text must keep.
// A failure here means a confirmed fact was lost or changed — check documentation-map.md before "fixing" the test.
const L = require('./lib');

// "Restrict network access" page — port tables per component.
const WINDOWS_PORTS = {
  'imaging-services': [2381, 8090, 8091, 8092, 8096, 8098, 9002],
  'analysis-node': [8099],
  'imaging-viewer (Neo4j and services)': [6372, 7483, 7484, 7697, 8070, 8093, 8094, 8286, 9010, 9011],
  dashboards: [8097],
  PostgreSQL: [2284],
};
const DOCKER_PORTS = {
  'imaging-services': [2285, 2381, 8090, 8091, 8092, 8096, 8098],
  'analysis-node': [8089],
  'imaging-viewer': [7473, 7474, 7687, 8070, 8082, 8083, 9000, 9001],
  dashboards: [8097],
};
// Scenario pages — Windows services on one machine, Docker containers on one machine.
const WIN_SERVICES = { full: 14, 'viewer-readonly': 12, 'analysis-dashboards': 7, 'dashboards-only': 6 };
const DOCKER_COUNT = { full: '13 containers', 'viewer-readonly': '11 containers', 'analysis-dashboards': '8 containers', 'dashboards-only': '7 containers' };

(async () => {
  const { browser, page, errors } = await L.open();
  const fails = [];
  const has = (t, port) => new RegExp('(^|[^\\d.])' + port + '(?!\\d)').test(t);

  // every port must appear for a distributed full scenario with everything switched on
  for (const [platform, table] of [['windows', WINDOWS_PORTS], ['docker', DOCKER_PORTS]]) {
    await L.set(page, { platform, scenario: 'full', topology: 'multi', dbHosting: 'colocated', mcp: true });
    if (platform === 'windows') await L.set(page, { dbHosting: 'dedicated' });
    const t = await L.resultsText(page);
    for (const [component, ports] of Object.entries(table))
      for (const p of ports) if (!has(t, p)) fails.push(platform + ': port ' + p + ' (' + component + ') missing from the generated text');
  }

  // Windows must not show the Docker-only ports as its own
  await L.set(page, { platform: 'windows', scenario: 'full', topology: 'single', dbHosting: 'dedicated' });
  const wt = await L.resultsText(page);
  for (const p of [8089, 8082, 8083, 9001]) if (has(wt.replace(/Docker\/Podman[^\n]*/g, ''), p)) fails.push('windows: Docker port ' + p + ' shown');

  // service / container counts and Dashboards-only mode
  for (const [sc, n] of Object.entries(WIN_SERVICES)) {
    await L.set(page, { platform: 'windows', scenario: sc, topology: 'single', dbHosting: 'dedicated' });
    const txt = await page.evaluate(k => { const e = document.querySelector('[data-check-key="win-services:' + k + '"]'); return e ? e.closest('li,label,div').innerText : ''; }, sc);
    if (!new RegExp('\\b' + n + '\\b').test(txt)) fails.push('windows ' + sc + ': expected ' + n + ' services in the checklist');
  }
  for (const [sc, label] of Object.entries(DOCKER_COUNT)) {
    await L.set(page, { platform: 'docker', scenario: sc, topology: 'single', dbHosting: 'colocated' });
    const keys = await L.checkKeys(page);
    const txt = await page.evaluate(() => { const e = document.querySelector('[data-check-key^="dk-install-plan"]'); return e ? e.closest('li,label,div').innerText : ''; });
    if (!txt.includes(label)) fails.push('docker ' + sc + ': expected "' + label + '" in the install plan');
    if (sc === 'full' && !/install\.sh all/.test(txt)) fails.push('docker full single: install command should be "all"');
    if (sc === 'dashboards-only' && !keys.includes('dk-dashboards-standalone')) fails.push('docker dashboards-only: standalone item missing');
  }

  // PostgreSQL range and Windows port
  await L.set(page, { platform: 'windows', dbHosting: 'dedicated', scenario: 'full' });
  const pg = await L.resultsText(page);
  if (!/15\.x–18\.x/.test(pg) || /14\.x–18\.x/.test(pg)) fails.push('PostgreSQL range must be 15.x–18.x');
  if (!/2284/.test(pg)) fails.push('Windows PostgreSQL port 2284 missing');

  errors.forEach(e => fails.push(e));
  console.log('fact checks', fails.length ? 'FAILED' : 'passed');
  fails.forEach(f => console.log(' -', f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
