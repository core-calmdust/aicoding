// Builds lessons.json for Agon. Every problem's answer set is computed from the rules / the engine:
//   ok   = the full set of correct moves for the lesson's goal (any of them scores 20)
//   sc   = engine values of all moves (partial points) for the judgement lessons
// Positions: random but sensible ones built round the lesson's idea (seeded), and AI self-play positions.
// Warm-up ramps (step.ramp, not scored) come from tools/lesson_ramps.js.
// node tools/gen_lessons.js > lessons.json
const E = require('../engine.js'); E.setRule('std');
const path = require('path');
const { keepLangs } = require(path.join(__dirname, '../../tools', 'keep-langs.js'));   // keeps ru / zh-TW / id / tr of unchanged texts
let seed = 1842; const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const ri = n => Math.floor(rand() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const real = pos => pos.moves().filter(m => m !== E.PASS);
const N = E.N, C = E.CENTER;
const cellsOfRing = k => E.RINGL[k].slice();
// ---------------------------------------------------------------- random positions
// opts: { wq: ring of White's queen (or 'T'), bq, wg: [rings of White's guards], bg: [...], side }
function build(o) {
  const b = Array(N).fill('.');
  const free = k => shuffle(cellsOfRing(k).filter(i => b[i] === '.'));
  const put = (ch, ring) => { if (ring === 'T') { if (b[C] !== '.') return false; b[C] = ch; return true; } const f = free(ring); if (!f.length) return false; b[f[0]] = ch; return true; };
  if (o.wq != null && !put('W', o.wq)) return null;
  if (o.bq != null && !put('B', o.bq)) return null;
  for (const r of o.wg || []) if (!put('w', r)) return null;
  for (const r of o.bg || []) if (!put('b', r)) return null;
  return E.Pos.from({ b: b.join(''), side: o.side || 1, n: o.n || 40 });
}
const pickRing = (lo, hi) => lo + ri(hi - lo + 1);
// a full set of pieces with rings biased inwards (a middle game)
function midgame(side, inner) {
  const g = () => Array.from({ length: 6 }, () => pickRing(inner ? 1 : 2, 5));
  return build({ wq: pickRing(inner ? 1 : 2, 4), bq: pickRing(inner ? 1 : 2, 4), wg: g(), bg: g(), side });
}
// no position that is already over, no pieces in danger of a "free" immediate win either way
const quiet = p => !E.judge(p).over;
const val = (p, d) => { const r = E.analyze(p.spec(), [], 400 + d * 300); return r.list; };
// ---------------------------------------------------------------- self-play positions
const POS = [];
for (let g = 0; g < 26; g++) {
  const mv = [], lv = [6 + ri(6), 6 + ri(6)];
  for (let i = 0; i < 220; i++) {
    const { pos, hashes } = E.replay(null, mv);
    if (E.judge(pos, hashes).over) break;
    if (i > 6) POS.push(pos.clone());
    const r = E.think(null, mv, lv[pos.side], rand); if (r.move == null || r.move < 0) break;
    mv.push(r.move);
  }
}
shuffle(POS);
console.error('positions', POS.length);
const used = new Set();
const fresh = p => { const k = p.spec().b + p.side; if (used.has(k)) return false; used.add(k); return true; };
function gather(make, test, n, id, tries) {
  const out = [];
  for (let k = 0; k < (tries || 40000) && out.length < n; k++) {
    const p = make(k); if (!p || !quiet(p)) continue;
    const r = test(p); if (!r) continue;
    if (!fresh(p)) continue;
    const s = p.spec(); delete s.n; s.n = 40;
    out.push(Object.assign({ s }, r));
  }
  if (out.length < n) console.error('only', out.length, 'for', id);
  return out;
}
const fromPool = side => k => { const p = POS[k % POS.length]; return p && p.turn === side ? p.clone() : null; };
const okOf = (L, best) => ({ ok: L, best: best !== undefined ? best : L[0] });
const scOf = (p, d) => { const L = val(p, d); return { sc: L.map(e => [e.m, e.v]), best: L[0].m }; };
// moves that do not leave one of my pieces to be captured next move (when nothing hung before)
const safe = (p, m) => { const q = p.clone().play(m); return E.hanging(q, p.turn).n === 0; };
// ---------------------------------------------------------------- lesson problems
const steps = [];
const RAMP = require('./lesson_ramps.js').RAMPS;
const add = (id, course, problems, ramp) => { const st = { id, course, problems }; if (ramp) st.ramp = ramp; steps.push(st); console.error(id, problems.length); };

// 1 a step inwards (a safe one), when sideways moves are also possible
add('b_step', 'basics', gather(k => midgame(1, false), p => {
  if (p.phase() !== 'move' || E.hanging(p, 1).n) return null;
  const L = real(p); if (L.some(m => p.capsOf(m).length)) return null;
  const ok = L.filter(m => E.RING[E.mTo(m)] < E.RING[E.mFrom(m)] && safe(p, m));
  if (ok.length < 2 || ok.length > 8 || L.length - ok.length < 6) return null;
  return okOf(ok);
}, 5, 'b_step'), RAMP.b_step);

// 2 the queen takes the throne (guards may not)
add('b_throne', 'basics', gather(k => build({ wq: 1, bq: pickRing(2, 4), wg: Array.from({ length: 6 }, () => pickRing(1, 4)), bg: Array.from({ length: 6 }, () => pickRing(2, 5)) }), p => {
  if (p.phase() !== 'move' || E.hanging(p, 1).n) return null;
  const L = real(p), ok = L.filter(m => E.mTo(m) === C);
  if (ok.length !== 1 || !safe(p, ok[0])) return null;
  return okOf(ok);
}, 5, 'b_throne'), RAMP.b_throne);

// 3 capture: sandwich an enemy piece
add('b_capture', 'basics', gather(k => midgame(1, k % 2 === 0), p => {
  if (p.phase() !== 'move') return null;
  const L = real(p), ok = L.filter(m => p.capsOf(m).length);
  if (!ok.length || ok.length > 2 || L.length < 10) return null;
  return okOf(ok);
}, 5, 'b_capture'), RAMP.b_capture);

// 4 your captured guard goes back to the edge: pick a good cell (engine values, partial points)
add('b_reloc', 'basics', gather(k => {
  const p = midgame(1, true); if (!p) return null;
  const g = []; for (let i = 0; i < N; i++) if (p.sq[i] === 1 && E.RING[i] <= 3) g.push(i);
  if (!g.length) return null; const q = p.spec(); const a = q.b.split(''); a[g[0]] = 'x'; q.b = a.join(''); return E.Pos.from(q);
}, p => {
  if (p.phase() !== 'guard') return null;
  const r = scOf(p, 2), vs = r.sc.map(e => e[1]);
  if (vs[0] - vs[vs.length - 1] < 120) return null;
  return r;
}, 4, 'b_reloc'), RAMP.b_reloc);

// 5 a piece in danger: save it (no piece left to be captured)
add('b_safe', 'basics', gather(k => midgame(1, k % 2 === 0), p => {
  if (p.phase() !== 'move') return null;
  const h = E.hanging(p, 1); if (h.n !== 1 || h.q) return null;
  const L = real(p); if (L.some(m => p.capsOf(m).length)) return null;
  const ok = L.filter(m => safe(p, m));
  if (!ok.length || ok.length > 4 || L.length < 8) return null;
  return okOf(ok);
}, 5, 'b_safe'), RAMP.b_safe);

// 6 finish: queen on the throne, five guards round her, bring in the sixth
add('b_finish', 'basics', gather(k => {
  const b = Array(N).fill('.'); b[C] = 'W';
  const ring = shuffle(E.INNER.slice()); const gap = ring[0];
  for (const i of ring.slice(1)) b[i] = 'w';
  // the sixth guard somewhere on ring 2 (next to the gap or not)
  const r2 = shuffle(cellsOfRing(2)); b[r2[0]] = 'w';
  const bl = shuffle(cellsOfRing(2).concat(cellsOfRing(3), cellsOfRing(4)).filter(i => b[i] === '.'));
  for (let j = 0; j < 6; j++) b[bl[j]] = 'b';
  const bq = shuffle(cellsOfRing(3).concat(cellsOfRing(4)).filter(i => b[i] === '.'))[0]; b[bq] = 'B';
  return E.Pos.from({ b: b.join(''), side: 1, n: 80 });
}, p => {
  if (p.phase() !== 'move') return null;
  const L = real(p), ok = L.filter(m => E.judge(p.clone().play(m)).winner === 1);
  if (ok.length !== 1) return null;
  return okOf(ok);
}, 4, 'b_finish'), RAMP.b_finish);

// 7 block: the opponent would win next move — stop it (any move after which it cannot win at once)
add('s_block', 'strategy', gather(k => {
  const b = Array(N).fill('.'); b[C] = 'B';
  const ring = shuffle(E.INNER.slice()), gap = ring[0];
  for (const i of ring.slice(1)) b[i] = 'b';
  const nb = E.NB[gap].filter(i => i >= 0 && E.RING[i] === 2 && b[i] === '.'); if (!nb.length) return null;
  b[shuffle(nb)[0]] = 'b';
  const fr = shuffle(cellsOfRing(2).concat(cellsOfRing(3)).filter(i => b[i] === '.'));
  for (let j = 0; j < 6; j++) b[fr[j]] = 'w';
  b[shuffle(cellsOfRing(2).concat(cellsOfRing(3)).filter(i => b[i] === '.'))[0]] = 'W';
  return E.Pos.from({ b: b.join(''), side: 1, n: 80 });
}, p => {
  if (p.phase() !== 'move') return null;
  const L = real(p);
  const wins = q => real(q).some(m => E.judge(q.clone().play(m)).winner === 2);
  if (!wins((() => { const q = p.clone(); q.side = 1; return q; })())) return null;
  const ok = L.filter(m => { const q = p.clone().play(m); return E.judge(q).winner === 1 || !wins(q); });
  if (!ok.length || ok.length > 3) return null;
  return okOf(ok);
}, 5, 's_block'), RAMP.s_block);

// 8 capture the queen on the throne (two of yours on opposite sides of her)
add('s_queencap', 'strategy', gather(k => build({ bq: 'T', wq: pickRing(2, 4), wg: [1, 1, 2, 2, 3, 4].map(r => k % 3 ? r : pickRing(1, 4)), bg: Array.from({ length: 6 }, () => pickRing(1, 3)) }), p => {
  if (p.phase() !== 'move') return null;
  const L = real(p), ok = L.filter(m => p.capsOf(m).includes(C));
  if (!ok.length || ok.length > 2) return null;
  return okOf(ok);
}, 5, 's_queencap'), RAMP.s_queencap);

// 9 two at once: a move that captures two pieces
add('s_double', 'strategy', gather(k => { const g = () => Array.from({ length: 6 }, () => pickRing(1, 3)); return build({ wq: pickRing(1, 3), bq: pickRing(1, 3), wg: g(), bg: g(), side: 1 }); }, p => {
  if (p.phase() !== 'move') return null;
  const L = real(p), ok = L.filter(m => p.capsOf(m).length >= 2);
  if (!ok.length || ok.length > 3) return null;
  return okOf(ok);
}, 4, 's_double', 300000));

// 10 which capture? (several captures: the engine's values decide; capturing a piece deep inside sends it farthest back)
add('s_tempo', 'strategy', gather(k => midgame(1, true), p => {
  if (p.phase() !== 'move') return null;
  const L = real(p), cs = L.filter(m => p.capsOf(m).length === 1);
  if (cs.length < 2) return null;
  const rings = new Set(cs.map(m => E.RING[p.capsOf(m)[0]])); if (rings.size < 2) return null;
  const r = scOf(p, 3); if (!cs.includes(r.best)) return null;
  const v = new Map(r.sc); const bv = v.get(r.best); if (cs.filter(m => v.get(m) >= bv - 40).length > 1) return null;
  return r;
}, 4, 's_tempo'));

// 11 win in two: the queen and guards close in (exact solver)
add('s_win2', 'strategy', gather(k => {
  const b = Array(N).fill('.');
  const throne = k % 2 === 0; b[throne ? C : shuffle(E.INNER.slice())[0]] = 'W';
  const ring = shuffle(E.INNER.filter(i => b[i] === '.'));
  const inn = throne ? 4 : 5; for (let j = 0; j < inn; j++) b[ring[j]] = 'w';
  const r2 = shuffle(cellsOfRing(2).filter(i => b[i] === '.')); for (let j = 0; j < 6 - inn; j++) b[r2[j]] = 'w';
  const fr = shuffle(cellsOfRing(2).concat(cellsOfRing(3), cellsOfRing(4)).filter(i => b[i] === '.'));
  for (let j = 0; j < 6; j++) b[fr[j]] = 'b';
  b[fr[6]] = 'B';
  return E.Pos.from({ b: b.join(''), side: 1, n: 80 });
}, p => {
  if (p.phase() !== 'move') return null;
  if (E.duelMin(p.spec(), [], 2, 'std', 4e5) !== 2) return null;
  const ok = E.duelGood(p.spec(), [], 2, 'std', 4e5); if (!ok || !ok.length || ok.length > 2) return null;
  return okOf(ok);
}, 5, 's_win2'), RAMP.s_win2);

// 12 the best move in a real game (engine values, partial points)
add('s_best', 'strategy', gather(fromPool(1), p => {
  if (p.phase() !== 'move' || p.ply < 30) return null;
  const r = scOf(p, 3), vs = r.sc.map(e => e[1]);
  if (vs.length < 6 || vs[0] - vs[1] < 60 || Math.abs(vs[0]) > 2500) return null;
  return r;
}, 5, 's_best'));

const RUI = require('./lesson_ramps.js').UI;
console.log(JSON.stringify(keepLangs({ version: 1, steps, rampUi: RUI }, path.join(__dirname, '..', 'lessons.json'))));
