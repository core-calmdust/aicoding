// Amazons lessons → lessons.json (node tools/gen_lessons.js)
// Two courses for a player who does not know the game yet:
//   basics   — b_queen (move like a queen), b_arrow (shoot the arrow), b_block (nothing passes over anything), b_win (leave them no move)
//   strategy — s_trap (box in an enemy amazon), s_escape (get out before you are boxed in), s_wall (wall off a room), s_fill (fill your room without waste)
// Every scored problem: White to move, 5 per step, 20 points each (75 to pass). The right answers (ok) are computed from the rules:
// nothing is judged by the engine's opinion. Each step opens with a warm-up ramp (考え方 → 例題), its texts are i18n keys
// (am-ls / i18n-am-ls.js). Positions are random but seeded, and checked by the conditions below.
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const { Pos, P1, P2, NB, sqName: SQ, sqIdx: IX, mFrom, mTo, mArrow } = E;
let seed = 20261110;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = n => Math.floor(rnd() * n);
const free = (pos, i) => NB[i].filter(x => !pos.sq[x]).length;
const amz = (pos, p) => { const o = []; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f >= 0 && pos.sq[f] === p) o.push(f); } return o; };
function spec(w, b, x) { const a = Array(100).fill('.'); for (const i of x) a[i] = 'x'; for (const i of w) a[i] = 'w'; for (const i of b) a[i] = 'b'; return { b: a.join(''), side: P1 }; }
function randPos(nw, nb, na, avoid) {
  const used = new Set(avoid || []), pick = () => { let i; do i = ri(100); while (used.has(i)); used.add(i); return i; };
  const w = [], b = [], x = []; for (let k = 0; k < nw; k++) w.push(pick()); for (let k = 0; k < nb; k++) b.push(pick()); for (let k = 0; k < na; k++) x.push(pick());
  return { w, b, x };
}
const dist = (a, b) => { const [r0, c0] = E.RC[a], [r1, c1] = E.RC[b]; return Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)); };
const diag = (a, b) => { const [r0, c0] = E.RC[a], [r1, c1] = E.RC[b]; return r0 !== r1 && c0 !== c1; };
const lineClear = (pos, f, t) => E.clearLine(pos.sq, f, t, -1);
function problemsBy(gen, n, tries) {
  const out = [], seen = new Set();
  for (let t = 0; t < (tries || 40000) && out.length < n; t++) { const P = gen(out.length); if (!P) continue; const k = P.s.b; if (seen.has(k)) continue; seen.add(k); out.push(P); }
  if (out.length < n) throw new Error('not enough problems');
  return out;
}
// ---------------------------------------------------------------- basics
// b_queen: one white amazon, a marked square it reaches in one queen move (straight or diagonal, 3+ squares away); the arrow is free
function genQueen(i) {
  const R = randPos(1, 1 + ri(2), 4 + ri(8)), pos = Pos.from(spec(R.w, R.b, R.x)), f = R.w[0];
  const want = i % 2 ? 'diag' : 'line';
  const tos = [...new Set(pos.moves().filter(m => mFrom(m) === f).map(mTo))].filter(t => dist(f, t) >= 3 && (want === 'diag') === diag(f, t));
  if (!tos.length || free(pos, f) < 3) return null;
  const t = tos[ri(tos.length)], ok = pos.moves().filter(m => mTo(m) === t);
  return { s: pos.spec(), ok, best: ok[0], mk: [t] };
}
// b_arrow: a marked square the arrow must hit; it is NOT on a clear line from where the amazon stands now (move first, then shoot)
function genArrow() {
  const R = randPos(1 + ri(2), 1 + ri(2), 3 + ri(6)), pos = Pos.from(spec(R.w, R.b, R.x));
  const all = pos.moves(), cand = new Map();
  for (const m of all) { const a = mArrow(m); if (!cand.has(a)) cand.set(a, []); cand.get(a).push(m); }
  const good = [...cand.entries()].filter(([a, ms]) => ms.length >= 2 && ms.length <= 18 && amz(pos, P1).every(f => !lineClear(pos, f, a) || f === a));
  if (!good.length) return null;
  const [a, ok] = good[ri(good.length)];
  return { s: pos.spec(), ok, best: ok[0], mk: [a] };
}
// b_block: a crowded board — the marked square can be hit only from one or two landing squares (lines are blocked)
function genBlock() {
  const R = randPos(1, 2, 16 + ri(10)), pos = Pos.from(spec(R.w, R.b, R.x)), f = R.w[0];
  if (free(pos, f) < 2) return null;
  const all = pos.moves(), by = new Map();
  for (const m of all) { const a = mArrow(m); if (!by.has(a)) by.set(a, new Set()); by.get(a).add(mTo(m)); }
  const good = [...by.entries()].filter(([a, tos]) => tos.size >= 1 && tos.size <= 2 && a !== f && !lineClear(pos, f, a) && dist(f, a) >= 2);
  if (!good.length) return null;
  const [a] = good[ri(good.length)], ok = all.filter(m => mArrow(m) === a);
  return { s: pos.spec(), ok, best: ok[0], mk: [a] };
}
// b_win: one black amazon (or two) almost boxed in; some White move leaves Black with no move at all
function genWin() {
  const R = randPos(1 + ri(2), 1 + ri(2), 30 + ri(25)), pos = Pos.from(spec(R.w, R.b, R.x));
  if (!pos.canMove(P2) || !pos.canMove(P1)) return null;
  const all = pos.moves(); if (all.length > 400) return null;
  const ok = all.filter(m => { pos.play(m); const r = !pos.canMove(P2); pos.unplay(m); return r; });
  if (!ok.length || ok.length > all.length * 0.3) return null;
  return { s: pos.spec(), ok, best: ok[0] };
}
// ---------------------------------------------------------------- strategy
// s_trap: an enemy amazon with exactly one way out (the game goes on): block that last square
function genTrap() {
  const R = randPos(2, 2 + ri(2), 6 + ri(10)), e = R.b[0], nb = [...NB[e]].filter(i => !R.w.includes(i) && !R.b.includes(i));
  if (nb.length < 3) return null;
  const exit = nb[ri(nb.length)];
  for (const i of nb) if (i !== exit && !R.x.includes(i)) R.x.push(i);
  const pos = Pos.from(spec(R.w, R.b, R.x));
  if (free(pos, e) !== 1 || amz(pos, P2).filter(o => o !== e && free(pos, o) >= 3).length < 1 || amz(pos, P1).some(a => free(pos, a) < 2)) return null;
  const all = pos.moves(), ok = all.filter(m => { pos.play(m); const r = free(pos, e) === 0 && pos.canMove(P2); pos.unplay(m); return r; });
  if (!ok.length || ok.length > all.length * 0.15) return null;
  return { s: pos.spec(), ok, best: ok[0], mk: [e] };
}
// s_escape: one of your amazons has only two empty neighbours and Black could box it in next move; move it out to open space
// (right = that amazon lands on a square with 4+ empty neighbours and Black cannot box it in on the reply)
function boxable(pos, a) {   // can the side to move (Black) leave the amazon on a with no empty neighbour?
  for (const m of pos.moves()) { pos.play(m); const r = free(pos, a) === 0; pos.unplay(m); if (r) return true; }
  return false;
}
function genEscape() {
  const R = randPos(2, 2 + ri(2), 4 + ri(8)), a = R.w[0], nb = [...NB[a]].filter(i => !R.w.includes(i) && !R.b.includes(i));
  if (nb.length < 4) return null;
  const keep = []; while (keep.length < 2) { const i = nb[ri(nb.length)]; if (!keep.includes(i)) keep.push(i); }
  for (const i of nb) if (!keep.includes(i) && !R.x.includes(i)) R.x.push(i);
  const pos = Pos.from(spec(R.w, R.b, R.x));
  if (free(pos, a) !== 2 || free(pos, R.w[1]) < 3) return null;
  { const p2 = pos.clone(); p2.side = 1; if (!boxable(p2, a)) return null; }
  const mine = pos.moves().filter(m => mFrom(m) === a); if (!mine.length) return null;
  const ok = mine.filter(m => { const q = pos.clone().play(m); return free(q, mTo(m)) >= 4 && !boxable(q, mTo(m)); });
  if (!ok.length || ok.length > mine.length * 0.7) return null;
  return { s: pos.spec(), ok, best: ok[0], mk: [a] };
}
// s_wall: a wall of arrows with a single gap; White's amazon at the gap seals it with its arrow, keeping the bigger room for White
// (right = after the move the board is split and White's room is the largest it can be)
function genWall() {
  const col = 3 + ri(4), gap = 1 + ri(8), x = [];
  for (let r = 0; r < 10; r++) if (r !== gap) x.push(r * 10 + col);
  for (let k = 0; k < 3 + ri(5); k++) { const i = ri(100); if (!x.includes(i)) x.push(i); }
  const big = col >= 5 ? 'L' : 'R', side = s => (i => (i % 10 < col) === (s === 'L'));
  const cells = s => [...Array(100).keys()].filter(i => side(s)(i) && i % 10 !== col && !x.includes(i));
  const pickIn = (arr, used) => { const c = arr.filter(i => !used.includes(i)); return c[ri(c.length)]; };
  const used = [...x], w = [], b = [];
  w.push(pickIn(cells(big), used)); used.push(w[0]);
  const gapSq = gap * 10 + col, nearW = [...NB[gapSq]].filter(i => side(big)(i) && !used.includes(i));
  if (!nearW.length) return null; w.push(nearW[ri(nearW.length)]); used.push(w[1]);
  const small = big === 'L' ? 'R' : 'L';
  b.push(pickIn(cells(small), used)); used.push(b[0]); b.push(pickIn(cells(small), used)); used.push(b[1]);
  if (w.some(v => v === undefined) || b.some(v => v === undefined)) return null;
  const pos = Pos.from(spec(w, b, x)); if (pos.terr().sep) return null;
  const all = pos.moves(); let bestD = -1e9; const sc = new Map();
  for (const m of all) { pos.play(m); const T = pos.terr(), d = T.sep ? T.a - T.b : -999; pos.unplay(m); sc.set(m, d); if (d > bestD) bestD = d; }
  if (bestD < 4) return null;
  const ok = all.filter(m => sc.get(m) === bestD);
  if (!ok.length || ok.length > all.length * 0.1) return null;
  return { s: pos.spec(), ok, best: ok[0], mk: [gapSq] };
}
// s_fill: the rooms are split; White's amazon sits in a small, oddly shaped room. Right = a move that keeps the most moves White
// can still make in that room (a wrong arrow cuts off squares — a "defective" room)
function fillCount(pos, a, memo) {   // the most moves the single amazon on a can make (with its own arrows) in its room
  const sq = pos.sq;
  const rec = a => {
    const key = a + '|' + sq.join(''); if (memo.has(key)) return memo.get(key);
    let best = 0; const me = sq[a];
    for (let d = 0; d < 8; d++) for (const t of E.RAYS[a][d]) {
      if (sq[t]) break;
      sq[a] = 0; sq[t] = me;
      for (let e = 0; e < 8; e++) for (const ar of E.RAYS[t][e]) { if (sq[ar]) break; sq[ar] = 3; const v = 1 + rec(t); sq[ar] = 0; if (v > best) best = v; }
      sq[t] = 0; sq[a] = me;
    }
    memo.set(key, best); return best;
  };
  return rec(a);
}
function genFill() {
  // a closed room for White (6–9 squares, carved at random) in one corner; Black far away in its own open room
  const x = new Set([...Array(100).keys()]), room = [], start = [ri(3), ri(3)].map(v => v);
  let cur = start[0] * 10 + start[1]; room.push(cur);
  const want = 7 + ri(4);
  for (let k = 0; k < 200 && room.length < want; k++) { const c = room[ri(room.length)], n = [...NB[c]].filter(i => i % 10 < 5 && Math.floor(i / 10) < 5); const t = n[ri(n.length)]; if (t !== undefined && !room.includes(t)) room.push(t); }
  for (const i of room) x.delete(i);
  const open = []; for (let r = 6; r < 10; r++) for (let c = 5; c < 10; c++) open.push(r * 10 + c);
  for (const i of open) x.delete(i);
  const w = [room[0]], b = [open[ri(open.length)]];
  const pos = Pos.from(spec(w, b, [...x]));
  if (!pos.terr().sep || !pos.canMove(P1)) return null;
  const memo = new Map(), full = fillCount(pos.clone(), w[0], memo);
  const all = pos.moves(); const ok = [];
  for (const m of all) { const q = pos.clone().play(m); const v = 1 + fillCount(q, mTo(m), new Map()); if (v === full) ok.push(m); }
  if (!ok.length || ok.length > all.length * 0.5 || full < room.length - 1) return null;
  return { s: pos.spec(), ok, best: ok[0], room: room.length - 1, full };
}
// ---------------------------------------------------------------- warm-up ramps (fixed, hand-made positions; texts in i18n)
const S = (w, b, x) => spec(w.map(IX), b.map(IX), (x || []).map(IX));
const nm = (s, m) => E.name(Pos.from(s), m);
function tryItem(id, s, okFn, look) {
  const pos = Pos.from(s), ok = pos.moves().filter(m => okFn(m, pos)).map(m => E.name(pos, m));
  if (!ok.length) throw new Error('ramp without answer: ' + id);
  return { k: 'try', s, ok, g: 'rp.' + id + '.g', h: 'rp.' + id + '.h', y: 'rp.' + id + '.y', look: (look || []).map(q => IX(q) + 1) };
}
const ex = (id, s, seq, marks) => ({ k: 'explain', s, seq: seq || [], marks: (marks || []).map(([q, c]) => [IX(q) + 1, c]), t: 'rp.' + id + '.t', body: 'rp.' + id + '.b' });
const RAMPS = {
  b_queen: [
    ex('q1', S(['e5'], ['a10']), [], [['e9', 'ok'], ['e1', 'ok'], ['a5', 'ok'], ['j5', 'ok'], ['a1', 'ok'], ['i9', 'ok'], ['b8', 'ok'], ['h2', 'ok']]),
    tryItem('q2', S(['c3'], ['j10']), (m, p) => mTo(m) === IX('c8'), ['c8']),
  ],
  b_arrow: [
    ex('a1', S(['d4'], ['j10']), ['d4-d8/g8'], [['g8', 'ok']]),
    tryItem('a2', S(['c2'], ['j9']), m => mArrow(m) === IX('h7'), ['h7']),
    tryItem('a3', S(['e5'], ['j10']), m => mArrow(m) === mFrom(m), ['e5']),
  ],
  b_block: [
    ex('k1', S(['b2'], ['j10'], ['b6', 'e5']), [], [['b5', 'ok'], ['d4', 'ok'], ['b7', 'ng'], ['f6', 'ng']]),
    tryItem('k2', S(['c3'], ['j10'], ['c7', 'f3', 'f6']), m => mTo(m) === IX('c6'), ['c6']),
  ],
  b_win: [
    ex('w1', S(['f1'], ['a1'], ['a2', 'b2']), ['f1-c1/b1'], [['a1', 'ng']]),
    tryItem('w2', S(['g3', 'h8'], ['j1'], ['i1', 'i2']), (m, p) => { p.play(m); const r = !p.canMove(P2); p.unplay(m); return r; }, ['j2']),
  ],
  s_trap: [
    ex('t1', S(['e5', 'c8'], ['a10', 'h3'], ['a9', 'b9']), ['e5-e10/b10'], [['b10', 'ok'], ['a10', 'ng']]),
    tryItem('t2', S(['d4', 'h8'], ['j1', 'b9'], ['i1', 'j2']), (m, p) => { p.play(m); const r = free(p, IX('j1')) === 0; p.unplay(m); return r; }, ['i2']),
  ],
  s_escape: [
    ex('e1', S(['a1', 'f6'], ['c4', 'h8'], ['a3', 'c1', 'c2']), [], [['a1', 'ng'], ['a2', 'ok'], ['b1', 'ok'], ['b2', 'ok']]),
    tryItem('e2', S(['j10', 'c3'], ['f6', 'b8'], ['h10', 'j8', 'h8']), (m, p) => mFrom(m) === IX('j10') && free(p.clone().play(m), mTo(m)) >= 4, ['j10']),
  ],
  s_wall: [
    ex('l1', S(['b5', 'e6'], ['h8', 'i2'], ['f1', 'f2', 'f3', 'f4', 'f5', 'f7', 'f8', 'f9', 'f10']), ['e6-e7/f6'], [['f6', 'ok']]),
    tryItem('l2', S(['f3', 'g8'], ['a5', 'b9'], ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd8', 'd9', 'd10']), (m, p) => { p.play(m); const T = p.terr(); p.unplay(m); return T.sep && T.a > T.b; }, ['d7']),
  ],
  s_fill: [
    ex('f1', S(['a1'], ['j10'], ['a3', 'b3', 'c3', 'd3', 'd2', 'd1']), ['a1-b2/a1'], [['a2', 'ok'], ['b1', 'ok'], ['c1', 'ok'], ['c2', 'ok']]),
    tryItem('f2', S(['a1'], ['j10'], ['a4', 'b4', 'b3', 'c3', 'c2', 'c1']), (m, p) => { const q = p.clone().play(m); return 1 + fillCount(q, mTo(m), new Map()) === 4; }, ['a3']),
  ],
};
// ---------------------------------------------------------------- build
const STEPS = [
  { id: 'b_queen', course: 'basics', gen: genQueen },
  { id: 'b_arrow', course: 'basics', gen: genArrow },
  { id: 'b_block', course: 'basics', gen: genBlock },
  { id: 'b_win', course: 'basics', gen: genWin },
  { id: 's_trap', course: 'strategy', gen: genTrap },
  { id: 's_escape', course: 'strategy', gen: genEscape },
  { id: 's_wall', course: 'strategy', gen: genWall },
  { id: 's_fill', course: 'strategy', gen: genFill },
];
const out = { version: 1, steps: [] };
for (const st of STEPS) {
  const t0 = Date.now(), probs = problemsBy(st.gen, 5, st.id === 's_fill' ? 3000 : 60000);
  // check every answer once more against the rules (legal moves only)
  for (const P of probs) { const pos = Pos.from(P.s); for (const m of P.ok) if (!pos.isLegal(m)) throw new Error('illegal answer in ' + st.id); }
  out.steps.push({ id: st.id, course: st.course, ramp: RAMPS[st.id], problems: probs.map(P => ({ s: P.s, ok: P.ok, best: P.best, mk: P.mk || [] })) });
  console.log(st.id, probs.map(P => P.ok.length).join(','), (Date.now() - t0) + 'ms');
}
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(out));
console.log('lessons.json', fs.statSync(path.join(__dirname, '..', 'lessons.json')).size, 'bytes');
