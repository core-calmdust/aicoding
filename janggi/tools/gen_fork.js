// node janggi/tools/gen_fork.js dump1.txt[,dump2…] out.json [ms] [max]  (2026-11-24 担当D) candidates for the lesson 「両取り」 (t_fork)
// from self-play positions (`jg dump`, tools/native.c): 楚 to move, not in check, nothing of 楚 in danger, nothing of 漢 free to take now,
// no capture that wins material, and exactly one legal move that wins something for sure three plies deep (janggi/tools/fork_facts.js
// fork > 0): a quiet move, not a check, after which the moved piece attacks two pieces of 漢 (3 points or more, each won if left) and
// nothing of 楚 is in danger. The engine values every legal move (sc, = the 2D problemPoints); the answer must be alone on top, 120 or
// more ahead. tools/lesson-verify-janggi.js checks the rest.
'use strict';
const fs = require('fs');
const E = require('../../tools/lesson-verify-janggi.js').engine(), F = require('./fork_facts.js')(E);
const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, PTS = F.PTS;
const flipFen = f => { const [b, s] = f.split(' '); return b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join('')).join('/') + ' ' + (s === 'b' ? 'w' : 'b'); };
const [ins, outF, msA, maxA] = process.argv.slice(2), ms = +(msA || 1500), MAX = +(maxA || 1e9);
// the pieces of 漢 (3 points or more) the piece on s attacks with a winning exchange, 楚 to move in r
const hits = (q, s) => { const r = F.flip(q); return r.movesFrom(s).filter(m => !E.isPass(m) && r.at(mTo(m)) && T(r.at(mTo(m))) !== E.KING && PTS[T(r.at(mTo(m)))] >= 3 && F.see(r, mTo(m)) > 0).map(m => mTo(m)); };
const seen = new Set(), cand = []; let n = 0;
for (const f of ins.split(',')) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
  const a = ln.split(' '); if (a[0] !== 'F') continue; let fen = a[2] + ' ' + a[3]; if (a[3] === 'b') fen = flipFen(fen);
  if (seen.has(fen)) continue; seen.add(fen); if (++n % 2000 === 0) console.error('read', n, 'cand', cand.length);
  let p; try { p = E.Pos.from(fen); } catch (e) { continue; } if (p.inCheck() || p.status()) continue;
  const all = p.moves(); if (all.length < 3) continue;
  if (F.threats(p, p.side).length || F.danger(F.flip(p)).length) continue;
  const quiet = all.filter(u => !E.isPass(u) && !p.at(mTo(u)));
  const A0 = quiet.filter(u => { const q = p.clone().play(u); if (q.inCheck()) return false; return hits(q, mTo(u)).length >= 2 && !F.danger(q).length; });
  if (!A0.length) continue;
  if (all.some(u => F.capOf(p, u) && F.net(p, u) > 0)) continue;
  const G = all.filter(u => F.fork(p, u, 0).v > 0); if (G.length !== 1 || !A0.includes(G[0])) continue;
  const A = G[0], mt = T(p.at(mFrom(A))), fx = F.fork(p, A);
  if (all.filter(m => T(p.at(mFrom(m))) === mt).length < 4) continue;
  const wc = all.filter(m => m !== A && F.capOf(p, m) && T(p.at(mTo(m))) !== E.KING);
  const fake = all.filter(u => u !== A && !F.capOf(p, u) && F.threats(p.clone().play(u), p.side).length >= 2);
  const traps = wc.filter(m => F.facts(p, m).back).length + fake.length;
  cand.push({ s: fen, A, mt, tg: hits(p.clone().play(A), mTo(A)).map(s => T(p.at(s))), g: fx.v, d: wc.length + traps, tr: traps });
}
console.error('candidates', cand.length);
cand.sort(() => Math.random() - 0.5);
const out = [];
for (const c of cand.slice(0, MAX)) {
  const r = E.analyze(c.s, [], ms), L = r.list.slice().sort((a, b) => b.v - a.v);
  if (L[0].m !== c.A || L.length < 2 || L[0].v - L[1].v < 120 || Math.abs(L[0].v) > E.WINT - 1000) continue;
  out.push(Object.assign({}, c, { best: c.A, sc: L.map(e => [e.m, e.v]), gap: L[0].v - L[1].v }));
  console.error(out.length, E.name(E.Pos.from(c.s), c.A), 'gap', L[0].v - L[1].v, 'd', c.d, 'g', c.g);
  fs.writeFileSync(outF, JSON.stringify(out));
}
fs.writeFileSync(outF, JSON.stringify(out));
