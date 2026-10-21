// Mines new backgammon puzzles from seeded self-play games and verifies each one exactly like the puzzle set:
// all plays ranked by the engine (wildbg nets + bear-off database), the top ones re-valued at 2-ply, the answer must
// beat the 2nd play (also at 2-ply) clearly. Cube puzzles: pre-roll value at depth 2 + BG.cubeDecision (money, centred cube).
// Only candidates whose fun score (fun.js) is ≥ MIN are written.
// usage: node mine.js <seed> <games> <out.jsonl> [needJSON e.g. '{"blitz":30,"cube_pass":1}']
'use strict';
const fs = require('fs');
const { BG, BGX, encPos, encMoves } = require('./load.js');
const { funScore, THEME, cubeMargin } = require('./fun.js');
const [seed, games, out, needArg] = [+process.argv[2] || 1, +process.argv[3] || 10, process.argv[4] || 'cand.jsonl', process.argv[5]];
const need = needArg ? JSON.parse(needArg) : null;
const MIN = 75;
const P0 = require('../puzzles.json');
const seenPos = new Set(); for (const C of P0.cats) for (const X of C.puzzles) seenPos.add(X.pos);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(seed * 7919 + 17);
const die = () => 1 + Math.floor(rng() * 6);
const got = {};
const fd = fs.openSync(out, 'a');
const emit = (cat, P, f) => { got[cat] = (got[cat] || 0) + 1; fs.writeSync(fd, JSON.stringify({ cat, fun: f.fun, gap: f.gap, P }) + '\n'); };
const wants = cat => !need || (need[cat] && (got[cat] || 0) < need[cat] * 2);
const naiveTop = (p, s, plays) => { let b = null, be = -1e9; for (const x of plays) { const e = -BG.equity(BG.heurEval(x.pos, 1 - s)); if (e > be) { be = e; b = x; } } return b; };
const themeName = (cat, tags, sit) => cat === 'defense' ? (sit === 'sx.onBar' ? 'enter' : sit === 'sx.backgame' || tags.includes('backgame') ? 'backgame' : 'holding')
  : cat === 'race' ? (tags.includes('race') ? 'race' : 'escape') : cat === 'bearoff' ? (tags.includes('bearoff') ? 'bearoff' : 'bearcontact') : cat;

