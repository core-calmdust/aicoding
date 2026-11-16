// Engine test:  node hitblow/tools/test_engine.js [--quick]
// Feedback (incl. repeats), candidate filter, the Lv.20 solver within the guess limit for every difficulty,
// average guesses per level (must fall with the level), the daily code, decision time. Prints ALL OK or FAILED.
'use strict';
const E = require('../engine.js');
const QUICK = process.argv.includes('--quick');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
const C = s => s.split('').map(Number);

// --- feedback ---
const CASES = [      // secret, guess, hits, blows
  ['0123', '0123', 4, 0], ['0123', '3210', 0, 4], ['0123', '0132', 2, 2], ['0123', '4455', 0, 0], ['0123', '1045', 0, 2],
  ['0011', '0101', 2, 2], ['0011', '1100', 0, 4], ['0011', '0000', 2, 0], ['0000', '0011', 2, 0], ['0012', '0100', 1, 2],
  ['1122', '2211', 0, 4], ['1122', '1212', 2, 2], ['1123', '1111', 2, 0], ['5555', '5550', 3, 0], ['0123', '1111', 1, 0],
  ['0012', '2200', 0, 3], ['01234', '43210', 1, 4], ['00123', '00000', 2, 0], ['77777', '70707', 3, 0], ['01234', '56701', 0, 2],
];
let bad = 0;
for (const [s, g, h, b] of CASES) { const f = E.feedback(C(s), C(g)); if (f.h !== h || f.b !== b) { bad++; console.log('   feedback ' + s + ' / ' + g + ' = ' + f.h + 'H' + f.b + 'B, expected ' + h + 'H' + b + 'B'); } }
ok(!bad, 'feedback: ' + CASES.length + ' table cases (with repeats)');
{
  let sym = 0, sum = 0, idx = 0, n = 0; const rand = E.rng(11);
  for (const k of E.DIFFS) { const cfg = E.PRESETS[k], full = Object.assign({}, cfg, { rep: true }), sp = E.space(full);
    for (let i = 0; i < 4000; i++) { const a = E.randomCode(full, rand), b = E.randomCode(full, rand), f = E.feedback(a, b), r = E.feedback(b, a); n++;
      if (f.h !== r.h || f.b !== r.b) sym++; if (f.h + f.b > cfg.n || f.h < 0 || f.b < 0 || (f.h === cfg.n) !== (a.join() === b.join()) || (f.h === cfg.n - 1 && f.b === 1)) sum++;
      // the engine's packed feedback agrees with the plain one
      const x = (() => { const ia = E.idxOf(full, a), ib = E.idxOf(full, b); return E.filterCands(full, Int32Array.from([ia]), b, f.h, f.b).length === 1 && E.codeOf(full, ia).join() === a.join(); })(); if (!x) idx++; } }
  ok(!sym, 'feedback is symmetric (' + n + ' random pairs)');
  ok(!sum, 'hits + blows ≤ N, N hits only for the same code, never N−1 hits + 1 blow');
  ok(!idx, 'the index form of the feedback agrees with the plain one');
}
// --- code spaces ---
ok(E.allCands(E.PRESETS.easy).length === 360 && E.allCands(E.PRESETS.normal).length === 1296 && E.allCands(E.PRESETS.hard).length === 32768, 'code spaces: 360 (やさしい) / 1296 (ふつう) / 32768 (むずかしい)');
{ const rand = E.rng(5); let rep = 0; for (let i = 0; i < 2000; i++) { const c = E.randomCode(E.PRESETS.easy, rand); if (new Set(c).size !== 4) rep++; } ok(!rep, 'やさしい: generated codes never repeat a colour'); }
// --- the filter never removes the true code ---
{
  let lost = 0, grew = 0, n = 0; const rand = E.rng(21);
  for (const k of E.DIFFS) { const cfg = E.PRESETS[k];
    for (let i = 0; i < (k === 'hard' ? 60 : 400); i++) { const s = E.randomCode(cfg, rand), si = E.idxOf(cfg, s); let c = E.allCands(cfg);
      for (let t = 0; t < 6; t++) { const g = E.randomCode(Object.assign({}, cfg, { rep: true }), rand), f = E.feedback(s, g), c2 = E.filterCands(cfg, c, g, f.h, f.b); n++; if (c2.indexOf(si) < 0) lost++; if (c2.length > c.length) grew++; c = c2; } } }
  ok(!lost && !grew, 'candidate filter: the true code always stays, the set never grows (' + n + ' filters)');
}
// --- Lv.20 always solves within the limit ---
const table = {};
for (const k of E.DIFFS) {
  const cfg = E.PRESETS[k], rand = E.rng(100 + k.length), memo = new Map(); let mx = 0, sum = 0, n = 0; const dist = {};
  if (k !== 'hard') { for (const i of E.allCands(cfg)) { const g = E.solve(cfg, E.codeOf(cfg, i), 20, rand, 40, memo); mx = Math.max(mx, g); sum += g; n++; dist[g] = (dist[g] || 0) + 1; } }
  else { const N = QUICK ? 60 : 400; for (let i = 0; i < N; i++) { const g = E.solve(cfg, E.randomCode(cfg, rand), 20, rand, 40, memo); mx = Math.max(mx, g); sum += g; n++; dist[g] = (dist[g] || 0) + 1; } }
  table[k] = { mx, mean: sum / n, n };
  ok(mx <= cfg.max, `Lv.20 solver, ${k}: ${n} ${k === 'hard' ? 'random codes' : 'codes (every code)'} — max ${mx}, mean ${(sum / n).toFixed(3)} guesses (limit ${cfg.max})  ` + JSON.stringify(dist));
}
// --- average guesses per level (classic 4 × 6, the same secrets for every level) ---
{
  const cfg = E.PRESETS.normal, N = QUICK ? 4000 : 40000, secrets = []; const r0 = E.rng(777); for (let i = 0; i < N; i++) secrets.push(E.randomCode(cfg, r0));
  const memo = new Map(), means = []; let line = '';
  for (let lv = 1; lv <= 20; lv++) { const rand = E.rng(9000 + lv); let s = 0, mx = 0, over = 0; for (const sec of secrets) { const g = E.solve(cfg, sec, lv, rand, 60, memo); s += g; if (g > mx) mx = g; if (g > cfg.max) over++; } means.push(s / N); line += `\n   Lv.${lv < 10 ? ' ' : ''}${lv}  mean ${(s / N).toFixed(3)}  max ${mx}  over the limit of 10: ${(over / N * 100).toFixed(2)}%`; }
  console.log('   average guesses per level, ふつう (4 pegs, 6 colours, repeats), ' + N + ' codes each:' + line);
  let mono = true; for (let i = 1; i < 20; i++) if (!(means[i] < means[i - 1])) { mono = false; console.log('   not falling: Lv.' + i + ' ' + means[i - 1].toFixed(4) + ' → Lv.' + (i + 1) + ' ' + means[i].toFixed(4)); }
  ok(mono, 'the average number of guesses falls with every level (Lv.1 ' + means[0].toFixed(2) + ' → Lv.20 ' + means[19].toFixed(2) + ')');
  for (const k of ['easy', 'hard']) { const c2 = E.PRESETS[k], M = k === 'hard' ? (QUICK ? 30 : 200) : (QUICK ? 500 : 4000), rs = E.rng(31), secs = []; for (let i = 0; i < M; i++) secs.push(E.randomCode(c2, rs));
    let l2 = '', prev = Infinity, m2 = true; const mm = new Map();
    for (const lv of [1, 4, 8, 20]) { const rand = E.rng(500 + lv); let s = 0; for (const sec of secs) s += E.solve(c2, sec, lv, rand, 80, mm); l2 += `  Lv.${lv} ${(s / M).toFixed(2)}`; if (s / M >= prev) m2 = false; prev = s / M; }
    if (QUICK && k === 'hard') console.log('    (quick run, too few codes to compare) hard (' + M + ' codes):' + l2); else ok(m2, k + ' (' + M + ' codes): the average falls with the level —' + l2); }
}
// --- hints / best guess stay inside the rules ---
{ const cfg = E.PRESETS.easy, rand = E.rng(3); let badg = 0; for (let i = 0; i < 300; i++) { const s = E.randomCode(cfg, rand), hist = []; for (let t = 0; t < 3; t++) { const r = E.bestGuess(cfg, E.candsOf(cfg, hist), { rand }); if (!E.validCode(cfg, r.guess) || !E.consistent(cfg, hist, r.guess)) badg++; const f = E.feedback(s, r.guess); if (f.h === 4) break; hist.push({ g: r.guess, h: f.h, b: f.b }); } } ok(!badg, 'hint (best candidate guess): always a legal, consistent code — also without repeats'); }
{ const cfg = E.PRESETS.normal, rand = E.rng(8); let incons = 0, n = 0; for (let i = 0; i < 400; i++) { const s = E.randomCode(cfg, rand), hist = []; for (let t = 0; t < 12; t++) { const g = E.aiGuess(cfg, hist, 8 + (i % 12), rand); n++; if (!E.consistent(cfg, hist, g)) incons++; const f = E.feedback(s, g); if (f.h === 4) break; hist.push({ g, h: f.h, b: f.b }); } }
  ok(!incons, 'Lv.8–19 never contradict the feedback (' + n + ' guesses)');
  let low = 0, m = 0; for (let i = 0; i < 400; i++) { const s = E.randomCode(cfg, rand), hist = []; for (let t = 0; t < 12; t++) { const g = E.aiGuess(cfg, hist, 2, rand); m++; if (!E.consistent(cfg, hist, g)) low++; const f = E.feedback(s, g); if (f.h === 4) break; hist.push({ g, h: f.h, b: f.b }); } }
  ok(low > 0, 'Lv.2 does make contradicting guesses (' + (low / m * 100).toFixed(1) + '% of ' + m + ')'); }
