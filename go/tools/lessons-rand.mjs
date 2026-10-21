// random local search for tesuji problems with a unique answer of a given kind.
//   node lessons-rand.mjs <kind> [seconds] [seed]   kind: snapback | throwin | net | oiotoshi
import { solveFirst, legalSetup, show, R, co } from './lessons-lib.mjs';
const kind = process.argv[2], secs = +(process.argv[3] || 60);
let seed = +(process.argv[4] || 1);
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
const n = 9, t0 = Date.now(), found = [];
while (Date.now() - t0 < secs * 1000) {
  // window: columns 0..5, rows 4..8 (bottom-left), random fill
  const b = new Array(n * n).fill('.');
  const Y0 = +(process.env.Y0 || 4), X1 = +(process.env.X1 || 6), PB = +(process.env.PB || 0.3), PW = +(process.env.PW || 0.3);
  for (let y = Y0; y < 9; y++) for (let x = 0; x < X1; x++) { const r = rnd(); b[y * n + x] = r < PB ? 'b' : r < PB + PW ? 'w' : '.'; }
  if (process.env.FIX) for (const [k, c] of process.env.FIX.split(',').map(t => [t.slice(1), t[0]])) b[R.parseCoord(k, n)] = c;
  // outside support: white stones at G3 and G1 region optional
  const spec = { n, stones: b.join(''), turn: 1 };
  if (legalSetup(spec).length) continue;
  const p = R.Pos.from(spec);
  // pick a white chain with 2 libs and >= 2 stones
  const seen = new Set(); let tgt = null;
  for (let i = 0; i < n * n; i++) if (p.b[i] === 2 && !seen.has(i)) { const g = p.group(i); g.stones.forEach(s => seen.add(s)); if (g.libs === 2 && g.stones.length >= 2) { tgt = i; break; } }
  if (tgt === null) continue;
  // all black chains need >= 2 libs (no trivial captures for white)
  let ok = true; for (let i = 0; i < n * n; i++) if (p.b[i] === 1 && p.group(i).libs < 2) ok = false;
  if (!ok) continue;
  // white chains other than target: >= 2 libs
  for (let i = 0; i < n * n; i++) if (p.b[i] === 2 && p.group(i).libs < 2) ok = false;
  if (!ok) continue;
  const r = solveFirst(spec, 'capture', [co(tgt, n)], { depth: +(process.env.DEPTH || 3) });
  if (r.wins.length !== 1) continue;
  const m = R.parseCoord(r.wins[0], n), after = p.tryPlay(m, 0, true);
  const selfAtari = after.pos.group(m).libs === 1 && after.captured.length === 0;
  const isLib = p.group(tgt).stones.some(s => R.nbrs(n).slice(s * 4, s * 4 + 4).includes(m));
  let want = false;
  if (kind === 'snapback' || kind === 'throwin') want = selfAtari && isLib;
  if (kind === 'net') want = !isLib;
  if (kind === 'oiotoshi' && isLib && !selfAtari) {
    // white's connecting reply: a defender move adjacent to the target that joins another white chain, leaving 1 liberty
    const q = after.pos, g = q.group(tgt);
    for (const l of [...Array(n * n).keys()].filter(i => q.b[i] === 0 && R.nbrs(n).slice(i * 4, i * 4 + 4).some(s => g.stones.includes(s)))) {
      const rr = q.tryPlay(l, 0, true); if (!rr) continue; const g2 = rr.pos.group(tgt);
      if (g2.stones.length > g.stones.length + 1 && g2.libs === 1) want = true;
    }
  }
  if (!want) continue;
  // count stones as a naturalness proxy
  const cnt = b.filter(c => c !== '.').length;
  found.push({ spec, win: r.wins[0], tgt: co(tgt, n), cnt });
}
found.sort((a, b) => a.cnt - b.cnt);
for (const f of found.slice(0, 6)) { console.log(f.win, 'tgt', f.tgt, 'stones', f.cnt, JSON.stringify(f.spec.stones)); console.log(show(f.spec)); }
console.log('found', found.length);
