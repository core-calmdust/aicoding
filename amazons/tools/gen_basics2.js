// (2026-11-24 第2期 problem check) the basics' scored problems (b_queen / b_arrow / b_block / b_win) made again so each one passes
// tools/lesson-verify.js amazons: the question and hint ケロ says for problem k fit its board (two white amazons where he asks
// "which amazon", a blocked decoy where he says "watch for an arrow on the line", two exits where he says "if there are two exits",
// two black amazons where he says "all of Black's amazons", a white amazon whose leaving square would reopen an exit where he warns
// about it…), and the problems get harder (lesson-verify's d). Rewrites only these four steps' problems in lessons.json.
// node amazons/tools/gen_basics2.js [--dry]
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'amazons/engine.js')), V = require(path.join(ROOT, 'tools/lesson-verify.js'));
const { Pos, P1, P2, NB, mFrom, mTo, mArrow, RC } = E;
let seed = 20261124;   // (mulberry32 below: the old LCG of gen_lessons.js loses its low bits in floats and loops)
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = n => Math.floor(rnd() * n);
function spec(w, b, x) { const a = Array(100).fill('.'); for (const i of x) a[i] = 'x'; for (const i of w) a[i] = 'w'; for (const i of b) a[i] = 'b'; return { b: a.join(''), side: P1 }; }
function randPos(nw, nb, na) { const used = new Set(), pick = () => { let i; do i = ri(100); while (used.has(i)); used.add(i); return i; };
  const w = [], b = [], x = []; for (let k = 0; k < nw; k++) w.push(pick()); for (let k = 0; k < nb; k++) b.push(pick()); for (let k = 0; k < na; k++) x.push(pick()); return { w, b, x }; }
const cheb = (a, b) => Math.max(Math.abs(RC[a][0] - RC[b][0]), Math.abs(RC[a][1] - RC[b][1]));
const al = (f, t) => { const [r1, c1] = RC[f], [r2, c2] = RC[t]; return f !== t && (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)); };
const seg = (f, t) => { const [r1, c1] = RC[f], [r2, c2] = RC[t], dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), o = []; let r = r1 + dr, c = c1 + dc; while (r !== r2 || c !== c2) { o.push(r * 10 + c); r += dr; c += dc; } return o; };
const blk = (sq, f, t) => seg(f, t).some(q => sq[q]);
const sideOf = (p, c) => { const o = []; for (let k = 0; k < 8; k++) if (p.q[k] >= 0 && p.sq[p.q[k]] === c) o.push(p.q[k]); return o; };
// candidates: { P (the problem), d, tags }
function cQueen() { const nw = 1 + ri(2), R = randPos(nw, 1 + ri(2), 5 + ri(9)), p = Pos.from(spec(R.w, R.b, R.x)), all = p.moves(), W = sideOf(p, 1);
  const f = W[0], tos = [...new Set(all.filter(m => mFrom(m) === f).map(mTo))].filter(t => cheb(f, t) >= 3 && !W.slice(1).some(g => all.some(m => mFrom(m) === g && mTo(m) === t)));
  if (!tos.length) return null; const T = tos[ri(tos.length)], ok = all.filter(m => mTo(m) === T);
  const dec = W.filter(g => g !== f && al(g, T) && blk(p.sq, g, T)).length;
  return { P: { s: p.spec(), ok, best: ok[0], mk: [T] }, d: W.length + dec, far: cheb(f, T), nw: W.length, dec }; }
function cArrow() { const R = randPos(1 + ri(2), 1 + ri(2), 3 + ri(7)), p = Pos.from(spec(R.w, R.b, R.x)), all = p.moves(), W = sideOf(p, 1), by = new Map();
  for (const m of all) { const a = mArrow(m); if (!by.has(a)) by.set(a, []); by.get(a).push(m); }
  const good = [...by.entries()].filter(([a, ms]) => !W.some(f => al(f, a) && !blk(p.sq, f, a)) && !W.includes(a));
  if (!good.length) return null; const [T, ok] = good[ri(good.length)];
  const dests = new Set(all.map(m => mFrom(m) * 100 + mTo(m))).size, okD = new Set(ok.map(m => mFrom(m) * 100 + mTo(m))).size;
  if (dests < okD * 3 || ok.length > all.length * 0.3) return null;
  return { P: { s: p.spec(), ok, best: ok[0], mk: [T] }, d: Math.floor(dests / okD), okD, dests }; }
