// One-off (2026-10-21): replace puzzles whose fun score (tools/fun.js) is below 70 with new puzzles of the same
// theme, kind, goal and move count, verified with the engine exactly like the originals:
//   mate  — mateList: exactly one first move connects four within n (n = the fastest), pv = stubborn defence line
//   'b'   — exact solver values for every column (solveMove strong); exactly one move keeps the result
//   's'   — several such only-moves in a row, opponent replies = one of its best moves
// The old puzzle is kept in PZ.old["<theme>:<j>"]; the app shows it to players who already have a record for the
// slot, and the daily puzzle keeps it for dates <= PZ.cut.
// Positions come from seeded self-play games (heuristic engine + noise, never missing a four or a block), so they
// look like real games. Difficulty: the slot keeps its D; the candidate with the closest predicted D (linear fit on
// the original set, see dfit) is chosen, ties → more fun.
// usage: node tools/refresh_fun.js [--dry]   (deterministic seed; refuses to run twice; GAMES=<n> to replay a run)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const U = require('./c4util.js');
const { funScore, scoreAll } = require('./fun.js');
const file = path.join(__dirname, '..', 'puzzles.json');
const PZ = JSON.parse(fs.readFileSync(file, 'utf8'));
const DRY = process.argv.includes('--dry');
if (PZ.old && !DRY) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 72, BUDGET_MS = +(process.env.BUDGET || 18 * 60e3);

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261021);
const PREF = [3, 2, 4, 1, 5, 0, 6];

// ---------------------------------------------------------------- verification helpers
// the app's line: attacker = fastest win (centre first), defender = most stubborn reply (centre first)
function matePV(mv, ans, n) {
  let m = mv + (ans + 1), pv = String(ans + 1), left = n - 1;
  while (left > 0) {
    const dl = E.defendList(m, left);
    let best = null; for (const c of PREF) { const e = dl.find(x => x.c === c); if (!e) continue; const v = e.need || 99; if (!best || v > best.v) best = { c, v }; }
    if (!best || best.v === 99) return null;                      // the defender escapes: not a sound puzzle
    m += best.c + 1; pv += best.c + 1;
    const al = E.mateList(m, left);
    let a = null; for (const c of PREF) { const e = al.find(x => x.c === c); if (e && e.need && e.need <= left && (!a || e.need < a.need)) a = e; }
    if (!a) return null;
    m += a.c + 1; pv += a.c + 1; left--;
  }
  return pv;
}
// mate puzzle check: returns { n, answer } when exactly one move wins fastest within maxN
function mateCheck(mv, maxN) {
  const ml = E.mateList(mv, maxN).filter(e => e.need);
  if (!ml.length) return null;
  const n = Math.min(...ml.map(e => e.need)), win = ml.filter(e => e.need === n);
  if (win.length !== 1) return null;
  return { n, answer: win[0].c };
}
// exact values of every column, null for a full column; null overall if a solve runs too long
function exactSc(mv) {
  const sc = [];
  for (let c = 0; c < 7; c++) {
    E.loadMoves(mv);
    if (U.grid(mv)[c].length >= 6) { sc.push(null); continue; }
    E.setDeadline(Date.now() + 6000);
    const v = E.solveMove(c, false); E.setDeadline2();
    if (v === null) return null;
    sc.push(v);
  }
  return sc;
}
function weakSc(mv) {
  const sc = [];
  for (let c = 0; c < 7; c++) {
    E.loadMoves(mv);
    if (U.grid(mv)[c].length >= 6) { sc.push(null); continue; }
    E.setDeadline(Date.now() + 3000);
    const v = E.solveMove(c, true); E.setDeadline2();
    if (v === null) return null;
    sc.push(Math.sign(v));
  }
  return sc;
}
// only move: goal win → exactly one column > 0; draw → none > 0 and exactly one = 0; def → exactly one >= 0
function onlyMove(sc, goal) {
  const v = sc.map(x => (x === null ? null : x));
  const good = goal === 'win' ? v.filter(x => x !== null && x > 0) : goal === 'draw' ? v.filter(x => x !== null && x >= 0) : v.filter(x => x !== null && x >= 0);
  if (goal === 'draw' && v.some(x => x !== null && x > 0)) return -1;
  if (good.length !== 1) return -1;
  return v.findIndex(x => x !== null && (goal === 'win' ? x > 0 : x >= 0));
}

