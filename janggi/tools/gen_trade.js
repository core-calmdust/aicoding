// node janggi/tools/gen_trade.js dump1.txt[,dump2…] out.json [ms]  (2026-11-24 担当D) candidates for the lesson 「得な交換」 (t_capture)
// from self-play positions (`jg dump`, tools/native.c): 楚 to move, not in check, nothing of 楚 in danger, and exactly one legal move
// that wins material (janggi/tools/trade_facts.js: the piece taken minus the opponent's best exchange afterwards > 0, no mate in 1 for
// the opponent): a capture of a guarded 馬・車・包 by a cheaper piece, which the opponent takes back. The engine values every legal move
// (sc, = the 2D problemPoints); the answer must be alone on top, 100 or more ahead. tools/lesson-verify-janggi.js checks the rest.
'use strict';
const fs = require('fs');
const E = require('../../tools/lesson-verify-janggi.js').engine(), F = require('./trade_facts.js')(E);
const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom;
const flipFen = f => { const [b, s] = f.split(' '); return b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join('')).join('/') + ' ' + (s === 'b' ? 'w' : 'b'); };
const [ins, outF, msA, maxA] = process.argv.slice(2), ms = +(msA || 1500), MAX = +(maxA || 1e9);
const seen = new Set(), cand = [];
for (const f of ins.split(',')) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
  const a = ln.split(' '); if (a[0] !== 'F') continue; let fen = a[2] + ' ' + a[3]; if (a[3] === 'b') fen = flipFen(fen);
  if (seen.has(fen)) continue; seen.add(fen);
  let p; try { p = E.Pos.from(fen); } catch (e) { continue; } if (p.inCheck() || p.status()) continue;
  const all = p.moves(); if (all.length < 3) continue;
  // (quick: a capture of a 馬・車・包 by a cheaper piece, taken back)
  if (!F.caps(p).some(m => { const c = T(p.at(mTo(m))), t = T(p.at(mFrom(m))); return F.PTS[c] >= 5 && F.PTS[t] < F.PTS[c] && F.facts(p, m).theme; })) continue;
  if (F.danger(F.flip(p)).length) continue;
  const G = all.filter(u => F.net(p, u) > 0); if (G.length !== 1) continue;
  const A = G[0], f = F.facts(p, A); if (!f.theme) continue;
  const kind = all.filter(m => T(p.at(mFrom(m))) === f.mt).length; if (kind < 4) continue;
  const wc = F.caps(p).filter(m => m !== A), traps = wc.filter(m => F.facts(p, m).back && F.net(p, m) <= 0);
  if (!wc.length) continue;
  cand.push({ s: fen, A, mt: f.mt, ct: f.ct, net: f.net, d: wc.length + traps.length, tr: traps.length });
}
console.error('candidates', cand.length);
cand.sort(() => Math.random() - 0.5);
const out = [];
for (const c of cand.slice(0, MAX)) {
  const r = E.analyze(c.s, [], ms), L = r.list.slice().sort((a, b) => b.v - a.v);
  if (L[0].m !== c.A || L.length < 2 || L[0].v - L[1].v < 120 || Math.abs(L[0].v) > E.WINT - 1000) continue;
  out.push(Object.assign({}, c, { best: c.A, sc: L.map(e => [e.m, e.v]), gap: L[0].v - L[1].v }));
  console.error(out.length, E.name(E.Pos.from(c.s), c.A), 'gap', L[0].v - L[1].v, 'd', c.d);
  fs.writeFileSync(outF, JSON.stringify(out));
}
fs.writeFileSync(outF, JSON.stringify(out));
