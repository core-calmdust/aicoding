// The rules of core.c (WebAssembly) against engine.js (node tools/check_rules.js [games per rule]): on the positions of random
// games (moves picked at random, captures / blocks preferred now and then) and on random boards, for every rule set —
//   the legal moves (the same list in the same order), hasMove, judge (over, winner, why), the evaluation (hand-made),
//   and every move played: board, blocked counters, counters in hand, captures, last moves, plies without a capture, side, hash.
// Then the net: a random small net, its value in JS (netEvalJS) and in core.c, and core.c's accumulators kept move by move
// (play) against a fresh refresh after random games (差分更新の一致). Exit code 1 on any difference.
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (!E.wasm) { console.log('no wasm core'); process.exit(1); }
const C = E.core, X = C.x;
const GAMES = +process.argv[2] || 60;
let seed = 12345; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let bad = 0, checked = { pos: 0, moves: 0, plays: 0, net: 0 };
const fail = (what, info) => { if (bad++ < 12) console.log('DIFF', what, JSON.stringify(info)); };
const WHY = { last: 1, stuck: 2, quiet: 3, tie: 4, tie2: 5 };
function checkPos(pos) {
  checked.pos++;
  const L = pos.moves();
  E.toCore(C, pos);
  const n = X.t_moves(), cm = Array.from(C.aom.subarray(0, n));
  if (n !== L.length || cm.some((m, i) => m !== L[i])) fail('moves', { b: pos.spec(), js: L.slice(0, 20), c: cm.slice(0, 20) });
  checked.moves += L.length;
  E.toCore(C, pos);
  if (!!X.t_hasmove() !== pos.hasMove()) fail('hasMove', pos.spec());
  const j = E.judge(pos); E.toCore(C, pos); const cj = X.t_judge(-1);
  const jj = j.over ? WHY[j.why] * 4 + (j.winner || 0) : 0;
  if (jj !== cj) fail('judge', { b: pos.spec(), js: j, c: cj });
  E.toCore(C, pos);
  const ev = E.evalCore(pos, null), cev = X.evaluate();
  if (ev !== cev) fail('evaluate', { b: pos.spec(), js: ev, c: cev });
  const sample = L.length <= 12 ? L : Array.from({ length: 12 }, () => L[Math.floor(rnd() * L.length)]);
  for (const m of sample) {
    const q = pos.clone().play(m);
    E.toCore(C, pos); X.t_play(m);
    const io = C.io, same = q.sq.every((x, i) => x === C.sq[i]) && q.inc.every((x, i) => x === C.inc[i]) && q.side === io[8] && q.ply === io[9] &&
      q.h1 === (io[10] >>> 0) && q.h2 === (io[11] >>> 0) && q.hand[0] === io[12] && q.hand[1] === io[13] && q.cap[0] === io[14] && q.cap[1] === io[15] &&
      q.last[0] === io[16] && q.last[1] === io[17] && q.quiet === io[18] && q.n[0] === io[19] && q.n[1] === io[20];
    if (!same) fail('play', { b: pos.spec(), m, js: q.spec(), c: { side: io[8], cap: [io[14], io[15]], q: io[18] } });
    checked.plays++;
  }
}
function randomGame(rule) {
  E.setRule(rule);
  const pos = E.Pos.from(null);
  for (let ply = 0; ply < 400; ply++) {
    checkPos(pos);
    if (E.judge(pos).over) break;
    const L = pos.moves(); if (!L.length) break;
    let m = L[Math.floor(rnd() * L.length)];
    if (rnd() < 0.5) { const hot = L.filter(x => { const e = E.effect(pos, x); return e.takes.length || e.blocks.length || e.rm >= 0; }); if (hot.length) m = hot[Math.floor(rnd() * hot.length)]; }
    pos.play(m);
  }
}
// random boards: counters anywhere, blocked where the two enclosing enemies stand (as the rules leave them), random side / last
function randomBoard(rule) {
  E.setRule(rule);
  const b = new Array(64).fill('.'), k = 8 + Math.floor(rnd() * 40);
  for (let i = 0; i < k; i++) b[Math.floor(rnd() * 64)] = rnd() < 0.5 ? 'b' : 'w';
  if (E.R.delay) for (let i = 0; i < 64; i++) {
    if (b[i] === '.' || rnd() < 0.6) continue;
    const r = i >> 3, c = i & 7, me = b[i], op = me === 'b' ? 'w' : 'b';
    if (c > 0 && c < 7 && b[i - 1] === op && b[i + 1] === op) b[i] = me === 'b' ? 'h' : 'H';
    else if (r > 0 && r < 7 && b[i - 8] === op && b[i + 8] === op) b[i] = me === 'b' ? 'v' : 'V';
  }
  const last = [0, 1].map(() => rnd() < 0.5 ? -1 : Math.floor(rnd() * 64) + 64 * Math.floor(rnd() * 64));
  const pos = E.Pos.from({ b: b.join(''), side: rnd() < 0.5 ? 1 : 2, hand: [0, 0], cap: [Math.floor(rnd() * 6), Math.floor(rnd() * 6)], last, n: 50, q: Math.floor(rnd() * 61) });
  checkPos(pos);
  // and a few plies on from there
  for (let i = 0; i < 6 && !E.judge(pos).over; i++) { const L = pos.moves(); if (!L.length) break; pos.play(L[Math.floor(rnd() * L.length)]); checkPos(pos); }
}
for (const rule of E.RULE_ORDER) {
  for (let g = 0; g < GAMES; g++) randomGame(rule);
  for (let g = 0; g < GAMES * 3; g++) randomBoard(rule);
  console.log(rule, 'ok so far:', JSON.stringify(checked), 'differences', bad);
}
// ---- the net: a random net (H 32), JS against core.c, and the accumulators kept move by move against a refresh
function randomNet(H, K, fl) {
  const IN = 366, n = 20 + 2 * (IN * H + 3 * H) + 4, b = new Uint8Array(n), dv = new DataView(b.buffer);
  b.set([76, 84, 78, 49]); dv.setInt32(4, H, true); dv.setInt32(8, IN, true); dv.setInt32(12, K, true); dv.setInt32(16, fl, true);
  let o = 20; const w = (lim) => { dv.setInt16(o, Math.round((rnd() * 2 - 1) * lim), true); o += 2; };
  for (let i = 0; i < IN * H; i++) w(40); for (let i = 0; i < H; i++) w(60); for (let i = 0; i < 2 * H; i++) w(3000);
  dv.setInt32(o, Math.round((rnd() * 2 - 1) * 1e6), true);
  return b;
}
for (const rule of E.RULE_ORDER) {
  const nb = randomNet(32, 180, rule === 'piso' ? 0 : 1), N = E.netParse(nb);
  E.setRule(rule); E.setNet(rule, nb);
  for (let g = 0; g < Math.max(4, GAMES / 4); g++) {
    const pos = E.Pos.from(null), line = [];
    for (let ply = 0; ply < 300; ply++) {
      if (E.judge(pos).over) break;
      const L = pos.moves(); if (!L.length) break;
      const m = L[Math.floor(rnd() * L.length)]; line.push(m); pos.play(m);
      if (ply % 7 === 0) {   // JS value against the core's (both from a fresh accumulator)
        E.toCore(C, pos); const cv = X.evaluate(), jv = (N.FL & 1 ? E.evalCore(pos, null) : 0) + E.netEvalJS(pos, N), ev = E.evaluate(pos);
        if (ev !== jv) fail('net value (evaluate)', { rule, ply, js: jv, ev });
        if (cv !== jv) fail('net value', { rule, ply, js: jv, c: cv });
        checked.net++;
      }
    }
    // the core plays the whole line keeping its accumulators, then compares them with a refresh
    const start = E.Pos.from(null); E.toCore(C, start); C.aom.set(line); const ok = X.t_netcheck(line.length);
    if (!ok) fail('net accumulators', { rule, plies: line.length });
    const jv = (N.FL & 1 ? E.evalCore(pos, null) : 0) + E.netEvalJS(pos, N); if (C.io[0] !== jv) fail('net value at the end', { rule, js: jv, c: C.io[0] });
    checked.net++;
  }
  E.setNet(rule, null);
}
console.log('net:', checked.net, 'checks', '| differences', bad);
console.log(bad ? 'FAILED' : 'all the same');
process.exit(bad ? 1 : 0);
