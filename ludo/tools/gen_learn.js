// node ludo/tools/gen_learn.js [games] → ludo/lessons.json + ludo/puzzles.json
// Positions come from AI self-play (Lv.6–14 mixed, 2–4 players). At each decision the throw is known; every legal
// move is scored by the Lv.20 evaluation (with the look at the extra throw). A position is kept when the best move is
// clearly better than every other (margin) and is of a teachable kind (capture, bring out, safe square / castle,
// escape a threat, reach home). The seat to move is rotated to seat 0, so the player is always red (ludo) / yellow (pachisi).
// Texts live in ludo/i18n.js (k.* titles, kd.* tips, kw.* reasons, lb.* bodies, lh.* hints, ls.* / pz.* UI) — the JSON holds
// positions, answers and marks only.
//   lessons.json: { cats: [{ id, rule, steps: [ids] }], steps: [{ id, cat, rule, kind, diagram: { s, marks }, ramp: [explain, example], problems: [5] }] }
//   puzzles.json: { cats: [{ id }], themes: [{ id, cat, rule, kind, puzzles: [{ s, t, ok, best, look, d }] }], daily: [theme ids] }
//   a problem: { s: packed state (seat 0 to move), t: { v, face }, ok: [[k, to]…] (every move as good as the best), best: [k, to], look: marks }
//   marks (2D grid units of board2d): { type: 'ring'|'dot', at: [gx, gy], color } · { type: 'arrow', from: [gx, gy], to: [gx, gy], color }
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
global.window = { LudoEngine: E }; require('../board2d.js'); const B = global.window.LudoBoard2D;
let rs = 20261108; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const G = +process.argv[2] || 300;

