// node janggi/tools/gen_escape.js dump1.txt[,dump2…] out.json [ms]  (2026-11-24 担当D) candidates for the lesson 「ねらわれた駒を逃げる」
// (b_escape) from self-play positions (`jg dump`, tools/native.c): 楚 to move, not in check, exactly one piece of 楚 in danger (the
// opponent wins something on it: janggi/tools/esc_facts.js SEE) — a 車, 包 or 馬 — and exactly one legal move after which nothing of
// 楚 is in danger and the opponent has no mate in 1: a quiet move (no capture, no check) of that piece. The engine values every legal
// move (sc, = the 2D problemPoints); the answer must be alone on top, 100 or more ahead. tools/lesson-verify-janggi.js checks the rest.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../../tools/lesson-verify-janggi.js').engine(), F = require('./esc_facts.js')(E);
const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom;
const flipFen = f => { const [b, s] = f.split(' '); return b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join('')).join('/') + ' ' + (s === 'b' ? 'w' : 'b'); };
const [ins, outF, msA] = process.argv.slice(2), ms = +(msA || 1500);
const seen = new Set(), cand = [];
for (const f of ins.split(',')) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
  const a = ln.split(' '); if (a[0] !== 'F') continue; let fen = a[2] + ' ' + a[3]; if (a[3] === 'b') fen = flipFen(fen);
  if (seen.has(fen)) continue; seen.add(fen);
  let p; try { p = E.Pos.from(fen); } catch (e) { continue; } if (p.inCheck() || p.status()) continue;
  const D = F.danger(F.flip(p)); if (D.length !== 1 || ![4, 5, 6].includes(D[0].t)) continue;
  const H = D[0].s, hm = p.movesFrom(H); if (hm.length < 4) continue;
  const all = p.moves(); if (all.length < 3) continue;
  const G = all.filter(u => { const q = p.clone().play(u); return !F.danger(q).length && !F.mate1(q); });
  if (G.length !== 1 || mFrom(G[0]) !== H) continue;
  const A = G[0]; if (p.at(mTo(A)) || p.clone().play(A).inCheck()) continue;
  // nothing to win for 楚 elsewhere (the lesson is the escape, not a counter-capture)
  if (F.danger(p).length) continue;
  cand.push({ s: fen, A, H, t: D[0].t, hm: hm.length });
}
console.error('candidates', cand.length);
const out = [];
for (const c of cand) {
  const r = E.analyze(c.s, [], ms), L = r.list.slice().sort((a, b) => b.v - a.v);
  if (L[0].m !== c.A || L.length < 2 || L[0].v - L[1].v < 120 || Math.abs(L[0].v) > E.WINT - 1000) continue;
  out.push({ s: c.s, best: c.A, sc: L.map(e => [e.m, e.v]), t: c.t, hm: c.hm, gap: L[0].v - L[1].v });
  console.error(out.length, E.name(E.Pos.from(c.s), c.A), 'gap', L[0].v - L[1].v);
}
fs.writeFileSync(outF, JSON.stringify(out));
