/* Hanafuda Koi-Koi AI (Lv.1-20). Own design:
   - imperfect information: the opponent's hand and the deck order are unknown -> determinization
     (sample a world consistent with what this side has seen, weighted by the opponent's discards)
   - each candidate action is scored by playouts with a quick heuristic policy (expected point gain)
   - koi-koi decision = expected value of continuing (playouts) vs. stopping now
   Strength scales with samples, playout policy quality and a decision noise for the low levels. */
(function (root) {
  'use strict';
  const HF = (typeof require !== 'undefined') ? require('./engine.js') : root.HF;
  const { CARDS, ID, month } = HF;

  // static card value for the quick policy
  const VAL = new Float32Array(48);
  CARDS.forEach(c => {
    VAL[c.id] = c.type === 'hikari' ? 9 : c.type === 'tane' ? 4 : c.type === 'tan' ? 3 : 1;
  });
  VAL[ID.sake] = 8; VAL[ID.boar] = VAL[ID.deer] = VAL[ID.butterfly] = 6;
  [1, 5, 9, 21, 33, 37].forEach(i => { VAL[i] = 5; });
  VAL[ID.rainman] = 6;

  function level(lv) {
    lv = Math.max(1, Math.min(20, lv | 0));
    return {
      lv,
      worlds: [0, 2, 3, 4, 6, 8, 10, 14, 18, 24, 30, 40, 36, 44, 52, 62, 74, 88, 104, 124, 150][lv],
      noise: Math.max(0, 1.6 - lv * 0.11),          // softmax temperature-ish
      blunder: Math.max(0, 0.30 - lv * 0.022),      // chance to play a quick-policy / random move
      infer: lv >= 8,                                // use the opponent's discards to shape its hand
      koiSmart: lv >= 5,
      strong: lv >= 12,                              // the stronger playout policy
    };
  }

  // value of the captured pile for the quick policy: yaku points + partial progress
  function pileValue(caps, o) {
    const y = HF.yaku(caps, o).total;
    const p = HF.progress(caps, o);
    let v = y * 10;
    v += [0, 2, 5, 9, 12, 14][p.lights] || 0;
    v += [0, 2, 6, 0][Math.min(3, p.isc)] || 0;
    v += [0, 2, 6, 0][Math.min(3, p.aka)] || 0;
    v += [0, 2, 6, 0][Math.min(3, p.ao)] || 0;
    if (p.sake) v += 3 + (p.moon ? 2 : 0) + (p.curtain ? 2 : 0);
    v += Math.min(p.tane, 4) * 0.8 + Math.min(p.tan, 4) * 0.7 + Math.min(p.kasu, 9) * 0.35;
    return v;
  }

  // stronger quick policy (Lv.12+ playouts): weigh a capture by what it adds to my pile AND what it keeps from the opponent;
  // weigh a discard by how much it could give the opponent (if it holds that month) or let me take back later.
  function gain(caps, add, o) { return pileValue(caps.concat(add), o) - pileValue(caps, o); }
  function quick2(s, r, eps) {
    const acts = HF.actions(s);
    if (acts.length === 1) return acts[0];
    if (s.phase === 'koi') return quickKoi2(s) ? 'koi' : 'stop';
    if (eps && r() < eps) return acts[Math.floor(r() * acts.length)];
    const p = s.turn, q = 1 - p, o = s.o, mine = s.caps[p], opp = s.caps[q];
    if (s.phase === 'pickPlay' || s.phase === 'pickDraw') {
      let best = acts[0], bv = -1e9;
      for (const a of acts) { const v = gain(mine, [s.pending, a], o) + 0.6 * gain(opp, [a], o); if (v > bv) { bv = v; best = a; } }
      return best;
    }
    // months already gone (both other cards captured) are safe to discard
    const seen = new Uint8Array(12);
    for (const c of mine) seen[month(c)]++;
    for (const c of opp) seen[month(c)]++;
    for (const c of s.field) seen[month(c)]++;
    let best = acts[0], bv = -1e9;
    for (const a of acts) {
      const ms = HF.matches(s.field, a);
      let v;
      if (ms.length) {
        const take = ms.length === 3 ? ms : [ms.reduce((x, y) => (gain(mine, [y], o) + 0.6 * gain(opp, [y], o) > gain(mine, [x], o) + 0.6 * gain(opp, [x], o) ? y : x))];
        v = 40 + gain(mine, [a, ...take], o) + 0.6 * gain(opp, take.concat([a]), o);
      } else {
        // the card goes to the field: the opponent may take it (with its month) next turn
        const left = 4 - 1 - seen[month(a)] - s.hands[p].filter(c => c !== a && month(c) === month(a)).length;
        const risk = left > 0 ? Math.min(1, left / 2) : 0;
        const mineBack = s.hands[p].some(c => c !== a && month(c) === month(a)) ? 0.5 : 0;   // I can take it back myself
        v = -risk * gain(opp, [a], o) * (1 - mineBack) + mineBack * 2 - VAL[a] * 0.3 + (r() - 0.5) * 0.2;
      }
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  function quickKoi2(s) {
    const p = s.turn, q = 1 - p;
    const mine = HF.yaku(s.caps[p], s.o).total;
    if (mine >= 7 && s.o.over7) return false;
    if (s.koi[q] > 0) return false;                 // win now while the opponent is in koi-koi (double)
    const oppV = pileValue(s.caps[q], s.o), myV = pileValue(s.caps[p], s.o) - mine * 10;
    const left = s.hands[p].length;
    return left >= 3 && oppV < 12 && myV > 8;
  }

  // quick policy for playouts and for the weakest levels
  function quick(s, r, eps) {
    const acts = HF.actions(s);
    if (acts.length === 1) return acts[0];
    if (s.phase === 'koi') return quickKoi(s) ? 'koi' : 'stop';
    if (eps && r() < eps) return acts[Math.floor(r() * acts.length)];
    if (s.phase === 'pickPlay' || s.phase === 'pickDraw') {
      let best = acts[0], bv = -1;
      for (const a of acts) if (VAL[a] > bv) { bv = VAL[a]; best = a; }
      return best;
    }
    // play: prefer captures of valuable cards; discard cards whose month is safe (both other cards gone)
    const p = s.turn;
    let best = acts[0], bv = -1e9;
    const gone = new Uint8Array(12);
    for (const c of s.caps[0]) gone[month(c)]++;
    for (const c of s.caps[1]) gone[month(c)]++;
    for (const a of acts) {
      const ms = HF.matches(s.field, a);
      let v;
      if (ms.length) {
        v = 20 + VAL[a] + Math.max(...ms.map(m => VAL[m])) + (ms.length === 3 ? 12 : 0);
      } else {
        // discarding gives the card to whoever holds its month: cheap, safe months first
        v = -VAL[a] * 1.5 + (gone[month(a)] >= 2 ? 6 : 0) + (r() - 0.5);
      }
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  function quickKoi(s) {
    const p = s.turn, q = 1 - p;
    const mine = HF.yaku(s.caps[p], s.o).total;
    if (mine >= 7) return false;
    const opp = pileValue(s.caps[q], s.o);
    const left = s.hands[p].length;
    return left >= 4 && opp < 14 && mine <= 3;
  }

  // ---- determinization ----
  function unseenFor(s, me) {
    const known = new Uint8Array(48);
    for (const c of s.hands[me]) known[c] = 1;
    for (const c of s.field) known[c] = 1;
    for (const c of s.caps[0]) known[c] = 1;
    for (const c of s.caps[1]) known[c] = 1;
    if (s.pending != null) known[s.pending] = 1;
    const out = [];
    for (let i = 0; i < 48; i++) if (!known[i]) out.push(i);
    return out;
  }

  // weight of a sampled opponent hand: a player who discarded without capturing probably had no card of the
  // field's months then (soft), so hands full of such months are less likely
  function handWeight(hand, s, opp) {
    let w = 1;
    for (const ev of s.seen) {
      if (ev.p !== opp) continue;
      const fm = new Set(ev.fieldMonths);
      for (const c of hand) if (fm.has(month(c))) w *= 0.45;
    }
    return w;
  }

  function sampleWorld(s, me, r, infer) {
    const opp = 1 - me;
    const un = unseenFor(s, me);
    const nOpp = s.hands[opp].length;
    let best = null, tries = infer ? 6 : 1;
    // importance resampling: draw a few, keep one proportionally to its weight
    let tot = 0, pick = null;
    for (let t = 0; t < tries; t++) {
      const sh = HF.shuffle(un.slice(), r);
      const hand = sh.slice(0, nOpp);
      const w = infer ? handWeight(hand, s, opp) : 1;
      tot += w;
      if (r() * tot < w) pick = sh;
    }
    const sh = pick;
    const w = HF.clone(s);
    w.hands[opp] = sh.slice(0, nOpp).sort((a, b) => a - b);
    w.deck = sh.slice(nOpp);
    return w;
  }

  function playout(s, me, r, strong) {
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 200) s = HF.apply(s, strong ? quick2(s, r, 0.04) : quick(s, r, 0.08));
    const res = s.result;
    if (!res || res.winner < 0) return res && res.draw ? 0 : 0;
    return res.winner === me ? res.pts : -res.pts;
  }

  // choose an action for the side to move. returns {action, scores:[{a,v}]}
  function choose(s, lv, seed) {
    const L = level(lv);
    const r = HF.rng(seed || (Date.now() & 0xffffff));
    const acts = HF.actions(s);
    if (acts.length === 1) return { action: acts[0], scores: [{ a: acts[0], v: 0 }] };
    if (L.worlds === 0 || r() < L.blunder) {
      const a = L.lv <= 1 && r() < 0.5 ? acts[Math.floor(r() * acts.length)] : quick(s, r, 0);
      return { action: a, scores: acts.map(x => ({ a: x, v: x === a ? 1 : 0 })) };
    }
    const me = s.turn;
    const sum = new Map(acts.map(a => [a, 0]));
    const reps = 2;
    for (let w = 0; w < L.worlds; w++) {
      const world = sampleWorld(s, me, r, L.infer);
      for (const a of acts) {
        let tot = 0;
        for (let k = 0; k < reps; k++) {
          // re-shuffle the deck between reps (the draw order is unknown to both)
          const ws = HF.clone(world);
          if (k) HF.shuffle(ws.deck, r);
          tot += playout(HF.apply(ws, a), me, r, L.strong);
        }
        sum.set(a, sum.get(a) + tot / reps);
      }
    }
    const scores = acts.map(a => ({ a, v: sum.get(a) / L.worlds }));
    // koi-koi at low levels: a simple rule instead of reading
    if (s.phase === 'koi' && !L.koiSmart) {
      const a = quickKoi(s) ? 'koi' : 'stop';
      return { action: a, scores };
    }
    let best = scores[0];
    if (L.noise > 0.05) {
      // noisy pick: add gaussian-ish noise scaled to the spread of the scores
      const spread = Math.max(0.5, Math.max(...scores.map(x => x.v)) - Math.min(...scores.map(x => x.v)));
      let bv = -1e9;
      for (const x of scores) {
        const n = (r() + r() + r() - 1.5) * L.noise * spread * 0.6;
        if (x.v + n > bv) { bv = x.v + n; best = x; }
      }
    } else {
      for (const x of scores) if (x.v > best.v) best = x;
    }
    return { action: best.a, scores: scores.sort((a, b) => b.v - a.v) };
  }

  const API = { choose, quick, quick2, level, pileValue, sampleWorld };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HFAI = API;
})(typeof self !== 'undefined' ? self : this);
