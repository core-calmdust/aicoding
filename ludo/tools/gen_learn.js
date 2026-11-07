// node ludo/tools/gen_learn.js [games]  → ludo/learn.json (lessons + "best move" puzzles for both rules)
// Positions come from AI self-play (Lv.6–14 mixed, 2–4 players). At each decision the throw is known; every legal
// move is scored by the Lv.20 evaluation (with the look at the extra throw). A position is kept when the best move is
// clearly better than every other (margin) and is of a teachable kind (capture, bring out, safe square / castle,
// escape a threat, reach home). The seat to move is rotated to seat 0, so the player is always red (ludo) / yellow (pachisi).
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
let rs = 20261108; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const G = +process.argv[2] || 400;

function rotate(s) {   // rotate the seats so that the seat to move becomes 0
  const r = s.turn, rot = x => (x - r + 4) % 4, o = E.clone(s);
  o.seats = s.seats.map(rot).sort((a, b) => a - b);
  for (let x = 0; x < 4; x++) { o.pos[rot(x)] = s.pos[x] && s.pos[x].slice(); o.ctrl[rot(x)] = s.ctrl[x]; o.team[rot(x)] = s.team[x]; o.entered[rot(x)] = s.entered[x]; }
  o.turn = 0; o.streak = 0; o.over = false; o.winner = -1;
  // keep the team ids small and the player's side = 0
  const t0 = o.team[0]; o.team = o.team.map(t => t < 0 ? -1 : t === t0 ? 0 : (s.rule === 'pachisi' ? 1 : t === 0 ? t0 : t));
  if (s.rule === 'ludo') o.team = [0, 1, 2, 3].map(x => o.pos[x] ? x : -1);
  return o;
}
function kindOf(s, m) {
  if (!m || m.pass) return null;
  if (m.cap && m.cap.length) return 'cap';
  if (m.enter) return 'enter';
  const LAST = E.lastOf(s);
  if (m.home || (s.rule === 'ludo' && m.to >= 51 && m.from < 51) || (s.rule === 'pachisi' && m.to >= 76 && m.from < 76)) return 'home';
  const th = E.threatProb(s, 0, m.from);
  const after = E.apply(s, m, { v: 0, again: true }).state;
  const cell = E.cellOf(s.rule, 0, m.to);
  if (th > .12 && E.isSafe(s.rule, cell)) return 'safe';
  if (th > .15 && E.threatProb(after, 0, m.to) < .06) return 'escape';
  return null;
}
const pack = s => ({ r: s.rule, seats: s.seats, team: s.team, pos: s.pos, entered: s.entered, opt: s.opt, players: s.players });
const cands = { ludo: [], pachisi: [] };
for (let g = 0; g < G; g++) {
  const rule = g % 2 ? 'pachisi' : 'ludo', players = rule === 'pachisi' ? (g % 4 === 1 ? 2 : 4) : [2, 3, 4][g % 3];
  let s = E.newGame({ rule, players, first: 0 }); const lv = s.seats.map(() => 6 + Math.floor(rnd() * 9));
  let n = 0;
  while (!s.over && n < 1500) {
    const t = E.rollThrow(rule, rnd);
    const moves = E.legalMoves(s, t), real = moves.filter(m => !m.pass);
    if (real.length >= 2 && n > 4) {
      const R = rotate(s);
      const ms = E.legalMoves(R, t), { scores } = E.think(R, t, 20, () => .5);
      const L = ms.map((m, i) => ({ m, v: scores[i] })).filter(x => !x.m.pass || rule === 'pachisi').sort((a, b) => b.v - a.v);
      if (L.length >= 2) {
        const margin = L[0].v - L[1].v, kind = kindOf(R, L[0].m);
        if (kind && margin >= 4 && Math.abs(L[0].v) < 5e4) cands[rule].push({ s: pack(R), t: { v: t.v, face: t.face }, best: [L[0].m.k, L[0].m.to], sc: L.map(x => [x.m.pass ? -1 : x.m.k, x.m.pass ? -1 : x.m.to, Math.round(x.v * 10) / 10]), kind, margin: Math.round(margin * 10) / 10 });
      }
    }
    const lvl = lv[s.seats.indexOf(s.turn)];
    s = E.apply(s, E.think(s, t, lvl, rnd).move, t).state; n++;
  }
}
for (const r in cands) { const by = {}; cands[r].forEach(c => by[c.kind] = (by[c.kind] || 0) + 1); console.error(r, cands[r].length, JSON.stringify(by)); }
// lessons: 5 problems per step, clear margins first, a mix of piece counts
const STEPS = { ludo: [['l_enter', 'enter', 'basics'], ['l_cap', 'cap', 'basics'], ['l_home', 'home', 'basics'], ['l_safe', 'safe', 'tactics'], ['l_escape', 'escape', 'tactics']],
  pachisi: [['p_enter', 'enter', 'basics'], ['p_cap', 'cap', 'basics'], ['p_home', 'home', 'basics'], ['p_safe', 'safe', 'tactics'], ['p_escape', 'escape', 'tactics']] };
const used = new Set(), key = c => JSON.stringify([c.s.pos, c.t.v]);
const lessons = [];
for (const rule of ['ludo', 'pachisi']) for (const [id, kind, course] of STEPS[rule]) {
  const pool = cands[rule].filter(c => c.kind === kind && !used.has(key(c))).sort((a, b) => b.margin - a.margin);
  const pickN = []; const step = Math.max(1, Math.floor(pool.length / 12));
  for (let i = 0; i < pool.length && pickN.length < 5; i += step) pickN.push(pool[i]);
  pickN.forEach(c => used.add(key(c)));
  if (pickN.length >= 3) lessons.push({ id, rule, course, kind, problems: pickN.map(({ s, t, best, sc, kind }) => ({ s, t, best, sc, kind })) });
}
// puzzles: up to 60 per rule, every kind, harder (smaller margin) later; stars by margin
const puzzles = {};
for (const rule of ['ludo', 'pachisi']) {
  const pool = cands[rule].filter(c => !used.has(key(c)));
  const kinds = [...new Set(pool.map(c => c.kind))], out = [];
  const byK = Object.fromEntries(kinds.map(k => [k, pool.filter(c => c.kind === k).sort((a, b) => b.margin - a.margin)]));
  let i = 0; while (out.length < 60 && kinds.some(k => byK[k].length)) { const k = kinds[i++ % kinds.length]; const c = byK[k].shift(); if (c && !used.has(key(c))) { used.add(key(c)); out.push(c); } }
  out.sort((a, b) => b.margin - a.margin);
  puzzles[rule] = out.map(({ s, t, best, sc, kind, margin }) => ({ s, t, best, sc, kind, d: margin >= 14 ? 1 : margin >= 8 ? 2 : 3 }));
}
const file = path.join(__dirname, '..', 'learn.json');
fs.writeFileSync(file, JSON.stringify({ version: 1, lessons, puzzles }));
console.log('learn.json', lessons.map(l => l.id + ':' + l.problems.length).join(' '), 'puzzles', Object.entries(puzzles).map(([r, a]) => r + ':' + a.length).join(' '));
