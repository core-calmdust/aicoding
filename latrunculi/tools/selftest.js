// node tools/selftest.js — rule checks and random / AI games for every rule set
const E = require('../engine.js');
let seed = 12345; const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
function assert(c, msg) { if (!c) { console.error('FAIL', msg); process.exitCode = 1; } }
const B = rows => rows.join('');
// --- seneca: enclose → blocked → removed next turn; rescue by blocking a holder
E.setRule('seneca');
let p = E.Pos.from({ b: B(['........', '........', '..b.....', '...w....', '....b...', '........', '........', '........']), side: 1 });
let m = p.moves().find(x => E.name(p, x) === 'c6-c5!d5'); assert(!m, 'c6-c5 does not enclose d5 (b on e4, not e5)');
p = E.Pos.from({ b: B(['........', '........', '..b.....', '...w....', '....b...', '........', '........', '........']), side: 1 });
m = E.parse(p, 'e4-e5!d5'); assert(m < 0, 'needs c5');
p = E.Pos.from({ b: B(['........', '........', '..b.....', '...wb...', '........', '........', '........', '........']), side: 1 });
m = E.parse(p, 'c6-c5!d5'); assert(m >= 0, 'c6-c5 blocks d5'); p.play(m);
assert(p.inc[27] === 1, 'd5 blocked horizontally'); assert(!p.moves().some(x => E.mFrom(x) === 27), 'blocked counter cannot move');
p.side = 0; const rmv = p.moves(); assert(rmv.every(x => E.mRm(x) === 27), 'must remove d5 first');
// rescue
p = E.Pos.from({ b: B(['........', '........', '.w......', '..bHb...', '........', '.w......', '........', '........']), side: 2 });
m = E.parse(p, 'b3-b4'); // no
m = p.moves().find(x => E.name(p, x).startsWith('b6-b5')); assert(m !== undefined, 'b6-b5 exists');
// holder c5 is enclosed by b5 + d5? d5 is blocked (cannot help) → no rescue this way
p.play(m); assert(p.inc[27] === 1 && !p.inc[26], 'blocked counter does not help enclose');
p = E.Pos.from({ b: B(['........', '..w.....', '........', '..bHb...', '........', '..w.....', '........', '........']), side: 2 });
m = E.parse(p, 'c7-c6!c5'); assert(m < 0, 'c3 is two away');
p = E.Pos.from({ b: B(['........', '..w.....', '........', '..bHb...', '..w.....', '........', '........', '........']), side: 2 });
m = p.moves().find(x => E.name(p, x) === 'c7-c6!c5'); assert(m >= 0, 'c7-c6 blocks holder c5'); p.play(m);
assert(p.inc[26] === 2 && p.inc[27] === 0, 'holder blocked → d5 freed');
// corner
p = E.Pos.from({ b: B(['wb......', '........', 'b.......', '........', '........', '........', '........', '........']), side: 1 });
m = E.parse(p, 'a6-a7!a8'); assert(m >= 0, 'corner enclosure'); 
// leap
p = E.Pos.from({ b: B(['........', '........', '........', '........', '........', '........', 'b.b.....', 'bb......']), side: 1 });
assert(p.moves().some(x => E.name(p, x) === 'a1^c1'), 'leap over own counter'); assert(p.moves().some(x => E.name(p, x) === 'a1^c3'), 'two leaps with a turn');
// back and forth
p = E.Pos.from({ b: B(['........', '........', '........', '........', '...w....', '........', '........', 'b......w']), side: 1 });
p.play(E.parse(p, 'a1-a2')); p.play(E.parse(p, 'h1-h2')); assert(E.parse(p, 'a2-a1') < 0, 'no back and forth');
// --- piso: immediate capture, two at once
E.setRule('piso');
p = E.Pos.from({ b: B(['........', '........', '...b....', '...w....', '.bw.....', '........', '........', '........']), side: 1 });
p.sq[36] = 1; p.rehash();   // e4? (r4 c4)
m = p.moves().find(x => E.name(p, x).startsWith('e4-d4')); 
// --- quintana
E.setRule('quintana'); p = new E.Pos(); assert(p.moves().length === 8 * 4, 'quintana start moves ' + p.moves().length);
// --- random games
for (const rule of E.RULE_ORDER) {
  E.setRule(rule); let plies = 0, res = { 1: 0, 2: 0, d: 0 }, why = {};
  for (let g = 0; g < 200; g++) {
    const pos = new E.Pos(); let j;
    while (!(j = E.judge(pos)).over) { const L = pos.moves(); assert(L.length, 'moves'); const s0 = pos.spec(); const mm = L[Math.floor(rand() * L.length)]; E.name(pos, mm); pos.play(mm); plies++;
      const h1 = pos.h1, h2 = pos.h2; pos.rehash(); assert(h1 === pos.h1 && h2 === pos.h2, 'hash ' + rule); const q = E.Pos.from(pos.spec()); assert(q.h1 === pos.h1, 'spec roundtrip');
      assert(pos.count(1) + pos.count(2) + pos.cap[0] + pos.cap[1] + pos.hand[0] + pos.hand[1] === (E.R.place ? 2 * E.count : 32), 'material'); }
    res[j.draw ? 'd' : j.winner]++; why[j.why] = (why[j.why] || 0) + 1;
  }
  console.log(rule, 'random 200 games: avg plies', (plies / 200).toFixed(0), res, why);
}
// --- AI games
function game(rule, la, lb, max) {
  E.setRule(rule); const moves = []; const pos = new E.Pos(); let j;
  while (!(j = E.judge(pos)).over && moves.length < (max || 600)) { const r = E.think(null, moves, pos.side ? lb : la, rand); moves.push(r.move); pos.play(r.move); }
  return { j, n: moves.length, cap: pos.cap };
}
for (const rule of E.RULE_ORDER) for (const [a, b] of [[3, 3], [8, 3], [3, 8], [12, 8], [8, 12]]) { const t = Date.now(), g = game(rule, a, b); console.log(rule, 'Lv' + a, 'vs', 'Lv' + b, JSON.stringify(g.j), 'plies', g.n, 'cap', g.cap, (Date.now() - t) + 'ms'); }
