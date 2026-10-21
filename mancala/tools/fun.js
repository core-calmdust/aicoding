// Mancala puzzle "fun score" (0–100) — how enjoyable a puzzle is for a human, on top of being correct.
// usage: node tools/fun.js            → distribution per theme
//        node tools/fun.js --list     → every puzzle with its score and parts
// Puzzles are verified by the engine (turn: turnMaxFirst / turnMax; pick, end: exact solve); this measures quality.
// The player is always side 0 (pits 0-5, store 6).
//
// Criteria (weights add up to 100):
//  K1 意外性 (30)   the answer is not what a greedy player plays. turn: not the move with the biggest immediate
//                   haul, not the textbook "nearest exact-to-store pit first" start, and a runner-up close enough
//                   that you must really count (goal − second small). pick/end: the reading level a human needs —
//                   1 greedy haul, 2 haul minus the opponent's best reply, 3 deeper — and not the greedy haul.
//  K2 誘惑 (20)     several plausible tries: first moves that also give an extra turn / capture / gain, enough
//                   legal moves, alternatives whose exact value is close to the best.
//  K3 山場・主題 (20) turn: the line uses extra turns that do not exist at the start (created by an earlier sowing)
//                   and/or ends with a capture; pick/end: the theme is really there (a capture for 横取り, a threat
//                   to parry for 守り, a greedy move that backfires for 罠, a result class kept only by one move for
//                   数え切り; end: a reading length that is neither trivial nor tedious).
//  K4 健全さ (15)   turn: one solution line (permutations of the same chain are duals); pick/end: a clear but not
//                   absurd margin to the second best; a single legal move → 0. Identical positions in the set → 0.
//  K5 すっきり (15)  clean layout: few seeds and few non-empty pits on the board, and not a tediously long line.
// Threshold for the 2026-10-21 refresh: 70.
'use strict';
const path = require('path');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

function info(E, b, k, rules) { const t = E.trace(b, 0, k, rules); return { gain: t.board[6] - b[6], extra: t.extra && !t.over, cap: t.cap, over: t.over, board: t.board }; }
function clean(b, n, turn) {
  const seeds = b.slice(0, 6).reduce((a, x) => a + x, 0) + b.slice(7, 13).reduce((a, x) => a + x, 0);
  const total = b.reduce((a, x) => a + x, 0);
  const pits = b.filter((x, i) => i !== 6 && i !== 13 && x > 0).length;
  const fill = clamp(1 - (seeds / total - 0.25) / 0.6, 0.2, 1);    // ≤25 % of the seeds still in play → 1
  const pitS = clamp(1 - (pits - 5) / 8, 0.3, 1);
  const len = n >= 9 ? 0.5 : n >= 7 ? 0.8 : 1;
  // a turn puzzle needs seeds to sow (an opening-like board is natural there), so the seed count weighs less
  return turn ? 0.25 * fill + 0.45 * pitS + 0.3 * len : 0.45 * fill + 0.3 * pitS + 0.25 * len;
}
// the textbook start: of the pits whose seeds end exactly in the store, the one nearest the store
function textbook(b) { for (let k = 5; k >= 0; k--) if (b[k] && b[k] === 6 - k) return k; return -1; }
// does a whole turn starting with k capture somewhere (following the given line)
function lineCaptures(E, b, line, rules) {
  let bb = Int8Array.from(b); let cap = false, sweep = false;
  for (const k of line) { const t = E.trace(bb, 0, k, rules); if (t.cap) cap = true; if (t.swept) sweep = true; bb = t.board; }
  return { cap, sweep };
}

