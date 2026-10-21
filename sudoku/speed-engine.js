/* すぴーど数独 — 4×4 engine (2×2 boxes, digits 1–4)
   generator / solver / grading, the daily puzzle stream and the gimmick catalogue.
   Works in the browser (window.SpeedEngine) and in node (module.exports, used by tools/gen-speed.js). */
(function (root) {
'use strict';
const N = 16;
const ROW = i => i >> 2, COL = i => i & 3, BOX = i => ((i >> 3) << 1) | ((i & 3) >> 1);
const UNITS = [];
for (let r = 0; r < 4; r++) UNITS.push([0, 1, 2, 3].map(c => r * 4 + c));
for (let c = 0; c < 4; c++) UNITS.push([0, 1, 2, 3].map(r => r * 4 + c));
for (let b = 0; b < 4; b++) { const r0 = (b >> 1) * 2, c0 = (b & 1) * 2; UNITS.push([r0 * 4 + c0, r0 * 4 + c0 + 1, (r0 + 1) * 4 + c0, (r0 + 1) * 4 + c0 + 1]); }
const CELL_UNITS = Array.from({ length: N }, (_, i) => [ROW(i), 4 + COL(i), 8 + BOX(i)]);
const PEERS = Array.from({ length: N }, (_, i) => { const s = new Set(); CELL_UNITS[i].forEach(u => UNITS[u].forEach(k => k !== i && s.add(k))); return [...s]; });

/* ---------- rng ---------- */
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- solving ---------- */
const ok = (g, i, d) => PEERS[i].every(k => g[k] !== d);
function countSolutions(g0, limit = 2) {
  const g = g0.slice(); let n = 0;
  (function rec() {
    if (n >= limit) return;
    let i = g.indexOf(0);
    if (i < 0) { n++; return; }
    for (let d = 1; d <= 4; d++) if (ok(g, i, d)) { g[i] = d; rec(); g[i] = 0; if (n >= limit) return; }
  })();
  return n;
}
function solve(g0) {
  const g = g0.slice();
  (function rec() { const i = g.indexOf(0); if (i < 0) return true; for (let d = 1; d <= 4; d++) if (ok(g, i, d)) { g[i] = d; if (rec()) return true; g[i] = 0; } return false; })();
  return g;
}
/* all 288 solution grids */
const ALL = [];
(function () { const g = new Array(N).fill(0); (function rec(i) { if (i === N) { ALL.push(g.slice()); return; } for (let d = 1; d <= 4; d++) if (ok(g, i, d)) { g[i] = d; rec(i + 1); g[i] = 0; } })(0); })();

/* human-style grading: how the puzzle falls with full houses, naked and hidden singles */
function grade(p) {
  const g = p.slice(); let fh = 0, ns = 0, hs = 0;
  const cand = i => { let m = 0; for (let d = 1; d <= 4; d++) if (ok(g, i, d)) m |= 1 << d; return m; };
  for (;;) {
    if (g.indexOf(0) < 0) return { ok: true, fh, ns, hs, givens: p.filter(Boolean).length };
    let done = false;
    for (const u of UNITS) { const e = u.filter(k => !g[k]); if (e.length === 1) { const used = u.map(k => g[k]); g[e[0]] = [1, 2, 3, 4].find(d => !used.includes(d)); fh++; done = true; break; } }
    if (done) continue;
    for (let i = 0; i < N && !done; i++) if (!g[i]) { const m = cand(i); if (m && !(m & (m - 1))) { g[i] = Math.log2(m); ns++; done = true; } }
    if (done) continue;
    for (const u of UNITS) { for (let d = 1; d <= 4 && !done; d++) { if (u.some(k => g[k] === d)) continue; const spots = u.filter(k => !g[k] && ok(g, k, d)); if (spots.length === 1) { g[spots[0]] = d; hs++; done = true; } } if (done) break; }
    if (!done) return { ok: false, fh, ns, hs, givens: p.filter(Boolean).length };
  }
}
/* levels: 1 やさしい … 4 てごわい */
const LV = { 1: [10, 11], 2: [8, 9], 3: [6, 7], 4: [4, 5] };
function make(rng, lv) {
  for (let tries = 0; tries < 60; tries++) {
    const sol = ALL[(rng() * ALL.length) | 0];
    const [lo, hi] = LV[lv]; const target = lo + ((rng() * (hi - lo + 1)) | 0);
    const p = sol.slice();
    const order = shuffle([...Array(N).keys()], rng);
    let givens = N;
    for (const i of order) {
      if (givens <= target) break;
      const v = p[i]; p[i] = 0;
      if (countSolutions(p) !== 1) p[i] = v; else givens--;
    }
    if (givens > hi || givens < lo) continue;
    const gr = grade(p);
    if (!gr.ok) continue;
    if (lv === 1 && gr.ns + gr.hs > 2) continue;           // easy ones fall almost entirely by full houses
    if (lv >= 3 && gr.fh > N - givens - 2) continue;        // harder ones need real scanning
    return { p, s: sol, lv, gr };
  }
  return make(rng, Math.max(1, lv - 1));
}
const enc = p => p.join('');
const dec = s => Array.from(s, Number);

/* ---------- gimmicks ----------
   bug     おじゃまむし  a bug walks the board and eats the numbers you wrote (tap it to shoo it away)
   mosaic  モザイク      every few seconds some given numbers are pixelated for a moment
   spin    ぐるぐる      the whole board slowly rotates
   spot    すぽっとらいと  only a moving spotlight is lit (box lines stay visible; you can type in the dark)
   fruit   くだもの      numbers are fruits (the fruit ↔ number pairing can change each puzzle)
   shuffle まぜまぜキー  the number keys swap places
   ghost   とうめいインク  numbers you write turn invisible after a moment
   ice     こおり        some empty cells are frozen — tap to break the ice before you can write */
//  bomb    ばくだん      a bomb sits on an empty cell — fill it before the fuse runs out or lose 3 seconds
//  swap    いれかわり    two rows (or columns) of the same band trade places — your numbers move with them
//  cloud   くもり        clouds drift across the board and hide the cells under them (you can still write there)
//  calc    けいさん      some given numbers are shown as little sums (1+2, 5−1, 2×2 …)
//  card    うらがえし    given numbers are face-down cards — tap one for a quick peek
//  mole    もぐら        moles pop out of empty cells and block them — tap (or type) to bonk them away
//  upside  さかさま      numbers are drawn turned sideways / upside down
//  balloon ふうせん      balloons float up over the board — tap to pop them, let one get away and lose 5 seconds
//  dark    ていでん      the lights go out for a moment every few seconds (you can still write)
//  sway    ゆらゆら      the board rocks like a boat
//  paint   ペンキ        paint splats land on cells and hide them — tap to wipe
//  order   じゅんばん    numbered cells must be filled in order (the others are free)
//  peep    のぞきまど    only the row / column / box of the selected cell can be seen (★2: row + column, ★3: just the box)
//  star    ながれぼし    shooting stars fly by — catch one for +2 seconds, miss it and lose 5
//  rev     あまのじゃく  in the colored cells, what you type goes in as the opposite number (1↔4, 2↔3)
//  dice    さいころ      numbers are shown as dice
//  sleepy  ねむねむ      the board gets drowsy and dims unless you keep writing
const GIMMICKS = ['bug', 'mosaic', 'spin', 'spot', 'fruit', 'shuffle', 'ghost', 'ice', 'bomb', 'swap', 'cloud', 'calc', 'card', 'mole', 'upside',
  'balloon', 'dark', 'sway', 'paint', 'order', 'peep', 'star', 'rev', 'dice', 'sleepy'];
/* pairs that don't go together in one puzzle (same display slot, or one makes the other unfair) */
const CLASH = [['fruit', 'calc'], ['fruit', 'dice'], ['calc', 'dice'], ['card', 'mosaic'], ['spin', 'sway'], ['shuffle', 'rev'], ['order', 'bomb'], ['spot', 'dark'], ['dark', 'sleepy'], ['spot', 'sleepy'], ['spot', 'peep'], ['dark', 'peep']];
const clash = (a, b) => CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const GEXTRA = { bug: s => 1.2 + s * .8, mosaic: s => .6 + s * .7, spin: s => 1.2 + s * .8, spot: s => 1.2 + s, fruit: s => 1.2 + s * .8, shuffle: s => 1 + s * .7, ghost: s => .8 + s * .8, ice: s => .8 + s, bomb: s => .8 + s * .6, swap: s => 1 + s * .8, cloud: s => 1 + s * .8, calc: s => .8 + s * .8, card: s => 1.2 + s * .9, mole: s => 1 + s * .8, upside: s => .6 + s * .6,
  balloon: s => 1.4 + s * .9, dark: s => .9 + s * .8, sway: s => .6 + s * .5, paint: s => 1 + s * .8, order: s => 1.4 + s * 1, peep: s => .9 + s * .8, star: s => .9 + s * .6, rev: s => 1.3 + s * 1, dice: s => .8 + s * .7, sleepy: s => .6 + s * .6 };
const BASE_T = { 1: 5, 2: 7, 3: 9, 4: 12 };
// g: '' | 'bug2' | 'spin1+mosaic2'
const parseG = g => (g ? g.split('+').map(x => ({ id: x.replace(/\d/g, ''), s: +x.replace(/\D/g, '') || 1 })) : []);
const expect = (lv, g) => BASE_T[lv] + parseG(g).reduce((a, x) => a + GEXTRA[x.id](x.s), 0);

/* ---------- daily: 30 / 60 / 90 seconds ---------- */
const DAILY = {
  30: { sec: 30, goal: 4, every: 4, start: 3, lv: k => (k < 3 ? 1 : 2), str: () => 1, ng: 1 },
  60: { sec: 60, goal: 8, every: 3, start: 2, lv: k => (k < 2 ? 1 : k < 5 ? 2 : 3), str: k => (k < 6 ? 1 : 2), ng: 2 },
  90: { sec: 90, goal: 10, every: 3, start: 2, lv: k => (k < 2 ? 2 : k < 9 ? 3 : 4), str: k => (k < 5 ? 2 : 3), ng: 3 },
};
const DKEYS = [30, 60, 90];
const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
/* the day's featured gimmicks (the same for everyone) */
function dailyGimmicks(date, d) {
  const L = GIMMICKS.slice(0, date < '2026-10-22' ? 8 : 25);   // keep past days' dailies unchanged
  const rng = mulberry32(hashStr('spd-g:' + date));
  const order = shuffle(L.slice(), rng);
  const rot = (dayNum(date) % L.length + L.length) % L.length;
  const pick = order.slice(rot % 3, rot % 3 + 3);
  return pick.slice(0, DAILY[d].ng);
}
function dailyPuzzle(date, d, k) {
  const C = DAILY[d];
  const rng = mulberry32(hashStr('spd:' + date + ':' + d + ':' + k));
  const P = make(rng, C.lv(k));
  let g = '';
  if (k >= C.start && (k - C.start) % C.every === 0) {   // e.g. 30s: the 4th, 8th, 12th … puzzle
    const gs = dailyGimmicks(date, d), n = (k - C.start) / C.every;
    g = gs[n % gs.length] + C.str(k);
  }
  return { p: P.p, s: P.s, lv: P.lv, g };
}

const API = { N, ROW, COL, BOX, UNITS, CELL_UNITS, PEERS, ALL, mulberry32, hashStr, shuffle, countSolutions, solve, grade, make, enc, dec, GIMMICKS, CLASH, clash, parseG, expect, BASE_T, GEXTRA, DAILY, DKEYS, dailyGimmicks, dailyPuzzle, dayNum };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.SpeedEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
