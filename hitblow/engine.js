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

const api = { PRESETS, DIFFS, OPENERS, rng, hashStr, space, idxOf, codeOf, validCode, feedback, randomCode, localDate, dailyCode, dayBefore,
  allCands, filterCands, candsOf, consistent, rate, bestGuess, opener, aiGuess, solve, reviewStep, keepProb, smartProb };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HitBlowEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
