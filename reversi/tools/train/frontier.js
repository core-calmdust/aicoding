// Strength against thinking time for many search settings at once (Mac): every setting plays the same baseline with rvmatch,
// and the table shows its Elo and its time, so settings can be compared at equal time — also in combination, not one
// parameter at a time, and at the depths the top levels really read. Guide: claude/reversi-mac-verification.md.
//
//   node frontier.js run   --plan stage1|stage2|mech|extreme [--base lv28|lv31|lv34|d,x,w,e,t] [--n 1000] [--procs N]
//                          [--openings op10.bin] [--out frontier-<base>.jsonl]
//   node frontier.js table [--base …] [--out …]
//
// A setting: depth, exact, wld, end (rvmatch --a), Multi-ProbCut's t (--ta), and test builds of engine.c:
//   k (ENDK): the width of the search to the end of the game, in percent        nn (MPC_NONEST): no Multi-ProbCut inside a probe
//   p (MPC_PRE): a probe only when the static evaluation is within p/100 discs of its bound
// The baseline (B) is a level of today (--base): lv28 = depth 13, exact 20, wld 22, end 26; lv31 = 20, 22, 24, 28; lv34 = 25, 23, 25, 30
// (t 1.5). Results are appended to --out one line per setting; a run that is stopped goes on from where it was.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const args = process.argv.slice(2), cmd = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASES = { lv28: [13, 20, 22, 26, 1.5], lv31: [20, 22, 24, 28, 1.5], lv34: [25, 23, 25, 30, 1.5] };
const BNAME = opt('base', 'lv28'), bv = BASES[BNAME] || BNAME.split(',').map(Number);
if (bv.length < 4 || bv.some(x => !(x >= 0))) { console.error('--base lv28 | lv31 | lv34 | depth,exact,wld,end[,t]'); process.exit(1); }
const BASE = { depth: bv[0], exact: bv[1], wld: bv[2], end: bv[3], t: bv[4] || 1.5, endk: 100, nonest: 0, pre: 0 };
const OUT = opt('out', `frontier-${BNAME.replace(/[^\w.]/g, '_')}.jsonl`), N = +opt('n', 1000), PROCS = opt('procs', ''), OPEN = opt('openings', 'op10.bin');
const name = c => `d${c.depth} x${c.exact}/${c.wld} e${c.end} t${c.t}` + (c.endk !== 100 ? ` k${c.endk}` : '') + (c.nonest ? ' nn' : '') + (c.pre ? ` p${c.pre}` : '');
const mk = o => Object.assign({}, BASE, o), B = BASE;
const PLANS = {
  // one parameter at a time around the baseline: the slope of each (Elo per doubling of the time)
  stage1: () => [
    ...[-2, -1, 1, 2, 3, 5, 7].map(d => mk({ depth: B.depth + d })),
    ...[1.3, 1.1, 0.9].flatMap(t => [0, 2, 4, 6].map(d => mk({ t, depth: B.depth + d }))),
    ...[-99, -4, -2, 2, 4, 6].map(d => mk({ end: d === -99 ? 0 : B.end + d })),
    ...[-4, -2, 2, 4].map(d => mk({ exact: B.exact + d, wld: B.wld + d, end: Math.max(B.end, B.wld + d + 4) })),
    ...[70, 130, 160, 200].map(endk => mk({ endk })),
    mk({ nonest: 1 }), mk({ pre: 200 }), mk({ pre: 400 }),
  ],
  // every combination of a small grid: the interactions (a deeper but more selective midgame with a wider / more careful
  // search to the end and an earlier exact solve)
  stage2: () => {
    const out = [];
    for (const t of [B.t, 1.1]) for (const d of [0, 3, 6]) for (const e of [0, 4]) for (const endk of [100, 150]) for (const x of [0, 2])
      out.push(mk({ t, depth: B.depth + d, end: B.end + e, endk, exact: B.exact + x, wld: B.wld + x }));
    return out;
  },
  // the mechanisms around Multi-ProbCut together with how hard it cuts (the other programs cut harder, t about 1.1, with
  // probes that are not themselves cut and only where the static evaluation says a cut is likely)
  mech: () => {
    const out = [];
    for (const nonest of [0, 1]) for (const pre of [0, 200, 400]) for (const t of [1.5, 1.1, 0.9]) for (const d of [0, 3])
      out.push(mk({ nonest, pre, t, depth: B.depth + d }));
    return out;
  },
  // far more time than any level uses today (10 to 100 times): does the strength keep growing, and with which mix
  extreme: () => [
    mk({ depth: 22, t: 1.1, end: 32, exact: 24, wld: 26 }), mk({ depth: 24, t: 1.1, end: 32, exact: 24, wld: 26, endk: 150 }),
    mk({ depth: 24, t: 1.5, end: 30, exact: 24, wld: 26 }), mk({ depth: 26, t: 1.1, end: 34, exact: 26, wld: 28, endk: 150 }),
    mk({ depth: 20, t: 1.1, end: 34, exact: 26, wld: 28, endk: 200 }), mk({ depth: 28, t: 0.9, end: 34, exact: 24, wld: 26, endk: 150 }),
    mk({ depth: 26, t: 1.1, end: 34, exact: 26, wld: 28, endk: 150, nonest: 1, pre: 200 }),
  ],
};
const done = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
function lib(c) {   // the engine as a library, built once per set of build options
  const plain = c.endk === 100 && !c.nonest && !c.pre, so = plain ? './rveng.so' : `./rveng_k${c.endk}_n${c.nonest}_p${c.pre}.so`;
  const D = (c.endk !== 100 ? ` -DENDK=${c.endk}` : '') + (c.nonest ? ' -DMPC_NONEST' : '') + (c.pre ? ` -DMPC_PRE=${c.pre}` : '');
  if (!fs.existsSync(path.join(__dirname, so)) || fs.statSync(path.join(__dirname, so)).mtimeMs < fs.statSync(path.join(__dirname, '../../engine.c')).mtimeMs)
    cp.execSync(`cc -O3 -shared -fPIC${D} -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o ${so} ../../engine.c`, { cwd: __dirname, stdio: 'inherit' });
  return so;
}
function run() {
  const plan = PLANS[opt('plan', 'stage1')]; if (!plan) { console.error('plans: ' + Object.keys(PLANS).join(', ')); process.exit(1); }
  if (!fs.existsSync(path.join(__dirname, 'rvmatch')) || fs.statSync(path.join(__dirname, 'rvmatch')).mtimeMs < fs.statSync(path.join(__dirname, 'rvmatch.c')).mtimeMs)
    cp.execSync('cc -O3 -o rvmatch rvmatch.c -ldl -lz -lm', { cwd: __dirname, stdio: 'inherit' });
  const have = new Set(done().map(r => r.name + '|' + r.n)), seen = new Set([name(BASE)]);
  const list = plan().filter(c => c.depth > 0 && c.exact > 0 && !seen.has(name(c)) && seen.add(name(c)));
  list.forEach((c, i) => {
    if (have.has(name(c) + '|' + N)) return;
    const a = ['match', OPEN, '--a', `${c.depth},${c.exact},${c.wld},${c.end}`, '--b', `${BASE.depth},${BASE.exact},${BASE.wld},${BASE.end}`,
      '--ta', String(c.t), '--tb', String(BASE.t), '--n', String(N), '--engine', lib(c), '--engine-b', lib(BASE)];
    if (PROCS) a.push('--procs', PROCS);
    console.error(`[${i + 1}/${list.length}] ${name(c)}`);
    const t0 = Date.now(), o = cp.execFileSync('./rvmatch', a, { cwd: __dirname, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
    const m1 = o.match(/得点率 ([\d.]+)% ± ([\d.]+)%\s+Elo ([+-]?\d+) ± (\d+)\s+平均石差 ([+-][\d.]+) ± ([\d.]+)/), m2 = o.match(/A ([\d.]+) 秒\s+B ([\d.]+) 秒/);
    if (!m1 || !m2) { console.error(o); throw new Error('rvmatch: unexpected output'); }
    const r = { name: name(c), cfg: c, base: name(BASE), n: N, score: +m1[1], elo: +m1[3], eloErr: +m1[4], discs: +m1[5], discsErr: +m1[6], secA: +m2[1], secB: +m2[2], wall: Math.round((Date.now() - t0) / 1000) };
    fs.appendFileSync(OUT, JSON.stringify(r) + '\n');
    console.error(`    Elo ${r.elo >= 0 ? '+' : ''}${r.elo} ± ${r.eloErr}   time ×${(r.secA / r.secB).toFixed(2)}   (${r.wall} s)`);
  });
  table();
}
function table() {
  const rs = done().filter(r => !r.base || r.base === name(BASE)); if (!rs.length) { console.log('no results in ' + OUT); return; }
  // the reference line: the depth-only settings (everything else as the baseline) — Elo against log2(time), least squares through the baseline
  const same = (c, k) => Object.keys(BASE).every(x => x === k || (c[x] || 0) === BASE[x]);
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
if (cmd === 'run') run(); else if (cmd === 'table') table();
else console.error('usage: node frontier.js run --plan stage1|stage2|mech|extreme [--base lv28|lv31|lv34|d,x,w,e,t] [--n 1000] [--procs N] [--openings op10.bin] [--out file]\n       node frontier.js table [--base …] [--out file]');
