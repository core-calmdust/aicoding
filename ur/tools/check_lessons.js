// ur/tools/check_lessons.js — ur/lessons.json の点検
// 局面の正しさ・正解手が合法で深さ3でも明確に最善・理由文と手の性質の一致・choice の答え（hitRisk / raceCount）・10言語・採点設定
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), X = require('./learn_text.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8'));
let bad = 0, nP = 0, nR = 0;
const ng = (id, m) => { bad++; console.log('NG', id, m); };
const has10 = (o, id, k) => { for (const l of X.LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) ng(id, `text ${k} ${l}`); };
const st = s => ({ rule: s.rule, pos: s.pos, turn: 0, winner: -1 });
function checkState(id, s0) {
  const s = st(s0), rl = E.RULES[s.rule];
  if (s.pos[0].length !== rl.pieces || s.pos[1].length !== rl.pieces) ng(id, 'piece count');
  for (const sd of [0, 1]) { const on = s.pos[sd].filter(x => x >= 1 && x <= rl.pathLen); if (new Set(on).size !== on.length) ng(id, 'stacked'); }
  const c0 = new Set(s.pos[0].filter(x => x >= 1 && x <= rl.pathLen).map(x => rl.cell[0][x]));
  if (s.pos[1].some(x => x >= 1 && x <= rl.pathLen && c0.has(rl.cell[1][x]))) ng(id, 'two sides on one square');
  return s;
}
// the reason text must match what the best move does
function checkWhy(id, s, n, best, key) {
  const m = E.legalMoves(s, n).find(x => x.from === best[0]);
  if (!m || m.to !== best[1]) { ng(id, 'best not legal'); return; }
  const alt = E.legalMoves(s, n).filter(x => x.from !== m.from);
  const req = {
    'w.cap': m.capture, 'w.blitz': m.capture && s.rule === 'blitz', 'w.ros': m.rosette, 'w.center': m.to === 8 && s.rule === 'finkel',
    'w.hold': s.pos[0].includes(8) && m.from !== 8, 'w.enter': m.enter, 'w.adv': !m.enter && alt.some(x => x.enter), 'w.goal': m.finish,
    'w.nocap': !m.capture && alt.some(x => x.capture), 'w.escape': true, 'w.safe': true, 'w.race': true, 'w.gen': true,
  }[key];
  if (!req) ng(id, `why ${key} does not match the move ${JSON.stringify(m)}`);
}
function checkMove(id, q, deep) {
  const s = checkState(id, q.s), ms = E.legalMoves(s, q.n);
  if (ms.length < 2) ng(id, 'only one move');
  const ok = q.ok || [q.best];
  for (const o of ok) if (!ms.find(m => m.from === o[0] && m.to === o[1])) ng(id, 'ok not legal ' + o);
  if (deep) {
    const ev = E.evaluate(s, q.n, { depth: 3 });
    if (ev[0].move.from !== ok[0][0]) ng(id, 'depth3 best differs');
    else if (ev.length > 1 && ev[0].wp - ev[1].wp < (s.rule === 'finkel' && !(s.pos[0].some(p => p <= 12) && s.pos[1].some(p => p <= 12)) ? 0.03 : 0.04)) ng(id, 'gap too small ' + (ev[0].wp - ev[1].wp).toFixed(3));
  }
  return s;
}
const deep = !process.argv.includes('--fast');
for (const k of ['ui', 'msg']) for (const x in D[k]) has10(D[k][x], k, x);
if (!D.score || D.score.per !== 20 || D.score.pass !== 75) ng('score', 'per 20 / pass 75');
const ids = new Set();
for (const c of D.cats) { has10(c.name, c.id, 'cat'); for (const s of c.steps) if (!D.steps.find(x => x.id === s)) ng(c.id, 'missing ' + s); }
if (D.steps.length < 10 || D.steps.length > 14) ng('steps', 'count ' + D.steps.length);
for (const L of D.steps) {
  if (ids.has(L.id)) ng(L.id, 'dup id'); ids.add(L.id);
  for (const k of ['title', 'tip', 'body']) has10(L[k], L.id, k);
  (L.hints || []).forEach((h, i) => has10(h, L.id, 'hint' + i));
  if (!L.hints || L.hints.length < 2) ng(L.id, 'hints');
  if (!L.ramp || L.ramp.length < 2 || L.ramp[0].k !== 'explain' || !L.ramp.some(r => r.k === 'try')) ng(L.id, 'ramp explain→try');
  for (const [i, r] of (L.ramp || []).entries()) {
    nR++; const rid = L.id + '/ramp' + i;
    has10(r.t, rid, 't');
    if (r.k === 'explain') { has10(r.body, rid, 'body'); if (r.s) checkState(rid, r.s); if (r.seq && r.seq.length) checkMove(rid, { s: r.s, n: r.n, ok: r.seq }, deep); }
    else { has10(r.h, rid, 'h'); has10(r.g, rid, 'g'); has10(r.y, rid, 'y');
      if (r.kind === 'choice') { if (!(r.ans >= 0 && r.ans < r.opts.length)) ng(rid, 'ans'); } else checkMove(rid, r, deep); }
  }
  if (L.problems.length !== 5) ng(L.id, 'problems ' + L.problems.length);
  for (const [i, q] of L.problems.entries()) {
    nP++; const pid = L.id + '#' + (i + 1);
    if (!X.MSG[q.why[0]]) ng(pid, 'why key');
    if (q.kind === 'move') {
      const s = checkMove(pid, q, deep); checkWhy(pid, s, q.n, q.best, q.why[0]);
      for (const f in q.ng || {}) if (!X.MSG[q.ng[f][0]]) ng(pid, 'ng key');
    } else if (q.kind === 'choice') {
      has10(q.q, pid, 'q');
      if (!(q.ans >= 0 && q.ans < q.opts.length)) ng(pid, 'ans');
      if (new Set(q.opts.map(o => JSON.stringify(o))).size !== q.opts.length) ng(pid, 'dup options');
      // recompute the answers
      if (q.why[0] === 'c.risk') { const s = st(q.s); s.turn = 1; const r = E.hitRisk(s, 0).reduce((a, b) => Math.max(a, b), 0); if (q.opts[q.ans] !== Math.round(r * 16) + '/16') ng(pid, 'risk answer'); }
      if (q.why[0] === 'c.roll') { if (q.opts[q.ans] !== [1, 4, 6, 4, 1][q.why[1].n] + '/16') ng(pid, 'roll answer'); }
      if (q.why[0] === 'c.pips') { const r = E.raceCount(st(q.s)); if (+q.opts[q.ans] !== r.pips[0]) ng(pid, 'pips answer'); }
      if (q.why[0] === 'c.lead') { const r = E.raceCount(st(q.s)); if ((r.pips[0] < r.pips[1] ? 0 : 1) !== q.ans) ng(pid, 'lead answer'); }
    } else ng(pid, 'kind');
  }
}
// no lesson position reused as a puzzle
try {
  const PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8')), K = new Set();
  for (const T of PZ.themes) for (const p of T.puzzles) K.add(E.key(st(p.s)) + '/' + p.n);
  for (const L of D.steps) for (const q of L.problems) if (q.kind === 'move' && K.has(E.key(st(q.s)) + '/' + q.n)) ng(L.id, 'same position as a puzzle');
} catch (e) {}
console.log(`${D.steps.length} lessons, ${nR} ramp items, ${nP} scored problems, problems: ${bad}`);
process.exit(bad ? 1 : 0);
