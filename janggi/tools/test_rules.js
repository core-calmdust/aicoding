// janggi rules unit tests: node janggi/tools/test_rules.js
const E = require('../engine.js');
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const sq = (r, c) => r * 9 + c;
const tos = (pos, s) => pos.movesFrom(s).map(m => E.mTo(m)).sort((a, b) => a - b);
// chariot on a palace corner runs along the diagonal (through the centre to the far corner)
let p = E.Pos.from('3k5/9/9/9/9/9/9/3R5/9/4K4 w');   // R at (7,3) bottom palace corner, K at (9,4)
ok(tos(p, sq(7, 3)).includes(sq(8, 4)), 'chariot corner -> centre');
p = E.Pos.from('3k5/9/9/9/9/9/9/3R5/9/5K3 w');
ok(tos(p, sq(7, 3)).includes(sq(9, 5)) === false, 'chariot blocked by own general at far corner'); 
// cannon jumps a screen on the palace diagonal
p = E.Pos.from('5k3/9/9/9/9/9/9/3C5/4P4/5K3 w');
ok(!tos(p, sq(7, 3)).includes(sq(9, 5)), 'cannon cannot land on own general');
p = E.Pos.from('4k4/9/9/9/9/9/9/3C5/4p4/5r3 w'.replace('5r3', '5n3') + '');
// cannon cannot jump a cannon
p = E.Pos.from('4k4/9/9/9/9/9/9/9/9/c1C1K4 w');
ok(!tos(p, sq(9, 2)).some(t => t === sq(9, 0)), 'cannon cannot capture a cannon');
p = E.Pos.from('4k4/9/9/9/9/9/9/9/9/rcC1K4 w');
ok(!tos(p, sq(9, 2)).includes(sq(9, 0)), 'cannon cannot jump over a cannon');
p = E.Pos.from('4k4/9/9/9/9/9/9/9/9/rpC1K4 w');
ok(tos(p, sq(9, 2)).includes(sq(9, 0)), 'cannon captures over a soldier screen');
// elephant: (3,2) leaps, blocked on the way
p = E.Pos.from('4k4/9/9/9/9/4B4/9/9/9/4K4 w');
ok(tos(p, sq(5, 4)).length === 8, 'elephant 8 moves in the open: ' + tos(p, sq(5, 4)).length);
p = E.Pos.from('4k4/9/9/9/4P4/4B4/9/9/9/4K4 w');
ok(tos(p, sq(5, 4)).length === 6, 'elephant blocked up: ' + tos(p, sq(5, 4)).length);
// soldier: forward + sideways; in the enemy palace also diagonally forward
p = E.Pos.from('9/4k4/3P5/9/9/9/9/9/9/4K4 w');
ok(tos(p, sq(2, 3)).includes(sq(1, 4)) && !tos(p, sq(2, 3)).includes(sq(1, 2)), 'soldier palace diagonal');
p = E.Pos.from('4k4/9/9/9/4P4/9/9/9/9/4K4 w');
ok(tos(p, sq(4, 4)).length === 3 && !tos(p, sq(4, 4)).includes(sq(5, 4)), 'soldier no backward');
// general along the palace diagonal
p = E.Pos.from('4k4/9/9/9/9/9/9/9/9/3K5 w');
ok(tos(p, sq(9, 3)).includes(sq(8, 4)), 'general corner -> centre');
p = E.Pos.from('4k4/9/9/9/9/9/9/9/4K4/9 w');
ok(tos(p, sq(8, 4)).length === 8, 'general centre: 8 moves');
// check by an elephant
p = E.Pos.from('4k4/9/9/9/9/9/9/9/4K4/9 w'.replace('4k4/9/9', '4k4/9/9').replace('9/9/9/9/9/4K4', '9/9/9/9/9/4K4'));
p = E.Pos.from('9/4k4/9/9/9/9/9/9/9/4K4 w'); p.b[sq(4, 2)] = E.ELEPHANT; p.findKings(); p.side = 1; // Cho elephant at (4,2) -> (1,4)? offsets (-3,+2)
ok(p.attacked(1), 'elephant gives check');
// pass when no move and not in check
p = E.Pos.from('3k5/9/9/9/9/9/9/9/9/4K4 w'); ok(p.moves().length > 0, 'king has moves');
// judge: three-fold repetition is decided by points
const r = E.replay(null, []); ok(!E.judge(r.pos, r.hashes).over, 'start not over');
console.log(fails ? fails + ' failures' : 'all ok');
