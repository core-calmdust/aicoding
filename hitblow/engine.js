// ヒット＆ブロー (hitblow/) — engine. Pure JS: Node (module.exports) and browser (window.HitBlowEngine).
// A code is an array of N colour numbers 0..C-1. Inside, a code is also its index in base C (first peg = highest digit).
// Feedback: hits = right colour in the right place, blows = right colour in the wrong place (multiset minimum minus hits).
(function (root) {
'use strict';

const PRESETS = {
  easy: { n: 4, c: 6, rep: false, max: 10 },
  normal: { n: 4, c: 6, rep: true, max: 10 },     // the classic 4 pegs / 6 colours
  hard: { n: 5, c: 8, rep: true, max: 12 },
};
const DIFFS = ['easy', 'normal', 'hard'];
// first guesses (0-based colours). 4×6 with repeats: "1123", the opener with the smallest expected number of candidates left;
// without repeats every opener is equivalent; 5×8: "11234" (the best of the opener shapes — measured by tools/test_engine.js)
const OPENERS = { easy: [0, 1, 2, 3], normal: [0, 0, 1, 2], hard: [0, 0, 1, 2, 3] };

// ---------- seeded random numbers ----------
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return h >>> 0; }
function rng(seed) { let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- code spaces (cached per n / c / rep) ----------
const SPACES = {};
function space(cfg) {
  const key = cfg.n + 'x' + cfg.c + (cfg.rep ? 'r' : 'u');
  if (SPACES[key]) return SPACES[key];
  const n = cfg.n, c = cfg.c, total = Math.pow(c, n), flat = new Uint8Array(total * n), valid = [];
  for (let i = 0; i < total; i++) {
    let x = i, ok = true, seen = 0;
    for (let k = n - 1; k >= 0; k--) { const d = x % c; x = (x - d) / c; flat[i * n + k] = d; if (seen & (1 << d)) ok = false; seen |= 1 << d; }
    if (cfg.rep || ok) valid.push(i);
  }
  return (SPACES[key] = { key, n, c, rep: !!cfg.rep, total, flat, all: Int32Array.from(valid), nfb: (n + 1) * (n + 1), ca: new Int8Array(c), cb: new Int8Array(c) });
}
function idxOf(cfg, code) { let x = 0; for (let k = 0; k < cfg.n; k++) x = x * cfg.c + code[k]; return x; }
function codeOf(cfg, idx) { const sp = space(cfg), out = []; for (let k = 0; k < sp.n; k++) out.push(sp.flat[idx * sp.n + k]); return out; }
function validCode(cfg, code) {
  if (!Array.isArray(code) || code.length !== cfg.n) return false;
  const seen = {};
  for (const d of code) { if (!(d >= 0 && d < cfg.c && d === (d | 0))) return false; if (!cfg.rep && seen[d]) return false; seen[d] = 1; }
  return true;
}
// feedback of two code indices, packed as hits * (n + 1) + blows
function fbIdx(sp, a, b) {
  const n = sp.n, f = sp.flat, ca = sp.ca, cb = sp.cb, c = sp.c; let h = 0, m = 0;
  for (let i = 0; i < c; i++) { ca[i] = 0; cb[i] = 0; }
  const oa = a * n, ob = b * n;
  for (let i = 0; i < n; i++) { const x = f[oa + i], y = f[ob + i]; if (x === y) h++; else { ca[x]++; cb[y]++; } }
  for (let i = 0; i < c; i++) m += ca[i] < cb[i] ? ca[i] : cb[i];
  return h * (n + 1) + m;
}
// feedback of two codes (arrays): { h, b }
function feedback(secret, guess) {
  const n = secret.length, ca = {}, cb = {}; let h = 0, b = 0;
  for (let i = 0; i < n; i++) { if (secret[i] === guess[i]) h++; else { ca[secret[i]] = (ca[secret[i]] || 0) + 1; cb[guess[i]] = (cb[guess[i]] || 0) + 1; } }
  for (const k in ca) if (cb[k]) b += Math.min(ca[k], cb[k]);
  return { h, b };
}

function randomCode(cfg, rand) { const sp = space(cfg); return codeOf(cfg, sp.all[Math.floor((rand || Math.random)() * sp.all.length)]); }
function localDate(d) { d = d || new Date(); const p = x => (x < 10 ? '0' : '') + x; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
// 今日の一問: the classic setting, one code per calendar day
function dailyCode(dateKey) { return randomCode(PRESETS.normal, rng('hitblow-daily:' + dateKey)); }
function dayBefore(dateKey) { const p = dateKey.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] - 1); return localDate(d); }

// ---------- candidates ----------
function allCands(cfg) { return space(cfg).all; }
function filterCands(cfg, cands, guess, h, b) {
  const sp = space(cfg), g = idxOf(cfg, guess), want = h * (sp.n + 1) + b, out = [];
  for (let i = 0; i < cands.length; i++) if (fbIdx(sp, cands[i], g) === want) out.push(cands[i]);
  return Int32Array.from(out);
}
// candidates after a whole history [{ g, h, b }]
function candsOf(cfg, hist) { let c = allCands(cfg); for (const x of hist) c = filterCands(cfg, c, x.g, x.h, x.b); return c; }
function consistent(cfg, hist, guess) { for (const x of hist) { const f = feedback(guess, x.g); if (f.h !== x.h || f.b !== x.b) return false; } return true; }

function sample(arr, k, rand) {
  if (arr.length <= k) return arr;
  const out = new Int32Array(k), step = arr.length / k;      // stratified: one from each stretch
  for (let i = 0; i < k; i++) out[i] = arr[Math.min(arr.length - 1, Math.floor((i + rand()) * step))];
  return out;
}
// how a guess splits the candidates: { exp: expected number left (Σ n² / N), ent: entropy in bits, worst: largest part, parts }
function rate(cfg, cands, guess, rand, cap) {
  const sp = space(cfg), S = sample(cands, cap || 4000, rand || Math.random);
  return rateIdx(sp, S, idxOf(cfg, guess), new Int32Array(sp.nfb), cands.length / S.length);
}
function rateIdx(sp, S, g, cnt, scale) {
  cnt.fill(0); const N = S.length;
  for (let i = 0; i < N; i++) cnt[fbIdx(sp, S[i], g)]++;
  let sq = 0, ent = 0, worst = 0, parts = 0;
  for (let k = 0; k < cnt.length; k++) { const v = cnt[k]; if (!v) continue; parts++; sq += v * v; ent -= v / N * Math.log2(v / N); if (v > worst) worst = v; }
  return { exp: sq / N * (scale || 1), ent, worst: worst * (scale || 1), parts };
}
// The guess that tells the most (largest entropy; ties → smaller worst case, then a candidate).
// opts: rand, full (also look at codes that cannot be the answer — never hurts the information, sometimes helps),
//       budget (feedback evaluations for one decision, default 800 000 ≈ 0.1 s on a PC), first (history is empty → opener)
function bestGuess(cfg, cands, opts) {
  opts = opts || {}; const sp = space(cfg), rand = opts.rand || Math.random, budget = opts.budget || 800000;
  if (!cands.length) return null;
  if (cands.length === 1) return { guess: codeOf(cfg, cands[0]), exp: 1, ent: 0, cand: true };
  if (cands.length === 2) return { guess: codeOf(cfg, cands[0]), exp: 1, ent: 1, cand: true };
  if (cands.length === sp.all.length) { const op = opener(cfg), r = rate(cfg, cands, op, rand, 40000); return { guess: op, exp: r.exp, ent: r.ent, cand: true }; }
  const S = sample(cands, Math.min(cands.length, 2500), rand), scale = cands.length / S.length;
  let room = Math.max(60, Math.floor(budget / S.length));
  let pool;
  if (opts.full && sp.all.length <= room) pool = sp.all;
  else {
    pool = sample(cands, Math.min(cands.length, room), rand);
    if (opts.full && room > pool.length) { const extra = sample(sp.all, room - pool.length, rand), p = new Int32Array(pool.length + extra.length); p.set(pool); p.set(extra, pool.length); pool = p; }
  }
  const inC = (opts.full) ? new Uint8Array(sp.total) : null; if (inC) for (let i = 0; i < cands.length; i++) inC[cands[i]] = 1;
  const cnt = new Int32Array(sp.nfb); let best = -1, be = -1, bw = Infinity, bc = false, bx = 0;
  for (let i = 0; i < pool.length; i++) {
    const g = pool[i], r = rateIdx(sp, S, g, cnt, scale), isC = inC ? !!inC[g] : true;
    // a candidate can end the game at once: worth a small bonus (1 / N of a solved game)
    const e = r.ent + (isC ? 1e-3 + 1 / cands.length * 0.9 : 0);
    if (e > be + 1e-9 || (Math.abs(e - be) <= 1e-9 && (r.worst < bw || (r.worst === bw && isC && !bc)))) { be = e; best = g; bw = r.worst; bc = isC; bx = r.exp; }
  }
  return { guess: codeOf(cfg, best), exp: bx, ent: be, cand: bc };
}
function opener(cfg) {
  for (const k of DIFFS) { const p = PRESETS[k]; if (p.n === cfg.n && p.c === cfg.c && !!p.rep === !!cfg.rep) return OPENERS[k].slice(); }
  const o = []; for (let i = 0; i < cfg.n; i++) o.push(cfg.rep ? Math.max(0, i - 1) % cfg.c : i % cfg.c); return o;
}

// ---------- AI levels (Lv.1–20) ----------
// Lv.20: the most informative guess, looking at every code. Lv.8–19: a consistent candidate — the most informative one
// with a probability that grows with the level, otherwise a random one. Lv.1–7: forgets part of the earlier feedback
// (each earlier answer is kept with probability keep(lv)), so some guesses contradict what is already known.
function keepProb(lv) { return lv >= 8 ? 1 : 0.30 + (lv - 1) * 0.1; }
function smartProb(lv) { return lv >= 20 ? 1 : lv < 8 ? 0 : (lv - 8) / 12; }
function aiGuess(cfg, hist, level, rand, memo) {
  rand = rand || Math.random; const sp = space(cfg);
  if (level >= 8) {
    let cands = null;
    const smart = rand() < smartProb(level);
    if (smart) {
      const key = memo ? (level >= 20 ? 'F' : 'C') + sp.key + hist.map(x => x.g.join('') + x.h + x.b).join('|') : null;
      if (key && memo.has(key)) return memo.get(key).slice();
      cands = candsOf(cfg, hist);
      const r = bestGuess(cfg, cands, { rand, full: level >= 20 });
      if (key && cands.length <= 2500) memo.set(key, r.guess.slice());
      return r.guess;
    }
    if (!hist.length) return randomCode(cfg, rand);
    cands = candsOf(cfg, hist);
    return codeOf(cfg, cands[Math.floor(rand() * cands.length)]);
  }
  const keep = keepProb(level), used = hist.filter((x, i) => rand() < keep);
  let cands = candsOf(cfg, used);
  const tried = {}; for (const x of hist) tried[idxOf(cfg, x.g)] = 1;
  for (let t = 0; t < 40; t++) { const g = cands[Math.floor(rand() * cands.length)]; if (!tried[g]) return codeOf(cfg, g); }
  cands = candsOf(cfg, hist);
  return codeOf(cfg, cands[Math.floor(rand() * cands.length)]);
}
// plays a whole game against a secret: number of guesses (cap + 1 = not solved within cap)
function solve(cfg, secret, level, rand, cap, memo) {
  const hist = []; cap = cap || 60;
  for (let t = 1; t <= cap; t++) { const g = aiGuess(cfg, hist, level, rand, memo), f = feedback(secret, g); if (f.h === cfg.n) return t; hist.push({ g, h: f.h, b: f.b }); }
  return cap + 1;
}

// ---------- review (after the game) ----------
// one step of the review: for guess i of the history → { ok (consistent with the earlier feedback), before, after,
// exp (expected candidates left by this guess), best (by the most informative guess) }
function reviewStep(cfg, hist, i, rand) {
  const prev = hist.slice(0, i), x = hist[i], cands = candsOf(cfg, prev), after = filterCands(cfg, cands, x.g, x.h, x.b).length;
  const mine = rate(cfg, cands, x.g, rand), best = bestGuess(cfg, cands, { rand, budget: 250000 });
  return { ok: consistent(cfg, prev, x.g), before: cands.length, after, exp: mine.exp, best: Math.min(best.exp, mine.exp) };
}

// ---------- 3D table (atlas/games/hitblow.js, 2026-11-16): the 種目 and the race on one shared board ----------
// Both players guess the SAME hidden code on one board, taking turns (rows alternate); each sees every row and its answer.
// The first to get all hits wins; when the rows run out, a draw. 種目 = adapter sizes 1..5.
const RULES = [null,
  { id: 'color', n: 4, c: 6, rep: false, kind: 'color', rows: 10 },    // カラー: 6 colours, 4 different (the classic Japanese ヒット＆ブロー)
  { id: 'dup', n: 4, c: 6, rep: true, kind: 'color', rows: 10 },       // カラー（重複あり）: the 1970s board game's rule
  { id: 'num3', n: 3, c: 10, rep: false, kind: 'num', rows: 10 },      // ナンバー3: three different digits 0–9
  { id: 'num4', n: 4, c: 10, rep: false, kind: 'num', rows: 12 },      // ナンバー4: four different digits 0–9
  { id: 'expert', n: 5, c: 8, rep: true, kind: 'color', rows: 12 },    // エキスパート: 5 pegs, 8 colours, repeats
];
const RULE_IDS = [1, 2, 3, 4, 5];
function rule(z) { return RULES[z] || RULES[1]; }
// ---------- the race AI ----------
// In a race on one shared board every answer teaches both players, so the best guess is not the most informative one: it
// is the candidate that gives the best chance to win — now, or later if the opponent does not hit it on the next turn.
// raceValue(S) = the chance that the player to move wins from the candidate set S (both play this way; exact for small S):
//   max over g in S of  1/|S| + Σ over answers p (not all hits) of |p|/|S| · (1 − raceValue(p)).
// Measured (tools/test_engine.js): this beats a random candidate ~54–55% of races, the most informative candidate ~60%.
const RV = new Map();
function splitBy(sp, S, g) {
  const m = new Map(), win = sp.n * (sp.n + 1);
  for (let i = 0; i < S.length; i++) { const k = fbIdx(sp, S[i], g); if (k === win) continue; let a = m.get(k); if (!a) m.set(k, a = []); a.push(S[i]); }
  return m;
}
function raceValue(sp, S) {
  if (S.length <= 1) return S.length;
  if (S.length > 30) return 0.5 + 0.5 / S.length;   // (large sets: the shape of the small ones)
  const key = sp.key + ':' + Array.prototype.join.call(S, ',');
  const hit = RV.get(key); if (hit != null) return hit;
  let best = 0;
  for (let i = 0; i < S.length && best < 1 - 1e-12; i++) {
    let v = 1 / S.length;
    for (const p of splitBy(sp, S, S[i]).values()) v += p.length / S.length * (1 - raceValue(sp, p));
    if (v > best) best = v;
  }
  if (RV.size > 60000) RV.clear();
  RV.set(key, best); return best;
}
function raceBest(cfg, cands, rand) {
  const sp = space(cfg), N = cands.length;
  if (N <= 2) return codeOf(cfg, cands[0]);
  const S = N > 2000 ? sample(cands, 2000, rand) : cands, sc = N / S.length;
  const pool = N > 220 ? sample(cands, 220, rand) : cands;
  let bg = pool[0], bv = -1;
  for (let i = 0; i < pool.length; i++) {
    let v = 1 / N;
    for (const p of splitBy(sp, S, pool[i]).values()) { const n = p.length * sc; v += n / N * (1 - (n <= 30 && sc === 1 ? raceValue(sp, Int32Array.from(p)) : 0.5 + 0.5 / n)); }
    v += rand() * 1e-9;
    if (v > bv) { bv = v; bg = pool[i]; }
  }
  return codeOf(cfg, bg);
}
// the race levels (Lv.1–20): Lv.1–15 forget part of the answers on the board (each row is kept with a probability that grows
// from 10% to 94%), so their guesses can contradict what is known; Lv.16–17 guess a random code that can still be the answer;
// Lv.18–19 sometimes, Lv.20 always, play the race search above.
function raceKeep(lv) { return lv >= 16 ? 1 : 0.10 + (lv - 1) * 0.06; }
function aiRace(cfg, hist, level, rand) {
  rand = rand || Math.random;
  if (!hist.length) return level >= 18 ? opener(cfg) : randomCode(cfg, rand);
  const tried = {}; for (const x of hist) tried[idxOf(cfg, x.g)] = 1;
  if (level < 16) {
    const keep = raceKeep(level), used = hist.filter(() => rand() < keep), cands = candsOf(cfg, used);
    for (let t = 0; t < 40; t++) { const g = cands[Math.floor(rand() * cands.length)]; if (!tried[g]) return codeOf(cfg, g); }
  }
  const cands = candsOf(cfg, hist);
  if (!cands.length) return randomCode(cfg, rand);
  if (level >= 20 || (level >= 18 && rand() < (level - 17) * 0.35)) return raceBest(cfg, cands, rand);
  return codeOf(cfg, cands[Math.floor(rand() * cands.length)]);
}
// a race between two levels on one secret: → { w: 0 | 1 | -1 (draw), rows }
function race(cfg, secret, la, lb, first, rand, rows, memo) {
  const hist = []; rows = rows || 60; let s = first ? 1 : 0;
  for (let t = 0; t < rows; t++) {
    const g = aiRace(cfg, hist, s ? lb : la, rand), f = feedback(secret, g);
    if (f.h === cfg.n) return { w: s, rows: t + 1 };
    hist.push({ g, h: f.h, b: f.b }); s ^= 1;
  }
  return { w: -1, rows };
}
// the number of guesses the greedy solver needs from a set of candidates, for every one of them as the answer: { worst, mean }
function solverDepth(cfg, hist, rand) {
  const cands = candsOf(cfg, hist); let worst = 0, sum = 0; const memo = new Map();
  for (let i = 0; i < cands.length; i++) {
    const secret = codeOf(cfg, cands[i]), h = hist.slice(); let t = 0;
    for (;;) { t++; const key = h.map(x => x.g.join('') + x.h + x.b).join('|'); let g = memo.get(key);
      if (!g) { g = bestGuess(cfg, candsOf(cfg, h), { rand: rng('sd:' + key), full: false, budget: 300000 }).guess; memo.set(key, g); }
      const f = feedback(secret, g); if (f.h === cfg.n || t > 12) break; h.push({ g, h: f.h, b: f.b }); }
    worst = Math.max(worst, t); sum += t;
  }
  return { worst, mean: cands.length ? sum / cands.length : 0, n: cands.length };
}
// 今日の一問 (EASY / HARD): a fixed puzzle per local date — the answer and a few clue rows already on the board (guesses made
// by a "ghost" player, with their answers); solve it within the limit. EASY: カラー, a handful of candidates left, a roomy limit;
// HARD: ナンバー4, a few dozen candidates left, the limit = the greedy solver's worst case. Same on every device (seeded).
const DAILY = {
  easy: { z: 1, lo: 3, hi: 9, extra: 1 },
  hard: { z: 4, lo: 14, hi: 48, extra: 0 },
};
const dailyMemo = {};
function makeDaily(dateKey, which) {
  const k = which === 'hard' ? 'hard' : 'easy', id = k + ':' + dateKey; if (dailyMemo[id]) return dailyMemo[id];
  const P = genPuzzle('hb3d-daily:' + id, DAILY[k]); if (P) { P.which = k; P.date = dateKey; }
  return (dailyMemo[id] = P);
}
// 問題集 (2026-11-16 user: パズルをたくさん): 10 sets × 50 — the same kind of puzzle as 今日の一問 (clue rows on the board, solve
// within the limit), seeded by set and number, so every device gets the same 500. lo..hi: the candidates left after the clues;
// extra: rows over the greedy solver's worst case (0 = exactly its worst case: "ぴったり").
const BOOK = [
  { id: 'first', z: 1, lo: 1, hi: 1, extra: 0 },   // カラー: the clues leave one answer — find it in one row
  { id: 'c2', z: 1, lo: 2, hi: 4, extra: 1 },
  { id: 'c3', z: 1, lo: 5, hi: 12, extra: 1 },
  { id: 'c4', z: 1, lo: 10, hi: 24, extra: 0 },
  { id: 'd1', z: 2, lo: 2, hi: 10, extra: 1 },   // 重複あり
  { id: 'd2', z: 2, lo: 12, hi: 36, extra: 0 },
  { id: 'n1', z: 3, lo: 1, hi: 1, extra: 0 },   // ナンバー3: one answer left
  { id: 'n2', z: 3, lo: 4, hi: 16, extra: 0 },
  { id: 'n4', z: 4, lo: 14, hi: 48, extra: 0 },   // ナンバー4 (as HARD)
  { id: 'x', z: 5, lo: 6, hi: 24, extra: 0 },   // エキスパート
];
const BOOK_N = 50, bookMemo = {};
const BOOK_SALT = { 'first:21': 1 };   // (a re-seed: it came out the same as first:19 — hitblow/tools/test_engine.js checks the 500 are all different)
function makePuzzle(set, i) {
  const S = BOOK.find(x => x.id === set); if (!S || !(i >= 0 && i < BOOK_N)) return null;
  const id = set + ':' + i; if (bookMemo[id]) return bookMemo[id];
  const P = genPuzzle('hb3d-pz:' + id + (BOOK_SALT[id] ? ':' + BOOK_SALT[id] : ''), S); if (P) { P.set = set; P.i = i; }
  return (bookMemo[id] = P);
}
function genPuzzle(seed, D) {
  const cfg = rule(D.z), maxClues = D.hi <= 1 ? 8 : 6;
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = rng(seed + ':' + attempt), secret = randomCode(cfg, r), clues = [];
    let cands = allCands(cfg);
    for (let t = 0; t < maxClues && cands.length > D.hi; t++) {
      // a plausible earlier guess: one of the candidates left (as a player would), picked at random among a few that cut well
      let best = null, bn = Infinity;
      for (let j = 0; j < 6; j++) {
        const g = codeOf(cfg, cands[Math.floor(r() * cands.length)]), f = feedback(secret, g); if (f.h === cfg.n) continue;
        const left = filterCands(cfg, cands, g, f.h, f.b).length;
        if (left >= D.lo && (left < bn || best == null)) { best = { g, h: f.h, b: f.b }; bn = left; }
      }
      if (!best) break;
      clues.push(best); cands = filterCands(cfg, cands, best.g, best.h, best.b);
    }
    if (cands.length < D.lo || cands.length > D.hi || clues.length < 2) continue;
    const d = solverDepth(cfg, clues, r);
    return { z: D.z, cfg, secret, clues, cands: cands.length, limit: d.worst + D.extra, par: d.worst };
  }
  return null;
}
const api = { RULES, RULE_IDS, rule, aiRace, raceBest, raceValue, raceKeep, race, solverDepth, makeDaily, DAILY, makePuzzle, BOOK, BOOK_N, PRESETS, DIFFS, OPENERS, rng, hashStr, space, idxOf, codeOf, validCode, feedback, randomCode, localDate, dailyCode, dayBefore,
  allCands, filterCands, candsOf, consistent, rate, bestGuess, opener, aiGuess, solve, reviewStep, keepProb, smartProb };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HitBlowEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