function funTurn(E, P) {
  const b = Int8Array.from(P.b), R = P.rules, legal = E.legal(b, 0);
  const I = legal.map(k => ({ k, ...info(E, b, k, R) }));
  const best = P.best, line = P.line || [best], n = line.length;
  const parts = {};
  const maxImm = Math.max(...I.map(x => x.gain)), bi = I.find(x => x.k === best);
  const otherExtra = I.filter(x => x.k !== best && (x.extra || x.cap)).length;
  const gap = P.goal - P.second;
  parts.K1 = 10 * (bi.gain < maxImm ? 1 : otherExtra ? 0.5 : 0) + 12 * (gap <= 1 ? 1 : gap === 2 ? 0.9 : gap === 3 ? 0.7 : gap <= 5 ? 0.5 : 0.3) +
    8 * (n === 1 ? (bi.extra ? 0.3 : 1) : (best !== textbook(b) ? 1 : 0.25));
  const plaus = I.filter(x => x.k !== best && (x.extra || x.cap || x.gain >= 1)).length;
  parts.K2 = 14 * [0.3, 0.6, 0.85, 1][Math.min(3, plaus)] + 6 * clamp((legal.length - 2) / 2);
  // created extra turns: line moves (not the last) whose pit was not exact-to-store in the start position
  let created = 0;
  for (let i = 0; i < n - 1; i++) { const k = line[i]; if (!(b[k] && (b[k] === 6 - k || (R === 'sunka')))) created++; }
  const lc = lineCaptures(E, b, line, R);
  parts.K3 = 20 * (n === 1 ? (0.4 + 0.4 * (lc.cap || lc.sweep ? 1 : 0) + 0.2 * (bi.gain < maxImm ? 1 : 0)) :
    (R === 'easy' ? 0.75 * clamp(created) : 0.55 * clamp(created) + 0.25 * (lc.cap || lc.sweep ? 1 : 0)) + 0.2 * (n <= 6 ? 1 : 0.5));   // no captures in Easy
  const tm = E.turnMax(b, 0, R), lines = tm.gain === P.goal ? tm.lines.length : 1;
  parts.K4 = 15 * (lines <= 1 ? 1 : lines === 2 ? 0.6 : 0.35);
  parts.K5 = 15 * clean(P.b, n, true);
  return parts;
}
// how a human reads it: level 1 = greedy (biggest haul this turn, extra turns included), level 2 = haul minus the
// opponent's best haul in reply (material only), 3 = neither shows the answer as the unique best
function seeDepth(E, b, R, best) {
  const legal = E.legal(b, 0), g = E.turnMaxFirst(b, 0, R);
  const uniq = f => { const v = legal.map(f), m = Math.max(...v); return v.filter(x => x === m).length === 1 && legal[v.indexOf(m)] === best; };
  if (uniq(k => g[k])) return 1;
  const v2 = k => {
    // follow the best continuation of the turn, then the opponent's best reply turn
    const t = E.trace(b, 0, k, R); let bb = t.board, gain = bb[6] - b[6];
    if (t.extra && !t.over) { const tm = E.turnMax(bb, 0, R); if (tm.lines[0]) { for (const m of tm.lines[0]) bb = E.trace(bb, 0, m, R).board; gain = bb[6] - b[6]; } }
    if (E.sideSum(bb, 0) === 0 || E.sideSum(bb, 1) === 0) return gain;
    const o = E.turnMaxFirst(bb, 1, R).filter(x => x !== null);
    return gain - (o.length ? Math.max(...o) : 0);
  };
  if (uniq(v2)) return 2;
  return 3;
}
function pickLike(E, P, theme, sc) {
  const b = Int8Array.from(P.b), R = P.rules, legal = E.legal(b, 0);
  const I = legal.map(k => ({ k, ...info(E, b, k, R) }));
  const g = E.turnMaxFirst(b, 0, R);
  const best = P.best;
  const gmax = Math.max(...legal.map(k => g[k])), greedy = legal.filter(k => g[k] === gmax);
  const parts = {};
  const notGreedy = !greedy.includes(best);
  const bi = I.find(x => x.k === best), maxImm = Math.max(...I.map(x => x.gain));
  // how deep a plain search must look before it prefers the answer (1 = the greedy haul already shows it)
  const d = seeDepth(E, b, R, best);
  parts.K1 = legal.length < 2 ? 0 : 22 * [0, 0.2, 0.65, 1][d] + 8 * (notGreedy ? 1 : bi.gain < maxImm ? 0.6 : 0);
  let close = 0, margin = 0;
  if (sc) {
    const bv = sc[best], others = legal.filter(k => k !== best).map(k => sc[k]);
    close = others.filter(v => bv - v <= 6).length; margin = others.length ? bv - Math.max(...others) : 0;
  } else { margin = P.v - P.second; close = margin <= 6 ? 1 : 0; }
  parts.K2 = 12 * [0.3, 0.7, 1][Math.min(2, close)] + 8 * (legal.length >= 4 ? 1 : legal.length === 3 ? 0.7 : 0.3);
  let th = 0.6;
  const id = theme;
  if (/cap|Cap/.test(id)) th = (bi.cap || lineCaptures(E, b, [best], R).cap) ? 1 : 0.4;
  else if (/efend/.test(id)) {
    // the opponent threatens something now: its best haul if it were to move, and how much the answer cuts it
    const threat = Math.max(0, ...E.turnMaxFirst(b, 1, R).filter(x => x !== null));
    const after = bi.over ? 0 : Math.max(0, ...E.turnMaxFirst(bi.board, 1, R).filter(x => x !== null));
    th = threat >= 3 && after < threat ? 1 : 0.5;
  } else if (id === 'trap') th = notGreedy && sc && greedy.every(k => sc[best] - sc[k] >= 4) ? 1 : 0.3;
  else if (id === 'count') { const s = v => Math.sign(v); th = sc && legal.filter(k => k !== best).every(k => s(sc[k]) < s(sc[best])) ? 1 : 0.5; }
  else if (P.kind === 'end') { const n = P.n || 1; th = n >= 3 && n <= 7 ? 1 : n <= 2 ? 0.6 : 0.7; if (id === 'end3' && n < 3) th = 0.4; }
  else th = 0.8;                                                   // generic 最善手 themes: K1 already rates the reading
  parts.K3 = 20 * th;
  parts.K4 = legal.length < 2 ? 0 : 15 * (margin <= 0 ? 0 : margin <= 2 ? 0.8 : margin <= 12 ? 1 : margin <= 18 ? 0.8 : 0.6);
  parts.K5 = 15 * clean(P.b, P.n || 1);
  return parts;
}
function funScore(E, P, theme) {
  const parts = P.kind === 'turn' ? funTurn(E, P) : pickLike(E, P, theme, P.kind === 'pick' ? P.sc : null);
  const fun = Math.round(Object.values(parts).reduce((a, b) => a + b, 0));
  return { fun, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 10) / 10])) };
}
const posKey = P => P.rules + ':' + Array.from(P.b).join(',');
function scoreAll(E, PZ) {
  const seen = new Map(), out = [];
  PZ.cats.forEach((C, ci) => C.themes.forEach((T, ti) => T.puzzles.forEach((P, j) => {
    const f = funScore(E, P, T.id), k = posKey(P);
    if (seen.has(k)) { f.fun -= Math.round(f.parts.K4); f.parts.K4 = 0; f.dup = seen.get(k); } else seen.set(k, T.id + '-' + j);
    out.push({ ci, ti, j, id: T.id, ...f });
  })));
  return out;
}
module.exports = { funScore, scoreAll, posKey };

if (require.main === module) {
  const E = require('../engine.js');
  const PZ = require(path.join(__dirname, '..', 'puzzles.json'));
  const all = scoreAll(E, PZ);
  if (process.argv.includes('--list')) for (const r of all) console.log(r.id + '-' + r.j, r.fun, JSON.stringify(r.parts), r.dup ? 'dup of ' + r.dup : '');
  const by = {};
  for (const r of all) (by[r.id] = by[r.id] || []).push(r.fun);
  let low = 0;
  for (const id in by) { const a = by[id].slice().sort((x, y) => x - y), lo = a.filter(x => x < 70).length; low += lo; console.log(id.padEnd(8), 'n', a.length, 'min', a[0], 'med', a[a.length >> 1], 'max', a[a.length - 1], '<70:', lo); }
  console.log('total <70:', low, '/', all.length);
}
