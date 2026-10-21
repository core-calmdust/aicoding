// mine natural tesuji positions from engine self-play (light net, sampled policy) on 9x9.
//   node lessons-mine.mjs <seconds> <seed> > out.json
import { load, policy } from './golib.mjs';
import { solveFirst, show, R, co, makeReader } from './lessons-lib.mjs';
const secs = +(process.argv[2] || 60); let seed = +(process.argv[3] || 1);
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1000000) / 1000000; };
const E = await load('light');
const n = +(process.env.N || 9), t0 = Date.now(), out = [];
const nb = R.nbrs(n);
const adjTo = (stones, i) => stones.some(s => nb.slice(s * 4, s * 4 + 4).includes(i));
while (Date.now() - t0 < secs * 1000) {
  let p = R.Pos.from({ n, turn: 1 }); const moves = [];
  const len = 14 + Math.floor(rnd() * 30);
  for (let k = 0; k < len; k++) {
    const pol = policy(E, { n, turn: 1 }, moves, 7, 1).list.filter(e => e.m >= 0 && p.legal(e.m));
    if (!pol.length) break;
    // sample with temperature
    let tot = 0; const w = pol.slice(0, 8).map(e => { const v = Math.pow(e.p, 0.7); tot += v; return v; });
    let r = rnd() * tot, pick = pol[0].m; for (let j = 0; j < w.length; j++) { r -= w[j]; if (r <= 0) { pick = pol[j].m; break; } }
    p = p.tryPlay(pick).pos; moves.push(pick);
    if (k < 10) continue;
    // examine: opponent chains with 2 libs, size >= 2
    const att = p.turn, def = 3 - att, seen = new Set();
    for (let i = 0; i < n * n; i++) {
      if (p.b[i] !== def || seen.has(i)) continue;
      const g = p.group(i); g.stones.forEach(s => seen.add(s));
      if (g.libs !== 2 || g.stones.length < 2) continue;
      const spec = p.spec();
      let hit = null;
      for (const d of [2, 3]) {
        const res = solveFirst(spec, 'capture', [co(i, n)], { depth: d });
        if (res.wins.length === 1) { hit = { d, win: res.wins[0] }; break; }
        if (res.wins.length > 1) break;
      }
      if (!hit) continue;
      // the group must survive if the attacker tenukis (pass)
      const ps = p.tryPlay(-1, 0, true).pos;
      const esc = solveFirst(ps.spec(), 'escape', [co(i, n)], { depth: hit.d + 1 });
      if (!esc.wins.length) continue;
      const m = R.parseCoord(hit.win, n), aft = p.tryPlay(m, 0, true);
      const self = aft.pos.group(m).libs === 1 && !aft.captured.length;
      const isLib = adjTo(g.stones, m);
      const kind = self && isLib ? 'snap/throw' : !isLib ? 'net' : 'atari';
      out.push({ kind, d: hit.d, win: hit.win, tgt: co(i, n), size: g.stones.length, spec, moves: moves.map(x => co(x, n)) });
      process.stderr.write(kind + ' ' + hit.win + '\n');
    }
  }
}
console.log(JSON.stringify(out));
