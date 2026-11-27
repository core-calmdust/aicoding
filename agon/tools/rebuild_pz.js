// (2026-11-27 担当F) Rebuilds puzzles.json so that every puzzle passes tools/lesson-verify-agon.js (claude/lesson-quality.md ①〜⑨
// and 追1〜追88): the candidates are the current puzzles and the generator pools (tools/duel_raw.jsonl — self-play — and
// tools/pz_c*.jsonl — constructed), each analysed with the exact solver (lesson-verify-agon.js analyze: one winning first move, no
// quicker win, 3 legal moves or more with 2 wrong or more, 追72, the main line's wrong moves and their facts). Kept: the passing
// current puzzles first, then self-play, then constructed; a winning first move (from-to) at most twice per theme; no two positions
// within 4 cells under the 12 symmetries and the colour swap (with the lesson positions too), no start on another puzzle's main
// line. Inside a theme: easy → hard by d (wrong first moves + 2 × near misses).
// node agon/tools/rebuild_pz.js [cache.jsonl …]  → writes agon/puzzles.json (the analysis takes ~15 min on 2 cores without a cache)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const V = require(path.join(ROOT, 'tools/lesson-verify-agon.js'));
const E = require(path.join(ROOT, 'agon/engine.js')); E.setRule('std');
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/puzzles.json'), 'utf8'));
const SIZE = { x2: 8, w3: 24, b3: 24, w4: 24, b4: 24, w5: 24, b5: 24 };
function candidates() {
  const C = [], seen = new Set();
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => { seen.add(P.s.b + P.s.side); C.push({ src: 'cur', tag: T.id + '#' + (j + 1), s: P.s, n: P.n, a: P.a }); }));
  for (const f of ['duel_raw.jsonl', 'pz_c1.jsonl', 'pz_c2.jsonl']) for (const l of fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n')) {
    if (!l.trim()) continue; const d = JSON.parse(l), k = d.s.b + d.s.side; if (seen.has(k)) continue; seen.add(k);
    if (d.ok.length !== 1 || d.all < 3 || d.n < 2 || d.n > 5) continue;
    C.push({ src: f === 'duel_raw.jsonl' ? 'real' : 'cons', s: d.s, n: d.n, a: d.ok[0] });
  }
  return C;
}
function analyse(c) {
  const tid = c.n === 2 ? 'x2' : (c.s.side === 2 ? 'b' : 'w') + c.n;
  const g = E.duelGood(c.s, [], c.n, 'std', 6e7); if (g && g.length === 1) c.a = g[0];
  const r = V.analyze(c, tid);
  return Object.assign({ tid }, c, { iss: r.iss, legal: r.legal, near: r.near, d: r.d, line: r.line });
}
const cache = process.argv.slice(2);
const A = cache.length ? cache.flatMap(f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))) : candidates().map(analyse);
const LS = V.poolOf({ themes: [] });   // the lesson positions
const chosen = [], lineSet = new Set(), startSet = new Set();
const symKeys = (b, side) => { const o = []; for (const mp of V.MAPS) for (const sw of [0, 1]) o.push(V.sym(b, mp, sw) + (sw ? 3 - side : side)); return o; };
const rank = c => (c.src === 'cur' ? 0 : c.src === 'real' ? 1 : 2);
const themes = [];
for (const T of PZ.themes) {
  const want = SIZE[T.id];
  const pool = A.filter(c => c.tid === T.id && !c.iss.length).sort((a, b) => rank(a) - rank(b) || b.legal - a.legal || b.d - a.d);
  const cnt = new Map(), out = [];
  for (const c of pool) {
    if (out.length >= want) break;
    const k = E.mFrom(c.a) + '-' + E.mTo(c.a); if ((cnt.get(k) || 0) >= 2) continue;
    const me = { b: c.s.b, side: c.s.side };
    if (chosen.some(o => V.dist(me, o) <= 4) || LS.some(o => V.dist(me, o) <= 4)) continue;
    const ks = symKeys(c.s.b, c.s.side);
    if (ks.some(x => lineSet.has(x)) || (c.line || []).some(x => startSet.has(x))) continue;
    cnt.set(k, (cnt.get(k) || 0) + 1); out.push(c); chosen.push(me);
    ks.forEach(x => startSet.add(x)); (c.line || []).forEach(x => lineSet.add(x));
  }
  if (out.length < want) console.error(T.id, 'only', out.length, 'of', want);
  // easy → hard; no answer twice in a row where a swap with the next one keeps the order of d
  out.sort((a, b) => a.d - b.d || a.legal - b.legal);
  for (let i = 1; i < out.length; i++) if (out[i].a % 92 === out[i - 1].a % 92 && Math.floor(out[i].a / 92) === Math.floor(out[i - 1].a / 92)) { const j = out.findIndex((x, y) => y > i && x.d === out[i].d && x.a !== out[i].a); if (j > 0) [out[i], out[j]] = [out[j], out[i]]; }
  console.error(T.id, out.length, 'kept', out.filter(c => c.src === 'cur').length, 'd', out.map(c => c.d).join(','));
  themes.push({ id: T.id, grp: T.grp, puzzles: out.map(c => ({ s: c.s, n: c.n, a: c.a })) });
}
const res = Object.assign({}, PZ, { version: (PZ.version | 0) + 1, themes });
fs.writeFileSync(path.join(ROOT, 'agon/puzzles.json'), JSON.stringify(res));
