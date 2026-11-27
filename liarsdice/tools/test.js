// rules tests: node liarsdice/tools/test.js
'use strict';
const path = require('path'); require(path.join(__dirname, '..', 'engine.js')); require(path.join(__dirname, '..', 'ai.js'));
const LD = globalThis.LD, AI = globalThis.LDAI;
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const C = (o) => Object.assign({ wild: true, raise: 'std', pal: false, lockFace: 0, total: 20, opening: false }, o);
// opening: no aces while wild
ok(LD.minQ(C({ prev: null, opening: true }), 1) === Infinity, 'no opening on aces');
ok(LD.minQ(C({ prev: null, opening: true, wild: false }), 1) === 1, 'aces open when not wild');
// raises (Perudo)
const p53 = { q: 5, f: 3 };
ok(LD.minQ(C({ prev: p53 }), 3) === 6, 'same face +1');
ok(LD.minQ(C({ prev: p53 }), 4) === 5, 'higher face same qty');
ok(LD.minQ(C({ prev: p53 }), 2) === 6, 'lower face +1 (std)');
ok(LD.minQ(C({ prev: p53 }), 1) === 3, 'five threes -> three aces (half, rounded up)');
ok(LD.minQ(C({ prev: { q: 3, f: 1 } }), 4) === 7, 'three aces -> seven fours (double+1)');
ok(LD.minQ(C({ prev: { q: 3, f: 1 } }), 1) === 4, 'aces -> aces +1');
ok(LD.minQ(C({ prev: { q: 6, f: 5 } }), 1) === 3, 'six fives -> three aces');
// strict
ok(LD.minQ(C({ prev: p53, raise: 'strict' }), 2) === Infinity, 'strict: no lower face');
ok(LD.legalBid(C({ prev: p53, raise: 'strict' }), 6, 4) === false, 'strict: higher face only same qty');
ok(LD.legalBid(C({ prev: p53, raise: 'strict' }), 5, 4) === true, 'strict: same qty higher face');
ok(LD.legalBid(C({ prev: p53, raise: 'strict' }), 7, 3) === true, 'strict: same face more');
// palifico lock
ok(LD.minQ(C({ prev: { q: 2, f: 4 }, wild: false, pal: true, lockFace: 4 }), 5) === Infinity, 'palifico: face locked');
ok(LD.minQ(C({ prev: { q: 2, f: 4 }, wild: false, pal: true, lockFace: 4 }), 4) === 3, 'palifico: more of the same face');
// a game: dudo / calza / palifico / elimination
{
  const G = LD.newGame({ players: 3, rules: LD.PRESETS.perudo });
  LD.startRound(G, null, [[1, 2, 3, 3, 6], [3, 4, 5, 5, 6], [1, 1, 2, 2, 2]]);
  ok(LD.countFace(G.hands, 3, true) === 6, 'count threes with aces');
  LD.act(G, 0, { t: 'bid', q: 5, f: 3 });
  const r = LD.act(G, 1, { t: 'dudo' });
  ok(r.ok === true && r.loser === 1 && G.dice[1] === 4, 'dudo wrong: caller loses');
  ok(G.starter === 1, 'loser starts');
  LD.startRound(G, null, [[1, 2, 3, 3, 6], [3, 4, 5, 5], [1, 1, 2, 2, 2]]);
  LD.act(G, 1, { t: 'bid', q: 7, f: 2 });
  const r2 = LD.act(G, 2, { t: 'calza' });
  ok(r2.ok === true && G.dice[2] === 5 && r2.gainer === -1, 'calza right at 5 dice: no gain beyond 5');
  ok(G.starter === 2, 'calza caller starts');
  LD.startRound(G, null, [[1, 2, 3, 3, 6], [3, 4, 5, 5], [1, 1, 2, 2, 2]]);
  LD.act(G, 2, { t: 'bid', q: 8, f: 2 });
  const r3 = LD.act(G, 0, { t: 'calza' });
  ok(r3.ok === false && G.dice[0] === 4, 'calza wrong loses a die');
}
{ // palifico after dropping to one die, once
  const G = LD.newGame({ players: 3, rules: LD.PRESETS.perudo });
  G.dice = [2, 5, 5];
  LD.startRound(G, null, [[6, 6], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]]);
  G.round.turn = 1; G.round.start = 1;
  LD.act(G, 1, { t: 'bid', q: 4, f: 6 }); LD.act(G, 2, { t: 'bid', q: 5, f: 6 });
  const r = LD.act(G, 0, { t: 'dudo' });
  ok(r.ok === false && r.loser === 2, 'dudo right: bidder loses (5 sixes? only 2 + no wild)');
  G.dice = [2, 5, 5]; G.starter = 1;
  LD.startRound(G, null, [[6, 6], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]]);
  LD.act(G, 1, { t: 'bid', q: 1, f: 6 }); LD.act(G, 2, { t: 'bid', q: 2, f: 6 });
  LD.act(G, 0, { t: 'dudo' });
  ok(G.dice[0] === 1 && G.palNext === 0, 'palifico armed');
  const R = LD.startRound(G);
  ok(R.pal === 0 && !LD.wildOn(G), 'palifico round: aces not wild');
  ok(G.round.turn === 0, 'palifico player starts');
  ok(LD.minQ(LD.bidCtx(G, 0), 1) === 1, 'palifico: may open on ones');
  LD.act(G, 0, { t: 'bid', q: 1, f: 5 });
  ok(LD.minQ(LD.bidCtx(G, 1), 6) === Infinity && LD.minQ(LD.bidCtx(G, 1), 5) === 2, 'palifico: others keep the face');
  ok(!LD.canCalza(G, 1), 'no calza in palifico');
}
// probability
ok(Math.abs(LD.pAtLeast(1, 0, 1, 3, false) - 1 / 6) < 1e-12, 'p one die');
ok(Math.abs(LD.pAtLeast(1, 0, 1, 3, true) - 1 / 3) < 1e-12, 'p one die wild');
{ let s = 0; for (const h of LD.HANDS[5]) s += h.p; ok(LD.HANDS[5].length === 252 && Math.abs(s - 1) < 1e-9, '252 hands, sum 1'); }
// posterior with gamma 0 equals binomial
{
  const G = LD.newGame({ players: 4 }); LD.startRound(G, () => .3);
  const V = AI.view(G, 0, 0);
  const mine = LD.supportOf(G.hands[0], 4, true);
  ok(Math.abs(AI.pTrue(V, 6, 4) - LD.pAtLeast(6, mine, 15, 4, true)) < 1e-9, 'gamma 0 = binomial');
}
// random games: no illegal moves, dice only go down by one per round, game ends
{
  let rounds = 0; const rng = (() => { let s = 7; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })();
  for (let g = 0; g < 250; g++) {
    const R = [LD.PRESETS.perudo, LD.PRESETS.dudo, LD.PRESETS.classic, Object.assign({}, LD.PRESETS.perudo, { raise: 'strict' })][g % 4];
    const G = LD.newGame({ players: 2 + g % 5, rules: R });
    let guard = 0;
    while (!G.over && guard++ < 500) {
      LD.startRound(G, rng); const before = LD.total(G);
      let res = null, n = 0;
      while (!res && n++ < 200) { const p = G.round.turn; res = LD.act(G, p, AI.decide(G, p, 1 + ((g + n) % 13), rng)); }
      ok(!!res, 'round ended'); rounds++;
      ok(Math.abs(LD.total(G) - before) === 1 || (res.t === 'calza' && res.ok && res.gainer < 0 && LD.total(G) === before), 'one die changes per round');
    }
    ok(G.over && G.winner >= 0, 'game over');
  }
  console.log('random rounds', rounds);
}
console.log(bad ? bad + ' failure(s)' : 'all ok'); process.exit(bad ? 1 : 0);
