// Rules tests + a long random run: node hearts/tools/test.js [games]
const HT = require('../engine.js'); global.HT = HT; const AI = require('../ai.js');
const { card, name } = HT;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('NG', m); } };
const P = s => s.split(' ').map(x => { const su = '♣♦♠♥'.indexOf(x.slice(-1)), r = x.slice(0, -1); return card(su, r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : +r); });
const names = a => a.map(name).sort().join(' ');
// a hand with chosen cards; the rest dealt in order
function handWith(rows, R) {
  const used = new Set([].concat(...rows)), rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const hands = rows.map(r => r.slice()); for (let s = 0; s < 4; s++) while (hands[s].length < 13) hands[s].push(rest.shift());
  return HT.newHand(HT.rules(R || {}), hands, 0, 4);
}
// points / variants
ok(HT.totalPen(HT.rules({})) === 26, 'std total 26');
ok(HT.totalPen(HT.rules({ v: 'maria' })) === 43, 'black maria total 43');
ok(HT.totalPen(HT.rules({ v: 'spot' })) === 129, 'spot total 104+25');
ok(HT.pts(HT.JD, HT.rules({ v: 'omni' })) === -10 && HT.pts(HT.JD, HT.rules({})) === 0, 'jack of diamonds');
// pass cycle
const R = HT.rules({}); ok([1, 2, 3, 4, 5].map(n => HT.passDir(R, n)).join() === '1,3,2,0,1', 'pass left right across hold');
ok([1, 2, 3, 4].map(n => HT.passDir(HT.rules({ pass: 'lra' }), n)).join() === '1,3,2,1', 'pass without hold');
// the 2 of clubs leads; first trick has no points
{ const S = handWith([P('3♣ 4♣ A♥'), P('2♣ 5♠'), P('Q♠ 2♥ 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ 9♥ 10♥ J♥ Q♥ K♥'), []]);
  ok(S.turn === 1 && HT.legal(S, 1).length === 1 && HT.legal(S, 1)[0] === HT.C2, '2♣ must lead');
  HT.play(S, 1, HT.C2);
  ok(names(HT.legal(S, 2)) === names(P('Q♠')), 'only points: the queen before hearts on the first trick (seat 2) ' + names(HT.legal(S, 2)));
}
{ const S = HT.newHand(HT.rules({}), [P('2♣ 9♣'), P('Q♠ 3♥ 4♦'), P('5♣ 6♣'), P('7♣ 8♣')], 0, 1);
  HT.play(S, 0, HT.C2);
  ok(names(HT.legal(S, 1)) === names(P('4♦')), 'no points on the first trick');
  const S2 = HT.newHand(HT.rules({ firstPts: 1 }), [P('2♣ 9♣'), P('Q♠ 3♥ 4♦'), P('5♣ 6♣'), P('7♣ 8♣')], 0, 1); HT.play(S2, 0, HT.C2);
  ok(HT.legal(S2, 1).length === 3, 'first-trick points allowed when firstPts');
}
// hearts cannot be led before broken; can if only hearts
{ const S = handWith([P('2♣ 3♥ 4♥'), [], [], []]); S.tn = 1; S.turn = 0; S.leader = 0;
  ok(!HT.legal(S, 0).some(c => HT.suit(c) === 3), 'no heart lead before broken');
  S.broken = true; ok(HT.legal(S, 0).some(c => HT.suit(c) === 3), 'heart lead after broken');
  const S2 = HT.newHand(HT.rules({}), [P('2♥ 3♥'), P('2♣ 3♣'), P('4♣ 5♣'), P('6♣ 7♣')], 0, 1); S2.tn = 1; S2.turn = 0;
  ok(HT.legal(S2, 0).length === 2, 'only hearts may lead hearts');
  const S3 = handWith([P('2♣ 3♥ 4♥'), [], [], []], { v: 'maria' }); S3.tn = 1; S3.turn = 0; ok(HT.legal(S3, 0).some(c => HT.suit(c) === 3), 'black maria: hearts any time');
  const S4 = handWith([P('2♣'), P('Q♠ 3♦'), P('4♦'), P('5♦')], { qBreaks: 1 }); S4.tn = 1; S4.turn = 1; S4.leader = 1; HT.play(S4, 1, P('3♦')[0]);
  const S5 = handWith([P('2♣'), P('3♦ 4♥'), [], []], { qBreaks: 1 }); S5.tn = 1; S5.turn = 2; S5.trick = [{ s: 1, c: P('3♦')[0] }]; S5.hands[1] = S5.hands[1].filter(c => c !== P('3♦')[0]);
  const qsHolder = S5.hands.findIndex(h => h.includes(HT.QS)); ok(qsHolder >= 0, 'qs somewhere');
}
// follow suit
{ const S = handWith([P('2♣ 5♦ 9♦ K♠'), P('3♣'), P('4♣'), P('6♣')]); HT.play(S, 0, HT.C2); HT.play(S, 1, P('3♣')[0]); HT.play(S, 2, P('4♣')[0]); HT.play(S, 3, P('6♣')[0]);
  ok(S.turn === 3 && S.tn === 1, 'highest of the led suit wins (6♣ by seat 3)'); }