function cBlock() { const R = randPos(1, 2, 16 + ri(10)), p = Pos.from(spec(R.w, R.b, R.x)), all = p.moves(), f = R.w[0], by = new Map();
  for (const m of all) { const a = mArrow(m); if (!by.has(a)) by.set(a, new Set()); by.get(a).add(mTo(m)); }
  const good = [...by.entries()].filter(([a, tos]) => tos.size <= 2 && a !== f && !(al(f, a) && !blk(p.sq, f, a)) && cheb(f, a) >= 2);
  if (!good.length) return null; const [T, tos] = good[ri(good.length)], ok = all.filter(m => mArrow(m) === T);
  const dests = new Set(all.map(m => mTo(m))).size; if (dests < tos.size * 3 || ok.length > all.length * 0.3) return null;
  const far = [...tos].every(t => cheb(t, T) >= 3);
  const path = [...Array(100).keys()].some(s => !p.sq[s] && al(s, T) && !blk(p.sq, s, T) && al(f, s) && blk(p.sq, f, s) && !tos.has(s));
  return { P: { s: p.spec(), ok, best: ok[0], mk: [T] }, d: Math.floor(dests / tos.size), far, path }; }
function cWin() { const nb = 1 + ri(2), R = randPos(1 + ri(2), nb, 30 + ri(25));
  if (nb === 2) { // the second black amazon: already shut in, or with one or two exits (so "look at all of Black's amazons" matters)
    const occ = new Set([...R.w, ...R.b]); for (const bb of R.b) { const e = NB[bb].filter(i => !occ.has(i)), keep = ri(3); e.forEach((i, j) => { if (j >= keep && !R.x.includes(i)) R.x.push(i); else if (j < keep) { const k = R.x.indexOf(i); if (k >= 0) R.x.splice(k, 1); } }); } }
  const p = Pos.from(spec(R.w, R.b, R.x));
  if (!p.canMove(P2) || !p.canMove(P1)) return null; const all = p.moves(); if (all.length > 400 || all.length < 8) return null;
  const ok = all.filter(m => { p.play(m); const r = !p.canMove(P2); p.unplay(m); return r; });
  if (!ok.length || ok.length > all.length * 0.3) return null;
  const ex = E.emptyAround(p, P2).length, B = sideOf(p, 2);
  const open = all.some(m => { if (ok.includes(m) || !NB[mFrom(m)].some(x => p.sq[x] === 2)) return false; const q = p.clone().play(m); if (q.sq[mFrom(m)]) return false; q.sq[mFrom(m)] = 3; return !q.canMove(2); });
  return { P: { s: p.spec(), ok, best: ok[0] }, d: Math.floor(all.length / ok.length), ex, nb: B.length, open }; }
// what problem k must be (ケロ's question / hint k, see atlas/lessons3d.js AMJ_LS.ask / hint)
const NEED = {
  b_queen: [c => c.nw === 1, c => c.nw === 1 && c.far >= 4, c => c.nw === 2 && !c.dec, c => c.nw === 2, c => c.dec >= 1],
  b_arrow: [c => c.okD >= 2, c => true, c => true, c => true, c => true],
  b_block: [c => true, c => true, c => true, c => c.far, c => c.path],
  b_win: [c => c.nb === 1, c => c.nb === 2, c => c.ex === 2, c => c.open, c => c.nb === 2],
};
const GEN = { b_queen: cQueen, b_arrow: cArrow, b_block: cBlock, b_win: cWin };
const file = path.join(ROOT, 'amazons/lessons.json'), L = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const id of Object.keys(GEN)) {
  const C = []; for (let t = 0; t < (id === 'b_win' ? 300000 : 20000) && C.length < 400; t++) { const c = GEN[id](); if (c) C.push(c); }
  const st = L.steps.find(s => s.id === id);
  // d targets: spread over the candidates' range, rising
  const ds = [...new Set(C.map(c => c.d))].sort((a, b) => a - b);
  let done = false;
  for (let tr = 0; tr < 400 && !done; tr++) {
    const pick = []; let prev = -1;
    for (let k = 0; k < 5; k++) { const lo = id === 'b_queen' ? 0 : ds[Math.min(ds.length - 1, Math.floor(ds.length * k / 6))];
      const ok = C.filter(c => NEED[id][k](c) && c.d >= Math.max(prev, lo) && !pick.includes(c) && (k < 4 || c.d > pick[0].d));
      if (!ok.length) break; const c = ok.sort((a, b) => a.d - b.d)[Math.min(ok.length - 1, ri(Math.min(4, ok.length)))]; pick.push(c); prev = c.d; }
    if (pick.length < 5) continue;
    const old = st.problems; st.problems = pick.map(c => c.P);
    const f = V.amazons({ lessons: L, only: new Set([id]) });
    if (!f.length) { done = true; console.log('OK', id, 'd', pick.map(c => c.d).join(' '), `(${C.length} candidates, try ${tr + 1})`); }
    else { if (tr < 2) console.log(id, f.slice(0, 6).map(x => `q${x.q} ${x.msg}`.slice(0, 160)).join("\n  ")); st.problems = old; }
  }
  if (!done) { console.log('FAILED', id, C.length, NEED[id].map(n => C.filter(n).length).join(' ')); process.exitCode = 1; }
}
if (!process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(L));
