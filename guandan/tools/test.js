// 掼蛋 rule tests: node guandan/tools/test.js   (claude/guandan-quality.md A1–A11, B1)
'use strict';
const GD = require('../engine.js');
global.GD = GD;
const AI = require('../ai.js');
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
// card notation: "AS" "10H" "2D" "KC", "SJ" small joker, "BJ" big joker; a second copy: suffix "'" ("AS'")
const SU = { S: 0, H: 1, D: 2, C: 3 };
function C(s) {
  const two = s.endsWith("'"); if (two) s = s.slice(0, -1);
  let b;
  if (s === 'SJ') b = 52; else if (s === 'BJ') b = 53;
  else { const su = SU[s.slice(-1)], r = s.slice(0, -1), rk = r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : +r; b = su * 13 + rk - 1; }
  return b + (two ? 54 : 0);
}
const H = str => str.trim().split(/\s+/).map(C);
const id1 = (str, L) => GD.identify(H(str), L).map(c => c.t + ':' + c.k).sort().join(' ');
const best = (str, L) => GD.identify(H(str), L);
const cmb = (str, L, t) => best(str, L).find(c => !t || c.t === t);

// A1 combinations
ok(id1('5S', 2) === 'single:5', 'single');
ok(id1('5S 5D', 2) === 'pair:5', 'pair');
ok(id1('5S 5D 5C', 2) === 'triple:5', 'triple');
ok(id1('5S 5D 5C 9H 9S', 2) === 'full:5', 'full ' + id1('5S 5D 5C 9H 9S', 2));
ok(id1('3S 4D 5C 6H 7S', 2) === 'straight:7', 'straight');
ok(id1('AS 2D 3C 4H 5S', 9) === 'straight:5', 'A low straight');
ok(id1('10S JD QC KH AS', 2) === 'straight:14', '10-A straight');
ok(id1('JS QD KC AH 2S', 3) === '', 'no wrap J-Q-K-A-2');
ok(id1('3S 3D 4C 4H 5S 5D', 2) === 'tube:5', 'tube');
ok(id1('AS AD 2C 2H 3S 3D', 9) === 'tube:3', 'A low tube');
ok(id1('QS QD KC KH AS AD', 2) === 'tube:14', 'QKA tube');
ok(id1('3S 3D 3C 4H 4S 4D', 2) === 'plate:4', 'plate');
ok(id1('AS AD AC 2H 2S 2D', 9) === 'plate:2', 'A low plate');
ok(id1('7S 7D 7C 7H', 2) === 'bomb:7', 'bomb4');
ok(id1("7S 7D 7C 7H 7S' 7D' 7C' 7H'", 2) === 'bomb:7', 'bomb8');
ok(best("7S 7D 7C 7H 7S' 7D' 7C' 7H'", 2)[0].n === 8, 'bomb8 size');
ok(id1('3H 4H 5H 6H 7H', 2) === 'sflush:7 straight:7', 'sflush ' + id1('3H 4H 5H 6H 7H', 2));
ok(id1("SJ SJ' BJ BJ'", 2) === 'kings:0', 'kings');
ok(id1('SJ BJ', 2) === '', 'SJ+BJ is no pair');
ok(id1("BJ BJ'", 2) === 'pair:17', 'BJ pair');
ok(id1("3S 3D 3C BJ BJ'", 2) === 'full:3', 'full with joker pair');
ok(id1('3S 4D 5C 6H 7S 8D', 2) === '', 'six-card straight is not a play');
ok(id1('3S 3D 4C 4H', 2) === '', 'two pairs is not a play');
// A2 / A4 comparisons and level cards
const L7 = 7;
ok(GD.beats(cmb('7S', L7), cmb('AS', L7)), 'level card beats A as a single');
ok(GD.beats(cmb('SJ', L7), cmb('7S', L7)), 'small joker beats the level card');
ok(GD.beats(cmb('BJ', L7), cmb('SJ', L7)), 'big joker beats small joker');
ok(!GD.beats(cmb('AS AD', L7), cmb('7S 7D', L7)), 'pair of A < pair of level');
ok(GD.beats(cmb('4S 5D 6C 7H 8S', L7), cmb('3S 4D 5C 6H 7S', L7)), 'straights: in natural order (the level card keeps its place)');
ok(!GD.beats(cmb('AS 2D 3C 4H 5S', 9), cmb('2S 3D 4C 5H 6S', 9)), 'A2345 is the lowest straight');
ok(GD.beats(cmb('9S 9D 9C 2H 2S', 2), cmb('8S 8D 8C AH AS', 2)), 'full: only the triple counts');
ok(GD.beats(cmb('2S 2D 2C 3H 3S', 2), cmb('AS AD AC KH KS', 2)), 'full of level cards beats full of A');
ok(!GD.beats(cmb('9S 9D', 2), cmb('8S 8D 8C', 2)), 'different type does not beat');
ok(!GD.beats(cmb('4S 5D 6C 7H 8S', 2), cmb('3S 3D 4C 4H 5S 5D', 2)), 'straight vs tube');
// A3 bomb order
const b4 = cmb('9S 9D 9C 9H', 2), b4h = cmb('KS KD KC KH', 2), b5 = cmb('3S 3D 3C 3H 3S\'', 2), sf = cmb('3H 4H 5H 6H 7H', 2, 'sflush'), sf2 = cmb('4S 5S 6S 7S 8S', 2, 'sflush'), b6 = cmb("3S 3D 3C 3H 3S' 3D'", 2), b6h = cmb("4S 4D 4C 4H 4S' 4D'", 2), b7 = cmb("3S 3D 3C 3H 3S' 3D' 3C'", 2), kings = cmb("SJ SJ' BJ BJ'", 2);
ok(GD.beats(b4, cmb('AS AD AC KH KS', 2)) && GD.beats(b4, cmb('10S JD QC KH AS', 2)), 'bomb beats normal plays');
ok(GD.beats(b4h, b4), 'bomb4 by rank');
ok(GD.beats(b5, b4h), '5 bomb > 4 bomb');
ok(GD.beats(sf, b5), 'straight flush > 5 bomb');
ok(GD.beats(sf2, sf), 'straight flush by top');
ok(GD.beats(b6, sf2) && !GD.beats(sf2, b6), '6 bomb > straight flush');
ok(GD.beats(b6h, b6), '6 bomb by rank');
ok(GD.beats(b7, b6h), '7 bomb > 6 bomb');
ok(GD.beats(kings, b7) && !GD.beats(b7, kings), 'four kings on top');
ok(GD.beats(cmb('2S 2D 2C 2H', 2), cmb('AS AD AC AH', 2)), 'bomb of level cards beats bomb of A (same size)');
// A5 wilds: the hearts level card (2H when L = 2)
ok(id1('2H 5S 5D', 2) === 'triple:5', 'wild makes a triple');
ok(id1('2H 3S 4D 6C 7H', 2) === 'straight:7', 'wild fills a straight ' + id1('2H 3S 4D 6C 7H', 2));
ok(id1('2H 3S 4S 6S 7S', 2) === 'sflush:7 straight:7', 'wild fills a straight flush');
ok(id1("2H 2H' 9S 9D 9C 9H 9S' 9D' 9C' 9H'", 2) === 'bomb:9', '10-card bomb with two wilds');
ok(id1('2H SJ', 2) === '', 'a wild cannot be a joker');
ok(id1("2H 2H'", 2) === 'pair:15', 'two wilds = pair of level cards');
ok(id1('2H 5S 5D 5C 9S', 2).includes('full:5'), 'wild in a full house');
ok(id1('2H', 2) === 'single:15', 'a lone wild is the level card');
ok(GD.isWild(C('7H'), 7) && !GD.isWild(C('7S'), 7) && GD.isWild(C("7H'"), 7), 'wild = hearts of the level');
// A6–A7 turn order, 接风, end of hand
{
  const S = { L: 2, lt: -1, hands: [H('3S 4S'), H('5D 9D'), H('6C'), H('7H 8H')], out: [], turn: 0, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play' };
  GD.act(S, 0, cmb('3S', 2)); ok(S.turn === 1, 'next is seat 1');
  GD.act(S, 1, cmb('5D', 2)); GD.act(S, 2, cmb('6C', 2)); ok(S.out[0] === 2, 'seat 2 out first');
  ok(S.turn === 3, 'turn skips to 3');
  GD.act(S, 3, null); GD.act(S, 0, null); GD.act(S, 1, null);
  ok(S.turn === 0 && S.last === null, '接风: partner of the player who went out leads (' + S.turn + ')');
}
{
  const S = { L: 2, lt: -1, hands: [H('3S'), H('5D 9D'), H('6C'), H('7H 8H')], out: [], turn: 0, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play' };
  GD.act(S, 0, cmb('3S', 2)); GD.act(S, 1, null); GD.act(S, 2, cmb('6C', 2));
  ok(S.phase === 'end' && S.order[0] === 0 && S.order[1] === 2, 'both of a team out ends the hand');
  ok(S.order.length === 4, 'order of 4');
}
{
  let threw = false; const S = { L: 2, lt: -1, hands: [H('3S 4S'), H('5D'), H('6C'), H('7H')], out: [], turn: 0, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play' };
  try { GD.act(S, 0, null); } catch (e) { threw = true; } ok(threw, 'the leader cannot pass');
  threw = false; GD.act(S, 0, cmb('4S', 2)); try { GD.act(S, 1, cmb('5D', 2) && { t: 'single', n: 1, k: 3, ids: [C('5D')] }); } catch (e) { threw = true; } ok(threw, 'a fake key is refused');
}
// A8 level up
{
  const M = GD.newMatch();
  const S = { L: 2, lt: -1, order: [0, 2, 1, 3] }; let R = GD.handResult(M, S); ok(R.up === 3, '1st+2nd → +3'); GD.applyResult(M, R); ok(M.lv[0] === 5 && M.lt === 0, 'level 5');
  R = GD.handResult(M, { L: 5, lt: 0, order: [1, 0, 3, 2] }); ok(R.up === 2 && R.win === 1, '1st+3rd → +2'); GD.applyResult(M, R); ok(M.lv[1] === 4, 'team 1 level 4');
  R = GD.handResult(M, { L: 4, lt: 1, order: [0, 1, 3, 2] }); ok(R.up === 1, '1st+4th → +1'); GD.applyResult(M, R); ok(M.lv[0] === 6, 'team 0 level 6');
  M.lv[0] = 13; R = GD.handResult(M, { L: 13, lt: 0, order: [0, 2, 1, 3] }); GD.applyResult(M, R); ok(M.lv[0] === 14, 'cap at A');
}
// A10 打A
{
  const M = GD.newMatch(); M.lv = [14, 5]; M.lt = 0;
  let R = GD.handResult(M, { L: 14, lt: 0, order: [0, 1, 3, 2] }); ok(!R.passA && R.failA === 0, 'A: 1st + partner last = not passed'); GD.applyResult(M, R); ok(M.af[0] === 1 && M.lv[0] === 14, 'one failure');
  R = GD.handResult(M, { L: 14, lt: 0, order: [1, 3, 0, 2] }); ok(R.failA === 0, 'A: losing = failure'); GD.applyResult(M, R); ok(M.af[0] === 2 && M.lv[1] === 8, 'two failures, opponents +3');
  R = GD.handResult(M, { L: 8, lt: 1, order: [0, 1, 3, 2] }); GD.applyResult(M, R); ok(M.af[0] === 2 && M.lv[0] === 14, 'winning at the other level: still A, no failure');
  R = GD.handResult(M, { L: 14, lt: 0, order: [1, 0, 3, 2] }); GD.applyResult(M, R); ok(M.lv[0] === 2 && M.af[0] === 0, 'three failures → back to 2');
  M.lv = [14, 3]; M.lt = 0; M.af = [0, 0];
  R = GD.handResult(M, { L: 14, lt: 0, order: [0, 3, 2, 1] }); ok(R.passA, '1st + 3rd at A wins'); GD.applyResult(M, R); ok(M.over && M.winner === 0, 'match over');
}
// A9 tribute
{
  const M = GD.newMatch(); M.prev = [0, 1, 3, 2]; M.lv = [3, 2]; M.lt = 0;   // single tribute: seat 2 (last) → seat 0
  const rng = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  let S = GD.dealHand(M, rng);
  // make sure the giver has no two big jokers
  S.hands = [H('3S 4S 5S'), H('6S 7S'), H('KD 3D 3H BJ'), H('8S')]; S.L = 3; GD.setupTribute(S, M.prev);
  ok(S.phase === 'trib' && S.trib.give.length === 1 && S.trib.give[0].from === 2 && S.trib.give[0].to === 0, 'single tribute 2 → 0');
  ok(GD.tributeChoices(S.hands[2], 3).length === 1 && GD.tributeChoices(S.hands[2], 3)[0] === C('BJ'), 'tribute = the big joker');
  S.hands[2] = H('KD 3D 3H AS'); ok(GD.tributeChoices(S.hands[2], 3)[0] === C('3D'), 'tribute: level card beats A, but not the hearts level (wild)');
  S.trib.give[0].id = C('3D'); GD.doTribute(S); ok(S.hands[0].includes(C('3D')) && S.phase === 'ret' && S.trib.ret[0].from === 0 && S.trib.ret[0].to === 2, 'tribute moved');
  ok(GD.returnChoices(H('JS QS 10D'), 3).length === 1, 'return ≤ 10');
  ok(GD.returnChoices(H('JS QS KD'), 3)[0] === C('JS'), 'no card ≤ 10 → the smallest');
  S.trib.ret[0].id = C('3S'); GD.doReturn(S); ok(S.hands[2].includes(C('3S')) && S.turn === 2, 'giver leads after a single tribute');
  // anti-tribute: the last player holds both big jokers
  S = GD.dealHand(M, rng); S.hands = [H('3S'), H('6S'), H("BJ BJ' 4D"), H('8S')]; GD.setupTribute(S, M.prev);
  ok(S.trib.mode === 'anti' && S.phase === 'play' && S.turn === 0, 'anti tribute, 1st leads');
  // double tribute
  const f = [1, 3, 0, 2];
  S = GD.dealHand(M, rng); S.L = 2; S.hands = [H('AS 3S'), H('4S'), H('KS 5S'), H('6S')]; GD.setupTribute(S, f);
  ok(S.trib.mode === 'double' && S.trib.give.length === 2, 'double tribute');
  S.trib.give[0].id = C('AS'); S.trib.give[1].id = C('KS'); GD.doTribute(S);
  ok(S.hands[1].includes(C('AS')) && S.hands[3].includes(C('KS')) && S.trib.lead === 0, 'bigger → 1st, smaller → 2nd, bigger giver leads');
  S = GD.dealHand(M, rng); S.L = 2; S.hands = [H('AS 3S'), H('4S'), H("AS' 5S"), H('6S')]; GD.setupTribute(S, f);
  S.trib.give[0].id = C('AS'); S.trib.give[1].id = C("AS'"); GD.doTribute(S);
  ok(S.hands[3].includes(C('AS')) && S.hands[1].includes(C("AS'")) && S.trib.lead === 2, 'equal: each to the player before them; 1st\'s next leads (' + S.trib.lead + ')');
  S = GD.dealHand(M, rng); S.L = 2; S.hands = [H('BJ 3S'), H('4S'), H("BJ' 5S"), H('6S')]; GD.setupTribute(S, f);
  ok(S.trib.mode === 'anti' && S.turn === 1, 'double anti tribute (one big joker each)');
}
// gen and identify agree; every generated play is legal
{
  const rng = (() => { let x = 11; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  let bad = 0;
  for (let t = 0; t < 300; t++) {
    const d = GD.shuffled(rng), h = d.slice(0, 27), L = 2 + Math.floor(rng() * 13);
    for (const c of GD.gen(h, L)) if (!GD.identify(c.ids, L).some(x => x.t === c.t && x.k === c.k && x.n === c.n)) { bad++; if (bad < 4) console.log('gen/identify mismatch', c, L); }
    const P = AI.plan(h, L), R = AI.realize(h, L, P), used = [].concat(...R.map(g => g.ids));
    if (used.length !== 27 || new Set(used).size !== 27) { bad++; if (bad < 4) console.log('plan does not cover the hand', used.length); }
    for (const g of R) if (!GD.identify(g.ids, L).some(x => x.t === g.t && x.k === g.k)) { bad++; if (bad < 6) console.log('plan group not a play', g, L); }
  }
  ok(bad === 0, 'gen/identify/plan agree (' + bad + ')');
}
// B3 / B4: partner play and stopping an opponent (strong and expert)
for (const lvl of [3, 4]) {
  const st = (hands, last, turn) => ({ L: 2, lt: -1, hands: hands.map(H), out: [], turn, last, passN: 0, trick: 0, log: [], played: [], phase: 'play' });
  // partner (seat 2) led a king; seat 0 has an ace single but plenty of cards → let it go
  let S = st(['AS 3D 4D 6C 8S 9S JD QC 5H 7S', '3S 4S 5S 6S 7D 8D 9D 10D JS QS', 'KD 3C', '5C 6D 7C 8C 9C 10C JC 4C QD 2C'], { s: 2, c: cmb('KD', 2) }, 0);
  S.passN = 1;
  ok(AI.decide(S, 0, lvl, Math.random) === null, `Lv${lvl}: does not beat the partner's king`);
  // partner has one card left, seat 0 leads, opponents have many → lead the lowest single
  S = st(['3D 9S 9D JD JC QS QH KD', '4S 5S 6S 7D 8D 9C 10D JS QD', '5D', '5C 6D 7C 8C 9H 10C 4C QC 2C'], null, 0);
  let c = AI.decide(S, 0, lvl, Math.random); if (lvl === 3) ok(c && c.t === 'single' && c.k === 3, `Lv${lvl}: feeds the partner with the 3 (${c && c.t + c.k})`);
  // an opponent (seat 1) with two cards plays a pair of queens; seat 0 has no higher pair but a bomb → bomb
  S = st(['6S 6D 6C 6H 3D 4C 8S 10D', 'KS KD', '3S 4S 5S 7S 8D 9D', '5C 7C 8C 9C 10C JC 2C'], { s: 3, c: cmb('QS QD', 2) }, 0);
  S.hands[1] = H('KS KD'); S.last = { s: 1, c: cmb('QS QD', 2) }; S.turn = 2; S.hands[2] = H('3S 4S 5S 7S 8D 9D'); S.passN = 0;
  // make seat 2 (partner of 0) the one to answer: give the bomb to seat 2
  S.hands[2] = H('6S 6D 6C 6H 3D 4C 8S 10D'); S.hands[0] = H('3S 4S 5S 7S 8D 9D');
  c = AI.decide(S, 2, lvl, Math.random); ok(c && c.t === 'bomb', `Lv${lvl}: bombs to stop the opponent with 2 cards (${c && c.t})`);
}
// A11 + B1: random full matches with all levels; cards conserved, only legal plays, never stuck
{
  const rng = (() => { let x = 12345; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  const N = +(process.argv[2] || 300);
  let bad = 0, hands = 0, matches = 0; const t0 = Date.now();
  for (let m = 0; m < N; m++) {
    const lvls = [1 + (m % 3), 1 + ((m + 1) % 3), 1 + (m % 3), 1 + ((m + 1) % 3)];
    const M = GD.newMatch({ start: m % 2 ? 10 : 2 });
    let guardH = 200;
    while (!M.over && guardH-- > 0) {
      const S = GD.dealHand(M, rng);
      if (S.phase === 'trib') { for (const g of S.trib.give) g.id = AI.chooseTribute(S.hands[g.from], S.L, lvls[g.from]); GD.doTribute(S); }
      if (S.phase === 'ret') { for (const r of S.trib.ret) r.id = AI.chooseReturn(S.hands[r.from], S.L, lvls[r.from]); GD.doReturn(S); }
      let guard = 600;
      while (S.phase === 'play' && guard-- > 0) {
        const s = S.turn, c = AI.decide(S, s, lvls[s], rng);
        try { GD.act(S, s, c); } catch (e) { bad++; if (bad < 5) console.log('illegal', e.message, c, S.last); GD.act(S, s, S.last ? null : GD.gen(S.hands[s], S.L)[0]); }
      }
      if (S.phase !== 'end') { bad++; console.log('stuck hand'); break; }
      const all = S.hands.reduce((a, h) => a + h.length, 0) + S.played.length; if (all !== 108) { bad++; console.log('cards', all); }
      GD.applyResult(M, GD.handResult(M, S)); hands++;
    }
    if (!M.over) { bad++; console.log('match did not end', M.lv, M.af); } else matches++;
  }
  ok(bad === 0, 'random matches clean (' + bad + ')');
  console.log(`  ${matches} matches, ${hands} hands, ${((Date.now() - t0) / hands).toFixed(1)} ms/hand`);
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