function rotate(s) {   // rotate the seats so that the seat to move becomes 0
  const r = s.turn, rot = x => (x - r + 4) % 4, o = E.clone(s);
  o.seats = s.seats.map(rot).sort((a, b) => a - b);
  for (let x = 0; x < 4; x++) { o.pos[rot(x)] = s.pos[x] && s.pos[x].slice(); o.ctrl[rot(x)] = s.ctrl[x]; o.team[rot(x)] = s.team[x]; o.entered[rot(x)] = s.entered[x]; }
  o.turn = 0; o.streak = 0; o.over = false; o.winner = -1;
  if (s.rule === 'ludo') o.team = [0, 1, 2, 3].map(x => o.pos[x] ? x : -1);
  else o.team = [0, 1, 0, 1];
  return o;
}
function kindOf(s, m, t) {
  if (!m || m.pass) return null;
  if (m.cap && m.cap.length) return 'cap';
  if (m.enter) return 'enter';
  if (m.home || (s.rule === 'ludo' && m.to >= 51 && m.from < 51) || (s.rule === 'pachisi' && m.to >= 76 && m.from < 76)) return 'home';
  const th = E.threatProb(s, 0, m.from);
  const after = E.apply(s, m, t).state;
  const cell = E.cellOf(s.rule, 0, m.to);
  if (th > .12 && E.isSafe(s.rule, cell)) return 'safe';
  if (th > .15 && E.threatProb(after, 0, m.to) < .06) return 'escape';
  return null;
}
const pack = s => ({ r: s.rule, seats: s.seats, team: s.team, pos: s.pos, entered: s.entered, opt: s.opt, players: s.players });
const xy = (s, seat, p, k) => { const g = B.geometry(s.rule); const L = E.lastOf(s); const q = p < 0 ? g.yard(seat, k) : p >= L ? g.home(seat, k) : g.cellXY(seat, p); return [+q[0].toFixed(3), +q[1].toFixed(3)]; };
// marks: the best move as an arrow, its destination ringed; captured rival pieces in red; a threatened piece in orange
function marksOf(s, m, kind) {
  const out = [], from = xy(s, 0, m.from, m.k), to = xy(s, 0, m.to, m.k);
  out.push({ type: 'arrow', from, to, color: '#3df59a' });
  out.push({ type: 'ring', at: to, color: '#3df59a' });
  (m.cap || []).forEach(c => out.push({ type: 'ring', at: xy(s, c.seat, s.pos[c.seat][c.k], c.k), color: '#ff5b4b' }));
  if (kind === 'safe' || kind === 'escape') out.push({ type: 'ring', at: from, color: '#ffb02e' });
  return out;
}
function lookOf(s, m, kind) {   // the hint's marks: where to look (not the answer's arrow)
  if (kind === 'cap') return (m.cap || []).map(c => ({ type: 'ring', at: xy(s, c.seat, s.pos[c.seat][c.k], c.k), color: '#ffd84a' }));
  if (kind === 'safe' || kind === 'escape') return [{ type: 'ring', at: xy(s, 0, m.from, m.k), color: '#ffd84a' }];
  if (kind === 'enter') return [{ type: 'ring', at: xy(s, 0, 0, 0), color: '#ffd84a' }];
  return [{ type: 'ring', at: xy(s, 0, m.to, m.k), color: '#ffd84a' }];
}
const cands = { ludo: [], pachisi: [] };
const seen = new Set();
for (let g = 0; g < G; g++) {
  const rule = g % 2 ? 'pachisi' : 'ludo', players = rule === 'pachisi' ? (g % 4 === 1 ? 2 : 4) : [2, 3, 4][g % 3];
  let s = E.newGame({ rule, players, first: 0 }); const lv = [0, 1, 2, 3].map(() => 6 + Math.floor(rnd() * 9));
  let n = 0;
  while (!s.over && n < 1500) {
    const t = E.rollThrow(rule, rnd);
    const moves = E.legalMoves(s, t), real = moves.filter(m => !m.pass);
    if (real.length >= 2 && n > 4) {
      const R = rotate(s);
      const ms = E.legalMoves(R, t), { scores } = E.think(R, t, 20, () => .5);
      const L = ms.map((m, i) => ({ m, v: scores[i] })).filter(x => !x.m.pass || rule === 'pachisi').sort((a, b) => b.v - a.v);
      if (L.length >= 2) {
        const top = L[0].v, ok = L.filter(x => x.v >= top - .5), rest = L.filter(x => x.v < top - .5);
        const margin = rest.length ? top - rest[0].v : 0, best = L[0].m, kind = kindOf(R, best, t);
        // every "ok" move must be the same idea (equal pieces / the same square); one kind per position
        const key = JSON.stringify([R.pos, t.v, R.rule]);
        if (kind && rest.length && margin >= 4 && Math.abs(top) < 5e4 && ok.every(x => !x.m.pass && x.m.to === best.to) && !seen.has(key)) {
          seen.add(key);
          cands[rule].push({ s: pack(R), t: { v: t.v, face: t.face }, ok: ok.map(x => [x.m.k, x.m.to]), best: [best.k, best.to], kind, margin: Math.round(margin * 10) / 10,
            marks: marksOf(R, best, kind), look: lookOf(R, best, kind), nPcs: R.pos[0].filter(p => p >= 0 && p < E.lastOf(R)).length });
        }
      }
    }
    const lvl = lv[s.turn];
    s = E.apply(s, E.think(s, t, lvl, rnd).move, t).state; n++;
  }
}
for (const r in cands) { const by = {}; cands[r].forEach(c => by[c.kind] = (by[c.kind] || 0) + 1); console.error(r, cands[r].length, JSON.stringify(by)); }
const KINDS = ['enter', 'cap', 'home', 'safe', 'escape'];
const used = new Set(), ukey = c => JSON.stringify([c.s.pos, c.t.v, c.s.r]);
const strip = ({ s, t, ok, best, look }) => ({ s, t, ok, best, look });
// lessons: per rule, basics (enter, cap, home) and tactics (safe, escape). ramp = an explained example + an easy example; 5 problems
const CATS = [['lb', 'ludo', ['enter', 'cap', 'home']], ['lt', 'ludo', ['safe', 'escape']], ['pb', 'pachisi', ['enter', 'cap', 'home']], ['pt', 'pachisi', ['safe', 'escape']]];
const lessons = { version: 2, score: { per: 20, hint: [16, 12], retry: 10, answer: 0, pass: 75 }, cats: [], steps: [] };
for (const [cid, rule, kinds] of CATS) {
  const cat = { id: cid, rule, steps: [] };
  for (const kind of kinds) {
    const pool = cands[rule].filter(c => c.kind === kind).sort((a, b) => b.margin - a.margin);
    // the clearest positions with few pieces for the warm-up, then 5 problems spread over the rest (easy → harder)
    const easy = pool.filter(c => c.nPcs <= 3).slice(0, 12);
    const ex = easy[0] || pool[0], ex2 = easy.find(c => c !== ex) || pool[1];
    [ex, ex2].forEach(c => used.add(ukey(c)));
    const rest = pool.filter(c => !used.has(ukey(c)));
    const probs = []; const stepN = Math.max(1, Math.floor(rest.length / 10));
    for (let i = 0; i < rest.length && probs.length < 5; i += stepN) probs.push(rest[i]);
    probs.forEach(c => used.add(ukey(c)));
    const id = (rule === 'ludo' ? 'l_' : 'p_') + kind;
    cat.steps.push(id);
    lessons.steps.push({ id, cat: cid, rule, kind, diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, t: ex.t, marks: ex.marks }, Object.assign({ k: 'move' }, strip(ex2))],
      problems: probs.map(strip) });
  }
  lessons.cats.push(cat);
}
// puzzles: a theme per rule × kind, easy (big margin) first; stages of 10
const puzzles = { version: 2, cats: [{ id: 'ludo' }, { id: 'pachisi' }], themes: [], daily: [] };
for (const rule of ['ludo', 'pachisi']) for (const kind of KINDS) {
  const pool = cands[rule].filter(c => c.kind === kind && !used.has(ukey(c))).sort((a, b) => b.margin - a.margin).slice(0, 50);
  pool.forEach(c => used.add(ukey(c)));
  const id = rule + '-' + kind;
  puzzles.themes.push({ id, cat: rule, rule, kind, puzzles: pool.map(c => Object.assign(strip(c), { d: c.margin >= 14 ? 1 : c.margin >= 8 ? 2 : 3 })) });
  puzzles.daily.push(id);
}
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(lessons));
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(puzzles));
console.log('lessons', lessons.steps.map(l => l.id + ':' + l.problems.length).join(' '));
console.log('puzzles', puzzles.themes.map(t => t.id + ':' + t.puzzles.length).join(' '));
