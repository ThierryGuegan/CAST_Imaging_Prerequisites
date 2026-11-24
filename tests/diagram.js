// Geometry check of the architecture diagram: no line crosses a box, no label overlaps a box or another label,
// nothing is clipped by the viewBox. (A line passing under a label is tolerated: labels have a halo.)
// Usage: node tests/diagram.js [--quick]
const L = require('./lib');
const quick = process.argv.includes('--quick');

function segRect(a, b, r, m) { // Liang-Barsky: does the segment enter the rectangle shrunk by m?
  const x0 = r.x + m, x1 = r.x + r.w - m, y0 = r.y + m, y1 = r.y + r.h - m;
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; }
    else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return t0 < t1;
}

(async () => {
  const { browser, page, errors } = await L.open();
  await page.setViewportSize({ width: 1500, height: 1200 });
  const issues = new Map();
  let n = 0;
  const platforms = quick ? ['docker', 'kubernetes'] : ['docker', 'podman', 'windows', 'kubernetes', 'openshift'];
  const scenarios = quick ? ['full', 'analysis-only'] : ['full', 'analysis-only', 'analysis-dashboards', 'dashboards-only', 'viewer-readonly'];
  for (const platform of platforms) for (const scenario of scenarios) for (const topology of ['single', 'multi'])
  for (const egress of quick ? ['direct'] : ['direct', 'proxy', 'airgapped']) for (const mcp of [false, true]) for (const nd of [false, true]) {
    if (nd && topology !== 'multi') continue;
    const dbHosting = ['colocated', 'dedicated', 'managed'][n % 3];
    n++;
    await L.set(page, { platform, scenario, topology, egress, dbHosting, analysisNodes: n % 2 ? '1' : '4+' });
    await L.set(page, { neo4jDedicated: nd, mcp });
    const data = await page.evaluate(() => {
      const f = document.querySelector('.arch-diagram-frame svg'); if (!f) return null;
      const vb = f.viewBox.baseVal;
      const rects = [...f.querySelectorAll('rect')].map(r => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'), t: (r.nextSibling && r.nextSibling.textContent || '').slice(0, 30) }));
      const segs = [];
      f.querySelectorAll('line').forEach(l => segs.push({ pts: [[+l.getAttribute('x1'), +l.getAttribute('y1')], [+l.getAttribute('x2'), +l.getAttribute('y2')]], d: 'line' }));
      f.querySelectorAll('path').forEach(p => {
        const d = p.getAttribute('d'); if (!d || /[CQA]/i.test(d.replace(/[ML]/g, ''))) return;
        const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
        if (pts.length > 1) segs.push({ pts, d });
      });
      const tb = [...f.querySelectorAll('text')].map(t => { const bb = t.getBBox(); return { s: t.textContent, x: bb.x, y: bb.y, w: bb.width, h: bb.height, lbl: t.hasAttribute('paint-order') }; });
      return { vb: [vb.x, vb.y, vb.width, vb.height], rects, segs, tb };
    });
    if (!data) continue;
    const key = [platform, scenario, topology, egress, dbHosting, 'nd' + nd, 'mcp' + mcp].join('/');
    const add = m => { if (!issues.has(m)) issues.set(m, key); };
    const [vx, vy, vw, vh] = data.vb;
    data.rects.forEach(r => { if (r.x < vx || r.y < vy || r.x + r.w > vx + vw || r.y + r.h > vy + vh) add('box clipped: ' + r.t); });
    data.tb.forEach(t => { if (t.x < vx - 0.5 || t.x + t.w > vx + vw + 0.5 || t.y < vy || t.y + t.h > vy + vh) add('text clipped: "' + t.s + '"'); });
    const boxes = data.rects.filter(r => r.w > 40 && r.h > 20);
    data.segs.forEach(s => {
      for (let i = 0; i < s.pts.length - 1; i++)
        boxes.forEach(r => { if (segRect(s.pts[i], s.pts[i + 1], r, 2)) add('line ' + s.d.slice(0, 60) + ' crosses box "' + r.t + '"'); });
    });
    const lb = data.tb.filter(t => t.lbl);
    for (let i = 0; i < lb.length; i++) {
      for (let j = i + 1; j < lb.length; j++) { const a = lb[i], b = lb[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) add('label overlap: "' + a.s + '" / "' + b.s + '"'); }
      boxes.forEach(r => { const a = lb[i]; if (a.x < r.x + r.w && r.x < a.x + a.w && a.y < r.y + r.h && r.y < a.y + a.h) add('label "' + a.s + '" overlaps box "' + r.t + '"'); });
    }
  }
  errors.forEach(e => issues.set(e, 'page'));
  console.log('diagram combinations', n, 'issues', issues.size);
  [...issues].slice(0, 30).forEach(([m, k]) => console.log(' -', m, '  e.g.', k));
  await browser.close();
  process.exit(issues.size ? 1 : 0);
})();
