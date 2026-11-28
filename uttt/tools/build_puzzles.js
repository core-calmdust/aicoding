// puzzles.json from the generated candidates (tools/gen_content.js puzzles …): dedupe (with the board's symmetries, and against
// the lesson positions), the fun score (tools/fun.js, ≥ 70; for every theme at least 3 candidates per puzzle kept), themes:
//   w1 1手で勝て (20) · w2 2手 (30) · w3 3手 (30) · w4 4手 (20) — Win; send 送り先で勝つ (30: a quiet first move that sends the opponent to
//   an open board) · free 自由な手番から勝つ (20: the solver starts with a free choice) — Tac. Easy → hard by the first choice's breadth.
// node tools/build_puzzles.js cand1.json cand2.json … > puzzles.json
const E = require('../engine.js'); E.setRule('std');
const fun = require('./fun.js'), fs = require('fs');
const all = []; for (const f of process.argv.slice(2)) all.push(...JSON.parse(fs.readFileSync(f, 'utf8')));
const SYM = (() => { const out = []; for (let k = 0; k < 8; k++) { const map = []; for (let m = 0; m < 81; m++) { let r = E.grow(m), c = E.gcol(m); if (k & 4) [r, c] = [c, r]; if (k & 1) r = 8 - r; if (k & 2) c = 8 - c; map.push(E.mAt(r, c)); } out.push(map); } return out; })();
const symKey = s => { const pos = E.Pos.from(s); let best = null; for (const map of SYM) { const a = Array(81).fill('.'); for (let m = 0; m < 81; m++) a[map[m]] = '.xo'[pos.c[m]]; const f = pos.forced < 0 ? -1 : E.mB(map[pos.forced * 9 + 4]); const k = a.join('') + f + pos.side; if (best === null || k < best) best = k; } return best; };
const seen = new Set();
try { const L = JSON.parse(fs.readFileSync(__dirname + '/../lessons.json', 'utf8')); for (const st of L.steps) { for (const P of st.problems || []) seen.add(symKey(P.s)); for (const R of st.ramp || []) seen.add(symKey(R.s)); } } catch (e) {}
const cands = [];
for (const P of all) {
  const k = symKey(P.s); if (seen.has(k)) continue; seen.add(k);
  if (P.sol.length > 2) continue;
  const r = fun.score(P); if (!r.ok) continue;
  const pos = E.Pos.from(P.s), m = P.sol[0], q = pos.clone().play(m);
  const quiet = !(!pos.own[E.mB(m)] && q.own[E.mB(m)] === pos.turn) && q.forced >= 0;
  cands.push(Object.assign({}, P, { fun: r.s, quiet, free: pos.forced < 0, line: r.line }));
}
const NEED = { send: 30, free: 20, w1: 20, w2: 30, w3: 30, w4: 20 };
const used = new Set(), themes = {}, stat = {};
const pick = (id, f) => {
  const pool = cands.filter(c => !used.has(c) && f(c)).sort((a, b) => b.fun - a.fun || b.legal - a.legal);
  stat[id] = { cand: pool.length, pass: pool.filter(c => c.fun >= 70).length };
  const take = pool.filter(c => c.fun >= 70).slice(0, NEED[id]);
  take.forEach(c => used.add(c));
  // easy → hard: fewer first choices and a shorter line first
  themes[id] = take.sort((a, b) => a.n - b.n || a.legal - b.legal || a.fun - b.fun);
};
pick('send', c => c.n >= 2 && c.n <= 3 && c.quiet && !c.free);
pick('free', c => c.n >= 2 && c.n <= 3 && c.free);
pick('w1', c => c.n === 1);
pick('w2', c => c.n === 2);
pick('w3', c => c.n === 3);
pick('w4', c => c.n === 4);
process.stderr.write(JSON.stringify(stat) + '\n' + Object.entries(themes).map(([k, v]) => k + ' ' + v.length).join(' · ') + '\n');
const out = { version: 1, rule: 'std', kind: 'duel', rev: '2026-11-28', daily: ['w2', 'send', 'w3', 'free', 'w2', 'w4', 'w1'],
  themes: ['w1', 'w2', 'w3', 'w4', 'send', 'free'].map(id => ({ id, grp: /^w/.test(id) ? 'Win' : 'Tac', puzzles: themes[id].map(c => ({ s: c.s, n: c.n, sol: c.sol, fun: c.fun })) })) };
process.stdout.write(JSON.stringify(out) + '\n');
