// "Fun" score (0–100) for backgammon puzzles (puzzles.json). A puzzle must be sound AND enjoyable:
// Checker-play puzzles (one roll, find the best play):
//   • sound   25  the best play is clearly best at 2-ply (gap to the 2nd play: 0 at ≤0.02, full at ≥0.08)
//   • trap    25  a naive player (BG.heurEval: pips + blots + made points, i.e. "the obvious move") would NOT pick the
//                 answer — the key play is quiet / counter-intuitive (naive rank 0: .2, rank 1: .7, rank 2+: 1)
//   • choice  15  enough legal plays to think about (≤2 plays: 0, 10+ plays: full); no forced moves
//   • theme   15  the category's theme is what the best play actually does (BGX.themes of the answer / the situation)
//   • explain 10  the engine's comparison with the tempting alternative has real reasons (not just "subtle")
//   • natural 10  natural-looking position: no huge stacks, few checkers on the bar, no duplicate in the set
// Cube puzzles (double / take decisions):
//   • clarity 30  the right action beats the next one by a margin (0 at ≤0.015, full at ≥0.06 equity per cube unit)
//   • interest 30 but not by a mile — trivial decisions (margin > .2, gone at .7) are no fun
//   • gammons 15  gammon chances matter (≥10 %)
//   • explain 10  a cube commentary exists
//   • natural 15  as above
// usage: const { funScore } = require('./fun.js'); funScore(P, catId) → { fun, parts }
//        node fun.js            → score distribution of the current set per category
'use strict';
const { BG, BGX, decPos, decMoves } = require('./load.js');
const clamp = x => Math.max(0, Math.min(1, x));
const THEME = {
  opening: (t, sit) => sit === 'sx.opening', hit: t => t.includes('hit'), point: t => t.includes('point'), prime: t => t.includes('prime'),
  safe: t => t.includes('safe'), blitz: t => t.includes('blitz'), defense: (t, sit) => t.includes('enter') || t.includes('backgame') || sit === 'sx.holding' || sit === 'sx.onBar' || sit === 'sx.backgame',
  race: (t, sit) => t.includes('race') || t.includes('escape'), bearoff: t => t.includes('bearoff') || t.includes('bearcontact'),
};
function natural(p) {
  let worst = 0, bar = p[25] + p[51];
  for (let i = 1; i <= 24; i++) worst = Math.max(worst, p[i], p[26 + i]);
  let n = 1;
  if (worst >= 7) n -= .5; else if (worst >= 6) n -= .25;
  if (bar >= 4) n -= .5; else if (bar >= 3) n -= .25;
  return clamp(n);
}
function cubeMargin(P) {
  const q = P.qv;
  if (P.q === 'take') return Math.abs(+q.tk + 1) / 2;   // tk is in units of the doubled cube
  const nd = +q.nd, dt = +q.dt, dp = +q.dp, D = Math.min(dt, dp) - nd, T = dp - dt;
  const a = P.opts[P.ans];
  return a === 'nd' ? -D : a === 'tg' ? Math.min(-D, -T) : a === 'dt' ? Math.min(D, T) : Math.min(D, -T);
}
function funScore(P, cat, seen) {
  const p = decPos(P.pos);
  const nat = natural(p) * (seen && seen.has(P.pos + (P.dice || '')) ? 0 : 1);   // same position and roll twice in a category
  if (P.kind === 'cube') {
    const m = cubeMargin(P), q = P.qv;
    const parts = { clarity: clamp((m - .015) / .045), interest: 1 - clamp((m - .2) / .5), gammons: clamp(Math.max(+q.g, +q.l) / 10), explain: P.cx && P.cx.length ? 1 : 0, natural: nat };
    const fun = Math.round(30 * parts.clarity + 30 * parts.interest + 15 * parts.gammons + 10 * parts.explain + 15 * parts.natural);
    return { fun, parts, margin: m };
  }
  const s = P.side, [d1, d2] = P.dice;
  const all = BG.genPlays(p, s, d1, d2);
  const bk = BG.key(decMoves(p, s, P.plays[0][0]).pos);
  const naive = all.map(x => ({ k: BG.key(x.pos), e: BG.equity(BG.heurEval(x.pos, 1 - s)) * -1 })).sort((a, b) => b.e - a.e);
  const nr = naive.findIndex(x => x.k === bk);
  const gap = P.plays.length > 1 ? P.plays[0][1] - P.plays[1][1] : 0;
  const best = decMoves(p, s, P.plays[0][0]);
  const tags = BGX.themes(p, s, best), sit = BGX.situation(p, s).k;
  const reasons = (P.r || []).filter(r => r[0] !== 'x.win' && r[0] !== 'x.subtle').length;
  const parts = {
    sound: all.length < 2 ? 0 : clamp((gap - .02) / .06),
    trap: nr <= 0 ? .2 : nr === 1 ? .7 : 1,
    choice: clamp((all.length - 2) / 8),
    theme: THEME[cat] ? (THEME[cat](tags, sit) ? 1 : 0) : 1,
    explain: reasons >= 2 ? 1 : reasons === 1 ? .6 : 0,
    natural: nat,
  };
  const fun = Math.round(25 * parts.sound + 25 * parts.trap + 15 * parts.choice + 15 * parts.theme + 10 * parts.explain + 10 * parts.natural);
  return { fun, parts, gap, naiveRank: nr, nPlays: all.length, tags };
}
module.exports = { funScore, cubeMargin, natural, THEME };

if (require.main === module) {
  const P = require('../puzzles.json');
  const all = [];
  for (const C of P.cats) {
    const seen = new Set(), sc = [];
    for (const X of C.puzzles) { const f = funScore(X, C.id, seen); seen.add(X.pos + (X.dice || '')); sc.push(f.fun); all.push(f.fun); }
    const s = sc.slice().sort((a, b) => a - b);
    console.log(C.id.padEnd(8), 'min', s[0], 'med', s[s.length >> 1], 'max', s[s.length - 1], '<70:', s.filter(x => x < 70).length, '/', s.length);
  }
  const s = all.sort((a, b) => a - b);
  console.log('all: p10', s[s.length * .1 | 0], 'p25', s[s.length * .25 | 0], 'med', s[s.length >> 1], 'p75', s[s.length * .75 | 0], '<70:', s.filter(x => x < 70).length);
}
