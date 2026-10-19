// Mine 詰め連珠 candidates from self-play games (renju rules).
// node tools/mine-puzzles.js <games.jsonl> <out.jsonl> [part] [parts]
// For every position near the end of a game (side to move = attacker): the shortest forced win counted the traditional
// way (both sides' moves up to the settling move), with fours only (VCF) and with threes allowed (VCT); whether the win
// depends on black's forbidden moves; uniqueness of the first move; and a principal variation for "show answer".
'use strict';
const E = require('../engine.js');
const fs = require('fs');
const [IN, OUT] = [process.argv[2], process.argv[3]];
const PART = +process.argv[4] || 0, PARTS = +process.argv[5] || 1;
const games = fs.readFileSync(IN, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const I2M = E.I2M, M2I = E.M2I;
function solver(fo, limit) { const S = new E.Solver(); S.foursOnly = !!fo; S.limit = limit; return S; }
function freshSolve(pos, maxT, fo, limit) { const S = solver(fo, limit); const t = S.winIn(pos, maxT); return { t, over: S.nodes > S.limit }; }
// position without black's forbidden moves (black still needs exactly five, white five or more)
function cloneNoForbid(pos) {
  const p = new E.Pos('renju'); p.renju = false; p.fresh = false;
  // rebuild with the normal combination table for black (no forbidden flags)
  const q = new E.Pos('free'); // only to borrow COMB_N through a fresh position of another rule
  p.CB = q.CB;
  const mv = pos.moves();
  for (let k = 0; k < mv.length; k++) { const c = pos.at(mv[k]); if (p.side !== c) p.pass(); p.make(mv[k]); }
  if (p.side !== pos.side) p.pass();
  return p;
}
function setupFromGame(moves, k) {
  const pos = new E.Pos('renju');
  for (let i = 0; i < k; i++) pos.make(moves[i]);
  return pos;
}
function stones(pos) { const b = [], w = []; for (let m = 0; m < 225; m++) { const c = pos.at(m); if (c === 1) b.push(E.sqName(m)); else if (c === 2) w.push(E.sqName(m)); } return { b, w }; }
// principal variation: attacker takes the quickest win, defender the longest defence, until the settling move
function pv(pos, T, fo) {
  const line = []; let left = T;
  const S = solver(fo, 4e6);
  for (let guard = 0; guard < 40 && left >= 1; guard++) {
    const al = S.attackList(pos, left).filter(e => e.need > 0).sort((a, b) => a.need - b.need);
    if (!al.length) return null;
    const a = al[0]; pos.make(I2M[a.i]); line.push(I2M[a.i]);
    if (a.need === 1) break;
    left -= 2;
    const dl = S.defendList(pos, left);
    if (!dl.length) break;
    let best = null; for (const e of dl) { const v = e.need === 0 ? 999 : e.need; if (!best || v > best.v) best = { i: e.i, v }; }
    if (best.v === 999) return null;
    pos.make(I2M[best.i]); line.push(I2M[best.i]);
  }
  for (let k = 0; k < line.length; k++) pos.unmake();
  return line;
}
const out = fs.openSync(OUT, 'a');
let found = 0, seen = 0;
for (let gi = PART; gi < games.length; gi += PARTS) {
  const g = games[gi], moves = g.moves.split(' ').map(E.sqOf);
  const from = Math.max(7, moves.length - 26);
  for (let k = from; k < moves.length; k++) {
    const pos = setupFromGame(moves, k);
    if (pos.status().over) break;
    const me = pos.side, op = 3 - me;
    if (pos.cnt[me][E.C.FIVE] || pos.cnt[op][E.C.FIVE]) continue;
    seen++;
    // quick screen: any forced win at all?
    const S0 = solver(false, 120000);
    let tAll = 0;
    for (let t = 1; t <= 9; t += 2) { if (S0.attack(pos, t) >= 0) { tAll = t; break; } if (S0.nodes > S0.limit) break; }
    const vq = solver(true, 200000); const vcfOk = vq.vcf(pos, 30, null) >= 0;
    let tVcf = 0;
    if (vcfOk) { const r = freshSolve(pos, 17, true, 1500000); tVcf = r.t; }
    let T = 0, cat = '';
    if (tVcf && (!tAll || tVcf <= tAll)) { T = tVcf; cat = tVcf === 1 ? 'intro' : 'vcf'; }
    else if (tAll) { T = tAll; cat = tAll === 1 ? 'intro' : 'vct'; }
    if (!T) continue;
    // depends on black's forbidden moves? (white attacker only)
    if (me === 2) { const pn = cloneNoForbid(pos); const r = freshSolve(pn, T, false, 400000); if (!r.over && (r.t === 0 || r.t > T)) cat = 'forbid'; }
    // uniqueness of the first move among all winning moves within T
    const SU = solver(false, 3000000), al = SU.attackList(pos, T);
    if (SU.nodes > SU.limit) continue;
    const wins = al.filter(e => e.need > 0 && e.need <= T);
    if (wins.length !== 1) continue;
    if (wins[0].need !== T) continue;
    const ans = I2M[wins[0].i];
    if (cat === 'vcf') { const SV = solver(true, 1500000); const l = SV.attackList(pos, T).filter(e => e.need > 0 && e.need <= T); if (l.length !== 1 || l[0].i !== wins[0].i) cat = 'vct'; }
    const line = pv(pos, T, cat === 'vcf');
    if (!line || line[0] !== ans) continue;
    const st = stones(pos);
    const rec = { g: gi, k, side: me, cat, T, a: E.sqName(ans), pv: line.map(E.sqName).join(' '), b: st.b.join(' '), w: st.w.join(' '), last: E.sqName(moves[k - 1]), n: st.b.length + st.w.length };
    fs.writeSync(out, JSON.stringify(rec) + '\n'); found++;
  }
  if ((gi - PART) / PARTS % 20 === 0) console.log('game', gi, 'positions', seen, 'puzzles', found);
}
console.log('done', seen, found);
