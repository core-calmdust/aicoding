// One-off (2026-10-21): replace puzzles whose fun score (tools/fun.js) is below 70 with new puzzles of the same theme,
// rule set, kind and move count n, verified with the engine exactly like the originals:
//   turn — turnMaxFirst: the best first move is unique; goal = its haul, second = the best other first move,
//          line = turnMax().lines[0] (as the app shows it), n = line length
//   pick — exact solve (E.solve): sc = final margin of every pit (null = empty), the best value is unique
//   end  — exact solve: best unique, v / second = best / second-best margin, goal = final stores under perfect play,
//          n = your moves in the perfect line to the end (both sides take the first best move, as the app does)
// The old puzzle is kept in PZ.old["<theme>-<j>"]; the app shows it to players who already have a record for the
// slot, and the daily puzzle keeps it for dates <= PZ.cut. The slot keeps its rating rt (difficulty pips, daily pools).
// Positions come from seeded self-play games (engine levels 3–7) of the theme's rule set, normalised so the player to
// move is side 0; a candidate must have the theme's motif and a seed count in the range of the theme's originals.
// usage: node tools/refresh_fun.js [--dry]   (deterministic; GAMES=<n> replays a run; refuses to run twice)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { funScore, scoreAll, posKey } = require('./fun.js');
const file = path.join(__dirname, '..', 'puzzles.json');
const PZ = JSON.parse(fs.readFileSync(file, 'utf8'));
const DRY = process.argv.includes('--dry');
if (PZ.old && !DRY) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 72, BUDGET_MS = +(process.env.BUDGET || 15 * 60e3), MAX_GAMES = +(process.env.GAMES || 1e9);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261021);
E.setRandom(rng);

const pitSeeds = b => b.slice(0, 6).reduce((a, x) => a + x, 0) + b.slice(7, 13).reduce((a, x) => a + x, 0);
const mirror = b => Int8Array.from([...b.slice(7, 13), b[13], ...b.slice(0, 6), b[6]]);
function lineCap(b, line, rules) { let bb = Int8Array.from(b), c = false; for (const k of line) { const t = E.trace(bb, 0, k, rules); if (t.cap || t.swept) c = true; bb = t.board; } return c; }
// ---------------------------------------------------------------- verification (same rules as the originals)
function mkTurn(b, rules) {
  const g = E.turnMaxFirst(b, 0, rules), legal = E.legal(b, 0);
  if (legal.length < 2) return null;
  const goal = Math.max(...legal.map(k => g[k])), top = legal.filter(k => g[k] === goal);
  if (top.length !== 1 || goal < 3) return null;
  const best = top[0], second = Math.max(...legal.filter(k => k !== best).map(k => g[k]));
  const tm = E.turnMax(b, 0, rules); if (tm.gain !== goal || tm.lines[0][0] !== best) return null;
  return { kind: 'turn', rules, b: Array.from(b), best, goal, line: tm.lines[0], second, n: tm.lines[0].length };
}
function solveSc(b, rules, ms) {
  const s = E.solve(b, 0, rules, ms); if (!s) return null;
  const sc = [0, 1, 2, 3, 4, 5].map(m => { const x = s.list.find(y => y.m === m); return x ? x.v : null; });
  return sc;
}
function uniqBest(sc) {
  const v = sc.filter(x => x !== null); if (v.length < 2) return -1;
  const m = Math.max(...v); if (v.filter(x => x === m).length !== 1) return -1;
  return sc.indexOf(m);
}
function playoutN(b, rules) {
  let bb = Int8Array.from(b), side = 0, n = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (E.sideSum(bb, 0) === 0 || E.sideSum(bb, 1) === 0) break;
    const s = E.solve(bb, side, rules, 4000); if (!s) return -1;
    let best = s.list[0]; for (const x of s.list) if (x.v > best.v) best = x;
    const t = E.trace(bb, side, best.m, rules); if (side === 0) n++;
    bb = t.board; if (t.over) break; side = t.next;
  }
  return n;
}