// --- review ---
{ const cfg = E.PRESETS.normal, s = [3, 1, 1, 5], hist = [[0, 0, 1, 2], [0, 0, 1, 2], [3, 1, 1, 5]].map(g => { const f = E.feedback(s, g); return { g, h: f.h, b: f.b }; });
  const r0 = E.reviewStep(cfg, hist, 0, E.rng(1)), r1 = E.reviewStep(cfg, hist, 1, E.rng(1)), r2 = E.reviewStep(cfg, hist, 2, E.rng(1));
  ok(r0.ok && r0.before === 1296 && r0.after < 1296 && !r1.ok && r1.after === r1.before && r2.ok && r2.after === 1 && r0.best <= r0.exp + 1e-9, 'review: consistent / contradicting guesses and candidate counts (' + [r0, r1, r2].map(r => r.before + '→' + r.after).join(', ') + ')'); }
// --- daily ---
{ const a = E.dailyCode('2026-11-16'), b = E.dailyCode('2026-11-16'), seen = new Set(); let d = new Date(2026, 0, 1);
  for (let i = 0; i < 365; i++) { seen.add(E.dailyCode(E.localDate(d)).join('')); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
  ok(a.join() === b.join() && E.validCode(E.PRESETS.normal, a), 'daily code: the same for the same date (' + a.map(x => x + 1).join('') + ' on 2026-11-16)');
  ok(E.dailyCode('2026-11-17').join() !== a.join() && seen.size > 300, 'daily code: differs between dates (' + seen.size + ' different codes in 365 days)');
  ok(E.dayBefore('2026-03-01') === '2026-02-28' && E.dayBefore('2026-01-01') === '2025-12-31', 'dayBefore crosses months and years'); }
// --- decision time ---
{
  let line = '', worstAll = 0;
  for (const k of E.DIFFS) { const cfg = E.PRESETS[k], rand = E.rng(55); let worst = 0, sum = 0, n = 0;
    for (let i = 0; i < (k === 'hard' ? 25 : 60); i++) { const s = E.randomCode(cfg, rand), hist = [];
      for (let t = 0; t < 14; t++) { const t0 = process.hrtime.bigint(), g = E.aiGuess(cfg, hist, 20, rand), ms = Number(process.hrtime.bigint() - t0) / 1e6; worst = Math.max(worst, ms); sum += ms; n++; const f = E.feedback(s, g); if (f.h === cfg.n) break; hist.push({ g, h: f.h, b: f.b }); } }
    line += `  ${k}: mean ${(sum / n).toFixed(1)} ms, worst ${worst.toFixed(0)} ms`; worstAll = Math.max(worstAll, worst); }
  ok(worstAll < 300, 'decision time of Lv.20 (one guess):' + line);
  const cfg = E.PRESETS.hard, s = [1, 5, 5, 0, 7], g0 = [0, 0, 1, 2, 3], f = E.feedback(s, g0), t0 = Date.now(); E.reviewStep(cfg, [{ g: g0, h: f.h, b: f.b }, { g: g0, h: f.h, b: f.b }], 1, E.rng(2)); const ms = Date.now() - t0;
  ok(ms < 300, 'one review step in むずかしい: ' + ms + ' ms');
}
// ---------- 3D table: the race on one board (atlas/games/hitblow.js) ----------
{
  const r3 = E.rng('race-test'), z1 = E.rule(1);
  const winRate = (la, lb, z, n) => { const c = E.rule(z); let w = 0; for (let i = 0; i < n; i++) { const x = E.race(c, E.randomCode(c, r3), la, lb, i & 1, r3, c.rows); w += x.w === 0 ? 1 : x.w < 0 ? .5 : 0; } return w / n; };
  const lad = [[1, 15], [6, 15], [11, 15], [20, 15]].map(([a, b]) => winRate(a, b, 1, 400));
  console.log('race vs Lv.15 (カラー): Lv.1 ' + (lad[0] * 100).toFixed(0) + '%  Lv.6 ' + (lad[1] * 100).toFixed(0) + '%  Lv.11 ' + (lad[2] * 100).toFixed(0) + '%  Lv.20 ' + (lad[3] * 100).toFixed(0) + '%');
  ok(lad[0] < lad[1] && lad[1] < lad[2] && lad[2] < lad[3] + .05 && lad[3] > .5, 'race: the levels get stronger, Lv.20 beats Lv.15');
  for (const z of E.RULE_IDS) { const c = E.rule(z); let worst = 0; for (let i = 0; i < 6; i++) { const t0 = Date.now(); E.aiRace(c, [], 20, r3); const sec = E.randomCode(c, r3), op = E.opener(c), f0 = E.feedback(sec, op); const g = f0.h === c.n ? sec : E.raceBest(c, E.candsOf(c, [{ g: op, h: f0.h, b: f0.b }]), r3); worst = Math.max(worst, Date.now() - t0); ok(E.validCode(c, g), 'race guess is a valid code (' + c.id + ')'); } console.log('race decision ' + c.id + ': worst ' + worst + ' ms'); ok(worst < 600, 'race decision under 0.6 s (' + c.id + ')'); }
  for (const w of ['easy', 'hard']) for (const d of ['2026-11-16', '2026-11-17', '2027-01-01', '2027-06-30']) {
    const P = E.makeDaily(d, w); ok(!!P, 'daily ' + w + ' ' + d + ' exists');
    if (!P) continue;
    const c = E.rule(P.z), cands = E.candsOf(c, P.clues);
    ok(P.clues.every(x => { const f = E.feedback(P.secret, x.g); return f.h === x.h && f.b === x.b && f.h < c.n; }) && cands.some(i => E.codeOf(c, i).join() === P.secret.join()), 'daily ' + w + ' ' + d + ': the clues are true and leave the answer (' + cands.length + ' candidates, limit ' + P.limit + ')');
    const sd = E.solverDepth(c, P.clues, r3); ok(sd.worst <= P.limit, 'daily ' + w + ' ' + d + ': solvable within the limit for every candidate');
  }
}

console.log(fail ? 'FAILED (' + fail + ')' : 'ALL OK');
process.exit(fail ? 1 : 0);
