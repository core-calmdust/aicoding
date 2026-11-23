// (2026-11-24 第2期) candidates for the endgame lessons (e_kings・e_men・e_draw): random 3-4 piece positions solved exactly from the
// endgame database (tools/lesson-verify.js ckExact), kept when they meet the strict checks of tools/lesson-verify.js checkers (the right
// moves = every move keeping the result, at most half of 4+ legal moves, a quiet mistake among the wrong ones, no forced capture, nothing
// within 3 squares of any position the game shows). Prints JSON lines { id, b, side, ok, wrong, quiet, eg } to pick from.
// node checkers/tools/eg_lessons.js <e_kings|e_men|e_draw> [count] [seed]
'use strict';
const path = require('path'), fs = require('fs');
const V = require(path.join(__dirname, '../../tools/lesson-verify.js'));
const [id, cnt = '40', seed0 = '7'] = process.argv.slice(2);
const { E, val, moveVal } = V._ck.ckExact(), L = JSON.parse(fs.readFileSync(path.join(__dirname, '../lessons.json'), 'utf8'));
const pool = V._ck.ckPool(fs, L).filter(([, , o]) => !(L.steps.find(s => s.id === id).problems.includes(o)));
let seed = +seed0 >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (mulberry32)
const qs = (p, d) => { const c = p.caps(); if (!c.length || d > 10) return 0; let b = -99; for (const x of c) b = Math.max(b, E.popc(E.mCap(x)) - qs(p.clone().play(x), d + 1)); return b; };
const net = (p, m) => { const q = p.clone().play(m); return E.popc(E.mCap(m)) - qs(q, 0); };
const want = id === 'e_draw' ? 0 : 1, out = [], seen = [];
for (let it = 0; it < 2e6 && out.length < +cnt; it++) {
  const np = 3 + Math.floor(rnd() * 2), a = Array(32).fill('.');
  for (let i = 0; i < np; i++) { let s; do { s = Math.floor(rnd() * 32); } while (a[s] !== '.'); const black = i === 0 || (i < np - 1 && rnd() < 0.5);
    let king = id === 'e_kings' ? true : rnd() < (id === 'e_men' ? 0.35 : 0.5); if (black && s >= 28) king = true; if (!black && s < 4) king = true; a[s] = black ? (king ? 'B' : 'b') : (king ? 'W' : 'w'); }
  if (!a.some(c => c === 'w' || c === 'W')) continue;
  const b = a.join(''), side = 1 + Math.floor(rnd() * 2), p = E.Pos.from({ b, side });
  if (id === 'e_men' && a.filter(c => c === 'b' || c === 'w').length < 2) continue;
  if (p.hasCaps()) continue; const all = p.moves(); if (all.length < 4) continue;
  if (val(p, 8) !== want) continue;
  const v = all.map(m => moveVal(p, m)); if (v.some(x => x === null)) continue;
  const ok = all.filter((m, i) => v[i] === want), wrong = all.filter((m, i) => v[i] !== want);
  if (ok.length * 2 > all.length || wrong.length < 2) continue;
  if (id === 'e_draw' && wrong.some(m => moveVal(p, m) !== -1)) continue;
  const quiet = wrong.filter(m => net(p, m) >= 0).length; if (!quiet) continue;
  if (pool.some(([, b2]) => V._ck.ckDist(b, b2) <= 3) || seen.some(b2 => V._ck.ckDist(b, b2) <= 3)) continue;
  seen.push(b);
  const R = { 0: 'd', '-1': 'l' };
  out.push({ id, b, side, ok, best: ok[0], okN: ok.map(m => E.name(p, m)), n: all.length, wrong: wrong.length, quiet, eg: wrong.map(m => E.name(p, m) + ':' + R[moveVal(p, m)]).join(' ') });
}
out.forEach(o => console.log(JSON.stringify(o)));
