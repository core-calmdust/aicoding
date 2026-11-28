// node tools/test_engine.js — rules, the core's move lists against the JS rules, random games, search sanity, speed
const E = require('../engine.js');
let fail = 0; const ok = (c, msg) => { if (!c) { fail++; console.log('FAIL', msg); } };
let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
for (const rule of E.RULE_ORDER) {
  E.setRule(rule);
  const p = E.Pos.from(null), n = E.N;
  ok(p.moves().length === 3 * n - 2, rule + ' start moves ' + p.moves().length);
  // random games: the core's move count = the JS count, games end
  let lens = [], w = [0, 0, 0];
  for (let g = 0; g < 300; g++) {
    const q = E.Pos.from(null); let k = 0;
    while (!E.judge(q).over && k < 400) {
      const L = q.moves();
      if (g < 30 && k % 3 === 0) { const vals = E.rootValues(q, 1, 0); ok(vals.length === L.length && vals.every(e => L.includes(e.m)), rule + ' core moves ' + vals.length + ' vs ' + L.length + ' ' + JSON.stringify(q.spec())); }
      q.play(L[Math.floor(rnd() * L.length)]); k++;
    }
    const j = E.judge(q); ok(j.over, 'ended'); w[j.winner]++; lens.push(k);
  }
  console.log(rule, 'random games: P1', w[1], 'P2', w[2], 'avg', (lens.reduce((a, b) => a + b) / lens.length).toFixed(1), 'max', Math.max(...lens));
}
E.setRule('s8');
// win in one: a white piece on rank 7
{ const sp = { b: '.'.repeat(64).split(''), side: 1 }; const put = (nm, ch) => { sp.b[E.sqOf(nm)] = ch; };
  put('d7', 'w'); put('a8', 'b'); put('h8', 'b'); put('c2', 'b'); put('a1', 'w'); sp.b = sp.b.join('');
  const r = E.bestMove(E.Pos.from(sp), 10, 300); ok(r.v === E.WIN - 1, 'win in one ' + r.v);
  ok(E.duelGood(sp, [], 1).length === 3, 'duel 1: ' + E.duelGood(sp, [], 1).length); }
// speed
{ const p = E.Pos.from(null); const t0 = Date.now(); const r = E.bestMove(p, 60, 2000); const dt = Date.now() - t0;
  console.log('start 2 s: depth', r.depth, 'value', r.v, 'move', E.name(p, r.move), 'nodes', E.nodes, Math.round(E.nodes / dt * 1000) + ' n/s'); }
console.log(fail ? 'FAILED ' + fail : 'ALL OK');
