// Lists the documentation links written into the tool and (with --check) tests that they still answer.
// Usage: node tests/links.js [--check]   (--check needs outbound access to doc.castsoftware.com)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'cast-imaging-requirements-builder.html'), 'utf8');
const links = [...new Set([...html.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)].map(m => m[0].replace(/[.,;]+$/, '')))].filter(u => /castsoftware|casthighlight|github\.com\/CAST/.test(u)).sort();
console.log(links.length + ' links');
if (!process.argv.includes('--check')) { links.forEach(l => console.log(' ', l)); process.exit(0); }
(async () => {
  let bad = 0;
  for (const u of links) {
    try { const r = await fetch(u, { method: 'GET', redirect: 'follow' }); if (r.status >= 400) { bad++; console.log(' ', r.status, u); } }
    catch (e) { bad++; console.log('  error', u, String(e.message).slice(0, 60)); }
  }
  console.log(bad ? bad + ' link(s) to check' : 'all links answer');
  process.exit(bad ? 1 : 0);
})();
