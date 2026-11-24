// Cross-checks inside the generated document:
//  - every port written in the architecture diagram also appears in the text of the sections,
//  - every "Section N" reference points to a results section that exists and every "question N" to a questionnaire fieldset.
// Usage: node tests/consistency.js [--quick]
const L = require('./lib');
const quick = process.argv.includes('--quick');

(async () => {
  const { browser, page, errors } = await L.open();
  const fails = new Map();
  let n = 0;
  const platforms = quick ? ['docker', 'windows', 'kubernetes'] : ['docker', 'podman', 'windows', 'kubernetes', 'openshift'];
  const scenarios = quick ? ['full', 'dashboards-only'] : ['full', 'analysis-dashboards', 'viewer-readonly', 'dashboards-only', 'analysis-only'];
  const fieldsets = await page.evaluate(() => document.querySelectorAll('#form-pane fieldset').length);
  for (const platform of platforms) for (const scenario of scenarios) for (const topology of ['single', 'multi'])
  for (const egress of quick ? ['direct'] : ['direct', 'airgapped']) for (const mcp of [false, true]) for (const auth of quick ? ['local'] : ['local', 'saml']) {
    n++;
    await L.set(page, { platform, scenario, topology, egress, auth, dbHosting: ['colocated', 'dedicated', 'managed'][n % 3], certSource: n % 2 ? 'ca-issued' : 'none' });
    await L.set(page, { mcp });
    const d = await page.evaluate(() => {
      const root = document.querySelector('#results-content');
      const svg = root.querySelector('.arch-diagram-frame svg');
      const diagramText = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent).join(' ') : '';
      const clone = root.cloneNode(true);
      clone.querySelectorAll('.arch-diagram-frame').forEach(e => e.remove());
      const text = clone.textContent;
      const sections = [...root.querySelectorAll('h3')].map(h => (h.textContent.match(/^\s*(\d+)\./) || [])[1]).filter(Boolean);
      return { diagramText, text, sections };
    });
    const key = [platform, scenario, topology, egress, 'mcp' + mcp, auth].join('/');
    const ports = new Set((d.diagramText.match(/[:·]\s?(\d{4,5})(?!\d)/g) || []).map(m => m.replace(/\D/g, '')));
    for (const p of ports) if (!new RegExp('(^|[^\\d])' + p + '(?!\\d)').test(d.text)) fails.set('diagram port ' + p + ' absent from the sections', key);
    for (const m of d.text.matchAll(/Section (\d+)/g)) if (!d.sections.includes(m[1])) fails.set('"Section ' + m[1] + '" does not exist (sections: ' + d.sections.join(',') + ')', key);
    for (const m of d.text.matchAll(/question (\d+)/g)) if (+m[1] < 1 || +m[1] > fieldsets - 1) fails.set('"question ' + m[1] + '" does not exist (' + (fieldsets - 1) + ' questions)', key);
  }
  errors.forEach(e => fails.set(e, 'page'));
  console.log('consistency combinations', n, 'issues', fails.size);
  [...fails].slice(0, 30).forEach(([m, k]) => console.log(' -', m, '  e.g.', k));
  await browser.close();
  process.exit(fails.size ? 1 : 0);
})();
