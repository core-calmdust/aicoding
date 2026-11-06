// Kōnane lessons → konane/lessons.json. Every answer set is computed from the rules (basics) or by solving the position
// exactly (strategy: E.winningMoves = every move that still wins against any defence). Problem positions come from engine
// self-play endings on 8×8; warm-up pages (ramp) come from tools/lesson_ramps.js.
//   basics:   b_open (the opening removals), b_jump (find the capture), b_double (take two or more), b_win (the last capture)
//   strategy: s_count (leave the opponent the fewest jumps), s_stop (stop the jump line early), s_go (go on jumping),
//             s_keep (keep a spare jump of your own), s_read (two or three moves ahead)
// node konane/tools/gen_lessons.js [games]
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { RAMPS, UI } = require('./lesson_ramps.js');
const G = +(process.argv[2] || 160);
let seed = 4242;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const need = { b_jump: 5, b_double: 5, b_win: 5, s_count: 5, s_stop: 5, s_go: 5, s_keep: 5, s_read: 5 };
const got = Object.fromEntries(Object.keys(need).map(k => [k, []]));
const usedKey = new Set();
const full = () => Object.keys(need).every(k => got[k].length >= need[k] * 3);
E.setRule('s8');
const prob = (pos, ok, best) => ({ s: (sp => ({ b: sp.b, side: sp.side }))(pos.spec()), ok, best: best != null ? best : ok[0] });
for (let g = 0; g < G && !full(); g++) {
  const moves = [], pos = E.Pos.from(null);
  const la = 3 + Math.floor(rnd() * 14), lb = 3 + Math.floor(rnd() * 14);
  for (let k = 0; k < 4; k++) { const L = pos.moves(); const m = L[Math.floor(rnd() * L.length)]; pos.play(m); moves.push(m); }
  for (;;) {
    const L = pos.moves(); if (!L.length) break;
    const m = rnd() < 0.15 ? L[Math.floor(rnd() * L.length)] : E.think(null, moves, pos.turn === 1 ? la : lb, rnd).move;
    pos.play(m); moves.push(m);
    const ms = pos.moves(), me = pos.turn, op = 3 - me, stones = pos.count(1) + pos.count(2);
    if (!ms.length) break;
    const key = pos.h1 + ':' + pos.h2; if (usedKey.has(key)) continue;
    // basics (rule sets)
    if (stones >= 14 && ms.length >= 1 && ms.length <= 3 && got.b_jump.length < 15) { got.b_jump.push(prob(pos, ms)); usedKey.add(key); continue; }
    const dbl = ms.filter(x => E.hops(x) >= 2);
    if (dbl.length && dbl.length <= 2 && ms.length >= 4 && got.b_double.length < 15) { got.b_double.push(prob(pos, dbl)); usedKey.add(key); continue; }
    const w1 = ms.filter(x => !pos.clone().play(x).mobility(op));
    if (w1.length && w1.length * 3 <= ms.length && ms.length >= 3 && got.b_win.length < 15) { got.b_win.push(prob(pos, w1)); usedKey.add(key); continue; }
    // strategy (exact): small enough endings only
    if (stones > 22 || ms.length < 3) continue;
    const win = E.winningMoves(null, moves, 's8', 1.5e6);
    if (!win || !win.length || win.length * 2 > ms.length) continue;
    let gm = null, gs = 1e9;
    for (const x of ms) { const q = pos.clone().play(x), sc = q.mobility(op) * 10 - E.hops(x); if (sc < gs) { gs = sc; gm = x; } }
    const line = (a, b) => E.mFrom(a) === E.mFrom(b) && E.path(pos, a)[1] === E.path(pos, b)[1] && a !== b;
    const add = (k, ok) => { if (got[k].length < 15) { got[k].push(prob(pos, ok)); usedKey.add(key); return true; } return false; };
    if (win.some(w => ms.some(x => line(w, x) && E.hops(x) > E.hops(w) && !win.includes(x))) && add('s_stop', win)) continue;
    if (win.some(w => E.hops(w) >= 2 && ms.some(x => line(w, x) && E.hops(x) < E.hops(w) && !win.includes(x))) && add('s_go', win)) continue;
    if (win.includes(gm) && win.length === 1 && add('s_count', win)) continue;
    if (!win.includes(gm) && win.some(w => pos.clone().play(w).mobility(me) > pos.clone().play(gm).mobility(me)) && add('s_keep', win)) continue;
    const n = E.duelMin(null, moves, 3, 's8', 6e5);
    if (n >= 2 && win.length <= 2 && ms.length >= 4) add('s_read', win);
  }
  if (g % 10 === 0) process.stderr.write(`game ${g}: ` + Object.entries(got).map(([k, v]) => k + ' ' + v.length).join(', ') + '\n');
}
// pick 5 per lesson: fewer stones first for the basics, a spread of sizes for the strategy
function pick(list, n) {
  const L = list.slice().sort((a, b) => a.s.b.replace(/\./g, '').length - b.s.b.replace(/\./g, '').length);
  if (L.length <= n) return L;
  const out = []; for (let i = 0; i < n; i++) out.push(L[Math.round(i * (L.length - 1) / (n - 1))]);
  return out;
}
// the opening removals (rule sets): Black on the full board, then White after each kind of first removal
function openProblems() {
  const out = [];
  for (const [rl, first] of [['s8', null], ['s8', 'd4'], ['s8', 'a1'], ['s6', 'f6'], ['s8', 'e5']]) {
    E.setRule(rl); const p = E.Pos.from(null);
    if (first) { const m = p.moves().find(x => E.name(p, x) === first); p.play(m); }
    const sp = p.spec(); out.push({ s: { b: sp.b, side: sp.side, n: sp.n }, ok: p.moves(), best: p.moves()[0] });
  }
  E.setRule('s8');
  return out;
}
const STEPS = [
  { id: 'b_open', course: 'basics', problems: openProblems() },
  { id: 'b_jump', course: 'basics', problems: pick(got.b_jump, 5) },
  { id: 'b_double', course: 'basics', problems: pick(got.b_double, 5) },
  { id: 'b_win', course: 'basics', problems: pick(got.b_win, 5) },
  { id: 's_count', course: 'strategy', problems: pick(got.s_count, 5) },
  { id: 's_stop', course: 'strategy', problems: pick(got.s_stop, 5) },
  { id: 's_go', course: 'strategy', problems: pick(got.s_go, 5) },
  { id: 's_keep', course: 'strategy', problems: pick(got.s_keep, 5) },
  { id: 's_read', course: 'strategy', problems: pick(got.s_read, 5) },
];
// warm-up pages: "try" pages get their answer set from the rules / the solver here
for (const st of STEPS) {
  const R = RAMPS[st.id]; if (!R) continue;
  st.ramp = R.map(it => {
    if (it.k !== 'try') return it;
    const rl = it.s.b.length === 36 ? 's6' : it.s.b.length === 100 ? 's10' : 's8'; E.setRule(rl);
    const pos = E.Pos.from(it.s), ms = pos.moves();
    let ok;
    if (it.rule === 'win1') ok = ms.filter(x => !pos.clone().play(x).mobility(3 - pos.turn));
    else if (it.rule === 'double') ok = ms.filter(x => E.hops(x) >= 2);
    else ok = E.winningMoves(it.s, [], rl, 3e6);
    E.setRule('s8');
    if (!ok || !ok.length || ok.length === ms.length) throw new Error('ramp ' + st.id + ': no clear answer ' + JSON.stringify(ok && ok.length));
    return Object.assign({}, it, { ok: ok.map(x => E.name(pos, x)) });
  });
}
for (const st of STEPS) if (st.problems.length < 5) process.stderr.write(`WARNING ${st.id}: only ${st.problems.length} problems\n`);
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps: STEPS, rampUi: UI }));
process.stderr.write('lessons.json: ' + STEPS.map(s => s.id + ' ' + s.problems.length + (s.ramp ? '+' + s.ramp.length : '')).join(', ') + '\n');