// ---------------------------------------------------------------- 1) slots to replace
const scores = scoreAll(E, PZ);
const themes = []; PZ.cats.forEach((C, ci) => C.themes.forEach((T, ti) => themes.push({ ci, ti, T, rules: C.rules || T.puzzles[0].rules })));
const thOf = id => themes.find(x => x.T.id === id);
const jobs = scores.filter(s => s.fun < MIN).map(s => { const T = PZ.cats[s.ci].themes[s.ti], P = T.puzzles[s.j]; return { ...s, T, P, kind: P.kind, n: P.n, rt: P.rt }; });
const sig = J => J.id + '|' + J.n;
const need = {}; for (const J of jobs) need[sig(J)] = (need[sig(J)] || 0) + 1;
console.log('to replace', jobs.length, JSON.stringify(need));
// theme ranges / motifs from the originals
const RANGE = {}; for (const x of themes) { const s = x.T.puzzles.map(p => pitSeeds(p.b)); RANGE[x.T.id] = [Math.min(...s), Math.max(...s), x.T.puzzles[0].b.reduce((a, v) => a + v, 0)]; }
function themeOk(id, P) {
  const [lo, hi, tot] = RANGE[id], s = pitSeeds(P.b);
  if (s < lo || s > hi || P.b.reduce((a, v) => a + v, 0) !== tot) return false;
  const b = Int8Array.from(P.b), R = P.rules;
  if (id === 'max' || id === 'combo' || id === 'relay') return lineCap(b, P.line, R);
  if (id === 'chain2') return P.n >= 4;
  if (id === 'cap' || id === 'nCap' || id === 'sCap') return E.trace(b, 0, P.best, R).cap > 0;
  if (id === 'defend' || id === 'nDefend') return Math.max(0, ...E.turnMaxFirst(b, 1, R).filter(x => x !== null)) >= 3;
  if (id === 'trap') { const g = E.turnMaxFirst(b, 0, R), lg = E.legal(b, 0), gm = Math.max(...lg.map(k => g[k])); return g[P.best] !== gm && lg.filter(k => g[k] === gm).every(k => P.sc[P.best] - P.sc[k] >= 4); }
  if (id === 'count') { const sg = Math.sign; return E.legal(b, 0).filter(k => k !== P.best).every(k => sg(P.sc[k]) < sg(P.sc[P.best])); }
  return true;
}

