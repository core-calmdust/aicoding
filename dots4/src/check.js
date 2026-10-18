// verify logged AI decisions with the native oracle. usage: node check.js <log.jsonl> [maxRecords]
const fs = require('fs'), { spawn } = require('child_process');
const recs = [], results = [];
for (const f of process.argv[2].split(',')) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; const r = JSON.parse(l); if (r.result) results.push(r); else recs.push(r); }
const max = +process.argv[3] || recs.length;
const sel = recs.filter(r => !(process.env.SKIPBOOK && r.book)).slice(0, max);
const o = spawn(__dirname + '/oracle', ['26'], { env: Object.assign({}, process.env, { TTSEED: '/home/claude/work/ckpt/dots4/root/tt_root.bin' }) });
let buf = '', i = 0; const out = [];
o.stdout.on('data', d => {
  buf += d; let k;
  while ((k = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, k); buf = buf.slice(k + 1); const [v, w] = line.split(' ').map(Number); out.push({ v, w }); next(); }
});
function next() { if (i < sel.length) { o.stdin.write(sel[i].mask + ' ' + sel[i].move + '\n'); i++; } else if (out.length === sel.length) { o.stdin.end(); report(); } }
next();
function report() {
  let opt = 0, outc = 0, n = sel.length; const bad = [], byPly = {};
  sel.forEach((r, j) => {
    const { v, w } = out[j]; const ok = v === w; if (ok) opt++;
    const cls = x => Math.sign(r.lead + x); const ok2 = cls(w) >= cls(v); if (ok2) outc++;
    const b = byPly[r.ply] || (byPly[r.ply] = { n: 0, opt: 0, maxms: 0 }); b.n++; if (ok) b.opt++; b.maxms = Math.max(b.maxms, r.ms);
    if (!ok) bad.push({ g: r.g, ply: r.ply, mask: r.mask, move: r.move, v, w, ms: r.ms, exact: r.exact, book: r.book });
  });
  console.log(`decisions ${n}: exactly optimal ${opt}, outcome kept ${outc}`);
  console.log('by ply:', Object.entries(byPly).map(([p, b]) => `${p}:${b.opt}/${b.n}(${b.maxms}ms)`).join(' '));
  if (bad.length) console.log('non-optimal:', JSON.stringify(bad.slice(0, 20)));
  const lost = results.filter(r => r.ai < 8).length;
  console.log(`games ${results.length}: AI scores ` + results.map(r => r.ai + '-' + r.op).join(' ') + ` | AI below 8 boxes: ${lost}`);
}
