// HimeJan BOT — tile efficiency (shanten + ukeire), value, push/fold, simple call rules, skill timing.
// level 0 (beginner) … 4 (strong). Uses only what the seat can see (own hand, rivers, melds, dora).
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('./engine.js') : null);
const T = id => id >> 2;

function shan(c, m) { return MJ.shanten(c, m); }

// unseen copies of every type from seat s's view
function unseen(g, s) {
  const u = new Array(34).fill(4);
  for (const p of g.P) {
    for (const r of p.river) if (!r.taken) u[T(r.id)]--;
    for (const m of p.melds) for (const id of m.tiles) u[T(id)]--;
  }
  for (const t of g.doraInds()) u[t]--;
  for (const id of g.P[s].hand) u[T(id)]--;
  return u.map(x => Math.max(0, x));
}

function ukeire(c, m, u, sh) {
  let n = 0;
  for (let t = 0; t < 34; t++) {
    if (!u[t] || c[t] >= 4) continue;
    c[t]++;
    if (shan(c, m) < sh) n += u[t];
    c[t]--;
  }
  return n;
}

// tile value for keeping (dora, red, yakuhai)
function keepValue(g, s, t, c) {
  let v = 0;
  for (const ind of g.doraInds()) if (MJ.doraOf(ind) === t) v += 2.5;
  if (MJ.isDragon(t) || t === g.seatWind(s) || t === g.roundWind()) v += c[t] >= 2 ? 3 : 0.6;
  else if (MJ.isHonor(t)) v -= 0.6;
  if (MJ.isTerm(t)) v -= 0.25;
  return v;
}

// danger of discarding type t against seat q (0 = safe … ~10 = very risky)
function danger(g, q, t) {
  const p = g.P[q];
  if (p.discards.has(t)) return 0;
  // tiles discarded by anyone after q's riichi are safe against q
  if (p.riichi) {
    const rt = p.river[p.riichiTurn] ? p.river[p.riichiTurn].turn : 0;
    for (const o of g.P) for (const r of o.river) if (r.turn > rt && T(r.id) === t) return 0;
  }
  if (MJ.isHonor(t)) {
    const vis = g.visibleCount(t);
    return vis >= 3 ? 0.3 : vis === 2 ? 1.5 : 3.5;
  }
  const n = t % 9;
  const has = x => p.discards.has(x);
  let suji = false;
  if (n <= 2) suji = has(t + 3);
  else if (n >= 6) suji = has(t - 3);
  else suji = has(t - 3) && has(t + 3);
  const half = !suji && (n >= 3 && n <= 5) && (has(t - 3) || has(t + 3));
  let d = suji ? 2.5 : half ? 5 : (n === 0 || n === 8) ? 5 : (n === 1 || n === 7) ? 6.5 : 8;
  return d;
}
function threatLevel(g, s, q) {
  const p = g.P[q];
  if (p.riichi) return 1;
  const open = p.melds.filter(m => m.type !== 'ankan').length;
  if (open >= 3) return 0.7;
  if (open === 2) return 0.3;
  return 0;
}

class Bot {
  constructor(level = 3) { this.level = level; }

