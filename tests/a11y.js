// Automated accessibility scan (axe-core) of the questionnaire and the generated document, dark and light theme.
// Fails on serious or critical violations. Usage: node tests/a11y.js   (needs the axe-core dev dependency)
const path = require('path');
const L = require('./lib');
let axePath;
try { axePath = require.resolve('axe-core/axe.min.js'); } catch (e) { console.log('axe-core is not installed — skipped'); process.exit(0); }

(async () => {
  const { browser, page, errors } = await L.open();
  const fails = new Map();
  const states = [
    { label: 'docker full', answers: { platform: 'docker', scenario: 'full' } },
    { label: 'kubernetes eks + mcp', answers: { platform: 'kubernetes', k8sProvider: 'eks', scenario: 'full', mcp: true, reverseProxy: 'gatewayapi' } },
    { label: 'windows multi saml', answers: { platform: 'windows', topology: 'multi', auth: 'saml', scenario: 'full' } },
  ];
  for (const theme of ['dark', 'light']) {
    for (const st of states) {
      await L.set(page, st.answers);
      const isLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light');
      if ((theme === 'light') !== isLight) await page.click('#theme-toggle');
      await page.addScriptTag({ path: axePath });
      const res = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
      for (const v of res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')) {
        const k = v.id + ' (' + v.impact + '): ' + v.help;
        if (!fails.has(k)) fails.set(k, theme + ' / ' + st.label + ' — ' + v.nodes.length + ' node(s), e.g. ' + (v.nodes[0] && v.nodes[0].target.join(' ')));
      }
    }
  }
  errors.forEach(e => fails.set(e, 'page'));
  console.log('accessibility violations (serious / critical):', fails.size);
  [...fails].forEach(([k, v]) => console.log(' -', k, '\n     ', v));
  await browser.close();
  process.exit(fails.size ? 1 : 0);
})();
