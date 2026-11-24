// Syntax check of the tool's inline script: an unbalanced quote in one of the long string concatenations
// breaks the whole page, so catch it before the browser-based checks run.
// Usage: node tests/syntax.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'cast-imaging-requirements-builder.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.log('no inline script found'); process.exit(1); }
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));
const file = path.join(os.tmpdir(), 'cast-builder-inline-' + process.pid + '.js');
fs.writeFileSync(file, main);
const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
fs.unlinkSync(file);
if (res.status !== 0) { console.log('syntax error in the inline script:\n' + res.stderr); process.exit(1); }
console.log('inline script syntax ok (' + main.length + ' characters)');
