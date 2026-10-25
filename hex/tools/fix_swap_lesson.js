// Rebuild the "swap decision" lesson step (s_swap) of lessons.json: after a first move, Blue may swap or play.
// Every problem lists the swap AND the best cells, each evaluated by its own MCTS search; half of the first moves are
// strong (swap is right), half weak (a normal move is right).
//   HEXN=…/hexn node tools/fix_swap_lesson.js lessons.json
const fs = require('fs');
const E = require('../engine.js');
const N = require('./nat.js').open();
const f = process.argv[2], D = JSON.parse(fs.readFileSync(f, 'utf8'));
async function evalPos(spec, ms) { await N.setpos(spec); const a = await N.analyze(ms, 0, 1); return a.list[0] ? a.list[0].v : 0; }
(async () => {
  const out = [];
  for (const [n, nm] of [[9, 'e5'], [9, 'a1'], [11, 'f6'], [11, 'a2'], [7, 'd4'], [9, 'i1'], [11, 'k1'], [9, 'c3']]) {
    const p = new E.Pos(n, true); p.play(E.parse(p, nm));
    const spec = { ...p.spec(), sw: 1 };
    const q = E.Pos.from(spec); q.play(E.SWAP);
    const vSwap = -(await evalPos(q.spec(), 2500));   // Blue's view after the swap (Red to move)
    await N.setpos({ ...p.spec(), sw: 0 });
    const a = await N.analyze(2500, 0, 6), sc = [[E.SWAP, vSwap]];
    for (const e of a.list.slice(0, 6)) { const r = E.Pos.from(p.spec()); r.play(e.m); sc.push([e.m, -(await evalPos(r.spec(), 1500))]); }
    sc.sort((x, y) => y[1] - x[1]);
    out.push({ s: spec, best: sc[0][0], sc, nm });
    console.error(n, nm, 'best', sc[0][0] === E.SWAP ? 'swap' : E.nameOf(sc[0][0], n), sc.slice(0, 3).map(x => (x[0] === E.SWAP ? 'S' : E.nameOf(x[0], n)) + ':' + x[1]).join(' '));
  }
  // 5 problems: as balanced as possible between "swap" and "play"
  const sw = out.filter(x => x.best === E.SWAP), pl = out.filter(x => x.best !== E.SWAP), pick = [];
  while (pick.length < 5 && (sw.length || pl.length)) { if (sw.length && (pick.filter(x => x.best === E.SWAP).length <= pick.length / 2 || !pl.length)) pick.push(sw.shift()); else pick.push(pl.shift()); }
  const st = D.steps.find(s => s.id === 's_swap');
  st.problems = pick.map(({ s, best, sc }) => ({ s, best, sc }));
  delete st.diagram;
  fs.writeFileSync(f, JSON.stringify(D));
  console.error('s_swap', pick.map(x => x.nm + (x.best === E.SWAP ? ':swap' : ':play')).join(' '));
  N.close();
})();