function tryChecker(p, s, d1, d2) {
  const all = BG.genPlays(p, s, d1, d2);
  if (all.length < 4) return;
  const pos = encPos(p); if (seenPos.has(pos)) return;
  for (const x of all) x.e = BG.equity(BG.evalAfter(x.pos, s));
  all.sort((a, b) => b.e - a.e);
  if (all[0].e - all[1].e < 0.015) return;
  const nt = naiveTop(p, s, all);   // the obvious move is already the answer: only worth it when it is clearly best
  if (BG.key(nt.pos) === BG.key(all[0].pos) && all[0].e - all[1].e < 0.06) return;
  const tags0 = BGX.themes(p, s, all[0]), sit0 = BGX.situation(p, s).k;
  const cats = Object.keys(THEME).filter(c => THEME[c](tags0, sit0) && wants(c));
  if (!cats.length) return;
  // cheap screen at 1-ply on the top 3 (the estimate must already reach MIN), then the full verification
  const pre = BG.analyzePlays(p, s, d1, d2, { ply: 1, keep1: 3, margin1: 0.3 });
  if (pre[0].e - pre[1].e < 0.025) return;
  const est = { pos, side: s, dice: [d1, d2], plays: pre.slice(0, 2).map(x => [encMoves(x.moves), x.e]), r: [['x.a'], ['x.b']] };
  if (!cats.some(c => THEME[c](BGX.themes(p, s, pre[0]), sit0) && funScore(est, c).fun >= MIN - 2)) return;
  // full verification (same depth as the set: 2-ply on the top plays)
  const pl = BG.analyzePlays(p, s, d1, d2, { ply: 2, keep1: 8, margin1: 0.3, keep2: 3, margin2: 0.25 });
  if (pl.length < 2 || pl[0].ply !== 2 || pl[1].ply !== 2) return;
  const gap = pl[0].e - pl[1].e; if (gap < 0.03) return;
  const best = pl[0], tags = BGX.themes(p, s, best), sit = BGX.situation(p, s);
  const top = pl.slice(0, 12), ntk = BG.key(naiveTop(p, s, all).pos);
  let alt = top.findIndex(x => BG.key(x.pos) === ntk); if (alt <= 0) alt = 1;
  const cmp = BGX.compare(p, s, best, top[alt]);
  for (const cat of cats) {
    if (!THEME[cat](tags, sit.k)) continue;
    const P = { id: '', pos, side: s, dice: [d1, d2], plays: top.map(x => [encMoves(x.moves), +x.e.toFixed(3)]), gap: +gap.toFixed(3), theme: themeName(cat, tags, sit.k),
      sit: [sit.k, sit.a], alt, r: cmp.r.map(z => [z.k, z.a]) };
    const f = funScore(P, cat);
    if (f.fun >= MIN) { emit(cat, P, f); seenPos.add(pos); return; }
  }
}
// cube: side s on roll before rolling, centred cube, money game
function tryCube(p, s) {
  const pos = encPos(p); if (seenPos.has(pos) || !BG.contact(p) && !BG.allHome(p, s)) {}
  if (seenPos.has(pos)) return;
  const v0 = BG.evalRoll(p, s, 0); if (v0[0] < 0.6 || v0[0] > 0.93) return;
  const c0 = BG.cubeDecision(v0, { me: s, cube: 1, owner: -1, matchLen: 0 });
  const want = c0.double && !c0.take ? 'pass' : c0.double && c0.take ? 'take' : null;
  if (!want || !wants('cube_' + want)) return;
  const v = BG.evalRoll(p, s, 2), d = BG.cubeDecision(v, { me: s, cube: 1, owner: -1, matchLen: 0 });
  if (!d.double) return;
  const ans = d.take ? 0 : 1; if ((ans ? 'pass' : 'take') !== want) return;
  const o = 1 - s, sit = BGX.situation(p, o);
  const P = { id: '', kind: 'cube', q: 'take', pos, side: o, opts: ['take', 'pass'], ans, theme: 'cube', cx: BGX.cube(v, d, ans ? 'pass' : 'take').map(z => [z.k, z.a]),
    sit: null, qv: { p: String(Math.round((1 - v[0]) * 100)), g: String(Math.round(v[3] * 100)), l: String(Math.round(v[1] * 100)), tk: (-d.dt).toFixed(3) } };
  const f = funScore(P, 'cube');
  if (f.fun >= MIN) { emit('cube_' + want, P, f); seenPos.add(pos); }
}
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const p = BG.initial(); let s = rng() < .5 ? 0 : 1, first = true, ply = 0;
  while (BG.winner(p) < 0 && ply < 400) {
    let d1 = die(), d2 = die(); if (first) while (d1 === d2) d2 = die(); first = false;
    if (need && (need.cube_pass || need.cube_take) && ply > 6 && rng() < .25) tryCube(p, s);
    tryChecker(p, s, d1, d2);
    const plays = BG.genPlays(p, s, d1, d2);
    for (const x of plays) x.e = BG.equity(BG.evalAfter(x.pos, s));
    plays.sort((a, b) => b.e - a.e);
    const r = rng(), k = plays.length > 2 && r < .1 ? 2 : plays.length > 1 && r < .25 ? 1 : 0;   // a little noise for variety
    p.set(plays[k].pos); s = 1 - s; ply++;
  }
  if (g % 5 === 4) console.error(`seed ${seed} game ${g + 1}/${games}`, JSON.stringify(got), ((Date.now() - t0) / 1000 | 0) + 's');
}
fs.closeSync(fd);
console.error('done', seed, JSON.stringify(got));
