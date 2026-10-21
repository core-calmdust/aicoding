// quick policy peek: node fuseki-pol.mjs <n> <komi> <handicap> "Q16 D4 ..." [sym]
import { load, policy, norm, board, show, R } from './golib.mjs';
const [n, komi, hc, mv, sym] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5] || '', +(process.argv[6] || 2)];
const E = await load('strong');
const spec = { n, turn: hc ? 2 : 1 };
if (hc) spec.stones = R.handicapPoints(n, hc).map(i => [i, 1]);
const moves = norm(mv.split(/\s+/).filter(Boolean), n);
const p = policy(E, spec, moves, komi, sym);
console.log(show(board(spec, moves)));
console.log('turn', p.turn, 'lead(mover)', p.lead.toFixed(1), 'top:', p.list.slice(0, 8).map(e => R.coord(e.m, n) + ':' + (e.p * 100).toFixed(0)).join(' '));
