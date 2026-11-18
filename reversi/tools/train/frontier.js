// Strength against thinking time for many search settings at once (Mac): every setting plays the same baseline with rvmatch,
// and the table shows its Elo and its time, so settings can be compared at equal time — also in combination, not one
// parameter at a time. Guide: claude/reversi-mac-verification.md.
//
//   node frontier.js run   --plan stage1|stage2|extreme [--n 1000] [--procs N] [--openings op10.bin] [--out frontier.jsonl]
//   node frontier.js table [--out frontier.jsonl]
//
// A setting: depth, exact, wld, end (rvmatch --a), Multi-ProbCut's t (--ta), and build options of engine.c (ENDK: the width
// of the search to the end of the game, in percent). The baseline (B) is today's Lv.28: depth 13, exact 20, wld 22, end 26,
// t 1.5. Results are appended to --out one line per setting; a run that is stopped goes on from where it was.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const args = process.argv.slice(2), cmd = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('out', 'frontier.jsonl'), N = +opt('n', 1000), PROCS = opt('procs', ''), OPEN = opt('openings', 'op10.bin');
const BASE = { depth: 13, exact: 20, wld: 22, end: 26, t: 1.5, endk: 100 };
const name = c => `d${c.depth} x${c.exact}/${c.wld} e${c.end} t${c.t}` + (c.endk !== 100 ? ` k${c.endk}` : '');
const mk = o => Object.assign({}, BASE, o);
const PLANS = {
  // one parameter at a time around the baseline: the slope of each (Elo per doubling of the time)
  stage1: () => [
    ...[11, 12, 14, 15, 16, 18, 20].map(depth => mk({ depth })),
    ...[1.3, 1.1, 0.9].flatMap(t => [13, 15, 17, 19].map(depth => mk({ t, depth }))),
    ...[0, 22, 24, 28, 30, 32].map(end => mk({ end })),
    ...[[16, 18], [18, 20], [22, 24], [24, 26]].map(([exact, wld]) => mk({ exact, wld, end: Math.max(26, wld + 4) })),
    ...[70, 130, 160, 200].map(endk => mk({ endk })),
  ],
  // every combination of a small grid: the interactions (a deeper but more selective midgame with a wider / more careful
  // search to the end and an earlier exact solve)
  stage2: () => {
    const out = [];
    for (const t of [1.5, 1.1]) for (const depth of [13, 16, 19]) for (const end of [26, 30]) for (const endk of [100, 150])
      for (const [exact, wld] of [[20, 22], [22, 24]]) out.push(mk({ t, depth, end, endk, exact, wld }));
    return out;
  },
  // far more time than any level uses today (10 to 100 times): does the strength keep growing, and with which mix
  extreme: () => [
    mk({ depth: 22, t: 1.1, end: 32, exact: 24, wld: 26 }), mk({ depth: 24, t: 1.1, end: 32, exact: 24, wld: 26, endk: 150 }),
    mk({ depth: 24, t: 1.5, end: 30, exact: 24, wld: 26 }), mk({ depth: 26, t: 1.1, end: 34, exact: 26, wld: 28, endk: 150 }),
    mk({ depth: 20, t: 1.1, end: 34, exact: 26, wld: 28, endk: 200 }), mk({ depth: 28, t: 0.9, end: 34, exact: 24, wld: 26, endk: 150 }),
  ],
};
const done = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
function lib(endk) {   // the engine as a library, built once per build option
  const so = endk === 100 ? './rveng.so' : `./rveng_k${endk}.so`;
  if (!fs.existsSync(so) || fs.statSync(so).mtimeMs < fs.statSync(path.join(__dirname, '../../engine.c')).mtimeMs)
    cp.execSync(`cc -O3 -shared -fPIC ${endk === 100 ? '' : '-DENDK=' + endk} -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o ${so} ../../engine.c`, { cwd: __dirname, stdio: 'inherit' });
  return so;
}
function run() {
  const plan = PLANS[opt('plan', 'stage1')]; if (!plan) { console.error('plans: ' + Object.keys(PLANS).join(', ')); process.exit(1); }
  if (!fs.existsSync(path.join(__dirname, 'rvmatch'))) cp.execSync('cc -O3 -o rvmatch rvmatch.c -ldl -lz -lm', { cwd: __dirname, stdio: 'inherit' });
  const have = new Set(done().map(r => r.name + '|' + r.n)), list = plan().filter(c => name(c) !== name(BASE));
  list.forEach((c, i) => {
    if (have.has(name(c) + '|' + N)) return;
    const a = [`match`, OPEN, '--a', `${c.depth},${c.exact},${c.wld},${c.end}`, '--b', `${BASE.depth},${BASE.exact},${BASE.wld},${BASE.end}`,
      '--ta', String(c.t), '--tb', String(BASE.t), '--n', String(N), '--engine', lib(c.endk), '--engine-b', lib(100)];
    if (PROCS) a.push('--procs', PROCS);
    console.error(`[${i + 1}/${list.length}] ${name(c)}`);
    const t0 = Date.now(), o = cp.execFileSync('./rvmatch', a, { cwd: __dirname, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
    const m1 = o.match(/得点率 ([\d.]+)% ± ([\d.]+)%\s+Elo ([+-]?\d+) ± (\d+)\s+平均石差 ([+-][\d.]+) ± ([\d.]+)/), m2 = o.match(/A ([\d.]+) 秒\s+B ([\d.]+) 秒/);
    if (!m1 || !m2) { console.error(o); throw new Error('rvmatch: unexpected output'); }
    const r = { name: name(c), cfg: c, n: N, score: +m1[1], elo: +m1[3], eloErr: +m1[4], discs: +m1[5], discsErr: +m1[6], secA: +m2[1], secB: +m2[2], wall: Math.round((Date.now() - t0) / 1000) };
    fs.appendFileSync(OUT, JSON.stringify(r) + '\n');
    console.error(`    Elo ${r.elo >= 0 ? '+' : ''}${r.elo} ± ${r.eloErr}   time ×${(r.secA / r.secB).toFixed(2)}   (${r.wall} s)`);
  });
  table();
}
function table() {
  const rs = done(); if (!rs.length) { console.log('no results in ' + OUT); return; }
  // the reference line: the depth-only settings (everything else as the baseline) — Elo against log2(time), least squares through the baseline
  const same = (c, k) => Object.keys(BASE).every(x => x === k || c[x] === BASE[x]);
  const dl = rs.filter(r => same(r.cfg, 'depth')); let sxx = 0, sxy = 0;
  for (const r of dl) { const x = Math.log2(r.secA / r.secB); sxx += x * x; sxy += x * r.elo; }
  const slope = sxx > 0 ? sxy / sxx : 0;
  console.log(`基準（B）: ${name(BASE)}。深さだけを変えたときの傾き: 時間2倍あたり ${slope.toFixed(0)} Elo（${dl.length} 設定）`);
  console.log('| 設定 | Elo | ± | 時間（基準比） | 同じ時間の深さだけの設定との差（Elo） | 石差 | 局数 |');
  console.log('|---|---|---|---|---|---|---|');
  const rows = rs.map(r => { const x = Math.log2(r.secA / r.secB); return Object.assign({ x, gain: r.elo - slope * x }, r); }).sort((a, b) => b.gain - a.gain);
  for (const r of rows) console.log(`| ${r.name} | ${r.elo >= 0 ? '+' : ''}${r.elo} | ${r.eloErr} | ×${(r.secA / r.secB).toFixed(2)} | ${r.gain >= 0 ? '+' : ''}${r.gain.toFixed(0)} | ${r.discs >= 0 ? '+' : ''}${r.discs} | ${2 * r.n} |`);
  console.log('（「差」が ± の2倍を超えてプラスなら、同じ時間を深さに使うより得な設定）');
}
if (cmd === 'run') run(); else if (cmd === 'table') table(); else console.error('usage: node frontier.js run --plan stage1|stage2|extreme [--n 1000] [--procs N] [--openings op10.bin] [--out frontier.jsonl]\n       node frontier.js table [--out frontier.jsonl]');
