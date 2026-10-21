// node samegame/tools/refresh-fun.js [themeIds,comma] [--apply]
// Replaces stage puzzles whose fun score (tools/fun.js) is below TH with newly generated ones of the same theme,
// board size, colours and min group, and a similar difficulty (random-playout clear rate r stays inside the band
// between its neighbours, so each stage still goes easy → hard). Every replacement is verified clearable by
// E.solve (the stored solution is replayed) exactly like gen-stages.js.
// Without --apply the picks are written to tools/.refresh-<themes>.json; --apply merges all such files into
// stages.json and stores the replaced puzzles in stages.json "old" { "<theme>.<j>": {b,sol,r} }
// (j = stage*10 + index, the same key as DB.st), so players who already cleared that slot keep the old one.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { fun } = require('./fun.js');
const TH = 70;
const FILE = path.join(__dirname, '..', 'stages.json');
const S = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const SP = {
  cl: () => ({}), tr: () => ({}),
  rk: s => ({ rock: 2 + s }), ic: s => ({ ice: 3 + s * 2 }), bm: s => ({ bomb: 2 + (s >> 1) }),
  wd: s => ({ wild: 1 + (s >> 1) }), pt: s => ({ paint: 1 + (s >> 1) }),
  mx: (s, r) => { const pool = ['rock', 'ice', 'bomb', 'wild', 'paint']; const o = {}; const n = s < 2 ? 2 : 3; while (Object.keys(o).length < n) { const k = pool[(r() * pool.length) | 0]; o[k] = 1 + ((r() * (1 + (s >> 1))) | 0); } return o; },
  ih: s => ({ ice2: 3 + s * 2 }), ln: s => ({ row: 1 + (s >> 1) }), dr: s => ({ colm: 1 + (s >> 1) }),
  pr: s => ({ prism: 1 + (s >> 1) }), hd: s => ({ hid: 4 + s * 2 }), ch: s => ({ cham: 2 + s }),
  ex: (s, r) => { const pool = ['ice2', 'row', 'colm', 'prism', 'hid', 'cham', 'rock', 'bomb']; const o = {}; while (Object.keys(o).length < 3) { const k = pool[(r() * pool.length) | 0]; o[k] = 1 + ((r() * (1 + (s >> 1))) | 0); } return o; },
};
const rate = (b, min) => Math.round(E.playRate(b, min, 300, E.rng(E.hashStr('r' + E.enc(b)))) * 1000);

if (process.argv.includes('--apply')) {
  S.old = S.old || {};
  let n = 0;
  for (const f of fs.readdirSync(__dirname).filter(f => f.startsWith('.refresh-'))) {
    const picks = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    for (const k in picks) {
      const [th, j] = k.split('.'), T = S.themes.find(t => t.id === th), s = (+j / 10) | 0, i = +j % 10;
      const p = picks[k], b = E.dec(p.b);
      // re-verify: the stored solution must clear the board
      let bd = b; for (const v of p.sol) { const g = E.group(bd, v >> 4, v & 15); if (g.length < T.min) throw new Error('bad sol ' + k); bd = E.remove(bd, g, { min: T.min }).board; }
      if (bd.length) throw new Error('not cleared ' + k);
      if (!S.old[k]) S.old[k] = T.stages[s].p[i];
      T.stages[s].p[i] = { b: p.b, sol: p.sol, r: p.r };
      n++;
    }
  }
  fs.writeFileSync(FILE, JSON.stringify(S));
  console.log('applied', n, 'old', Object.keys(S.old).length);
  process.exit(0);
}

const only = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2].split(',') : S.themes.map(t => t.id);
const out = {};
const seen = new Set(); for (const T of S.themes) for (const st of T.stages) for (const p of st.p) seen.add(p.b);
for (const T of S.themes) {
  if (!only.includes(T.id)) continue;
  T.stages.forEach((st, s) => {
    const rs = st.p.map(p => p.r);
    const low = [];
    st.p.forEach((p, i) => { const f = fun(E.dec(p.b), T.min, T.id, p.sol, { r: p.r }); if (f.score < TH) low.push(i); });
    if (!low.length) return;
    // difficulty band for each slot: between the midpoints to its neighbours (at least ±10‰ around the original)
    const band = i => {
      const hi = i === 0 ? rs[0] + 40 : Math.max(rs[i] + 10, (rs[i] + rs[i - 1]) / 2);
      const lo = i === 9 ? 0 : Math.min(rs[i] - 10, (rs[i] + rs[i + 1]) / 2);
      return [Math.max(0, lo), hi];
    };
    const open = new Map(low.map(i => [i, null]));
    const rnd = E.rng(E.hashStr('fun-' + T.id + '-' + s));
    const t0 = Date.now(); let tries = 0;
    for (;;) {
      const el = Date.now() - t0, vs = [...open.values()];
      if (el > 180000 || tries >= 20000) break;
      if (vs.every(Boolean) && (vs.every(v => v.f >= 85) || el > 40000)) break;
      tries++;
      const b = E.randomBoard(st.w, st.h, st.k, rnd, SP[T.id](s, rnd));
      if (E.dead(b, T.min)) continue;
      const r = rate(b, T.min);
      const fits = [...open.keys()].filter(i => { const [lo, hi] = band(i); return r >= lo && r <= hi && (!open.get(i) || open.get(i).f < 85); });
      if (!fits.length) continue;
      const enc = E.enc(b); if (seen.has(enc)) continue;
      const sol = E.solve(b, T.min, 80000); if (!sol) continue;
      const f = fun(b, T.min, T.id, sol, { r });
      if (f.score < TH) continue;
      // give it to the slot where it improves most (closest original r on ties)
      fits.sort((a, c) => ((open.get(a) ? open.get(a).f : 0) - (open.get(c) ? open.get(c).f : 0)) || Math.abs(rs[a] - r) - Math.abs(rs[c] - r));
      const i = fits[0]; if (open.get(i) && open.get(i).f >= f.score) continue;
      if (open.get(i)) seen.delete(open.get(i).b);
      seen.add(enc);
      open.set(i, { b: enc, sol: sol.map(([x, y]) => x * 16 + y), r, f: f.score });
    }
    for (const [i, v] of open) if (v) out[T.id + '.' + (s * 10 + i)] = v;
    console.log(T.id, 's' + (s + 1), 'low', low.join(','), '→ filled', [...open.values()].filter(Boolean).length, 'tries', tries, [...open].map(([i, v]) => i + ':' + rs[i] + '→' + (v ? v.r + '/' + v.f : '-')).join(' '));
  });
}
fs.writeFileSync(path.join(__dirname, '.refresh-' + only.join('_') + '.json'), JSON.stringify(out));
