// design helper: node fuseki-peek.mjs <n> <komi> <hc> "Q16 D4 * * R10 *" [extra policy-top count]
// "*" = take the policy's top move; prints rank/prior/top-4 for each move and the final board.
import { load, policy, norm, board, show, R } from './golib.mjs';
const [n, komi, hc] = [+process.argv[2], +process.argv[3], +process.argv[4]];
const toks = (process.argv[5] || '').split(/\s+/).filter(Boolean);
const extra = +(process.argv[6] || 0);
const E = await load('strong');
const spec = { n, turn: hc ? 2 : 1 };
if (hc) spec.stones = R.handicapPoints(n, hc).map(i => [i, 1]);
const mv = [], out = [];
for (let k = 0; k < toks.length + extra; k++) {
  const p = policy(E, spec, mv, komi, 2);
  const t = toks[k] || '*';
  const m = t === '*' ? p.list[0].m : (/^\*\d$/.test(t) ? p.list[+t[1] - 1].m : R.parseCoord(t, n));
  const r = p.list.findIndex(e => e.m === m);
  out.push(`${k + 1}${p.turn === 1 ? 'B' : 'W'} ${R.coord(m, n).padEnd(4)} r${r + 1} ${(p.list[r].p * 100).toFixed(0).padStart(2)}% lead(B)=${(p.turn === 1 ? p.lead : -p.lead).toFixed(1).padStart(5)} | ` + p.list.slice(0, 5).map(e => R.coord(e.m, n) + ':' + (e.p * 100).toFixed(0)).join(' '));
  mv.push(m);
}
console.log(out.join('\n'));
console.log(show(board(spec, mv)));
console.log(mv.map(m => R.coord(m, n)).join(' '));
