// Dev tool (2026-11-13): four more themes for peg/puzzles.json, 40 puzzles each (★120), to fill the rows of 基本 and 世界の盤.
// node peg/tools/gen_themes.js   (deterministic; several minutes)
// The puzzles already there stay exactly as they are. New themes (appended to puzzles.json):
//   基本   'edge'   はしでフィニッシュ — English board, the last peg on a hole at the arms' ends / edges (not the middle)
//          'island' ふたつの島        — English board, the pegs start in two separate groups that must be joined
//   世界の盤 'wmix'  世界めぐり        — the four other boards mixed, finishing away from the middle
//          'wbig'  大盤の長丁場      — the big boards (German, diamond) with 12–15 pegs to the middle
// Each candidate is built backwards from the finish (solvable by construction), needs a choice and a dead-end first jump, and
// is kept only with a fun score (tools/fun.js) ≥ 70; at least 3× the needed candidates are scored, the best taken, easy → hard.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), F = require('./fun.js');
const OUT = path.join(__dirname, '..'), FILE = path.join(OUT, 'puzzles.json');
const PZ = JSON.parse(fs.readFileSync(FILE));
let seed = 131113; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const enc = a => a.map(v => v ? 1 : 0).join('');
const keyOf = (B, a, t) => B.id + ':' + t + ':' + E.canon(B, a);
const seen = new Set();
for (const T of PZ.themes) for (const P of T.list) if (P) seen.add(keyOf(E.BOARDS[P.b], P.p.split('').map(Number), P.t));
function unplay(B, t, n) {
  const a = new Array(B.n).fill(0); a[t] = 1; const back = []; let k = 1, guard = 0;
  while (k < n && guard++ < 4000) {
    const c = []; for (const j of B.jumps) { const [f, o, to] = j; if (a[to] && !a[o] && !a[f]) c.push(j); }
    if (!c.length) return null;
    const w = c.map(([f]) => { let s = 0; for (const [ff, oo, tt] of B.jumps) if (tt === f && a[oo]) s++; return 1 + s * 1.1 + rnd(); });
    let r = rnd() * w.reduce((x, y) => x + y, 0), i = 0; while ((r -= w[i]) > 0) i++;
    const j = c[i]; a[j[2]] = 0; a[j[1]] = 1; a[j[0]] = 1; k++; back.push(j);
  }
  return k === n ? { a, sol: back.reverse() } : null;
}
// groups of pegs (holes next to each other along a row / column / the triangle's lines)
function groups(B, a) {
  const nb = i => B.jumps.filter(j => j[0] === i).map(j => j[1]);
  const seenG = new Set(); let n = 0;
  for (let i = 0; i < B.n; i++) if (a[i] && !seenG.has(i)) { n++; const st = [i]; seenG.add(i); while (st.length) { const x = st.pop(); for (const y of nb(x)) if (a[y] && !seenG.has(y)) { seenG.add(y); st.push(y); } } }
  return n;
}
const hard = p => p.n * 10 + (1 - p.g / p.m) * 40;
function batch(name, need, gen, test) {
  const pool = []; let tries = 0, pass = 0;
  while ((pool.length < need * 3 || pass < need) && tries++ < need * 6000) {
    const { B, t, n } = gen(); const u = unplay(B, t, n); if (!u) continue;
    if (test && !test(B, u.a)) continue;
    const k = keyOf(B, u.a, t); if (seen.has(k) || pool.some(x => x._k === k)) continue;
    const ms = E.moves(B, u.a); if (ms.length < 2) continue;
    const P = { b: B.id, p: enc(u.a), t, s: u.sol.map(j => j[0] + '.' + j[2]).join(' '), n };
    const r = F.score(P); if (!r) continue;
    let g = 0; for (const j of ms) if (E.solve(B, E.apply(u.a, j), { target: t, time: 4000 }).ok) g++;
    if (g >= ms.length) continue;
    P.g = g; P.m = ms.length; P.f = r.total; P._k = k; pool.push(P); if (P.f >= 70) pass++;
  }
  const ok = pool.filter(P => P.f >= 70).sort((x, y) => y.f - x.f).slice(0, need);
  ok.forEach(P => seen.add(P._k));
  console.log(`${name}: ${pool.length} candidates, ${pool.filter(P => P.f >= 70).length} ≥ 70, took ${ok.length}/${need}`);
  return ok.sort((x, y) => hard(x) - hard(y)).map(P => { delete P._k; return P; });
}
const EN = E.BOARDS.english, far = B => B.cells.map((_, i) => i).filter(i => B.dist[i] >= 2 && B.dist[i] < 3.6);
const add = [];
add.push({ id: 'edge', list: batch('edge', 40, () => ({ B: EN, t: pick(far(EN)), n: 7 + Math.floor(rnd() * 7) })) });
add.push({ id: 'island', list: batch('island', 40, () => ({ B: EN, t: rnd() < .5 ? EN.center : pick(EN.cells.map((_, i) => i).filter(i => EN.dist[i] < 2.3)), n: 8 + Math.floor(rnd() * 7) }), (B, a) => groups(B, a) >= 2) });
add.push({ id: 'wmix', list: batch('wmix', 40, () => { const B = E.BOARDS[pick(['french', 'diamond', 'german', 'triangle'])]; return { B, t: pick(far(B).length ? far(B) : B.cells.map((_, i) => i)), n: (B.tri ? 6 : 9) + Math.floor(rnd() * (B.tri ? 5 : 6)) }; }) });
add.push({ id: 'wbig', list: batch('wbig', 40, () => { const B = E.BOARDS[pick(['german', 'diamond'])]; return { B, t: B.center, n: 12 + Math.floor(rnd() * 4) }; }) });
PZ.themes = PZ.themes.filter(T => !add.some(A => A.id === T.id)).concat(add);
fs.writeFileSync(FILE, JSON.stringify(PZ));
console.log(PZ.themes.map(T => T.id + ' ' + T.list.length).join(', '));
