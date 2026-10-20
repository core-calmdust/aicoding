// level A vs level B with E.think (as the app plays), balanced renju openings. node ladder.js A B pairs
'use strict';
const fs = require('fs');
const E = require('/home/claude/aicoding/gomoku/engine.js');
E.setNN('renju', fs.readFileSync('/home/claude/aicoding/gomoku/nn.wasm'), fs.readFileSync('/home/claude/work/nn/nn_renju_v3.bin'));
const [A, B, P] = [+process.argv[2], +process.argv[3], +process.argv[4] || 10];
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const OPENS = [];
for (const f of fs.readdirSync('/home/claude/work/eval').filter(f => /^labels_\d+\.jsonl$/.test(f))) for (const l of fs.readFileSync('/home/claude/work/eval/' + f, 'utf8').split('\n')) {
  if (!l) continue; let o; try { o = JSON.parse(l); } catch (e) { continue; }
  const g = games[o.g], ev = String(o.ev); if (g.rule !== 'renju' || ev.includes('M') || Math.abs(+ev) > 120 || o.k < 6 || o.k > 12) continue;
  OPENS.push(g.moves.slice(0, o.k));
}
let seed = 5; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
let sa = 0, sb = 0, d = 0;
for (let k = 0; k < P; k++) {
  const op = OPENS[Math.floor(rnd() * OPENS.length)];
  const start = { b: op.filter((_, i) => i % 2 === 0), w: op.filter((_, i) => i % 2 === 1), side: op.length % 2 ? 2 : 1 };
  for (const aBlack of [true, false]) {
    const pos = E.setup('renju', start), mv = [];
    let w = 0;
    while (true) {
      const st = pos.status(); if (st.over) { w = st.winner; break; }
      if (!pos.legal().length) { w = 3 - pos.side; break; }
      const lv = (pos.side === 1) === aBlack ? A : B;
      const r = E.think('renju', mv, lv, start, rnd);
      if (r.move < 0 || !pos.isLegal(r.move)) { w = 3 - pos.side; break; }
      pos.make(r.move); mv.push(r.move); if (mv.length > 200) break;
    }
    if (!w) d++; else if ((w === 1) === aBlack) sa++; else sb++;
  }
  console.log(`${A} vs ${B}: ${sa}-${sb}-${d}`);
}
