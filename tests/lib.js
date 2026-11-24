// Shared helpers for the regression tests: drive the questionnaire the way a user does.
// 'openshift' is Kubernetes + provider openshift (the questionnaire has no separate platform for it).
const path = require('path');
const { chromium } = require('playwright');

const RADIOS = ['k8sProvider', 'platform', 'topology', 'egress', 'auth', 'scale', 'users', 'scenario', 'analysisNodes',
  'dbHosting', 'reverseProxy', 'certSource', 'llmProvider', 'auditContext'];

async function open() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'cast-imaging-requirements-builder.html'));
  return { browser, page, errors };
}

async function set(page, answers) {
  for (let [k, v] of Object.entries(answers)) {
    if (k === 'platform' && v === 'openshift') {
      await page.$eval('input[name=platform][value="kubernetes"]', e => { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); });
      k = 'k8sProvider';
    }
    if (RADIOS.includes(k)) await page.$eval(`input[name=${k}][value="${v}"]`, e => { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); });
    else if (typeof v === 'boolean') await page.$eval('#' + k, (e, v) => { e.checked = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    else await page.fill('#' + k, v);
  }
}

const resultsText = page => page.evaluate(() => document.querySelector('#results-content').innerText);
const checkKeys = page => page.$$eval('[data-check-key]', els => els.map(x => x.dataset.checkKey));

module.exports = { open, set, resultsText, checkKeys };
