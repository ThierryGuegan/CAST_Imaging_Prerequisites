// Snapshot test on a handful of realistic customer profiles: the generated document (results text) must not change
// unless the change is intended. Review the diff of tests/snapshots/*.txt, then refresh with:  node tests/profiles.js --update
// Usage: node tests/profiles.js [--update]
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const update = process.argv.includes('--update');
const dir = path.join(__dirname, 'snapshots');

const PROFILES = {
  'poc-docker': { platform: 'docker', scenario: 'full', topology: 'single', scale: 'poc', dbHosting: 'colocated', egress: 'direct', auth: 'local', certSource: 'self-signed', reverseProxy: 'nginx' },
  'prod-windows-distributed': { platform: 'windows', scenario: 'full', topology: 'multi', scale: 'standard', dbHosting: 'dedicated', egress: 'proxy', auth: 'ldap', certSource: 'ca-issued', reverseProxy: 'nginx', mcp: true },
  'prod-podman-airgapped': { platform: 'podman', scenario: 'full', topology: 'multi', scale: 'standard', dbHosting: 'managed', egress: 'airgapped', auth: 'saml', certSource: 'ca-issued', reverseProxy: 'nginx' },
  'eks-gateway-api': { platform: 'kubernetes', k8sProvider: 'eks', scenario: 'full', topology: 'multi', scale: 'standard', dbHosting: 'managed', egress: 'direct', auth: 'oidc', certSource: 'ca-issued', reverseProxy: 'gatewayapi', mcp: true },
  'aks-application-gateway': { platform: 'kubernetes', k8sProvider: 'aks', scenario: 'analysis-dashboards', topology: 'single', scale: 'standard', dbHosting: 'colocated', egress: 'direct', auth: 'saml', certSource: 'ca-issued', reverseProxy: 'appgw' },
  'gke-istio-airgapped': { platform: 'kubernetes', k8sProvider: 'gke', scenario: 'full', topology: 'multi', scale: 'enterprise', dbHosting: 'dedicated', egress: 'airgapped', auth: 'local', certSource: 'ca-issued', reverseProxy: 'istio' },
  'openshift-route': { platform: 'kubernetes', k8sProvider: 'openshift', scenario: 'viewer-readonly', topology: 'single', scale: 'standard', dbHosting: 'colocated', egress: 'direct', auth: 'oidc', certSource: 'ca-issued', reverseProxy: 'route' },
  'windows-dashboards-only': { platform: 'windows', scenario: 'dashboards-only', topology: 'single', scale: 'standard', dbHosting: 'dedicated', egress: 'direct', auth: 'local', certSource: 'none', reverseProxy: 'nginx' },
};

(async () => {
  const { browser, page, errors } = await L.open();
  fs.mkdirSync(dir, { recursive: true });
  const fails = [];
  for (const [name, answers] of Object.entries(PROFILES)) {
    await L.set(page, Object.assign({ mcp: false, highlight: false, email: false, repoHttps: false, repoSmb: false, ctxUrl: false, dbTls: false, neo4jDedicated: false }, answers));
    const text = (await L.resultsText(page)).replace(/[ \t]+\n/g, '\n').trim() + '\n';
    const file = path.join(dir, name + '.txt');
    if (update || !fs.existsSync(file)) { fs.writeFileSync(file, text); continue; }
    const old = fs.readFileSync(file, 'utf8');
    if (old !== text) {
      const a = old.split('\n'), b = text.split('\n');
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      fails.push(name + ': text differs from line ' + (i + 1) + '\n     was: ' + (a[i] || '').slice(0, 140) + '\n     now: ' + (b[i] || '').slice(0, 140));
    }
  }
  errors.forEach(e => fails.push(e));
  console.log('profile snapshots', update ? 'updated' : fails.length ? 'DIFFER' : 'unchanged', '(' + Object.keys(PROFILES).length + ' profiles)');
  fails.forEach(f => console.log(' -', f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