  async turn(g, s, o) {
    const p = g.P[s];
    const lv = this.level;
    if (o.canTsumo) return { act: 'tsumo' };
    const c = MJ.countsIds(p.hand);
    const m = p.melds.length;
    const sh = shan(c, m);
    if (o.canKyuushu && sh >= 4) return { act: 'kyuushu' };
    // skills
    if (o.canSkill && this.wantSkill(g, s, sh)) return { act: 'skill' };
    if (o.mustTsumogiri) {
      if (o.ankans && o.ankans.length) return { act: 'ankan', t: o.ankans[0] };
      return { act: 'discard', id: o.drawn };
    }
    // closed kan of a non-useful quad
    if (o.ankans && o.ankans.length && lv >= 1) {
      const t = o.ankans[0];
      const c2 = c.slice(); c2[t] -= 4;
      if (shan(c2, m + 1) <= sh) return { act: 'ankan', t };
    }
    if (o.kakans && o.kakans.length && lv >= 2) return { act: 'kakan', t: o.kakans[0] };

    const u = unseen(g, s);
    const read = p.fx.read;          // skill "mind": exact tenpai / waits of the others
    const threats = read
      ? read.filter(r => r.shanten <= 0 && (g.P[r.seat].riichi || g.P[r.seat].melds.length >= 2 || r.shanten === 0)).map(r => ({ q: r.seat, w: 1, waits: r.waits }))
      : [1, 2, 3].map(k => (s + k) % 4).map(q => ({ q, w: threatLevel(g, s, q) })).filter(x => x.w > 0);
    const peek = p.fx.peek ? p.fx.peek.filter(id => !p.hand.includes(id)) : null;
    const forbid = o.forbid || [];
    const cand = [];
    const seen = new Set();
    for (const id of p.hand) {
      const t = T(id);
      if (seen.has(t) || forbid.includes(t)) continue; seen.add(t);
      c[t]--;
      const s2 = shan(c, m);
      const uk = s2 <= 6 ? ukeire(c, m, u, s2) : 0;
      c[t]++;
      let score = -s2 * 100 + uk - keepValue(g, s, t, c) * 2;
      if (peek && peek.length) {     // skill "peek": among equal shapes, prefer the one the known next draws improve
        let bonus = 0;
        for (const pid of peek) { const pt = T(pid); if (c[pt] >= 4) continue; c[pt]++; if (shan(c, m) < s2) bonus += 12; c[pt]--; }
        score += bonus;
      }
      if (MJ.RED.has(id) && p.hand.some(x => T(x) === t && !MJ.RED.has(x))) score += 0; // discard plain copy instead (handled below)
      let dg = 0;
      for (const th of threats) dg = Math.max(dg, (th.waits ? (th.waits.includes(t) ? 12 : 0) : danger(g, th.q, t)) * th.w);
      cand.push({ id, t, s2, uk, score, dg });
    }
    // prefer the plain copy over a red five
    for (const x of cand) {
      if (MJ.RED.has(x.id)) { const alt = p.hand.find(y => T(y) === x.t && !MJ.RED.has(y)); if (alt != null) x.id = alt; }
    }
    if (!cand.length) return { act: 'discard', id: p.hand[p.hand.length - 1] };
    // push / fold
    let fold = false;
    if (threats.length && lv >= 1) {
      const bestS = Math.min(...cand.map(x => x.s2));
      const bestUk = Math.max(...cand.filter(x => x.s2 === bestS).map(x => x.uk));
      const maxW = Math.max(...threats.map(t => (t.waits ? 1 : t.w)));
      if (bestS >= 2) fold = true;
      else if (bestS === 1) fold = maxW >= 1 && (lv >= 2 ? bestUk < 30 || g.liveLeft() < 30 : bestUk < 12);
      else fold = maxW >= 1 && bestUk <= 2 && lv >= 3;
    }
    let pick;
    if (fold) {
      cand.sort((a, b) => a.dg - b.dg || b.score - a.score);
      pick = cand[0];
    } else {
      for (const x of cand) x.v = x.score - x.dg * (threats.length ? 6 : 0);
      cand.sort((a, b) => b.v - a.v);
      pick = cand[0];
      if (lv === 0 && Math.random() < 0.35) pick = cand[Math.min(cand.length - 1, (Math.random() * 3) | 0)];
      if (lv === 1 && Math.random() < 0.12) pick = cand[Math.min(cand.length - 1, 1)];
    }
    // riichi?
    if (o.riichi && o.riichi.some(id => T(id) === pick.t) && pick.s2 === 0 && !fold) {
      const c2 = MJ.countsIds(p.hand); c2[pick.t]--;
      const w = MJ.waits(c2, m).reduce((a, t) => a + u[t], 0);
      if (w > 0 || lv <= 1) return { act: 'riichi', id: pick.id };
    }
    return { act: 'discard', id: pick.id };
  }

  // value of one use (points) for paid-use decisions; filled from the skill-value simulation
  skillValue(id) { const V = (typeof MJSkills !== 'undefined' && MJSkills.value) || {}; return V[id] || 1000; }
  paidOk(g, s) {
    const cost = g.skillCost(s);
    if (!cost) return true;
    if (this.policy === 'always') return true;
    if (this.policy === 'never') return false;
    return this.skillValue(g.chars[s].skill) >= cost * 1.15 && g.scores[s] - cost >= 12000;
  }

  // deal-time skills (point multipliers): decide right after the deal from the starting hand
  async dealSkill(g, s, o) {
    if (this.policy === 'always') return true;
    if (this.policy === 'never') return false;
    if (!this.paidOk(g, s)) return false;
    const p = g.P[s];
    const c = MJ.countsIds(p.hand);
    const sh = shan(c, 0);
    let dora = 0;
    for (const ind of g.doraInds()) dora += c[MJ.doraOf(ind)];
    const aka = p.hand.filter(id => MJ.RED.has(id)).length;
    const pot = g.kyotaku + g.honba * 300;
    const T0 = this.thresholds || {};
    switch (o.skill) {
      case 'wareme': return sh <= (T0.wareme ?? 2) || (sh <= 3 && dora + aka >= 2);
      case 'hanup': return sh <= (T0.hanup ?? 3);
      case 'guard': return sh >= (T0.guard ?? 4);
      case 'shugi': return aka >= 1 && sh <= (T0.shugi ?? 3);
      case 'pot': return pot >= 1000 && sh <= (T0.pot ?? 3);
    }
    return false;
  }

