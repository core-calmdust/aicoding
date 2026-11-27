'use strict';
// (2026-11-28 第2期 担当A) the maker of v_tablut problems: random tablut boards (the king inside, not on or next to the throne, with no
// open line now), the defenders to move; kept when tools/lesson-verify-tftablut.js finds no fault (P.ok = every move that forces the
// escape) and the board is ≥4 squares (8 symmetries) from every other tablut board. Prints one JSON per line: { P, d, kd, legal, no, shape }.
//   node tafl/tools/mk-tablut.js <count> [seed]
const path = require('path'), fs = require('fs'), E = require(path.join(__dirname, '../engine.js')), T = require(path.join(__dirname, '../../tools/lesson-verify-tftablut.js'));
const [CNT, SEED] = process.argv.slice(2), n = 9, TH = 40;
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);
const L = JSON.parse(fs.readFileSync(path.join(__dirname, '../lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '../puzzles.json'), 'utf8'));
const pool = []; L.steps.forEach(st => { if (st.id !== 'v_tablut') (st.problems || []).forEach(q => pool.push(q.s.b)); if (st.diagram) pool.push(st.diagram.s.b); (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); });
(PZ.themes || []).forEach(t => (t.puzzles || []).forEach(q => pool.push(q.s.b)));
const corner = i => i === 0 || i === 8 || i === 72 || i === 80;
let got = 0;
for (let tries = 0; tries < +(process.env.TRIES || 400000) && got < +CNT; tries++) {
  const b = Array(81).fill('.'), set = (i, x) => { if (i < 0 || i >= 81 || corner(i) || i === TH || b[i] !== '.') return false; b[i] = x; return true; };
  const kr = 1 + ri(7), kc = 1 + ri(7), k = kr * n + kc; if (Math.abs(kr - 4) + Math.abs(kc - 4) <= 1) continue; set(k, 'k');
  const na = 7 + ri(9), nd = 1 + ri(4); for (let q = 0; q < na; q++) set(ri(81), 'a'); for (let q = 0; q < nd; q++) set(ri(81), 'd');
  const P = { s: { v: 'tablut', b: b.join(''), side: 2 } };
  let f; try { f = T.tablutFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (!f.goal.length || f.goal.length > 2) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  const g = T.tablutFacts(E, P); if (g.bad.length) continue;
  if (pool.some(x => T.dist9(x, P.s.b) < 4)) continue;
  got++; console.log(JSON.stringify({ P, d: g.d, kd: g.kd, legal: g.all.length, no: P.ok.length, shape: P.ok.map(m => T.shape(E, g, m)).join(''), ans: P.ok.map(m => E.name(g.p, m)).join(' ') }));
}
console.error('made', got, 'tries');
