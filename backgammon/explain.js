// Backgammon V2 — position features and templated commentary ("why this play / cube decision").
// Pure functions on BG positions (Int8Array(52): side s's point i at s*26+i, 25 = bar, 0 = off).
// The output is language-independent: a list of {k: template key, a: {params}, w: weight}; the page turns it
// into sentences with its i18n templates (x.* / sx.* / cx.*). Used by the review (worker), the lessons and the
// puzzle generator (node), so every explanation is derived from the same objective criteria.
(function (root) {
'use strict';
const BG = root.BG || (typeof require !== 'undefined' ? require('./bg.js') : null);
const X = {};
const pct = x => Math.round(x * 100);

// ------------------------------------------------------------------ features of one side
function feat(q, s) {
  const o = 1 - s, m = s * 26, n = o * 26;
  const f = { pip: BG.pips(q, s), opip: BG.pips(q, o), off: q[m], ooff: q[n], bar: q[m + 25], oBar: q[n + 25],
    blots: [], made: [], home: 0, ohome: 0, anchors: 0, back: q[m + 25], maxStack: 0, prime: { len: 0, lo: 0, hi: 0 }, trapped: 0, contact: BG.contact(q) };
  let run = 0;
  for (let i = 1; i <= 24; i++) {
    const c = q[m + i];
    if (c === 1) f.blots.push(i);
    if (c >= 2) { f.made.push(i); if (i <= 6) f.home++; if (i >= 19) f.anchors++; }
    if (i >= 19) f.back += c;
    if (c > f.maxStack) f.maxStack = c;
    if (c >= 2) { run++; if (run > f.prime.len) f.prime = { len: run, lo: i - run + 1, hi: i }; } else run = 0;
    if (q[n + i] >= 2 && i <= 6) f.ohome++;
  }
  // opponent checkers behind the prime (they still have to pass it): opp at s-point x = opp point 25-x
  if (f.prime.len >= 3) for (let x = 1; x < f.prime.lo; x++) f.trapped += q[n + 25 - x];
  if (f.prime.len >= 3) f.trapped += q[n + 25];
  // all of s's checkers already past every opponent checker?
  f.allHome = BG.allHome(q, s);
  return f;
}
X.feat = feat;
// rolls (of 36) on which the opponent of s, on roll, can hit at least one checker of s
function shots(q, s) {
  const o = 1 - s, m = s * 26; let n = 0;
  if (!BG.contact(q)) return 0;
  let any = false; for (let i = 1; i <= 24; i++) if (q[m + i] === 1) { any = true; break; }
  if (!any) return 0;
  for (const [a, b, pr] of BG.ROLLS) {
    const pl = BG.genPlays(q, o, a, b);
    if (pl.some(x => x.pos[m + 25] > q[m + 25])) n += pr * 36;
  }
  return Math.round(n);
}
X.shots = shots;
// chance (0..1) that a checker on the bar cannot enter against `closed` made home points
const danceP = closed => (closed / 6) * (closed / 6);
// pips the opponent loses from the hits of a play (a hit on s-point i sends the opp checker back i pips)
function hitPips(moves) { let n = 0, k = 0; for (const c of moves) if (BG.mvHit(c)) { n += BG.mvTo(c); k++; } return { n, k }; }
const PT_VALUE = { 5: 10, 4: 8, 7: 8, 6: 6, 3: 6, 20: 7, 21: 6, 18: 5, 19: 4, 8: 4, 9: 3, 2: 3, 22: 3, 1: 1, 10: 2, 11: 2 };

// ------------------------------------------------------------------ why is `best` better than `played`?
// p: position before the play, s: the side to play; best/played: {moves, pos, v} with v from s's view
// (v = [win, winGammon, winBG, loseGammon, loseBG]). Returns {r: [...reasons], sit: {k, a}}.
function compare(p, s, best, played, opt) {
  opt = opt || {};
  const FB = feat(best.pos, s), FP = feat(played.pos, s);
  const R = [];
  const add = (k, a, w) => R.push({ k, a: a || {}, w });
  const hB = hitPips(best.moves), hP = hitPips(played.moves);
  const contactB = FB.contact, contactP = FP.contact;
  const SB = contactB ? shots(best.pos, s) : 0, SP = contactP ? shots(played.pos, s) : 0;
  // hitting
  if (hB.k > hP.k) {
    add(hB.k >= 2 && hP.k === 0 ? 'x.hit2' : 'x.hit', { n: hB.n - hP.n }, 3 + (hB.n - hP.n) / 8);
    if (FB.ohome <= 2 && SB > 0) add('x.hitSafe', { n: FB.ohome }, 1.2);
  } else if (hP.k > hB.k && SP >= SB + 4) add('x.noHit', { a: SP, b: SB, ap: pct(SP / 36), bp: pct(SB / 36) }, 2 + (SP - SB) / 5);
  // safety
  if (!R.some(r => r.k === 'x.noHit')) {
    if (SP - SB >= 4) add(SB === 0 ? 'x.shots0' : 'x.shots', { a: SP, b: SB, ap: pct(SP / 36), bp: pct(SB / 36) }, (SP - SB) / 4);
    else if (SB - SP >= 6) add('x.bold', { a: SB, ap: pct(SB / 36) }, 0.8);
  }
  // points
  const newB = FB.made.filter(i => !FP.made.includes(i) && !feat(p, s).made.includes(i));
  let bestPt = 0, bestV = 0;
  for (const i of newB) { const v = PT_VALUE[i] || 1; if (v > bestV) { bestV = v; bestPt = i; } }
  if (bestPt) {
    const k = bestPt === 5 ? 'x.pt5' : bestPt === 7 ? 'x.pt7' : bestPt === 4 ? 'x.pt4' : bestPt <= 6 ? 'x.ptHome' : bestPt === 20 ? 'x.anchor20' : bestPt >= 19 ? 'x.anchor' : 'x.pt';
    add(k, { n: bestPt }, bestV / 3);
  }
  // prime
  if (FB.prime.len >= 4 && FB.prime.len > FP.prime.len) add(FB.prime.len >= 6 ? 'x.prime6' : FB.trapped ? 'x.primeT' : 'x.prime', { n: FB.prime.len, t: FB.trapped }, FB.prime.len - 2);
  // anchors (when not already the reported point)
  if (FB.anchors > FP.anchors && !R.some(r => /anchor/.test(r.k))) add('x.anchor', { n: 0 }, 2);
  // running / escaping
  const leadB = FB.opip - FB.pip;
  if (contactP && FB.back < FP.back && leadB >= 10) add('x.escape', { n: leadB }, 2 + leadB / 20);
  if (contactP && !contactB && leadB >= 0) add('x.breakContact', { n: leadB }, 3);
  // attack: the opponent on the bar
  if (FB.oBar > 0 && FB.home > FP.home) add('x.closeBoard', { a: pct(danceP(FP.home)), b: pct(danceP(FB.home)), n: FB.home }, 2.5);
  // race / bear-off
  if (!contactP && !contactB) {
    if (FB.off > FP.off) add('x.off', { n: FB.off - FP.off }, 3);
    else if (BG.BO && BG.isBearoffPos(best.pos) && BG.isBearoffPos(played.pos)) {
      const eB = BG.boExpected(best.pos, s), eP = BG.boExpected(played.pos, s);
      if (eP - eB >= 0.02) add('x.boRolls', { a: eP.toFixed(2), b: eB.toFixed(2) }, 3);
    } else if (FB.pip === FP.pip) add('x.raceSmooth', {}, 1);
  }
  if (contactB && FB.allHome && FB.off > FP.off && SB <= SP) add('x.offSafe', { n: FB.off - FP.off }, 2.2);
  // gammons
  if (best.v && played.v) {
    const gw = best.v[1] - played.v[1], gl = played.v[3] - best.v[3];
    if (gw >= 0.04) add('x.gwin', { a: pct(played.v[1]), b: pct(best.v[1]) }, gw * 30);
    if (gl >= 0.04) add('x.gloss', { a: pct(played.v[3]), b: pct(best.v[3]) }, gl * 30);
  }
  // stacking
  if (FP.maxStack >= 6 && FB.maxStack < FP.maxStack) add('x.stack', { n: FP.maxStack }, 1.5);
  R.sort((a, b) => b.w - a.w);
  const out = R.slice(0, opt.max || 3);
  if (!out.length) out.push({ k: 'x.subtle', a: {}, w: 0 });
  if (best.v && played.v) out.push({ k: 'x.win', a: { a: (played.v[0] * 100).toFixed(1), b: (best.v[0] * 100).toFixed(1) }, w: 0 });
  return { r: out, sit: situation(p, s), sb: SB, sp: SP };
}
X.compare = compare;

// ------------------------------------------------------------------ what kind of position is it (side s to play)?
function situation(p, s) {
  const f = feat(p, s), lead = f.opip - f.pip, a = { n: Math.abs(lead), p: f.pip, o: f.opip };
  if (!f.contact) return { k: f.allHome && feat(p, 1 - s).allHome ? (lead >= 0 ? 'sx.bearAhead' : 'sx.bearBehind') : lead >= 0 ? 'sx.raceAhead' : 'sx.raceBehind', a };
  if (f.bar > 0) return { k: 'sx.onBar', a: Object.assign(a, { h: f.ohome }) };
  if (f.oBar > 0 && f.home >= 3) return { k: 'sx.blitz', a: Object.assign(a, { h: f.home }) };
  if (f.prime.len >= 4 && f.trapped > 0) return { k: 'sx.prime', a: Object.assign(a, { h: f.prime.len, t: f.trapped }) };
  if (f.anchors >= 2 && lead <= -50) return { k: 'sx.backgame', a };
  if (f.allHome) return { k: 'sx.bearContact', a };
  if (f.anchors >= 1 && lead <= -20) return { k: 'sx.holding', a };
  if (lead >= 25) return { k: 'sx.ahead', a };
  if (lead <= -25) return { k: 'sx.behind', a };
  if (f.pip >= 150 && f.opip >= 150) return { k: 'sx.opening', a };
  return { k: 'sx.middle', a };
}
X.situation = situation;

// ------------------------------------------------------------------ cube commentary
// v: pre-roll evaluation for the side on roll (the doubler); d: cubeDecision(v, ctx); sub: what was done
// ('nodouble' | 'double' | 'take' | 'pass'); returns reasons from the doubler's / taker's point of view
function cube(v, d, sub) {
  const R = [], p = pct(v[0]), g = pct(v[1]), q = 100 - p, lg = pct(v[3]);
  const tooGood = !d.double && !d.take;
  if (sub === 'take' || sub === 'pass') {
    R.push({ k: d.take ? 'cx.take' : 'cx.pass', a: { q, p, g } });
    if (!d.take && g >= 20) R.push({ k: 'cx.passGammon', a: { g } });
  } else if (d.double && d.take) R.push({ k: 'cx.dt', a: { p, g, q } });
  else if (d.double && !d.take) R.push({ k: 'cx.dp', a: { p, g, q } });
  else if (tooGood) R.push({ k: 'cx.tooGood', a: { p, g } });
  else R.push({ k: 'cx.nd', a: { p, g, q } });
  if (lg >= 15 && sub !== 'take' && sub !== 'pass') R.push({ k: 'cx.risk', a: { g: lg } });
  return R;
}
X.cube = cube;
// theme tags of a best play (for puzzles / lessons): language independent ids
function themes(p, s, best, plays) {
  const f0 = feat(p, s), FB = feat(best.pos, s), t = new Set();
  const h = hitPips(best.moves);
  if (!f0.contact) t.add(f0.allHome ? 'bearoff' : 'race');
  else {
    if (f0.bar) t.add('enter');
    if (h.k) t.add(h.k >= 2 ? 'blitz' : 'hit');
    if (f0.oBar && FB.home > f0.home) t.add('blitz');
    const newPts = FB.made.filter(i => !f0.made.includes(i));
    if (newPts.length) t.add('point');
    if (FB.prime.len >= 4 && FB.prime.len >= f0.prime.len) t.add('prime');
    if (f0.allHome) t.add('bearcontact');
    if (f0.anchors >= 2 && f0.opip - f0.pip <= -50) t.add('backgame');
    if (FB.back < f0.back && !h.k) t.add('escape');
    if (!h.k && shots(best.pos, s) === 0 && FB.blots.length <= f0.blots.length) t.add('safe');
  }
  return [...t];
}
X.themes = themes;
X.hitPips = hitPips;
X.danceP = danceP;

if (typeof module !== 'undefined' && module.exports) module.exports = X;
root.BGX = X;
})(typeof self !== 'undefined' ? self : this);