  // turn-timed skills
  wantSkill(g, s, sh) {
    const p = g.P[s];
    const sk = g.chars[s].skill;
    if (this.policy === 'never') return false;
    if (!this.paidOk(g, s)) return false;
    if (this.policy === 'always') return true;
    switch (sk) {
      case 'doraplus': return p.riichi || sh === 0;
      case 'lure': return sh >= 1 && g.liveLeft() > 30;
      case 'seal': return g.P.some((q, i) => i !== s && q.melds.length >= 1) && sh <= 2;
      case 'swap': {
        if (p.riichi || g.curDrawn == null) return false;
        const c = MJ.countsIds(p.hand), t = T(g.curDrawn);
        c[t]--; const before = shan(c, p.melds.length); c[t]++;
        return before <= sh && sh >= 1;
      }
      case 'mind': return g.P.some((q, i) => i !== s && (q.riichi || q.melds.length >= 2)) && sh >= 1;
      case 'peek': return sh >= 1 && sh <= 2 && g.liveLeft() > 24;
    }
    return false;
  }

  async react(g, s, o) {
    if (o.canRon) return { act: 'ron' };
    const lv = this.level;
    if (lv === 0) return { act: 'pass' };
    const p = g.P[s];
    const t = T(o.tile);
    const c = MJ.countsIds(p.hand);
    const m = p.melds.length;
    const sh = shan(c, m);
    if (g.P.some((q, i) => i !== s && q.riichi) && sh >= 1) return { act: 'pass' };
    const yakuhai = MJ.isDragon(t) || t === g.seatWind(s) || t === g.roundWind();
    const after = use => {            // best shanten after calling with `use` and discarding
      const c2 = c.slice(); for (const id of use) c2[T(id)]--;
      let best = 9;
      for (let d = 0; d < 34; d++) if (c2[d]) { c2[d]--; best = Math.min(best, shan(c2, m + 1)); c2[d]++; }
      return best;
    };
    const hasYakuhaiMeld = p.melds.some(x => (x.type !== 'chi') && (MJ.isDragon(x.t) || x.t === g.seatWind(s) || x.t === g.roundWind()));
    const tanyaoOk = () => p.hand.every(id => !MJ.isYao(T(id)) || c[T(id)] === 0) || p.hand.filter(id => MJ.isYao(T(id))).length <= 1;
    const flushSuit = () => {
      const cnt = [0, 0, 0]; let hon = 0;
      for (const id of p.hand) { const tt = T(id); if (tt < 27) cnt[MJ.suit(tt)]++; else hon++; }
      for (const x of p.melds) if (x.t < 27) cnt[MJ.suit(x.t)] += 3; else hon += 3;
      const sMax = cnt.indexOf(Math.max(...cnt));
      return cnt[sMax] + hon >= 11 ? sMax : -1;
    };
    const yakuRoute = tt => {
      if (hasYakuhaiMeld) return true;
      if (MJ.isYao(tt) === false && tanyaoOk() && p.melds.every(x => x.tiles.every(id => !MJ.isYao(T(id))))) return true;
      const fs = flushSuit();
      if (fs >= 0 && (tt >= 27 || MJ.suit(tt) === fs)) return true;
      return false;
    };
    if (o.pons) {
      if (yakuhai && c[t] >= 2 && after(o.pons[0]) <= sh) return { act: 'pon', use: o.pons[0] };
      if ((m > 0 || lv >= 3) && yakuRoute(t) && after(o.pons[0]) < sh) return { act: 'pon', use: o.pons[0] };
    }
    if (o.chis && (m > 0 || lv >= 3)) {
      for (const use of o.chis) if (yakuRoute(t) && use.every(id => yakuRoute(T(id))) && after(use) < sh) return { act: 'chi', use };
    }
    return { act: 'pass' };
  }
}

const MJBot = { Bot, danger, unseen };
if (typeof module !== 'undefined' && module.exports) module.exports = MJBot;
else root.MJBot = MJBot;
})(typeof window !== 'undefined' ? window : globalThis);
