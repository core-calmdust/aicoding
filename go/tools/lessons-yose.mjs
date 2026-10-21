// 9x9 endgame survey: self-play with the strong policy, then analyse late positions.
//   node lessons-yose.mjs <games> <seed> <out.json>
import fs from 'fs';
import { load, analyze, policy, R } from './golib.mjs';
const [G, seed0, outF] = [+process.argv[2], +process.argv[3], process.argv[4]];
let seed = seed0; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1000000) / 1000000; };
const E = await load('strong');
const n = 9, komi = 7, out = fs.existsSync(outF) ? JSON.parse(fs.readFileSync(outF, 'utf8')) : [];
for (let g = 0; g < G; g++) {
  const moves = []; let p = R.Pos.from({ n, turn: 1 });
  while (moves.length < 60) {
    const pol = policy(E, { n, turn: 1 }, moves, komi, 1).list.filter(e => e.m >= 0 && p.legal(e.m));
    if (!pol.length || pol[0].p < 0.02) break;
    let pick = pol[0].m;
    if (moves.length < 8) { let tot = 0; const w = pol.slice(0, 5).map(e => (tot += e.p, e.p)); let r = rnd() * tot; for (let j = 0; j < w.length; j++) { r -= w[j]; if (r <= 0) { pick = pol[j].m; break; } } }
    p = p.tryPlay(pick).pos; moves.push(pick);
  }
  for (let k = 30; k < moves.length - 2; k += 3) {
    const mv = moves.slice(0, k);
    const a = analyze(E, { n, turn: 1 }, mv, komi, 150);
    const top = a.list.slice(0, 5).map(e => ({ m: R.coord(e.m, n), n: e.n, lead: +e.lead.toFixed(2) }));
    out.push({ g, k, moves: mv.map(m => R.coord(m, n)), top });
    fs.writeFileSync(outF, JSON.stringify(out));
  }
  console.log('game', g, moves.length);
}
