// RT_LV (the rating of each AI level) from games between neighbouring levels (2026-11-19):
//   node tools/ladder.js <rule> <from> <to> <games> [seed]   → for each k in from..to-1: Lv.k+1 vs Lv.k, the Elo gap
// Lv.19 / 20 think by time; here they get a node budget instead (nk: their time at the nodes per second of a typical PC), so the
// table does not depend on this machine. Each opening (a few random placements) is played twice with the colours swapped.
const path = require('path');
const E = require(path.resolve(__dirname, '../engine.js'));
global.self = global; require(path.resolve(__dirname, '../book.js')); E.setBook(self.LT_BOOK);   // (the levels play with the opening book, as on the page)
const [, , rule = 'seneca', a = '1', b = '20', G = '24', sd = '1'] = process.argv;
const NPS_PC = 700;   // thousand nodes per second of one thread on a typical PC (the user's Mac ≈ 2× this work machine)
const cfgOf = k => { const L = E.LEVELS[k]; return L.ms ? { s: 1, nk: Math.round(L.ms / 1000 * NPS_PC) } : L; };
let seed = +sd * 7919 + 3; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
function game(cfg, op, rand) {   // cfg[0] plays Black
  E.setRule(rule); E.ttClear();
  const moves = [], pos = E.Pos.from(null);
  for (const m of op) { moves.push(m); pos.play(m); }
  for (let ply = 0; ply < 400; ply++) {
    const j = E.judge(pos); if (j.over) return j;
    E.ttClear();
    const r = E.thinkCfg(null, moves, cfg[pos.side], rule, rand);
    if (r.move == null || r.move < 0) return E.judge(pos);
    moves.push(r.move); pos.play(r.move);
  }
  return { draw: true };
}
const out = [];
for (let k = +a; k < +b; k++) {
  const hi = cfgOf(k + 1), lo = cfgOf(k);
  let sc = 0, n = 0;
  for (let g = 0; g < +G / 2; g++) {
    E.setRule(rule);
    const op = [], p = E.Pos.from(null);
    for (let i = 0; i < 4; i++) { const L = p.moves(); const m = L[Math.floor(rnd() * L.length)]; op.push(m); p.play(m); }
    for (const hiFirst of [true, false]) {
      const j = game(hiFirst ? [hi, lo] : [lo, hi], op, rnd);
      const hs = hiFirst ? 1 : 2;
      sc += j.draw ? .5 : j.winner === hs ? 1 : 0; n++;
    }
  }
  const p = Math.min(.97, Math.max(.03, sc / n)), elo = -400 * Math.log10(1 / p - 1);
  out.push([k + 1, Math.round(elo)]);
  console.log(`Lv.${k + 1} vs Lv.${k}: ${(100 * sc / n).toFixed(1)}%  ${Math.round(elo)} Elo`);
}
console.log(JSON.stringify(out));
