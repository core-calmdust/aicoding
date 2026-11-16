// node tools/selftest.js — rule checks, random games and AI games for the four rule sets
const E = require('../engine.js');
let seed = 4321; const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
function assert(c, msg) { if (!c) { console.error('FAIL', msg); process.exitCode = 1; } }
assert(E.POINTS.length === 33, '33 points');
assert(E.NBR[24].length === 8 && E.NBR[23].length === 4, 'centre 8 lines, d-file neighbour 4');
E.setRule('g13'); let p = new E.Pos(); assert(p.geese === 13 && p.fox === 24, 'g13 start'); assert(p.moves().length === 5, 'fox 5 steps at the start (3 lines blocked by geese): ' + p.moves().length);
E.setRule('g17'); p = new E.Pos(); assert(p.geese === 17, 'g17 start'); p.side = 1; assert(p.moves().every(m => E.RC[E.mTo(m)][0] <= E.RC[E.mFrom(m)][0]), 'g17 geese never move back');
// the four rule sets: start counts, order, and no goose ever steps back (straight or diagonally) where the rule forbids it
assert(E.RULE_ORDER.join() === 'g15,g17,g13,g13n' && E.DEFAULT_RULE === 'g15', 'rule order / default');
const nm2 = i => E.sqName(i), noBack = pos => pos.gooseMoves([]).every(m => E.RC[E.mTo(m)][0] <= E.RC[E.mFrom(m)][0]);
E.setRule('g15'); p = new E.Pos(); assert(p.geese === 15 && p.fox === 24, 'g15 start 15');
assert(E.START.g15.map(nm2).sort().join() === E.START.g13.concat([21, 27]).map(nm2).sort().join() && E.START.g15.includes(21) && E.START.g15.includes(27) && !E.START.g15.includes(22), 'g15 start = 13 + a4 g4');
p.side = 1; { const L = p.moves().map(m => E.name(p, m)); assert(noBack(p) && L.includes('a3-b4') && L.includes('a4-a5') && L.includes('a4-b4'), 'g15 geese: forward, sideways, diagonally forward: ' + L.join(' ')); }
E.setRule('g13n'); p = new E.Pos(); assert(p.geese === 13 && E.START.g13n.join() === E.START.g13.join(), 'g13n start = g13');
// a goose in the open centre: g13 has all 8 lines, g15 / g13n only the 5 forward / sideways ones, g17 the 3 orthogonal ones
{ const B2 = Array(49).fill('.'); B2[24] = 'g'; B2[3] = 'f'; for (const [r, n] of [['g13', 8], ['g15', 5], ['g13n', 5], ['g17', 3]]) { E.setRule(r); const q2 = E.Pos.from({ b: B2.join(''), side: 2, cap: 0 }); assert(q2.moves().length === n && (r === 'g13' || noBack(q2)), r + ' goose on d4: ' + q2.moves().length + ' moves'); } }
E.setRule('g13');
// a double jump: fox d4, geese d5 and c6?  d4 x d6 needs d5 goose, d6 empty; then d6 x b6 over c6
const B = Array(49).fill('.'); const S = (nm, ch) => { B[(7 - +nm[1]) * 7 + 'abcdefg'.indexOf(nm[0])] = ch; };
S('d4', 'f'); S('d3', 'g'); S('c2', 'g'); ['a3', 'b3', 'c3', 'e3', 'f3', 'g3', 'a4', 'g4'].forEach(x => S(x, 'g'));
p = E.Pos.from({ b: B.join(''), side: 1 }); p.sq[21] = 0; p.sq[22] = 0; p.rehash();
const nm = p.moves().map(m => E.name(p, m)); assert(nm.includes('d4xd2') && nm.includes('d4xd2xb4'), 'jump and double jump: ' + nm.join(' '));
const q = p.clone().play(E.parse(p, 'd4xd2xb4')); assert(q.cap === 2 && q.fox === 22, 'double jump takes two, fox on b4: ' + q.fox);
for (const rule of E.RULE_ORDER) {
  E.setRule(rule); let plies = 0; const res = { 1: 0, 2: 0, d: 0 }, why = {};
  for (let g = 0; g < 300; g++) { const pos = new E.Pos(); let j; while (!(j = E.judge(pos)).over) { const L = pos.moves(); if (pos.side && !E.R.back) assert(noBack(pos), rule + ': a goose move backwards'); const m = L[Math.floor(rand() * L.length)]; E.name(pos, m); pos.play(m); plies++; const h = pos.h1; pos.rehash(); assert(h === pos.h1, 'hash'); assert(E.Pos.from(pos.spec()).h1 === pos.h1, 'spec'); } res[j.draw ? 'd' : j.winner]++; why[j.why] = (why[j.why] || 0) + 1; }
  console.log(rule, 'random 300: avg plies', (plies / 300).toFixed(0), res, why);
}
function game(rule, la, lb) { E.setRule(rule); E.ttClear(); const moves = [], pos = new E.Pos(); let j; const hs = [pos.h1]; while (!(j = E.judge(pos, hs)).over && moves.length < 600) { const r = E.think(null, moves, pos.side ? lb : la, rand); moves.push(r.move); pos.play(r.move); hs.push(pos.h1); } if (!j.over || j.draw) throw new Error("the game must end with a winner"); return { w: j.draw ? 'draw' : j.winner === 1 ? 'fox' : 'geese', why: j.why, n: moves.length, geese: pos.geese }; }
for (const rule of E.RULE_ORDER) for (const [a, b] of [[6, 6], [9, 9], [13, 13], [16, 16], [16, 9], [9, 16]]) { const t = Date.now(), g = game(rule, a, b); console.log(rule, 'fox Lv' + a, 'geese Lv' + b, JSON.stringify(g), (Date.now() - t) + 'ms'); }
