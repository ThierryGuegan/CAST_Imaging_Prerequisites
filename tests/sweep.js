// Regression sweep: renders many answer combinations and fails on
//  - any JS error / console error,
//  - garbage in the generated text (undefined, NaN, [object),
//  - duplicate checklist ids,
//  - content that leaks across providers (Azure text on GKE, Gatekeeper in the Kubernetes sizing row, ...).
// Usage: node tests/sweep.js [--quick]     (CHROMIUM_PATH=/opt/pw-browsers/chromium if the default browser is missing)
const L = require('./lib');
const quick = process.argv.includes('--quick');

// Words that must not appear for a given provider. Generic provider-neutral text is checked elsewhere (provider lists were removed).
const LEAKS = {
  eks: /\bAzure\b|\bAKS\b|\bGKE\b|Google Cloud|Cloud SQL|Filestore/,
  aks: /\bAmazon\b|\bAWS\b|\bEKS\b|\bGKE\b|Google Cloud|Cloud SQL|Filestore|\bEFS\b|CloudFront/,
  gke: /\bAzure\b|\bAKS\b|\bAmazon\b|\bAWS\b|\bEKS\b|\bEFS\b|CloudFront|Application Gateway/,
};

(async () => {
  const { browser, page, errors } = await L.open();
  const fails = [];
  let n = 0;
  const platforms = quick ? ['kubernetes', 'docker', 'windows'] : ['kubernetes', 'openshift', 'docker', 'windows', 'podman'];
  const providers = quick ? ['eks', 'aks', 'gke'] : ['aks', 'eks', 'gke', 'other'];
  const scenarios = quick ? ['full', 'analysis-only'] : ['full', 'analysis-dashboards', 'viewer-readonly', 'dashboards-only', 'analysis-only'];
  const proxies = ['nginx', 'ingress', 'gatewayapi', 'istio', 'cloudfront', 'appgw', 'route', 'iis', 'undecided'];

  for (const pl of platforms) for (const pv of providers) for (const sc of scenarios)
  for (const tp of ['single', 'multi']) for (const db of ['colocated', 'managed']) for (const eg of ['direct', 'airgapped'])
  for (const au of quick ? ['local'] : ['local', 'oidc']) {
    if (pl !== 'kubernetes' && pv !== 'other') continue;
    n++;
    // rotate the reverse proxy so every option is rendered on every platform without multiplying the sweep
    // (options a provider doesn't offer are covered by the mismatch callout and are skipped here)
    const offered = proxies.filter(p => !(p === 'cloudfront' && pv !== 'eks') && !(p === 'appgw' && pv !== 'aks') && !(p === 'istio' && (pl !== 'kubernetes')) && !(p === 'ingress' && pl !== 'kubernetes') && !(p === 'gatewayapi' && pl !== 'kubernetes') && !(p === 'route' && pl !== 'openshift' && pv !== 'openshift') && !(p === 'iis' && pl !== 'windows'));
    const rp = offered[n % offered.length];
    await L.set(page, { platform: pl, k8sProvider: pv, scenario: sc, topology: tp, dbHosting: db, egress: eg, auth: au, reverseProxy: rp, certSource: n % 3 ? 'ca-issued' : 'none' });
    const t = await L.resultsText(page);
    const tag = [pl, pv, sc, tp, db, eg, au, rp].join('/');
    if (/undefined|NaN|\[object/.test(t)) fails.push('garbage text: ' + tag);
    const keys = await L.checkKeys(page);
    if (keys.length !== new Set(keys).size) fails.push('duplicate checklist ids: ' + tag);
    if (pl === 'kubernetes' && LEAKS[pv]) {
      // the TELEMETRY_PUSH_ENABLED item cites the only page that states it; that citation is allowed
      const m = t.replace(/CAST's EKS page \(the only one to say so\)/g, '').match(LEAKS[pv]);
      if (m) fails.push('provider leak (' + m[0] + ': …' + t.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ') + '…) on ' + tag);
    }
    if ((pl === 'kubernetes' || pl === 'openshift') && /Imaging MCP \+ Gatekeeper MCP\)/.test(t)) fails.push('Gatekeeper counted on Kubernetes: ' + tag);
    if (pl !== 'windows' && /\b2284\b/.test(t)) fails.push('Windows port 2284 leaked: ' + tag);
    if (pl === 'windows' && /\b8089\b/.test(t) && !/Docker\/Podman/.test(t)) fails.push('Docker port 8089 on Windows: ' + tag);
  }
  errors.forEach(e => fails.push(e));
  console.log('combos', n, 'failures', fails.length);
  fails.slice(0, 40).forEach(f => console.log(' -', f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