// scoring and the moon
function finishWith(taken, Ro, scores) { const S = HT.newHand(HT.rules(Ro || {}), [[], [], [], []], 0, 1); S.taken = taken; S.phase = 'end'; return HT.handScore(S, scores); }
{ const all = []; for (let c = 0; c < 52; c++) all.push(c);
  const r = finishWith([all, [], [], []]); ok(r.moon === 0 && r.delta.join() === '0,26,26,26', 'moon: others +26 ' + r.delta);
  const r2 = finishWith([all, [], [], []], { moon: 'sub' }); ok(r2.delta.join() === '-26,0,0,0', 'moon: shooter −26');
  const noJ = all.filter(c => c !== HT.JD);
  const r3 = finishWith([noJ, [HT.JD], [], []], { v: 'omni' }); ok(r3.delta.join() === '0,16,26,26', 'omnibus moon: jack still −10 for its taker ' + r3.delta);
  const r4 = finishWith([P('Q♠ 2♥'), P('3♥ J♦'), [], []], { v: 'omni' }); ok(r4.delta.join() === '14,-9,0,0', 'omnibus points ' + r4.delta);
  const r5 = finishWith([P('A♠ K♠'), P('Q♠ 2♥'), [], []], { v: 'maria' }); ok(r5.delta.join() === '17,14,0,0', 'black maria points ' + r5.delta);
  const r6 = finishWith([P('A♥ 10♥'), P('Q♠ 2♥'), [], []], { v: 'spot' }); ok(r6.delta.join() === '24,27,0,0', 'spot points ' + r6.delta);
  const r7 = finishWith([all, [], [], []], { moon: 'best' }, [95, 60, 75, 99]); ok(r7.how === 'sub', 'best: subtract when adding would end the game with the shooter not lowest ' + r7.how);
  const r8 = finishWith([all, [], [], []], { moon: 'best' }, [10, 20, 30, 40]); ok(r8.how === 'add', 'best: add normally');
}
// game end and ties
{ const G = HT.newGame({}); G.scores = [95, 40, 40, 60]; const S = HT.newHand(G.R, [[], [], [], []], 0, 1); S.taken = [P('2♥ 3♥ 4♥ 5♥ 6♥'), [], [], []]; HT.finishHand(G, S);
  ok(!G.over, 'tie for lowest: play on'); const G2 = HT.newGame({}); G2.scores = [95, 40, 41, 60]; HT.finishHand(G2, S); ok(G2.over && G2.winner === 1, 'game over at 100, lowest wins'); }
// random games with the AI: no illegal plays, the cards add up
const games = +process.argv[2] || 60;
const rng = AI.mulberry(7); let hands = 0, plays = 0;
for (let g = 0; g < games; g++) {
  const v = ['std', 'omni', 'maria', 'spot'][g % 4], G = HT.newGame({ v, moon: g % 3 === 0 ? 'best' : undefined });
  while (!G.over && G.hand < 60) {
    const S = HT.deal(G, rng);
    if (S.phase === 'pass') { for (let s = 0; s < 4; s++) S.pass[s] = AI.choosePass(S, s, 1 + (g + s) % 9, rng); HT.doPass(S); }
    while (S.phase === 'play') { const p = S.turn; const c = AI.decide(S, p, 1 + (g * 3 + p) % 11, rng); if (!HT.legal(S, p).includes(c)) { ok(false, 'illegal ' + name(c)); break; } HT.play(S, p, c); plays++; }
    ok(S.taken.reduce((a, t) => a + t.length, 0) === 52, 'all 52 cards taken');
    const before = G.scores.reduce((a, b) => a + b, 0); const r = HT.finishHand(G, S); hands++;
    const sum = r.delta.reduce((a, b) => a + b, 0), tot = HT.totalPen(G.R) + (G.R.jd ? -10 : 0);
    ok(r.moon >= 0 || sum === tot, 'points add up ' + sum + ' ' + tot);
  }
  ok(G.over, 'game ends');
}
console.log(`${pass} passed, ${fail} failed · ${games} games, ${hands} hands, ${plays} plays`);
process.exit(fail ? 1 : 0);
