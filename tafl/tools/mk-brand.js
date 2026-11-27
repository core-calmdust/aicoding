'use strict';
// (2026-11-28 第2期 担当A) the maker of v_brandubh problems: random brandubh boards (the king placed by the kind: 'two' away from the
// throne and the corners, 'corner' next to a corner, 'four' next to the throne), the attackers to move; kept when
// tools/lesson-verify-tfbrand.js finds no fault, one answer, and ≥4 squares (8 symmetries) from every other brandubh board.
// Prints one JSON per line: { P, kind, d, legal, ring }.   node tafl/tools/mk-brand.js <kind> <count> [seed] [mind]
const path = require('path'), fs = require('fs'), E = require(path.join(__dirname, '../engine.js')), B = require(path.join(__dirname, '../../tools/lesson-verify-tfbrand.js'));
const [KIND, CNT, SEED, MIND] = process.argv.slice(2), n = 7;
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);
const L = JSON.parse(fs.readFileSync(path.join(__dirname, '../lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '../puzzles.json'), 'utf8'));
const pool = []; L.steps.forEach(st => { if (st.id !== 'v_brandubh') (st.problems || []).forEach(q => pool.push(q.s.b)); if (st.diagram) pool.push(st.diagram.s.b); (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); });
(PZ.themes || []).forEach(t => (t.puzzles || []).forEach(q => pool.push(q.s.b)));
const KSQ = { two: [], corner: [], four: [] };
for (let i = 0; i < 49; i++) { if (B.CORNER(i) || i === 24) continue; if (B.nearThrone(i)) KSQ.four.push(i); else if (B.nb4(i).some(B.CORNER)) KSQ.corner.push(i); else KSQ.two.push(i); }
let got = 0;
for (let tries = 0; tries < +(process.env.TRIES || 3000000) && got < +CNT; tries++) {
  const b = Array(49).fill('.'), set = (i, x) => { if (i < 0 || i >= 49 || B.CORNER(i) || i === 24 || b[i] !== '.') return false; b[i] = x; return true; };
  const K = KSQ[KIND], k = K[ri(K.length)]; set(k, 'k');
  const nbk = B.nb4(k); for (let q = 0; q < 1 + ri(3); q++) set(nbk[ri(nbk.length)], rnd() < 0.75 ? 'a' : 'd');
  const na = 2 + ri(5), nd = ri(4); for (let q = 0; q < na; q++) set(ri(49), 'a'); for (let q = 0; q < nd; q++) set(ri(49), 'd');
  const P = { s: { v: 'brandubh', b: b.join(''), side: 1 } };
  let p; try { p = E.Pos.from(P.s); } catch (e) { continue; }
  const goal = p.moves().filter(m => p.clone().play(m).res === 1); if (goal.length !== 1) continue;
  P.ok = goal; P.best = goal[0];
  const f = B.brandFacts(E, P); if (f.bad.length || f.kind !== KIND) continue;
  if (pool.some(x => B.dist7(x, P.s.b) < 4)) continue;
  if (+(MIND || 0) > f.d) continue;
  got++; console.log(JSON.stringify({ P, kind: f.kind, d: f.d, legal: f.all.length, ring: f.ring.length, esc: f.wrong.filter(m => f.C.get(m).esc).length, cap: f.wrong.filter(m => f.C.get(m).cap).length, thr: f.wrong.filter(m => f.C.get(m).why === 'throne').length }));
}
console.error('made', got);
