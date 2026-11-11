// Dev tool (2026-11-11): more puzzles for peg/puzzles.json and the EASY daily list, chosen by the fun score (tools/fun.js).
// node peg/tools/gen_more.js   (deterministic; a few minutes)
// The puzzles already there stay exactly as they are (their places, so stars and records keep). New ones are added:
//   · two new themes in 基本: 'mid' 英国式の中盤 (10–16 pegs) and 'chain' 連続跳び (the solution ends with one marble
//     jumping 3+ times in a row)
//   · the four 世界の盤 boards get more puzzles, appended after the present ones (world list order = per-board order)
//   · daily.json gets `easy` (366, 4–8 pegs) beside the present `list` (通常)
// Every candidate is made backwards from the finish (so it is solvable; its solution is the construction), has a choice
// and a dead-end first jump, and is kept only with a fun score ≥ 70 (EASY ≥ 60); at least 3× the needed candidates are
// scored and the best are taken, then sorted easy → hard.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), F = require('./fun.js');
const OUT = path.join(__dirname, '..');
let seed = 1111; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const enc = a => a.map(v => v ? 1 : 0).join('');
const PZ = JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzles.orig.json'))), DL = JSON.parse(fs.readFileSync(path.join(OUT, 'daily.json')));
const seen = new Set();
const keyOf = (B, a, t) => B.id + ':' + t + ':' + E.canon(B, a);
for (const T of PZ.themes) for (const P of T.list) seen.add(keyOf(E.BOARDS[P.b], P.p.split('').map(Number), P.t));
for (const P of DL.list) seen.add(keyOf(E.BOARDS[P.b], P.p.split('').map(Number), P.t));

// backwards from one peg on t: `chain` first unjumps all by the same marble (a chain finish), then compact random unjumps
function unplay(B, t, n, chain) {
  const a = new Array(B.n).fill(0); a[t] = 1; const back = []; let k = 1, cur = t, guard = 0;
  while (k < n && guard++ < 4000) {
    let c = [];
    for (const j of B.jumps) { const [f, o, to] = j; if (a[to] && !a[o] && !a[f]) c.push(j); }
    if (back.length < chain) { c = c.filter(j => j[2] === cur); if (!c.length) return null; }
    if (!c.length) return null;
    const w = c.map(([f]) => { let s = 0; for (const [ff, oo, tt] of B.jumps) if (tt === f && a[oo]) s++; return 1 + s * 1.1 + rnd(); });
    let r = rnd() * w.reduce((x, y) => x + y, 0), i = 0; while ((r -= w[i]) > 0) i++;
    const j = c[i]; a[j[2]] = 0; a[j[1]] = 1; a[j[0]] = 1; k++; cur = j[0]; back.push(j);
  }
  return k === n ? { a, sol: back.reverse() } : null;
}
function cand(B, t, n, chain) {
  const u = unplay(B, t, n, chain); if (!u) return null;
  const k = keyOf(B, u.a, t); if (seen.has(k)) return null;
  const ms = E.moves(B, u.a); if (ms.length < 2) return null;
  const P = { b: B.id, p: enc(u.a), t, s: u.sol.map(j => j[0] + '.' + j[2]).join(' '), n };
  const r = F.score(P); if (!r) return null;
  // a dead-end first jump must exist (exact)
  let g = 0; for (const j of ms) if (E.solve(B, E.apply(u.a, j), { target: t, time: 4000 }).ok) g++;
  if (g >= ms.length) return null;
  P.g = g; P.m = ms.length; P.f = r.total; P._k = k; P._chain = r.chain;
  return P;
}
const hard = p => p.n * 10 + (1 - p.g / p.m) * 40;
function batch(ids, n0, n1, need, opt) {
  opt = opt || {};
  const pool = []; let tries = 0, pass = 0; const min0 = opt.min || 70;
  // (at least 3× the needed candidates; more until enough reach the bar)
  while ((pool.length < need * 3 || pass < need) && tries++ < need * 4000) {
    const B = E.BOARDS[pick(ids)], n = n0 + Math.floor(rnd() * (n1 - n0 + 1));
    const t = opt.center && rnd() < .6 ? B.center : pick(B.cells.map((_, i) => i).filter(i => B.dist[i] < (B.tri ? 2.6 : 3)));
    const P = cand(B, t, n, opt.chain || 0); if (!P) continue;
    if (opt.chain && P._chain < 3) continue;
    if (pool.some(x => x._k === P._k)) continue;
    pool.push(P); if (P.f >= min0) pass++;
  }
  const min = opt.min || 70;
  const ok = pool.filter(P => P.f >= min).sort((x, y) => y.f - x.f).slice(0, need);
  ok.forEach(P => seen.add(P._k));
  process.stdout.write(`${ids.join('/')}${opt.chain ? ' chain' : ''}: ${pool.length} candidates, ${pool.filter(P => P.f >= min).length} ≥ ${min}, took ${ok.length}/${need}\n`);
  return ok.sort((x, y) => hard(x) - hard(y)).map(P => { delete P._k; delete P._chain; return P; });
}

