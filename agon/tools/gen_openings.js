// Builds openings.json for Agon: no named opening lines have come down from the 1842 rules or the 19th-century rule books, so
// the "openings" are three typical opening plans for White shown by this site's engine — White's first four moves follow the
// plan (the engine's best move among the moves that fit it), Black answers with the engine; then both sides continue with the
// engine. Practice problems: positions of the line with the engine's values of every move. Notes: tools/op_text.js.
// node tools/gen_openings.js > openings.json
const E = require('../engine.js'); E.setRule('std');
const TXT = require('./op_text.js');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const L = (k, v) => { const o = TXT[k]; const r = {}; for (const l of LANGS) { let s = (o[l] || o.en); if (v) s = s.replace(/\{(\w+)\}/g, (_, y) => { const x = v[y]; return x && typeof x === 'object' ? (x[l] || x.en) : x; }); r[l] = s; } return r; };
let seed = 1842; const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const LV = 15;
const PLANS = {
  queen: (p, m) => { const f = E.mFrom(m); return p.isQueen(f) && E.RING[E.mTo(m)] < E.RING[f]; },
  pairs: (p, m) => {
    const f = E.mFrom(m), t = E.mTo(m); if (p.isQueen(f) || E.RING[t] > E.RING[f]) return false;
    const hd = (a, b) => { const dq = E.Q[a] - E.Q[b], dr = E.RR[a] - E.RR[b]; return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)); };
    const near = c => { let d = 99; for (let i = 0; i < E.N; i++) if (i !== f && p.owner(i) === p.turn && !p.isQueen(i)) d = Math.min(d, hd(c, i)); return d; };
    return near(t) < near(f) || near(t) === 1;
  },
  inner: (p, m) => { const f = E.mFrom(m), t = E.mTo(m); if (p.isQueen(f) || E.RING[t] >= E.RING[f]) return false; let mn = 9; for (let i = 0; i < E.N; i++) if (p.owner(i) === p.turn && !p.isQueen(i)) mn = Math.min(mn, E.RING[i]); return E.RING[f] === mn; },
};
const NOTE = { queen: 'n.planQ', pairs: 'n.planP', inner: 'n.planI' };
const sets = [];
for (const id of Object.keys(PLANS)) {
  const line = [], notes = [];
  for (let ply = 0; ply < 16; ply++) {
    const { pos } = E.replay(null, line);
    let m;
    if (ply < 8 && pos.turn === 1) {
      const r = E.analyze(null, line, 1500), fit = r.list.filter(e => PLANS[id](pos, e.m));
      m = (fit[0] || r.list[0]).m;
      notes.push(L(NOTE[id]));
    } else {
      m = E.think(null, line, LV, rand).move;
      const k = E.kindOfMove(pos, m), c = { ...L('c' + pos.turn) }, pc = L(pos.isQueen(E.mFrom(m)) ? 'pc.q' : 'pc.g');
      if (k === 'reloc') notes.push(L('n.reloc', { c }));
      else if (pos.capsOf(m).length) notes.push(L('n.cap', { c }));
      else if (E.mTo(m) === E.CENTER) notes.push(L('n.throne', { c }));
      else notes.push(L(E.RING[E.mTo(m)] < E.RING[E.mFrom(m)] ? 'n.in' : 'n.side', { c, p: pc }));
    }
    line.push(m);
  }
  const names = []; { const p = E.Pos.from(null); for (const m of line.slice(0, 8)) { names.push(E.name(p, m)); p.play(m); } }
  const problems = [];
  for (const ply of [6, 8, 9, 10, 11, 12, 13, 14]) {
    const { pos } = E.replay(null, line.slice(0, ply));
    if (pos.phase() !== 'move') continue;
    const r = E.analyze(null, line.slice(0, ply), 1500);
    problems.push({ s: pos.spec(), sc: r.list.map(e => [e.m, e.v]), best: r.list[0].m });
  }
  sets.push({ id, grp: 'a', side: 1, show: 4, moves: names.join(' '), label: L(id + '.title'), title: L(id + '.title'), short: null, intro: null, study: { line, notes }, problems });
  console.error(id, names.join(' '), problems.length);
}
console.log(JSON.stringify({ version: 1, sets }));