// motif present before solving (cheap): a capture available, an enemy threat, …
function motif(id, b, R) {
  const lg = E.legal(b, 0);
  if (id === 'cap' || id === 'nCap' || id === 'sCap') return lg.some(k => E.trace(b, 0, k, R).cap > 0);
  if (id === 'defend' || id === 'nDefend') return Math.max(0, ...E.turnMaxFirst(b, 1, R).filter(x => x !== null)) >= 3;
  return true;
}
// ---------------------------------------------------------------- 2) mine from self-play
const seen = new Set(); for (const x of themes) for (const p of x.T.puzzles) seen.add(posKey(p));
const kinds = Object.keys(need).map(k => { const [id, n] = k.split('|'); const th = thOf(id); return { k, id, n: +n, rules: th.rules, kind: th.T.puzzles[0].kind, tot: RANGE[id][2] }; });
const pool = {}; for (const K of kinds) pool[K.k] = [];
const want = K => need[K.k] * 2;
const open = () => kinds.filter(K => pool[K.k].length < want(K));
function add(K, P) {
  if (pool[K.k].length >= want(K)) return;
  const key = posKey(P); if (seen.has(key) || pool[K.k].some(x => x.key === key)) return;
  if (!themeOk(K.id, P)) return;
  const f = funScore(E, P, K.id); if (f.fun < TARGET) return;
  pool[K.k].push({ P: JSON.parse(JSON.stringify(P)), key, fun: f.fun, s: pitSeeds(P.b) });
}
const t0 = Date.now(); let games = 0, solves = 0;
const ruleSets = [...new Set(kinds.map(K => K.rules + '/' + K.tot))];
while (open().length && games < MAX_GAMES && (process.env.GAMES || Date.now() - t0 < BUDGET_MS)) {
  const op = open(), rs = [...new Set(op.map(K => K.rules + '/' + K.tot))];
  const [rules, tot] = rs[games % rs.length].split('/'); games++;
  const lvA = 3 + Math.floor(rng() * 5), lvB = 3 + Math.floor(rng() * 5);
  let b = E.initial(+tot / 12), side = 0;
  for (let ply = 0; ply < 300; ply++) {
    if (E.sideSum(b, 0) === 0 || E.sideSum(b, 1) === 0) break;
    const pb = side === 0 ? Int8Array.from(b) : mirror(b);    // the player to move as side 0
    const ks = open().filter(K => K.rules === rules && K.tot === +tot);
    if (ks.length && ply >= 2) {
      const tk = ks.filter(K => K.kind === 'turn');
      if (tk.length) { const P = mkTurn(pb, rules); if (P) for (const K of tk) if (K.n === P.n) add(K, P); }
      const sk = ks.filter(K => K.kind !== 'turn'), s = pitSeeds(pb);
      // cheap prefilter before the exact solve: a position whose depth-6 choice is also the unique greedy haul is
      // too obvious to score well; positions without the motif of any wanted theme are skipped too
      const want2 = sk.filter(K => s >= RANGE[K.id][0] && s <= RANGE[K.id][1] && motif(K.id, pb, rules));
      let obvious = false;
      if (want2.length) {
        const g = E.turnMaxFirst(pb, 0, rules), lg = E.legal(pb, 0), gm = Math.max(...lg.map(k => g[k])), top = lg.filter(k => g[k] === gm);
        if (lg.length < 2) obvious = true;
        else if (top.length === 1) { E.ttClear(); const r = E.chooseMove(pb, 0, rules, 7); obvious = r.move === top[0]; }
      }
      if (want2.length && !obvious) {
        solves++;
        const sc = solveSc(pb, rules, 2500);
        const best = sc ? uniqBest(sc) : -1;
        if (best >= 0) {
          const pk = sk.filter(K => K.kind === 'pick');
          if (pk.length) { const P = { kind: 'pick', rules, b: Array.from(pb), best, sc, n: 1, rt: 0 }; for (const K of pk) add(K, P); }
          const ek = sk.filter(K => K.kind === 'end' && pool[K.k].length < want(K));
          if (ek.length) {
            const v = sc[best], second = Math.max(...sc.filter((x, i) => x !== null && i !== best));
            const T = pb.reduce((a, x) => a + x, 0);
            const n = playoutN(pb, rules);
            if (n > 0) { const P = { kind: 'end', rules, b: Array.from(pb), best, goal: [(T + v) / 2, (T - v) / 2], v, second, n, rt: 0 }; for (const K of ek) if (K.n === n) add(K, P); }
          }
        }
      }
    }
    const lv = side === 0 ? lvA : lvB;
    const mv = E.chooseMove(b, side, rules, lv).move;
    if (mv < 0) break;
    const t = E.trace(b, side, mv, rules); b = t.board;
    if (t.over) break; side = t.next;
  }
  if (games % 20 === 0) console.error('games', games, 'solves', solves, ((Date.now() - t0) / 1000 | 0) + 's', kinds.map(K => K.k + ' ' + pool[K.k].length + '/' + want(K)).join('  '));
}

// ---------------------------------------------------------------- 3) assign (same n; closest seed count; ties → more fun)
const done = [], missing = [], used = new Set();
for (const J of jobs) {
  const c = (pool[sig(J)] || []).filter(x => !used.has(x.key));
  if (!c.length) { missing.push(J); continue; }
  const s0 = pitSeeds(J.P.b), cost = x => Math.abs(x.s - s0) * 0.6 - x.fun * 0.1;
  let bi = 0; for (let k = 1; k < c.length; k++) if (cost(c[k]) < cost(c[bi])) bi = k;
  const r = c[bi]; used.add(r.key);
  const P = r.P; P.rt = J.rt;
  done.push({ J, P, fun: r.fun });
}
const cnt = {}; for (const J of jobs) cnt[J.id] = cnt[J.id] || [0, 0, J.T.puzzles.length];
for (const J of jobs) cnt[J.id][1]++;
for (const d of done) cnt[d.J.id][0]++;
console.log('replaced', done.length, '/', jobs.length, 'games', games, 'solves', solves, ((Date.now() - t0) / 1000 | 0) + 's');
console.log(Object.entries(cnt).map(([k, v]) => `${k} ${v[0]}/${v[1]} (of ${v[2]})`).join(', '));
for (const d of done) console.log(' ', d.J.id + '-' + d.J.j, 'fun', d.J.fun, '→', d.fun, d.P.kind, 'n', d.P.n);
if (!DRY) {
  PZ.old = PZ.old || {}; PZ.cut = CUT;
  for (const d of done) { PZ.old[d.J.id + '-' + d.J.j] = d.J.P; PZ.cats[d.J.ci].themes[d.J.ti].puzzles[d.J.j] = d.P; }
  fs.writeFileSync(file, JSON.stringify(PZ));
}