// ---------------------------------------------------------------- difficulty predictor (fit on the original set)
function feats(P) {
  const g = U.grid(P.moves), pl = U.toMove(P.moves), a = P.k === 's' ? P.steps[0].a : P.answer;
  const plaus = U.legal(g).filter(c => c !== a && !U.obviousLoss(g, c, pl)).length;
  E.clearHT(); E.loadMoves(P.moves); E.setDeadline2();
  const r = E.rootHeur(2), me = r.find(x => x.c === a), rank = r.filter(x => x.c !== a && x.s > me.s).length;
  if (!P.k) return [1, P.n, P.moves.length / 10, plaus, rank, U.exMate(P.moves, a, P.n)[0] === 'set' ? 1 : 0];
  const st = P.k === 's' ? P.steps[0] : P;
  return [1, P.moves.length / 10, plaus, rank, Math.abs(st.sc[a]), P.k === 's' ? P.steps.length : 0, P.goal === 'draw' ? 1 : 0];
}
function fit(X, y) {
  const n = X[0].length, A = Array.from({ length: n }, () => Array(n + 1).fill(0));
  X.forEach((x, i) => { for (let a = 0; a < n; a++) { for (let b = 0; b < n; b++) A[a][b] += x[a] * x[b]; A[a][n] += x[a] * y[i]; } });
  for (let a = 0; a < n; a++) A[a][a] += 1e-6;
  for (let i = 0; i < n; i++) {
    let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
    [A[i], A[m]] = [A[m], A[i]];
    for (let k = 0; k < n; k++) if (k !== i) { const f = A[k][i] / A[i][i]; for (let j = i; j <= n; j++) A[k][j] -= f * A[i][j]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}
const W = {};
for (const kind of ['m', 'b']) {
  const X = [], y = [];
  for (const lv of PZ.levels) for (const P of lv.puzzles) if ((P.k ? 'b' : 'm') === kind) { X.push(feats(P)); y.push(P.D); }
  W[kind] = fit(X, y);
}
const predD = P => feats(P).reduce((s, v, i) => s + v * W[P.k ? 'b' : 'm'][i], 0);

// ---------------------------------------------------------------- 1) slots to replace
const scores = scoreAll(E, PZ);
const jobs = scores.filter(s => s.fun < MIN).map(s => {
  const lv = PZ.levels[s.li], P = lv.puzzles[s.j];
  return { li: s.li, j: s.j, id: lv.id, P, fun: s.fun, kind: P.k || 'm', n: P.n, goal: P.goal, steps: P.k === 's' ? P.steps.length : 0, D: P.D };
});
const sig = J => J.id + '|' + J.kind + '|' + (J.n || '') + '|' + (J.goal || '') + '|' + (J.steps || '');
const need = {}; for (const J of jobs) need[sig(J)] = (need[sig(J)] || 0) + 1;
console.log('to replace', jobs.length, need);

// theme rules for candidates
function themeOk(id, P) {
  if (/^w\d$/.test(id)) return P.n === +id.slice(1);
  if (id === 'dbl') { const ex = U.exMate(P.moves, P.answer, P.n)[0]; return ex === 'dbl' || ex === 'stk'; }
  if (id === 'long') return P.n >= 7;
  if (id === 'endg') return P.moves.length >= 29;
  if (id === 'silent') { const g = U.grid(P.moves); return U.newThreats(g, P.answer, U.toMove(P.moves)).length === 0; }
  if (id === 'edge') return P.answer === 0 || P.answer === 6;
  if (id === 'par') { const ex = U.exBest(P.moves, P.answer)[0]; return ex === 'even' || ex === 'odd'; }
  return true;
}

// ---------------------------------------------------------------- 2) natural positions from self-play
const seen = new Set();
const posKey = mv => { const g = U.grid(mv); const a = g.map(c => c.join('')).join('/'), b = g.slice().reverse().map(c => c.join('')).join('/'); return a < b ? a : b; };
for (const lv of PZ.levels) for (const P of lv.puzzles) seen.add(posKey(P.moves));
function selfPlay() {
  let m = '';
  const noise = 6 + rng() * 30, openRand = 2 + Math.floor(rng() * 5);
  for (;;) {
    const g = U.grid(m), p = U.toMove(m), L = U.legal(g);
    if (!L.length) return m;
    const w = U.immWins(g, p); if (w.length) return m;         // the game would end here: positions before it are enough
    const bl = U.immWins(g, 3 - p);
    let c;
    if (bl.length) c = bl[0];
    else {
      const safe = L.filter(x => !U.immWins(U.play(g, x, p), 3 - p).length);
      const S = safe.length ? safe : L;
      if (m.length < openRand) c = S[Math.floor(rng() * S.length)];
      else {
        E.loadMoves(m); E.setDeadline2();
        const r = E.rootHeur(2).filter(x => S.includes(x.c));
        let best = -Infinity;
        for (const x of r) { const v = Math.max(-1e4, Math.min(1e4, x.s)) + rng() * noise; if (v > best) { best = v; c = x.c; } }
        if (c === undefined) c = S[0];
      }
    }
    m += c + 1;
  }
}

// ---------------------------------------------------------------- 3) mine
const pool = {}; for (const k in need) pool[k] = [];
const want = k => need[k] * 3;
const kinds = Object.keys(need).map(k => { const [id, kind, n, goal, steps] = k.split('|'); return { k, id, kind, n: +n || 0, goal, steps: +steps || 0 }; });
const full = () => kinds.every(K => pool[K.k].length >= want(K.k));
const t0 = Date.now(); let games = 0, tested = 0;
function add(K, P) {
  if (pool[K.k].length >= want(K.k)) return false;
  const key = posKey(P.moves); if (seen.has(key) || pool[K.k].some(x => x.key === key)) return false;
  if (!themeOk(K.id, P)) return false;
  const f = funScore(E, P, K.id); if (f.fun < TARGET) return false;
  // a candidate may sit in several pools (e.g. a win-in-2 for both 2手で勝て and ダブルリーチ); used once at assignment
  pool[K.k].push({ P: JSON.parse(JSON.stringify(P)), key, fun: f.fun, pd: predD(P) });
  return true;
}
const mateKinds = kinds.filter(K => K.kind === 'm'), bKinds = kinds.filter(K => K.kind === 'b'), sKinds = kinds.filter(K => K.kind === 's');
// Positions are tested where puzzles of each kind naturally occur: forced wins in the last plies before the game's
// end (the winner to move, 1–11 plies before the end for 1–6 moves, 13–19 plies for the long ones), only-move
// positions (exact solver) anywhere from 14 stones on.
function mateAt(mv, mk) {
  const maxN = Math.max(...mk.map(K => K.n));
  const r = mateCheck(mv, maxN); if (!r) return;
  for (const K of mk) {
    if (K.n !== r.n) continue;
    const pv = matePV(mv, r.answer, r.n); if (!pv) continue;
    add(K, { moves: mv, n: r.n, answer: r.answer, D: 0, pv, ex: U.exMate(mv, r.answer, r.n) });
  }
}
function bestAt(mv, bk, sk) {
  const g = U.grid(mv), p = U.toMove(mv);
  if (U.immWins(g, p).length || U.immWins(g, 3 - p).length > 1) return;
  if (U.legal(g).filter(c => !U.obviousLoss(g, c, p)).length < 2) return;
  const ws = weakSc(mv); if (!ws) return;
  let sc = null;
  for (const goal of ['win', 'draw', 'def']) {
    const ks = goal === 'def' ? sk : bk.filter(K => K.goal === goal && (K.id !== 'endg' || mv.length >= 29));
    if (!ks.length || onlyMove(ws, goal) < 0) continue;
    sc = sc || exactSc(mv); if (!sc) return;
    const a = onlyMove(sc, goal); if (a < 0) continue;
    if (goal !== 'def') { const P = { moves: mv, k: 'b', goal, sc, answer: a, D: 0, ex: U.exBest(mv, a) }; for (const K of ks) add(K, P); continue; }
    for (const K of ks) {
      // extend: reply r = a best opponent move after which the next step is again an only move
      let m = mv + (a + 1); const steps = [{ sc, a }]; let ok = true;
      while (steps.length < K.steps) {
        const osc = exactSc(m); if (!osc) { ok = false; break; }
        const bestV = Math.max(...osc.filter(x => x !== null));
        let found = false;
        for (const r of PREF) {
          if (osc[r] !== bestV) continue;
          const m2 = m + (r + 1), g2 = U.grid(m2);
          if (U.immWins(g2, U.toMove(m2)).length) continue;
          const sc2 = exactSc(m2); if (!sc2) continue;
          const a2 = onlyMove(sc2, 'def'); if (a2 < 0) continue;
          steps[steps.length - 1].r = r; steps.push({ sc: sc2, a: a2 }); m = m2 + (a2 + 1); found = true; break;
        }
        if (!found) { ok = false; break; }
      }
      if (ok) add(K, { moves: mv, k: 's', goal: 'def', steps, D: 0, ex: U.exBest(mv, a) });
    }
  }
}
const MAX_GAMES = +(process.env.GAMES || 1e9);   // GAMES=<n> replays a run exactly (the time budget only decides when to stop)
while (!full() && games < MAX_GAMES && (process.env.GAMES || Date.now() - t0 < BUDGET_MS)) {
  const game = selfPlay(); games++;
  const L = game.length;                                     // the mover at L has a four available (or the board is full)
  const mk = mateKinds.filter(K => pool[K.k].length < want(K.k));
  if (mk.length) for (let d = 0; d <= 19; d += 2) {
    const i = L - d; if (i < 6) break;
    const ks = mk.filter(K => (K.n <= 6 ? d <= 11 : d >= 13 && i <= 24));
    if (ks.length) { tested++; mateAt(game.slice(0, i), ks); }
  }
  const bk = bKinds.filter(K => pool[K.k].length < want(K.k)), sk = sKinds.filter(K => pool[K.k].length < want(K.k));
  if (bk.length || sk.length) for (let i = Math.max(14, L - 26); i < L; i++) { tested++; bestAt(game.slice(0, i), bk, sk); }
  if (games % 10 === 0) console.error('games', games, 'pos', tested, ((Date.now() - t0) / 1000 | 0) + 's', kinds.map(K => K.k.split('|').slice(0, 2).join('') + (K.n || '') + (K.goal || '') + ' ' + pool[K.k].length + '/' + want(K.k)).join('  '));
}

// ---------------------------------------------------------------- 4) assign: closest predicted difficulty, ties → more fun
const done = [], missing = [], used = new Set();
const byOrder = jobs.slice().sort((a, b) => a.D - b.D);
for (const J of byOrder) {
  const c = (pool[sig(J)] || []).filter(x => !used.has(x.key));
  if (!c.length) { missing.push(J); continue; }
  let bi = 0; const cost = x => Math.abs(x.pd - J.D) - x.fun * 0.08;
  for (let k = 1; k < c.length; k++) if (cost(c[k]) < cost(c[bi])) bi = k;
  const r = c[bi]; used.add(r.key);
  const P = r.P; P.D = J.D;                                      // the slot keeps its difficulty (order within the theme)
  done.push({ J, P, fun: r.fun, pd: Math.round(r.pd * 10) / 10 });
}
const cnt = {};
for (const J of jobs) { const k = J.id; cnt[k] = cnt[k] || [0, PZ.levels[J.li].puzzles.length]; }
for (const d of done) cnt[d.J.id][0]++;
console.log('replaced', done.length, '/', jobs.length, JSON.stringify(cnt), 'games', games, 'positions', tested, ((Date.now() - t0) / 1000 | 0) + 's');
for (const d of done) console.log(' ', d.J.id + ':' + d.J.j, 'fun', d.J.fun, '→', d.fun, 'D', d.J.D, 'pred', d.pd, d.P.moves);
for (const J of missing) console.log('  not replaced', J.id + ':' + J.j, sig(J));
if (!DRY) {
  PZ.old = PZ.old || {}; PZ.cut = CUT;
  for (const d of done) { PZ.old[d.J.id + ':' + d.J.j] = d.J.P; PZ.levels[d.J.li].puzzles[d.J.j] = d.P; }
  fs.writeFileSync(file, JSON.stringify(PZ));
}
