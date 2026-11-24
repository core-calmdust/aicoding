// node janggi/tools/gen_defend.js dump1.txt[,dump2…] out.json [ms] [max]  (2026-11-24 担当D) candidates for the lesson 「守る」
// (t_defend) from self-play positions (`jg dump`, tools/native.c): 楚 to move, not in check, exactly one piece of 楚 in danger (the
// opponent wins something on it: esc_facts.js SEE) — a 車, 包 or 馬 — nothing of 漢 free to take, no capture that wins, and exactly one
// legal move after which nothing of 楚 is in danger and the opponent has no mate in 1: a quiet move (no capture, no check) of ANOTHER
// piece — the piece in danger has 3 moves or more and every one of them fails (no escape: the lesson is to defend, not to run).
// The kind of the answer: 'guard' = the attacker still reaches the piece, but now the moved piece takes back (the exchange no longer
// wins); 'block' = no piece of 漢 reaches the piece any more (the moved piece stands in the line / takes away a screen or a leg).
// The engine values every legal move (sc, = the 2D problemPoints); the answer must be alone on top, 120 or more ahead.
// tools/lesson-verify-janggi.js (defendStep) checks the rest.
'use strict';
const fs = require('fs');
const E = require('../../tools/lesson-verify-janggi.js').engine(), F = require('./esc_facts.js')(E);
const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, PTS = F.VAL;
const flipFen = f => { const [b, s] = f.split(' '); return b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join('')).join('/') + ' ' + (s === 'b' ? 'w' : 'b'); };
const [ins, outF, msA, maxA] = process.argv.slice(2), ms = +(msA || 1500), MAX = +(maxA || 1e9);
const capOf = (p, m) => !E.isPass(m) && p.at(mTo(m)) ? T(p.at(mTo(m))) : 0;
const safe = q => !F.danger(q).length && !F.mate1(q);
// does a piece of 漢 (to move in q) reach s?
const reach = (q, s) => q.moves().some(x => !E.isPass(x) && mTo(x) === s);
function kind(p, A, H) {
  const q = p.clone().play(A); if (!reach(q, H)) return 'block';
  // the attacker takes; the moved piece can take back
  const ok = q.moves().filter(x => !E.isPass(x) && mTo(x) === H).every(x => { const r = q.clone().play(x); return r.moves().some(y => !E.isPass(y) && mFrom(y) === mTo(A) && mTo(y) === H); });
  return ok ? 'guard' : null;
}
const seen = new Set(), cand = []; let n = 0;
for (const f of ins.split(',')) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
  const a = ln.split(' '); if (a[0] !== 'F') continue; let fen = a[2] + ' ' + a[3]; if (a[3] === 'b') fen = flipFen(fen);
  if (seen.has(fen)) continue; seen.add(fen); if (++n % 5000 === 0) console.error('read', n, 'cand', cand.length);
  let p; try { p = E.Pos.from(fen); } catch (e) { continue; } if (p.inCheck() || p.status()) continue;
  const D = F.danger(F.flip(p)); if (D.length !== 1 || ![4, 5, 6].includes(D[0].t)) continue;
  const H = D[0].s, hm = p.movesFrom(H); if (hm.length < 3) continue;
  if (F.danger(p).length) continue;                                          // nothing of 漢 free to take
  const all = p.moves(); if (all.length < 3) continue;
  if (all.some(u => capOf(p, u) && safe(p.clone().play(u)))) continue;       // (a capture that saves everything: no capture answers)
  const G = all.filter(u => safe(p.clone().play(u)));
  if (G.length !== 1) continue;
  const A = G[0]; if (mFrom(A) === H || capOf(p, A) || p.clone().play(A).inCheck()) continue;
  const k = kind(p, A, H); if (!k) continue;
  const mt = T(p.at(mFrom(A)));
  // traps: the escapes of the piece in danger (all fail) + other moves that also reach the point (a guard that does not hold)
  const tries = all.filter(u => u !== A && mFrom(u) !== H && !capOf(p, u) && p.clone().play(u).moves().length >= 0 && (() => { const r = F.flip(p.clone().play(u)); return r.moves().some(y => !E.isPass(y) && mFrom(y) === mTo(u) && mTo(y) === H); })());
  cand.push({ s: fen, A, H, t: D[0].t, by: D[0].by, mt, kind: k, hm: hm.length, tries: tries.length });
  if (cand.length >= MAX) break;
}
console.error('candidates', cand.length);
const out = [];
for (const c of cand) {
  const r = E.analyze(c.s, [], ms), L = r.list.slice().sort((a, b) => b.v - a.v);
  if (L[0].m !== c.A || L.length < 2 || L[0].v - L[1].v < 120 || Math.abs(L[0].v) > E.WINT - 1000) continue;
  out.push(Object.assign({}, c, { best: c.A, sc: L.map(e => [e.m, e.v]), gap: L[0].v - L[1].v }));
  console.error(out.length, E.name(E.Pos.from(c.s), c.A), c.kind, 'gap', L[0].v - L[1].v);
}
fs.writeFileSync(outF, JSON.stringify(out));
