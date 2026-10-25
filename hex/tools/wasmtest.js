// quick checks of engine.js + engine.wasm: rules, think, analyze, puzzle values
const { load } = require('./wasm.js');
const E = load();
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
// rules
let p = new E.Pos(5, true);
p.play(2); assert(p.swapOk, 'swap available after the first move');
p.play(E.SWAP); assert(p.at(2) === 0 && p.at(E.mirror(2, 5)) === E.BLUE && p.side === E.RED, 'swap mirrors the stone');
// red column 0 top→bottom on 5×5
p = E.Pos.from({ n: 5, b: 'r....' + 'r....' + 'r....' + 'r....' + '.....', side: 1 });
assert(!p.winner() && p.winCells(1).includes(20), 'red connects with a5');
p.play(20); assert(p.winner() === 1, 'red wins');
// think on an empty 11×11
let t0 = Date.now(), r = E.think({ n: 11, swap: true }, [], 15);
console.log('think lv15', E.nameOf(r.move, 11), r.v, r.po, Date.now() - t0, 'ms');
t0 = Date.now(); r = E.think({ n: 11, swap: true }, [60], 20);
console.log('think lv20 after f6', E.nameOf(r.move, 11), r.v, r.po, Date.now() - t0, 'ms');
t0 = Date.now(); const a = E.analyze({ n: 11, swap: false }, [60], 1000);
console.log('analyze', a.playouts, a.list.slice(0, 5).map(e => E.nameOf(e.m, 11) + ':' + e.v + '/' + e.n).join(' '), Date.now() - t0, 'ms');
// puzzle: red needs a5 (1 move) on 5×5
const spec = { n: 5, b: 'r....' + 'r....' + '.....' + 'r....' + '.....', side: 1 };
const L = E.puzzle(spec, [], 3, false);
console.log('puzzle need', L.filter(e => e.need > 0).map(e => E.nameOf(e.m, 5) + ':' + e.need).join(' '));
const D = E.puzzle({ ...spec, side: 2 }, [], 3, true);
console.log('defend need', D.map(e => E.nameOf(e.m, 5) + ':' + e.need).join(' '));
