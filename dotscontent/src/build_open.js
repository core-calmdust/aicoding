// assemble dots/openings.json from op3.json (3x3, all values exact) and op4.json (4x4, book + solver)
'use strict';
const L = require('./lib.js'), { E } = L;
const fs = require('fs');
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const enc = es => es.map(e => K64[e]).join('');
const op3 = JSON.parse(fs.readFileSync(`${L.CK}/op3.json`, 'utf8'));
const op4 = JSON.parse(fs.readFileSync(`${L.CK}/op4.json`, 'utf8'));
// 3x3 selection: [id, index in op3.json]
const SEL3 = [['d1', 51], ['d2', 52], ['d3', 53], ['a1', 0], ['a2', 1], ['a3', 9], ['b1', 20], ['b2', 26], ['b3', 22], ['c1', 32], ['c2', 34], ['c3', 44]];
const SEL4 = JSON.parse(process.env.SEL4 || '[]');   // [[id, index in op4.json], ...]
const G3 = E.geom(3, 3);
function drillLen(n, moves) {   // the opening part: until no safe line is left
  const G = E.geom(n, n), p = new E.Pos(G);
  for (let i = 0; i < moves.length; i++) { if (!p.legal().some(e => p.gives(e) === 0 && p.completes(e) === 0) && !p.hasCapture()) return i; p.play(moves[i]); }
  return moves.length;
}
function finalOf(n, moves) { const G = E.geom(n, n), p = new E.Pos(G); let turn = 0; const sc = [0, 0]; for (const e of moves) { const k = p.play(e); sc[turn] += k; if (!k) turn ^= 1; } return p.undrawn ? null : sc; }
(async () => {
  const N = new L.Native(3);
  const encV = vals => { const a = new Array(G3.E).fill('.'); for (const [e, v] of vals) a[e] = K64[v + 30]; return a.join(''); };
  const lines3 = [];
  for (const [id, i] of SEL3) { const o = op3[i]; lines3.push({ id, side: -1, moves: enc(o.moves), drill: drillLen(3, o.moves), vals: o.plies.map(p => p.v), full: o.plies.map(() => 1), final: o.final }); }
  // the trap line: the mirror reply to a centre-box edge loses; the first player then plays the best moves
  {
    const moves = [4, 7], p = E.Pos.from(G3, moves);
    while (p.undrawn) { const s = await N.solve(moves); const best = L.bestSet(s.vals); const caps = best.filter(e => p.completes(e)); const e = caps.length ? caps[0] : best[0]; moves.push(e); p.play(e); }
    const vals = []; for (let i = 0; i < moves.length; i++) vals.push(encV((await N.solve(moves.slice(0, i))).vals));
    lines3.splice(3, 0, { id: 'dx', side: 0, moves: enc(moves), drill: drillLen(3, moves), vals, full: moves.map(() => 1), final: finalOf(3, moves), trap: 1 });
  }
  N.close();
  const lines4 = SEL4.map(([id, i]) => { const o = op4[i]; return { id, side: o.side, moves: enc(o.moves), drill: o.drill, vals: o.plies.map(p => p.v), full: o.plies.map(p => p.full), final: null }; });
  const out = { version: 1, sets: [{ id: 's3', n: 3, lines: lines3 }, { id: 's4', n: 4, lines: lines4 }] };
  fs.writeFileSync('/home/claude/aicoding/dots/openings.json', JSON.stringify(out));
  fs.copyFileSync('/home/claude/aicoding/dots/openings.json', `${L.CK}/openings.json`);
  console.log('3x3', lines3.map(l => l.id + ':' + l.drill + (l.final ? '(' + l.final.join('-') + ')' : '')).join(' '), '| 4x4', lines4.map(l => l.id + ':' + l.drill).join(' '));
})();