// (2026-11-11, user: re-judge the puzzles already there too, and only a few very easy ones)
// The whole book is rebuilt from the original puzzles.json (kept as puzzles.orig.json beside this tool):
//   first  — はじめの一歩: 3 very easy (3–4 pegs) + 7 more with fun ≥ 70 (5–8 pegs)
//   shape  — the seven classic shapes always, then symmetric shapes with fun ≥ 70
//   mid / chain — new (≥ 70)        world — per board: the old ones with ≥ 70 first, then new ones
//   full   — the full boards (not scored: over 18 pegs) as they are
// The daily 通常 list is rebuilt the same way (≥ 70), EASY ≥ 60.
const ORIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzles.orig.json')));
const by = id => (ORIG.themes.find(T => T.id === id) || { list: [] }).list;
seen.clear();
const keep = (P, min) => { const r = F.score(P); if (!r || r.total < min) return null; const B = E.BOARDS[P.b]; seen.add(keyOf(B, P.p.split('').map(Number), P.t)); return Object.assign({}, P, { f: r.total }); };
const OUTT = [];
{ // はじめの一歩
  const old = by('first').map(P => ({ P, r: F.score(P) })).filter(x => x.r);
  const tiny = old.filter(x => x.P.n <= 4).sort((x, y) => y.r.total - x.r.total).slice(0, 3).map(x => keep(x.P, 0));
  const more = old.filter(x => x.P.n > 4 && x.r.total >= 70).sort((x, y) => y.r.total - x.r.total).slice(0, 7).map(x => keep(x.P, 70));
  const fill = more.length < 7 ? batch(['english'], 5, 8, 7 - more.length, { center: true }) : [];
  OUTT.push({ id: 'first', list: tiny.concat([...more, ...fill].sort((x, y) => hard(x) - hard(y))) });
}
{ // 形
  const cl = by('shape').filter(P => P.k && P.k !== 'sym').map(P => keep(P, 0));
  const sym = by('shape').filter(P => P.k === 'sym').map(P => keep(P, 70)).filter(Boolean).sort((x, y) => hard(x) - hard(y));
  OUTT.push({ id: 'shape', list: cl.concat(sym) });
}
OUTT.push({ id: 'mid', list: batch(['english'], 10, 16, 80, { center: true }) });
OUTT.push({ id: 'chain', list: batch(['english'], 7, 14, 60, { chain: 3 }) });
{ // 世界の盤
  const list = [];
  for (const [id, k, n0, n1] of [['triangle', 30, 6, 11], ['french', 40, 9, 16], ['diamond', 40, 9, 16], ['german', 40, 9, 16]]) {
    const old = by('world').filter(P => P.b === id).map(P => keep(P, 70)).filter(Boolean);
    const add = batch([id], n0, n1, Math.max(0, k - old.length));
    list.push(...old.concat(add).sort((x, y) => hard(x) - hard(y)));
  }
  OUTT.push({ id: 'world', list });
}
OUTT.push({ id: 'full', list: by('full') });
PZ.themes = OUTT; PZ.v = 3;
fs.writeFileSync(path.join(OUT, 'puzzles.json'), JSON.stringify(PZ));
console.log(PZ.themes.map(T => T.id + ' ' + T.list.length).join(', '), 'total', PZ.themes.reduce((s, T) => s + T.list.length, 0));
// the daily puzzles: 通常 (9–15 pegs, ≥ 70) and EASY (4–8 pegs, ≥ 60), every board (the English one most often)
seed = 7777;
const normal = [];
while (normal.length < 366) normal.push(...batch([rnd() < .5 ? 'english' : pick(['french', 'triangle', 'diamond', 'german'])], 9, 15, 6, { center: rnd() < .5 }));
seed = 4242;
const easy = [];
while (easy.length < 366) easy.push(...batch([rnd() < .5 ? 'english' : pick(['french', 'triangle', 'diamond', 'german'])], 4, 8, 6, { min: 60, center: rnd() < .5 }));
fs.writeFileSync(path.join(OUT, 'daily.json'), JSON.stringify({ v: 3, list: normal.slice(0, 366), easy: easy.slice(0, 366) }));
console.log('daily', 366, 'easy', 366);
