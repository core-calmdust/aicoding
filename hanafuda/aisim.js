/* Fast Koi-Koi simulator for the AI (hanafuda/aisim.js): plays a determinized world to the end in place,
   without the engine's cloning / logging. Same rules as engine.js (checked by tools/test-aisim.js).
   Also an exact perfect-information search for the last turns of a world (endgame). */
(function (root) {
  'use strict';
  const HF = (typeof require !== 'undefined') ? require('./engine.js') : root.HF;
  const { CARDS, ID } = HF;
  const M = new Int8Array(48), TYPE = new Int8Array(48);   // month; 0 hikari 1 tane 2 tan 3 kasu
  CARDS.forEach(c => { M[c.id] = c.m; TYPE[c.id] = c.type === 'hikari' ? 0 : c.type === 'tane' ? 1 : c.type === 'tan' ? 2 : 3; });
  const VAL = new Float32Array(48);
  CARDS.forEach(c => { VAL[c.id] = c.type === 'hikari' ? 9 : c.type === 'tane' ? 4 : c.type === 'tan' ? 3 : 1; });
  VAL[ID.sake] = 8; VAL[ID.boar] = VAL[ID.deer] = VAL[ID.butterfly] = 6; [1, 5, 9, 21, 33, 37].forEach(i => { VAL[i] = 5; }); VAL[ID.rainman] = 6;

  // ---- per-player counters ----
  // c = Int16Array(16): 0 lights 1 rain 2 tane 3 tan 4 kasu 5 sake 6 moon 7 curtain 8 boar 9 deer 10 butterfly 11 aka 12 ao
  function addCard(c, id) {
    const t = TYPE[id];
    if (t === 0) c[0]++; else if (t === 1) c[2]++; else if (t === 2) c[3]++; else c[4]++;
    if (id === ID.rainman) c[1] = 1; else if (id === ID.sake) c[5] = 1; else if (id === ID.moon) c[6] = 1; else if (id === ID.curtain) c[7] = 1;
    else if (id === ID.boar) c[8] = 1; else if (id === ID.deer) c[9] = 1; else if (id === ID.butterfly) c[10] = 1;
    if (id === 1 || id === 5 || id === 9) c[11]++; else if (id === 21 || id === 33 || id === 37) c[12]++;
  }
  function total(c, o) {
    let t = 0;
    const L = c[0], rain = c[1];
    if (L === 5) t += 10; else if (L === 4) t += rain ? 7 : 8; else if (L === 3 && !rain) t += 5;
    const view = o.viewing === 'on' || (o.viewing === 'rain' && !rain);
    if (view && c[5]) { if (c[7]) t += 5; if (c[6]) t += 5; }
    if (c[8] && c[9] && c[10]) t += 5 + (o.plusExtra ? c[2] - 3 : 0);
    const aka = c[11] === 3, ao = c[12] === 3;
    if (aka && ao) t += 10 + (o.plusExtra ? c[3] - 6 : 0); else if (aka || ao) t += 5 + (o.plusExtra ? c[3] - 3 : 0);
    if (c[2] >= 5) t += c[2] - 4;
    if (c[3] >= 5) t += c[3] - 4;
    const k = c[4] + (o.sakeKasu && c[5] ? 1 : 0);
    if (k >= 10) t += k - 9;
    return t;
  }
  // threat: how close a pile is to a yaku (for the playout koi rule)
  function threat(c) {
    return Math.max(c[0] >= 2 ? c[0] : 0, c[8] + c[9] + c[10], c[11], c[12], c[5] ? 2 : 0);
  }

  // ---- world (from an engine state) ----
  function fromState(s) {
    const w = { o: s.o, oya: s.oya, turn: s.turn, phase: s.phase, pending: s.pending == null ? -1 : s.pending,
      deck: s.deck.slice(), hands: [s.hands[0].slice(), s.hands[1].slice()], field: s.field.slice(),
      cnt: [new Int16Array(16), new Int16Array(16)], koi: s.koi.slice(), last: s.lastPts.slice(), res: null };
    for (const p of [0, 1]) for (const id of s.caps[p]) addCard(w.cnt[p], id);
    return w;
  }
  function copy(w) {
    return { o: w.o, oya: w.oya, turn: w.turn, phase: w.phase, pending: w.pending, deck: w.deck.slice(), hands: [w.hands[0].slice(), w.hands[1].slice()],
      field: w.field.slice(), cnt: [w.cnt[0].slice(), w.cnt[1].slice()], koi: w.koi.slice(), last: w.last.slice(), res: null };
  }
  function matches(w, id) { const m = M[id], out = []; for (const f of w.field) if (M[f] === m) out.push(f); return out; }
  function takeInto(w, p, card, f) {
    const m = M[card]; const same = matches(w, card);
    const got = same.length === 3 ? same : [f];
    w.field = w.field.filter(x => got.indexOf(x) < 0);
    addCard(w.cnt[p], card); for (const g of got) addCard(w.cnt[p], g);
  }
  function canKoi(w) {
    if (!w.hands[0].length && !w.hands[1].length) return false;
    if (w.o.koiLimit === 'once' && w.koi[0] + w.koi[1] > 0) return false;
    return true;
  }
  function finish(w, p) {
    const y = total(w.cnt[p], w.o); let mult = 1;
    if (w.o.over7 && y >= 7) mult *= 2;
    if (w.o.koiBonus === 'opp2' && w.koi[1 - p] > 0) mult *= 2;
    if (w.o.koiBonus === 'self' && w.koi[p] > 0) mult *= 1 + w.koi[p];
    w.res = p === 0 ? y * mult : -y * mult;     // from seat 0
    w.phase = 'over';
  }
  function nextTurn(w) {
    const p = w.turn;
    const y = total(w.cnt[p], w.o); if (y > w.last[p]) w.last[p] = y;
    w.turn = 1 - p; w.phase = 'play';
    if (!w.hands[0].length && !w.hands[1].length) {
      w.phase = 'over';
      w.res = w.o.noYaku === 'oyaken' ? (w.oya === 0 ? 6 : -6) : 0;
    }
  }
  function endTurn(w) {
    const p = w.turn, y = total(w.cnt[p], w.o);
    if (y > w.last[p]) { w.phase = 'koi'; if (!canKoi(w)) finish(w, p); return; }
    nextTurn(w);
  }
  // the actions of the side to move (same set as HF.actions)
  function actions(w) {
    switch (w.phase) {
      case 'play': return w.hands[w.turn].slice();
      case 'draw': return ['draw'];
      case 'pickPlay': case 'pickDraw': return matches(w, w.pending);
      case 'koi': return canKoi(w) ? ['stop', 'koi'] : ['stop'];
      default: return [];
    }
  }
  function apply(w, a) {     // in place
    const p = w.turn;
    if (w.phase === 'play') {
      const h = w.hands[p], i = h.indexOf(a); h.splice(i, 1);
      const ms = matches(w, a);
      if (!ms.length) { w.field.push(a); w.phase = 'draw'; }
      else if (ms.length === 2) { w.phase = 'pickPlay'; w.pending = a; }
      else { takeInto(w, p, a, ms[0]); w.phase = 'draw'; }
      return;
    }
    if (w.phase === 'pickPlay') { takeInto(w, p, w.pending, a); w.pending = -1; w.phase = 'draw'; return; }
    if (w.phase === 'draw') {
      const c = w.deck.pop(); const ms = matches(w, c);
      if (!ms.length) { w.field.push(c); endTurn(w); }
      else if (ms.length === 2) { w.phase = 'pickDraw'; w.pending = c; }
      else { takeInto(w, p, c, ms[0]); endTurn(w); }
      return;
    }
    if (w.phase === 'pickDraw') { takeInto(w, p, w.pending, a); w.pending = -1; endTurn(w); return; }
    if (w.phase === 'koi') { if (a === 'stop') finish(w, p); else { w.koi[p]++; nextTurn(w); } }
  }

  // ---- playout policy ----
  function policy(w, r, P) {
    const p = w.turn, q = 1 - p;
    if (w.phase === 'draw') return 'draw';
    if (w.phase === 'koi') {
      if (!canKoi(w)) return 'stop';
      const y = total(w.cnt[p], w.o);
      if ((w.o.over7 && y >= 7) || w.koi[q] > 0) return 'stop';
      const left = w.hands[p].length;
      return left >= P.koiLeft && threat(w.cnt[q]) < 2 && y <= P.koiMax ? 'koi' : 'stop';
    }
    if (w.phase === 'pickPlay' || w.phase === 'pickDraw') {
      const ms = matches(w, w.pending); return VAL[ms[0]] >= VAL[ms[1]] ? ms[0] : ms[1];
    }
    const h = w.hands[p];
    if (P.eps && r() < P.eps) return h[Math.floor(r() * h.length)];
    let best = h[0], bv = -1e9;
    for (const a of h) {
      const ms = matches(w, a);
      let v;
      if (ms.length) v = 20 + VAL[a] + (ms.length === 3 ? VAL[ms[0]] + VAL[ms[1]] + VAL[ms[2]] : Math.max(VAL[ms[0]], ms[1] != null ? VAL[ms[1]] : 0));
      else v = -VAL[a] + r() * 0.5;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  const DEF = { eps: 0.06, koiLeft: 4, koiMax: 3 };
  function playout(w, r, P) {
    P = P || DEF;
    let g = 0;
    while (w.phase !== 'over' && g++ < 200) apply(w, policy(w, r, P));
    return w.res || 0;      // from seat 0
  }

  // ---- exact search of a determinized world (both players see everything; the deck order is the world's) ----
  let nodes = 0;
  function search(w, me, budget) {
    if (w.phase === 'over') return me === 0 ? w.res : -w.res;
    if (++nodes > budget) return null;
    const acts = actions(w), maxi = w.turn === me;
    let best = maxi ? -1e9 : 1e9;
    for (const a of acts) {
      const c = copy(w); apply(c, a);
      const v = search(c, me, budget);
      if (v === null) return null;
      if (maxi ? v > best : v < best) best = v;
    }
    return best;
  }
  function exact(w, me, budget) { nodes = 0; return search(w, me, budget || 20000); }

  const API = { fromState, copy, actions, apply, playout, exact, total, threat, DEF, VAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HFSim = API;
})(typeof self !== 'undefined' ? self : this);
