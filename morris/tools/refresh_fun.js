// One-off (2026-10-21): replace Morris puzzles whose fun score (fun.js) is below 70 with new puzzles of the same theme,
// goal and move count (so each theme still goes easy → hard), mined around the theme's existing positions and verified
// with the engine exactly like the app does (mate() / mill(): forced win / mill in exactly N, one key move).
// Players keep the old puzzle where they already have a record for that slot (the app reads D.old), and the daily
// puzzle keeps the old content for dates <= D.cut.
// usage:
//   node refresh_fun.js <puzzles*.json> mine <out.jsonl> [k/m]   find replacements (shard k of m; resumable, deterministic per slot)
//   node refresh_fun.js <puzzles*.json> apply <in.jsonl>...       write them into the slots (a slot is replaced at most once)
//   node refresh_fun.js <puzzles*.json> verify                    re-check replaced slots with a fresh engine (unstable → old)
'use strict';
const E = require('../engine.js');
const { funScore, analyse, vOf } = require('./fun.js');
const fs = require('fs'), path = require('path');
const [fileArg, mode, outArg, shard = '0/1', ...more] = process.argv.slice(2);
const file = path.join(__dirname, '..', fileArg);
const D = JSON.parse(fs.readFileSync(file, 'utf8')), v = vOf(D), G = E.geom(v);
const CUT = '2026-10-21', MIN = 70, TARGET = 72, TRIES = +(process.env.TRIES || 1500);
const ft = m => m & 1023;
const keyOf = (T, j) => T.id + '-' + j;
// engine.mate() with a fresh engine (the shared one keeps its transposition table between calls)
function freshMate(s, n) {
  const { pos, hashes } = E.replay(v, s, []), X = new E.Engine(); X.setHistory(hashes);
  const vals = X.mateValues(pos, 2 * n - 1); if (!vals) return null;
  return vals.map(({ m, v: x }) => ({ m, need: x > E.WINT ? (E.WIN - x + 1) >> 1 : 0 }));
}
function sound(goal, P) {
  for (const L of [goal === 'mill' ? E.mill(v, P.s, [], P.n, false) : E.mate(v, P.s, [], P.n, false), goal === 'mill' ? null : freshMate(P.s, P.n)]) {
    if (L === null && goal === 'mill') continue;
    if (!L) return false;
    const g = L.filter(e => e.need && e.need <= P.n);
    if (!g.some(e => e.m === P.answer) || Math.min(...g.map(e => e.need)) !== P.n || new Set(g.map(e => ft(e.m))).size !== 1) return false;
  }
  return true;
}

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// jobs: slots below MIN (computed on the current content)
function jobsOf() {
  const jobs = [];
  D.themes.forEach((T, ti) => T.puzzles.forEach((P, j) => {
    const f = funScore(E, v, T, P).fun;
    if (f < MIN) jobs.push({ ti, j, key: keyOf(T, j), fun: f });
  }));
  return jobs;
}

// a legal-looking variation of a source position: move pieces to empty points; in the moving phase also add / remove one
function mutate(s, rnd) {
  const b = Array.from(s.b, Number), h = s.h.slice(), placing = h[0] > 0 || h[1] > 0;
  const k = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < k; i++) {
    const r = rnd(), filled = [], empty = [];
    b.forEach((x, p) => (x ? filled : empty).push(p));
    if (!placing && r < 0.15) { const p = 1 + Math.floor(rnd() * 2), mine = filled.filter(q => b[q] === p); if (mine.length > 3) b[mine[Math.floor(rnd() * mine.length)]] = 0; }
    else if (!placing && r < 0.3) { const p = 1 + Math.floor(rnd() * 2); if (b.filter(x => x === p).length < G.pieces && empty.length) b[empty[Math.floor(rnd() * empty.length)]] = p; }
    else if (r < 0.4 && filled.length) { // swap two pieces of different colours
      const a = filled[Math.floor(rnd() * filled.length)], c = filled[Math.floor(rnd() * filled.length)];
      const t = b[a]; b[a] = b[c]; b[c] = t;
    } else if (filled.length && empty.length) {
      const f = filled[Math.floor(rnd() * filled.length)], t = empty[Math.floor(rnd() * empty.length)]; b[t] = b[f]; b[f] = 0;
    }
  }
  return { b: b.join(''), h, side: s.side, quiet: 0 };
}
function legal(s) {
  const c1 = [...s.b].filter(x => x === '1').length, c2 = [...s.b].filter(x => x === '2').length;
  if (c1 + s.h[0] < 3 || c2 + s.h[1] < 3 || c1 + s.h[0] > G.pieces || c2 + s.h[1] > G.pieces) return false;
  const pos = E.Pos.from(G, s);
  return pos.status() === 0;
}
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };

