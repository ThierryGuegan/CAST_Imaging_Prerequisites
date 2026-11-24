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

  // Kubernetes: chart 3.6.9 container ports, images and defaults (CAST-Extend charts, provider pages)
  const K8S_PORTS = [8089, 8091, 8092, 8098, 2381, 8090, 8096, 8097, 8085, 8285];
  await L.set(page, { platform: 'kubernetes', k8sProvider: 'eks', scenario: 'full', topology: 'multi', dbHosting: 'dedicated', egress: 'airgapped', mcp: true });
  const kt = await L.resultsText(page);
  for (const p of K8S_PORTS) if (!has(kt, p)) fails.push('kubernetes: port ' + p + ' missing');
  for (const frag of ['imaging-mcp-server:3.1.0', 'extend-proxy', 'castimaging/analysis-node:<ver>_core', 'pvc-shared-datadir', 'ReadWriteMany', 'EFS']) if (!kt.includes(frag)) fails.push('kubernetes: "' + frag + '" missing');
  if (!/requests 0\.5 CPU \/ 8 GB/.test(kt)) fails.push('kubernetes: chart default analysis-node request (0.5 CPU / 8 GB) missing');
  await L.set(page, { k8sProvider: 'openshift', reverseProxy: 'route' });
  const ot = await L.resultsText(page);
  if (!/requests 1 CPU \/ 16 GB/.test(ot) || !/Routes\.enable/.test(ot) || /EnforceAnalysisNodeIsolation[^.]*:\s*true/.test(ot)) fails.push('openshift: chart defaults or Routes text');
  await L.set(page, { k8sProvider: 'aks', reverseProxy: 'gatewayapi' });
  const at = await L.resultsText(page);
  if (!/SMB/.test(at) || !/FIPS/.test(at)) fails.push('aks: Azure Files SMB / FIPS NFS text missing');
  await L.set(page, { k8sProvider: 'gke' });
  if (!/Filestore/.test(await L.resultsText(page))) fails.push('gke: Filestore missing');

  // Text that names a component the scenario excludes (the class of defect found by several audits)
  const EXCLUDED = [
    ['dashboards-only', /even with a single analysis-node pod|Each node hosting an analysis-node|analysis-node pods carry|requests 0\.5 CPU \/ 8 GB, limits 4 CPU \/ 32 GB \(<code>MaxParallel|analysis-node requests/],
    ['viewer-readonly', /even with a single analysis-node pod|analysis-node requests/],
    ['analysis-only', /viewer-neo4j|Neo4j requests|viewer-server and ETL/],
  ];
  for (const platform of ['kubernetes', 'docker', 'windows']) for (const [sc, re] of EXCLUDED) {
    await L.set(page, { platform, k8sProvider: 'eks', scenario: sc, topology: 'single', dbHosting: 'dedicated', egress: 'direct' });
    const m = (await L.resultsText(page)).match(re);
    if (m) fails.push(platform + '/' + sc + ': text names an excluded component ("' + m[0].slice(0, 60) + '")');
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
