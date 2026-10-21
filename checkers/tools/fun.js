// "Fun" score for checkers puzzles (0–100): a puzzle must be sound AND enjoyable.
// Soundness is a gate (score 0 when it fails): a legal position (no man on its crowning row, ≤ 12 pieces a side),
// at least 2 legal moves, and exactly one first move reaching the goal in the minimal number of own moves
// (the engine's own puzzle() search, the same check as tools/pzgen.c classify()).
// Then, weights (sum 100):
//   key  30  the key move: a sacrifice (offers a piece the opponent must / can jump) > a quiet move > a capture;
//            a capture that is the only capture on the board (forced) counts least
//   lure 20  several plausible first tries: alternatives that do not simply hang a piece, captures / crownings that
//            tempt; fewer points when 2+ alternatives also reach the goal one move later (near-cooks)
//   play 20  the middle of the line: own decisions after the first move that are real choices (not the only legal
//            move), a second sacrifice or a multi-jump; a single-move puzzle gets a neutral base here
//   end  15  satisfying finish: the opponent still has pieces but cannot move (a block), a multi-jump finale,
//            winning more than required
//   form 15  economy and natural look: share of pieces that take part in the solution (moved, jumped or touching
//            the action), not already winning on material; a lead of 2.5+ / 3.5+ (kings 1.4) also scales the
//            whole score by 0.9 / 0.82 (a mop-up, however tricky)
// usage: const { funScore } = require('./fun.js');  const K = await require('./wasm.js').load();
//        funScore(K, puzzle, theme) → { fun, sound, parts, info }
//        node tools/fun.js [--list]   prints the distribution of puzzles.json (and the worst / best puzzles)
'use strict';
const E = require('../engine.js');
const { bit, popc, mFrom, mTo, mCap, bitsOf, NB } = E;

function legal(spec) {
  const b = spec.b; let nb = 0, nw = 0;
  for (let i = 0; i < 32; i++) {
    const c = b[i];
    if (c === 'b' && i >= 28) return false;      // black man on its crowning row
    if (c === 'w' && i < 4) return false;
    if (c === 'b' || c === 'B') nb++; if (c === 'w' || c === 'W') nw++;
  }
  return nb >= 1 && nw >= 1 && nb <= 12 && nw <= 12;
}
const lead = (pos, me) => pos.count(me) - pos.count(3 - me);
const wlead = (pos, me) => (pos.count(me) + .4 * pos.kings(me)) - (pos.count(3 - me) + .4 * pos.kings(3 - me));
const reached = (g, base, pos, me) => pos.status() === -1 || (g > 0 && !pos.hasCaps() && lead(pos, me) - base >= g);
// after the attacker's move m from pos: does the opponent get a jump (a sacrifice when the answer)?
const offers = (pos, m) => pos.clone().play(m).hasCaps();
const near = i => [0, 1, 2, 3].map(d => NB[d][i]).filter(x => x >= 0);

