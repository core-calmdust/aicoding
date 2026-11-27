// finds the positions of the rules tutorial (printed as move lines; app.js TOUR_POS)
const E = require('../engine.js'); E.setRule('std');
let s = 7; const rnd = n => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n; };
const nm = m => E.sqName(m);
function play(n, ok, tries = 200000) {
  for (let t = 0; t < tries; t++) {
    const p = E.Pos.from(null), line = [];
    for (let k = 0; k < n && p.res < 0; k++) { const ms = p.moves(); const m = ms[rnd(ms.length)]; p.play(m); line.push(m); }
    if (p.res < 0 && ok(p, line)) return line.map(nm);
  }
  return null;
}
const winCells = (p, b, who) => { const out = []; for (let c = 0; c < 9; c++) { const m = b * 9 + c; if (p.c[m]) continue; const q = p.clone(); q.c[m] = who; let mk = 0; for (let i = 0; i < 9; i++) if (q.c[b * 9 + i] === who) mk |= 1 << i; if (E.W3[mk]) out.push(m); } return out; };
const out = {};
out.pick = play(4, p => p.turn === 1 && p.forced >= 0 && !p.c[p.forced * 9 + 2] && p.forced !== 2 && winCells(p, p.forced, 1).length === 0);
out.small = play(14, p => p.turn === 1 && p.forced >= 0 && !p.own.some(x => x) && winCells(p, p.forced, 1).length === 1 && p.moves().length >= 5);
out.free = play(20, p => p.turn === 1 && p.forced < 0 && p.own.filter(x => x).length === 1);
out.big = play(40, p => { if (p.turn !== 1 || p.forced < 0) return false; const mm = p.macMask(1); if (p.count(1) !== 2 || p.count(2) > 1) return false;
  const wins = p.moves().filter(m => p.clone().play(m).res === 1); return wins.length === 1 && p.moves().length >= 4; });
out.draw = play(45, p => p.own.filter(x => x === 3).length === 1 && p.own.filter(x => x === 1 || x === 2).length >= 2 && p.res < 0);
out.board = play(30, p => p.own.filter(x => x === 1).length === 1 && p.own.filter(x => x === 2).length === 1);
console.log(JSON.stringify(out));