function findOne(job, taken) {
  const T = D.themes[job.ti], old = T.puzzles[job.j], n = old.n, goal = T.goal || 'win';
  const rnd = mulberry32(hashStr(fileArg + ':' + job.key + (process.env.SALT || '')));
  const same = T.puzzles.filter(P => P.n === n), src = same.length >= 3 ? same : T.puzzles;
  const all = D.themes.flatMap(X => X.puzzles.map(P => P.s.b));
  for (let i = 0; i < TRIES; i++) {
    const base = src[Math.floor(rnd() * src.length)].s;
    const s = mutate(base, rnd);
    if (!legal(s)) continue;
    if (all.some(b => hamming(b, s.b) < 3) || taken.some(b => hamming(b, s.b) < 3)) continue;
    const L = goal === 'mill' ? E.mill(v, s, [], n, false) : E.mate(v, s, [], n, false);
    if (!L) continue;
    const g = L.filter(e => e.need && e.need <= n);
    if (!g.length || Math.min(...g.map(e => e.need)) !== n) continue;
    if (new Set(g.map(e => ft(e.m))).size !== 1) continue;
    if (goal === 'mill' && L.some(e => ((e.m >> 10) & 31) !== 31)) continue;
    const P = { s, n, answer: g[0].m };
    if (!sound(goal, P)) continue;
    const info = analyse(E, v, P, goal); if (!info || !info.sound) continue;
    const r = funScore(E, v, T, P, info);
    if (r.fun < TARGET || r.parts.D < (T.id === 'remove' ? 10 : 11)) continue;
    // the answer stored is a winning move; prefer one with the removal used on the main line
    return { key: job.key, ti: job.ti, j: job.j, p: P, fun: r.fun, oldFun: job.fun, tries: i + 1 };
  }
  return null;
}

if (mode === 'mine') {
  const [k, m] = shard.split('/').map(Number);
  const done = new Set(), taken = [];
  if (fs.existsSync(outArg)) for (const l of fs.readFileSync(outArg, 'utf8').split('\n')) if (l) { const x = JSON.parse(l); done.add(x.key); if (x.p) taken.push(x.p.s.b); }
  const jobs = jobsOf(); console.error(fileArg, 'jobs', jobs.length);
  const t0 = Date.now();
  jobs.forEach((job, i) => {
    if (i % m !== k || done.has(job.key)) return;
    const r = findOne(job, taken) || { key: job.key, ti: job.ti, j: job.j, p: null, oldFun: job.fun };
    if (r.p) taken.push(r.p.s.b);
    fs.appendFileSync(outArg, JSON.stringify(r) + '\n');
    console.error(job.key, r.p ? `ok fun ${job.fun}→${r.fun} (${r.tries})` : 'none', ((Date.now() - t0) / 1000 | 0) + 's');
  });
} else if (mode === 'verify') {   // re-check every replaced slot; an unstable one goes back to its old puzzle
  let bad = 0;
  D.themes.forEach((T, ti) => T.puzzles.forEach((P, j) => {
    const k = keyOf(T, j); if (!D.old || !D.old[k]) return;
    if (!sound(T.goal, P)) { bad++; console.error('restored', k); T.puzzles[j] = D.old[k]; delete D.old[k]; }
  }));
  if (bad) fs.writeFileSync(file, JSON.stringify(D));
  console.log(fileArg, 'verified', Object.keys(D.old || {}).length, 'restored', bad);
} else if (mode === 'apply') {
  const res = new Map();
  for (const f of [outArg, shard, ...more].filter(x => x && x.endsWith('.jsonl'))) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l) { const x = JSON.parse(l); if (x.p) res.set(x.key, x); }
  // final check (fresh engine call per puzzle, same as the app) and no duplicates
  if (!D.old) { D.old = {}; D.cut = CUT; D.version = (D.version || 2) + 1; }
  const cnt = {}, used = new Set(D.themes.flatMap(T => T.puzzles.map(P => P.s.b + P.s.h + P.s.side)));
  for (const x of [...res.values()].sort((a, b) => a.ti - b.ti || a.j - b.j)) {
    const T = D.themes[x.ti], P = x.p, id = P.s.b + P.s.h + P.s.side;
    if (D.old[x.key]) continue;   // a slot is replaced at most once (its old content stays the original)
    if (used.has(id)) { console.error('duplicate, skipped', x.key); continue; }
    used.add(id);
    if (!sound(T.goal, P)) { console.error('not stable, skipped', x.key); continue; }
    D.old[x.key] = T.puzzles[x.j];
    T.puzzles[x.j] = { s: P.s, n: P.n, answer: P.answer };
    cnt[T.id] = (cnt[T.id] || 0) + 1;
  }
  fs.writeFileSync(file, JSON.stringify(D));
  console.log(fileArg, 'replaced', Object.keys(D.old).length, JSON.stringify(cnt));
}