function funScore(K, P, T) {
  const spec = P.s, n = P.n, g = P.g || (T && T.g) || 0, me = spec.side;
  const zero = (why, extra) => ({ fun: 0, sound: false, why, parts: {}, info: extra || {} });
  if (!legal(spec)) return zero('illegal');
  const pos0 = E.Pos.from(spec), mv0 = pos0.moves();
  if (mv0.length < 2) return zero('forced');
  const root = K.puzzle(spec, [], n, false, g, 0);
  if (root.some(x => x.need < 0)) return zero('unknown');
  const win = root.filter(x => x.need > 0);
  if (win.length !== 1 || win[0].need !== n) return zero(win.length > 1 ? 'multi' : 'nosol', { win: win.length });
  if (P.answer !== undefined && win[0].m !== P.answer) return zero('answer');
  const ans = win[0].m, base = lead(pos0, me);

  // ---- main line (as the app's "show answer" plays it): the defender picks the longest resistance
  const moves = [ans]; let pos = pos0.clone().play(ans);
  const act = new Set([mFrom(ans), mTo(ans), ...bitsOf(mCap(ans))]);
  const ids = new Map(); bitsOf(pos0.b | pos0.w).forEach((s, k) => ids.set(s, k));
  const used = new Set(); const moveId = (p, m) => { const id = ids.get(mFrom(m)); used.add(id); for (const c of bitsOf(mCap(m))) used.add(ids.get(c)); ids.delete(mFrom(m)); for (const c of bitsOf(mCap(m))) ids.delete(c); ids.set(mTo(m), id); };
  moveId(pos0, ans);
  let left = n - 1, choices = 0, forcedOwn = 0, sacMid = 0, multi = popc(mCap(ans)) >= 2 ? 1 : 0, lastMulti = popc(mCap(ans)) >= 2;
  for (let step = 0; step < 24 && !reached(g, base, pos, me); step++) {
    const att = pos.turn === me;
    let m;
    if (att) {
      const L = pos.moves();
      if (left <= 0) break;
      const list = K.puzzle(pos.spec(), [], left, false, g ? Math.max(1, g - (lead(pos, me) - base)) : 0, 0);   // attacker mode measures the gain from the current lead
      const good = list.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      if (!good.length) break;
      m = good[0].m;
      if (L.length < 2) forcedOwn++; else { choices++; if (!mCap(m) && offers(pos, m)) sacMid++; }
      left--;
    } else {
      const list = K.puzzle(pos0.spec(), moves, left, true, g, base);
      if (!list.length) break;
      let best = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!best || v > best.v) best = { m: e.m, v }; }
      m = best.m;
    }
    for (const s of [mFrom(m), mTo(m), ...bitsOf(mCap(m))]) act.add(s);
    const c = popc(mCap(m)); if (att) { lastMulti = c >= 2; if (c >= 2) multi++; }
    moveId(pos, m); pos = pos.clone().play(m); moves.push(m);
  }
  if (!reached(g, base, pos, me)) return zero('line');

  // ---- key move
  const capAns = mCap(ans) !== 0, sac = !capAns && offers(pos0, ans);
  const nCaps = pos0.hasCaps() ? mv0.length : 0;
  const key = sac ? 1 : !capAns ? (pos0.promotes(ans) ? .5 : .65) : nCaps >= 2 ? .4 : .2;
  // ---- lure: plausible alternatives
  const alts = mv0.filter(m => m !== ans);
  const plaus = alts.filter(m => mCap(m) || pos0.promotes(m) || !offers(pos0, m)).length;
  let lure = Math.min(1, plaus / 3) * .75 + Math.min(1, (mv0.length - 1) / 6) * .25;
  let cooks = 0;
  if (n <= 3) { const r2 = K.puzzle(spec, [], n + 1, false, g, 0); cooks = r2.filter(x => x.m !== ans && x.need === n + 1).length; }
  if (cooks >= 2) lure *= cooks >= 4 ? .6 : .8;
  // ---- the middle of the line
  let play;
  if (n === 1) play = .5 + (sac ? .2 : 0);
  else play = Math.min(1, choices / (n - 1)) * .6 + Math.min(1, sacMid) * .25 + Math.min(1, multi) * .15 - Math.min(.4, forcedOwn / n * .4);
  play = Math.max(0, Math.min(1, play));
  // ---- finish
  const block = pos.status() === -1 && pos.count(pos.turn) > 0;
  let end;
  if (g === 0) end = block ? 1 : lastMulti ? .75 : .55;
  else { const got = lead(pos, me) - base; end = (got > g ? .9 : .6) + (lastMulti ? .2 : 0) + (pos.status() === -1 ? .2 : 0); }
  end = Math.min(1, end);
  // ---- economy / natural look
  const total = popc(pos0.b | pos0.w);
  const touch = new Set(); for (const s of act) { touch.add(s); for (const x of near(s)) touch.add(x); }
  const involved = new Set(used); bitsOf(pos0.b | pos0.w).forEach((s, k) => { if (touch.has(s)) involved.add(k); });
  const share = involved.size / total;
  const econ = total <= 8 ? Math.min(1, share / .85) : Math.min(1, share / .5);
  const wl = wlead(pos0, me);
  const bal = wl <= .5 ? 1 : wl <= 1.5 ? .8 : wl <= 2.5 ? .5 : .2;
  const form = econ * .6 + bal * .4;

  const parts = { key: 30 * key, lure: 20 * lure, play: 20 * play, end: 15 * end, form: 15 * form };
  // a big material lead turns any trick into a mop-up: scale the whole score down
  const mop = wl >= 3.5 ? .82 : wl >= 2.5 ? .9 : 1;
  const fun = Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * mop);
  return { fun, sound: true, parts, info: { sac, capAns, alts: alts.length, plaus, cooks, choices, forcedOwn, sacMid, multi, block, total, involved: involved.size, wl, line: moves.length, moves } };
}
module.exports = { funScore, legal };

if (require.main === module) (async () => {
  const fs = require('fs'), path = require('path');
  const K = await require('./wasm.js').load();
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  const all = [];
  for (const T of D.themes) {
    const sc = T.puzzles.map((P, j) => { const r = funScore(K, P, T); all.push({ id: T.id, j, ...r }); return r.fun; });
    const s = sc.slice().sort((a, b) => a - b);
    console.log(T.id.padEnd(7), 'min', s[0], 'med', s[s.length >> 1], 'max', s[s.length - 1], '<70:', sc.filter(x => x < 70).length, '<60:', sc.filter(x => x < 60).length, ' ', sc.join(' '));
  }
  const bad = all.filter(x => !x.sound); if (bad.length) console.log('unsound', bad.map(x => x.id + '-' + x.j + ':' + x.why).join(' '));
  if (process.argv.includes('--list')) {
    all.sort((a, b) => a.fun - b.fun);
    for (const x of [...all.slice(0, 12), ...all.slice(-8)]) console.log(x.fun, x.id + '-' + x.j, JSON.stringify(Object.fromEntries(Object.entries(x.parts).map(([k, v]) => [k, Math.round(v)]))), JSON.stringify(x.info));
  }
})();
