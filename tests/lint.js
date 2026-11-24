// ESLint on the tool's inline script: undefined variables and unreachable / duplicate code that `node --check` cannot see.
// Usage: node tests/lint.js   (needs the eslint and globals dev dependencies)
const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');
const globals = require('globals');

(async () => {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'cast-imaging-requirements-builder.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
      rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-redeclare': 'error', 'no-dupe-else-if': 'error', 'no-self-assign': 'error' },
    }],
  });
  const [res] = await eslint.lintText(main, { filePath: 'inline.js' });
  const msgs = res.messages.filter(m => m.severity === 2);
  console.log('lint messages', msgs.length);
  msgs.slice(0, 30).forEach(m => console.log(' -', m.ruleId, m.message, 'line', m.line, '|', main.split('\n')[m.line - 1].trim().slice(0, 100)));
  process.exit(msgs.length ? 1 : 0);
})();
