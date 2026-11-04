// Collects "win in N" puzzle candidates for Agon from self-play games: positions shortly before a decided game where the
// side to move forces a win (queen on the throne + six guards round her) within N of its own moves, whatever the defender
// does (engine.js duelGood / duelMin), with one or two winning first moves.
// node tools/gen_duel.js <seed> <games> >> tools/duel_raw.jsonl
const E = require('../engine.js'); E.setRule('std');
const seed0 = +process.argv[2] || 1, G = +process.argv[3] || 20;
let seed = seed0 * 7919; const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const seen = new Set();
for (let g = 0; g < G; g++) {
  const mv = [], lv = [8 + Math.floor(rand() * 10), 8 + Math.floor(rand() * 10)];
  let st;
  for (let i = 0; i < 300; i++) {
    const { pos, hashes } = E.replay(null, mv); st = E.judge(pos, hashes); if (st.over) break;
    // a few random moves in the middle for variety
    if (i > 10 && i < 40 && rand() < 0.08) { const L = pos.moves(); mv.push(L[Math.floor(rand() * L.length)]); continue; }
    const r = E.think(null, mv, lv[pos.side], rand); if (r.move == null || r.move < 0) break; mv.push(r.move);
  }
  if (!st || !st.winner) continue;
  for (let back = 1; back <= 18 && back < mv.length; back++) {
    const pre = mv.slice(0, mv.length - back);
    const { pos } = E.replay(null, pre);
    if (pos.turn !== st.winner) continue;
    const k = pos.spec().b + pos.side; if (seen.has(k)) continue; seen.add(k);
    const n = E.duelMin(null, pre, 5, 'std', 3e6);
    if (n < 2) continue;
    const good = E.duelGood(null, pre, n, 'std', 3e6);
    if (!good || !good.length || good.length > 2) continue;
    const all = pos.moves().length;
    console.log(JSON.stringify({ s: pos.spec(), n, ok: good, all, g: seed0 + ':' + g, w: st.winner }));
  }
  console.error('game', g, st.why, mv.length);
}
