/* 盤双六「本双六」— rules and AI (2026-11-23, for 所蔵品で遊ぶ: the Shōsōin's 木画紫檀双六局, atlas/museum/play.js).
   Rules (Tokushima Prefectural Museum after Masukawa 1995 『すごろくⅠ』; Japanese / English Wikipedia):
   · 15 stones each, the same opening position as backgammon; two dice; a double is just two moves (not four)
   · a stone may not land on a point held by two or more of the other side; landing on a single one "cuts" it (切る):
     it goes to the strip in the middle and must come in again from the start before that side moves anything else
   · no bearing off: the first to have all fifteen in the home table (内地) wins (入勝)
   · (not recorded in these sources, taken from backgammon:) both dice must be played if they can be; if only one can, the larger
   Absolute points 1–24: side 0 moves 24 → 1, home 1–6; side 1 moves 1 → 24, home 19–24. b[i] > 0: side 0's stones, < 0: side 1's.
   Node: module.exports; browser: window.SugorokuEngine. */
(function (root) {
  'use strict';
  const N = 15;
  function newGame(first) {
    const b = new Array(25).fill(0);
    b[24] = 2; b[13] = 5; b[8] = 3; b[6] = 5;   // side 0
    b[1] = -2; b[12] = -5; b[17] = -3; b[19] = -5;   // side 1
    return { b, bar: [0, 0], turn: first || 0, winner: -1 };
  }
  const clone = s => ({ b: s.b.slice(), bar: s.bar.slice(), turn: s.turn, winner: s.winner });
  const own = (s, side, i) => side ? -s.b[i] : s.b[i];   // stones of `side` on point i (negative: the other side's)
  const homeAll = (s, side) => { if (s.bar[side]) return false; let n = 0; for (let i = side ? 19 : 1; i <= (side ? 24 : 6); i++) n += Math.max(0, own(s, side, i)); return n === N; };
  // one die's moves for `side`: [{ from (0 = the middle strip), to, hit }]
  function steps(s, side, d) {
    const out = [], dir = side ? 1 : -1;
    const ok = to => to >= 1 && to <= 24 && own(s, side, to) >= -1;
    if (s.bar[side]) { const to = side ? d : 25 - d; if (ok(to)) out.push({ from: 0, to, hit: own(s, side, to) === -1 }); return out; }
    for (let i = 1; i <= 24; i++) { if (own(s, side, i) <= 0) continue; const to = i + dir * d; if (ok(to)) out.push({ from: i, to, hit: own(s, side, to) === -1 }); }
    return out;
  }
  function step(s, side, m) {   // in place
    const sg = side ? -1 : 1;
    if (m.from === 0) s.bar[side]--; else s.b[m.from] -= sg;
    if (m.hit) { s.b[m.to] = 0; s.bar[1 - side]++; }
    s.b[m.to] += sg;
    if (homeAll(s, side)) s.winner = side;
  }
  // every way to play the roll: [{ steps:[…], state }], each as long as the dice allow (the larger die when only one can be played)
  function sequences(s, dice) {
    const side = s.turn, orders = dice[0] === dice[1] ? [[dice[0], dice[1]]] : [[dice[0], dice[1]], [dice[1], dice[0]]], all = [];
    const rec = (st, rest, done) => {
      if (!rest.length || st.winner >= 0) { all.push({ steps: done, state: st, used: done.length }); return; }
      const ms = steps(st, side, rest[0]);
      if (!ms.length) { all.push({ steps: done, state: st, used: done.length }); return; }
      for (const m of ms) { const t = clone(st); step(t, side, m); rec(t, rest.slice(1), done.concat([Object.assign({ d: rest[0] }, m)])); }
    };
    orders.forEach(o => rec(clone(s), o, []));
    let max = 0; all.forEach(q => { const u = q.state.winner >= 0 ? 2 : q.used; if (u > max) max = u; });
    let res = all.filter(q => (q.state.winner >= 0 ? 2 : q.used) === max);
    if (max === 1 && dice[0] !== dice[1]) { const hi = Math.max(dice[0], dice[1]); if (res.some(q => q.steps[0].d === hi)) res = res.filter(q => q.steps[0].d === hi); }
    return max ? res : [];
  }
  function finish(s) { const t = clone(s); t.turn = 1 - t.turn; return t; }   // after the roll is played
  const key = s => s.b.join(',') + '|' + s.bar.join(',');
  // distinct end positions of a roll (for the AI)
  function ends(s, dice) { const seen = new Map(); for (const q of sequences(s, dice)) { const k = key(q.state); if (!seen.has(k)) seen.set(k, q); } return [...seen.values()]; }

  /* ---------- evaluation (from `side`'s view; larger = better) ---------- */
  // pips to home: what each stone still has to travel to reach the home table (the race; no bearing off, so the home's edge is the goal)
  function pips(s, side) { let p = s.bar[side] * 19; for (let i = 1; i <= 24; i++) { const n = own(s, side, i); if (n > 0) { const q = side ? 25 - i : i; if (q > 6) p += n * (q - 6); } } return p; }
  // direct shots: how many of the 36 rolls let the other side hit a blot at own-point q (q from side's view) — a short table
  const SHOT = [0, 11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];   // (a double moves twice, not four times: nothing past 12)
  const W = { race: 1, bar: 0, pt: 1.6, home: 1.6, blot: .55, blot0: .15, stack: .35, prime: 0, behind: .4 };   // weights (tuned by self-play: work/sgtune)
  function evaluate(s, side) {
    if (s.winner === side) return 1e6; if (s.winner === 1 - side) return -1e6;
    const o = 1 - side, pm = pips(s, side), po = pips(s, o);
    let v = (po - pm) * W.race;
    v += (s.bar[o] - s.bar[side]) * W.bar;
    // made points ahead of the other side's stones block it (a run of them more), blots it can reach cost the distance lost
    let run = 0, best = 0, backO = 0;
    for (let i = 1; i <= 24; i++) { if (own(s, o, i) > 0) backO = side ? Math.max(backO, 25 - i) : Math.max(backO, i); }
    for (let k = 1; k <= 24; k++) {   // k: side's own point number
      const i = side ? 25 - k : k, n = own(s, side, i);
      if (n >= 2) { run++; best = Math.max(best, run); if (k <= 12) v += W.pt + (k <= 6 ? W.home : 0); } else run = 0;
      if (n === 1) {
        // the other side's stones behind this blot (on its way): distance from each to the blot
        let risk = 0;
        for (let j = 1; j <= 24; j++) { if (own(s, o, j) <= 0) continue; const dist = side ? j - i : i - j; if (dist > 0) risk = Math.max(risk, SHOT[dist] || 0); }
        if (s.bar[o]) risk = Math.max(risk, SHOT[k] || 0);   // (coming in from the middle strip: the distance is the blot's own point number)
        v -= risk / 36 * (25 - k) * W.blot + W.blot0;
      }
      if (n > 3) v -= (n - 3) * W.stack;   // stacks waste stones
    }
    v += best * best * W.prime;
    // stones already home do nothing more: reward the last few to come in, punish a stone left far behind
    let behind = 0; for (let k = 19; k <= 24; k++) { const i = side ? 25 - k : k; behind += Math.max(0, own(s, side, i)); }
    v -= behind * W.behind;
    return v;
  }
  const ROLLS = []; for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);
  function greedy(s, dice, side) { let bv = -Infinity, bq = null; for (const q of ends(s, dice)) { const v = evaluate(q.state, side); if (v > bv) { bv = v; bq = q; } } return { q: bq, v: bv }; }
  // the value of position t (the other side to roll) for `side`: the other side's best answer, averaged over its 21 rolls
  function reply(t, side) {
    let e = 0; const o = 1 - side;
    for (const [a, b, p] of ROLLS) { const ts = Object.assign(clone(t), { turn: o }); const g = greedy(ts, [a, b], o); e += p * (g.q ? -g.v : evaluate(t, side)); }
    return e;
  }
  /* think(state, dice, level 1–20, rng) → { steps } or null (no move). Weak levels err on purpose; 17+ look one roll ahead. */
  function think(s, dice, level, rng) {
    rng = rng || Math.random; const side = s.turn, cs = ends(s, dice); if (!cs.length) return null;
    const lv = Math.max(1, Math.min(20, level | 0));
    if (lv <= 2 && rng() < .6) return cs[Math.floor(rng() * cs.length)];
    const sc = cs.map(q => ({ q, v: lv <= 4 ? pips(q.state, 1 - side) - pips(q.state, side) : evaluate(q.state, side) }));
    if (lv < 17) { const noise = (17 - lv) * (17 - lv) * .12; sc.forEach(x => { x.v += (rng() - .5) * 2 * noise; }); }
    sc.sort((a, b) => b.v - a.v);
    if (lv >= 17 && sc.length > 1 && sc[0].v < 5e5) {
      const top = sc.slice(0, lv >= 19 ? 8 : 5);
      top.forEach(x => { x.v = x.v * .15 + reply(x.q.state, side) * .85; });
      top.sort((a, b) => b.v - a.v); return top[0].q;
    }
    return sc[0].q;
  }
  // rollouts (the strongest levels): each candidate played out to the end many times by a quick greedy policy; the win rate decides
  function rollout(t, side, rng, cap) {
    let s = t, n = 0;
    while (s.winner < 0 && n < (cap || 400)) { const d = rollDice(rng), g = greedy(s, d, s.turn); s = g.q ? (g.q.state.winner >= 0 ? g.q.state : finish(g.q.state)) : finish(s); n++; }
    return s.winner === side ? 1 : s.winner < 0 ? .5 : 0;
  }
  function thinkRoll(s, dice, n, rng, k) {
    rng = rng || Math.random; const side = s.turn, cs = ends(s, dice); if (!cs.length) return null;
    const sc = cs.map(q => ({ q, v: evaluate(q.state, side) })).sort((a, b) => b.v - a.v).slice(0, k || 5);
    if (sc[0].v > 5e5 || sc.length === 1) return sc[0].q;
    sc.forEach(x => { let w = 0; for (let i = 0; i < n; i++) w += rollout(finish(x.q.state), side, rng); x.w = w / n; });
    sc.sort((a, b) => b.w - a.w); return sc[0].q;
  }
  const rollDice = rng => { rng = rng || Math.random; return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)]; };
  const API = { W, thinkRoll, N, newGame, clone, own, steps, step, sequences, ends, finish, key, pips, evaluate, think, rollDice, homeAll };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SugorokuEngine = API;
})(typeof window !== 'undefined' ? window : this);
