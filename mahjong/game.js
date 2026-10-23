// HimeJan game — the hand/round state machine (4-player riichi), with character skills.
// Drives 4 agents (human UI or BOT) through async calls and reports every step to a UI hook.
//
//   const g = new MJGame({ agents:[a0,a1,a2,a3], chars:[c0..c3], rules:{ length:'south'|'east', skills:true }, seed, ui: async (ev, data) => {} });
//   await g.run();
//
// Agent:  agent.turn(g, seat, opts)  -> {act:'tsumo'|'discard'|'riichi'|'ankan'|'kakan'|'kyuushu'|'skill', id, t}
//         agent.react(g, seat, opts) -> {act:'ron'|'pon'|'chi'|'minkan'|'pass', use:[ids]}
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('./engine.js') : null);
const SK = root.MJSkills || (typeof require !== 'undefined' ? require('./skills.js') : null);
const T = id => id >> 2;

function rng(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const WIND = [27, 28, 29, 30];

class MJGame {
  constructor(o) {
    this.agents = o.agents;
    this.chars = o.chars || [null, null, null, null];
    this.rules = Object.assign({ length: 'south', skills: true, start: 25000, ret: 30000, aka: true }, o.rules || {});
    this.ui = o.ui || (async () => {});
    this.rand = rng(o.seed == null ? (Math.random() * 2 ** 32) >>> 0 : o.seed);
    this.scores = [0, 1, 2, 3].map(() => this.rules.start);
    this.round = 0;          // 0 East, 1 South, 2 West
    this.kyoku = 0;          // dealer seat
    this.honba = 0;
    this.kyotaku = 0;        // points on the table (riichi sticks, skill costs)
    this.skillUses = [0, 0, 0, 0];
    this.over = false;
    this.log = [];
    this.lastRoundIdx = this.rules.length === 'east' ? 0 : 1;
    this.aborted = false;
  }

  // ---------------------------------------------------------------- helpers
  seatWind(s) { return WIND[(s - this.kyoku + 4) % 4]; }
  roundWind() { return WIND[this.round]; }
  isDealer(s) { return s === this.kyoku; }
  liveLeft() { return this.liveEnd - this.livePos; }
  // first use in a game is free; later uses cost the skill's base, doubling each time (paid into the pot)
  skillCost(s) {
    const n = this.skillUses[s];
    if (n === 0) return 0;
    const sk = this.chars[s] && SK.get(this.chars[s].skill);
    const base = (this.rules.costs && sk && this.rules.costs[sk.id]) || (sk && sk.cost) || 1000;
    return base * Math.pow(2, n - 1);
  }
  skillOf(s) { return this.chars[s] && this.chars[s].skill ? SK.get(this.chars[s].skill) : null; }
  canSkill(s, timing) {
    const p = this.P[s];
    if (!this.rules.skills) return false;
    const sk = this.skillOf(s);
    if (!sk || p.skillUsed) return false;
    if ((sk.timing || 'turn') !== (timing || 'turn')) return false;
    if (sk.can && !sk.can(this, s)) return false;
    return this.scores[s] >= this.skillCost(s);
  }
  doraInds() { return this.doraIdx.map(i => T(this.dead[i])); }
  uraInds() { return this.doraIdx.map(i => T(this.dead[i + 1])); }
  visibleCount(t, seat) {      // copies of type t visible to seat (rivers, melds, dora, own hand)
    let n = 0;
    for (const p of this.P) {
      for (const r of p.river) if (T(r.id) === t && !r.taken) n++;
      for (const m of p.melds) for (const id of m.tiles) if (T(id) === t) n++;
    }
    for (const t2 of this.doraInds()) if (t2 === t) n++;
    if (seat != null) for (const id of this.P[seat].hand) if (T(id) === t) n++;
    return n;
  }

  async emit(ev, data) { this.log.push([ev, data]); await this.ui(ev, data || {}); }

  // ---------------------------------------------------------------- game
  async run() {
    await this.emit('game-start', { scores: this.scores.slice() });
    while (!this.over) {
      await this.playHand();
      this.checkEnd();
    }
    // leftover sticks go to the top
    const rank = this.ranking();
    if (this.kyotaku) { this.scores[rank[0]] += this.kyotaku; this.kyotaku = 0; }
    await this.emit('game-end', { scores: this.scores.slice(), rank: this.ranking() });
    return this.ranking();
  }
  ranking() { return [0, 1, 2, 3].sort((a, b) => this.scores[b] - this.scores[a] || a - b); }

  checkEnd() {
    if (this.scores.some(s => s < 0)) { this.over = true; return; }
    const r = this.lastResult;
    const last = this.round >= this.lastRoundIdx && this.kyoku === 3;
    const dealerKeeps = r && r.renchan;
    const top = Math.max(...this.scores);
    if (last) {
      if (dealerKeeps) {
        // agari-yame / tenpai-yame: dealer is top with >= return points
        if (this.ranking()[0] === 3 && this.scores[3] >= this.rules.ret) { this.over = true; return; }
        return;
      }
      if (top >= this.rules.ret) { this.over = true; return; }
      if (this.round >= this.lastRoundIdx + 1) { this.over = true; return; }   // west 4 ends regardless
    } else if (this.round > this.lastRoundIdx && top >= this.rules.ret) { this.over = true; return; } // sudden death in west
    if (this.round > this.lastRoundIdx + 1) { this.over = true; return; }
    if (!dealerKeeps) {
      this.kyoku++;
      if (this.kyoku === 4) { this.kyoku = 0; this.round++; }
      if (this.round > this.lastRoundIdx + 1) this.over = true;
    }
  }

  // ---------------------------------------------------------------- hand
  async playHand() {
    const wall = [];
    for (let i = 0; i < 136; i++) wall.push(i);
    for (let i = wall.length - 1; i > 0; i--) { const j = (this.rand() * (i + 1)) | 0; [wall[i], wall[j]] = [wall[j], wall[i]]; }
    this.wall = wall;
    this.dead = wall.slice(122);          // 14: [0..3] rinshan, [4]+2k dora indicators, [5]+2k ura
    this.livePos = 0; this.liveEnd = 122;
    this.rinshanPos = 0;
    this.doraIdx = [4];
    this.kans = 0;
    this.kanSeats = new Set();
    this.firstGo = true;                   // no calls yet & within the first go-around
    this.turnCount = 0;
    this.lastResult = null;
    this.P = [0, 1, 2, 3].map(s => ({
      seat: s, hand: [], melds: [], river: [], riichi: false, dblRiichi: false, ippatsu: false, riichiTurn: -1,
      furitenTemp: false, furitenRiichi: false, discards: new Set(), skillUsed: false, fx: {}, firstTurn: true,
    }));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const s = (this.kyoku + k) % 4; for (let n = 0; n < 4; n++) this.P[s].hand.push(this.draw()); }
    for (let k = 0; k < 4; k++) { const s = (this.kyoku + k) % 4; this.P[s].hand.push(this.draw()); }
    for (const p of this.P) p.hand.sort((a, b) => a - b);
    await this.emit('hand-start', { round: this.round, kyoku: this.kyoku, honba: this.honba, kyotaku: this.kyotaku, scores: this.scores.slice() });

    let cur = this.kyoku;
    // deal-time skills: each player with one decides now, in turn order from the dealer
    if (this.rules.skills) {
      for (let k = 0; k < 4; k++) {
        const s = (this.kyoku + k) % 4;
        if (!this.canSkill(s, 'deal')) continue;
        const ag = this.agents[s];
        const yes = ag.dealSkill ? await ag.dealSkill(this, s, { cost: this.skillCost(s), skill: this.skillOf(s).id, tier: this.chars[s].tier | 0 }) : false;
        if (yes && this.canSkill(s, 'deal')) await this.useSkill(s);
      }
    }
    let drawn = this.draw();
    this.P[cur].hand.push(drawn);
    let rinshan = false;
    await this.emit('draw', { seat: cur, id: drawn });

    for (;;) {
      // ----- turn of `cur` (has 14 - 3*melds tiles)
      const res = await this.turn(cur, drawn, rinshan);
      rinshan = false;
      if (res.end) return;
      if (res.kan) {                      // ankan / kakan done -> rinshan draw (chankan handled inside)
        if (res.end) return;
        drawn = this.drawRinshan();
        this.P[cur].hand.push(drawn);
        rinshan = true;
        await this.emit('draw', { seat: cur, id: drawn, rinshan: true });
        continue;
      }
      // discard happened: res.id
      const d = res.id;
      const call = await this.callPhase(cur, d);
      if (call.end) return;
      if (call.caller != null) {
        cur = call.caller;
        if (call.minkan) {
          drawn = this.drawRinshan();
          this.P[cur].hand.push(drawn);
          rinshan = true;
          await this.emit('draw', { seat: cur, id: drawn, rinshan: true });
        } else drawn = null;
        continue;
      }
      // riichi stick goes down if the riichi discard was not ronned
      // next player
      if (this.liveLeft() === 0) { await this.exhaustive(); return; }
      if (this.kans >= 4 && this.kanSeats.size > 1) { await this.abort('suukaikan'); return; }
      cur = (cur + 1) % 4;
      if (cur === this.kyoku) this.firstGo = false;
      drawn = this.drawFor(cur);
      this.P[cur].hand.push(drawn);
      await this.emit('draw', { seat: cur, id: drawn });
    }
  }

  draw() { return this.wall[this.livePos++]; }
  // skill "lure": the next draws become effective tiles when one is left in the live wall
  drawFor(s) {
    const p = this.P[s];
    if (p.fx.lure > 0) {
      p.fx.lure--;
      const m = p.melds.length, c = MJ.countsIds(p.hand), sh = MJ.shanten(c, m);
      const W = p.fx.lureW || 1;           // higher tiers compare more candidates and keep the widest
      let pick = -1, pickUk = -1, found = 0;
      const seenT = new Set();
      for (let i = this.livePos; i < this.liveEnd && found < W; i++) {
        const t = T(this.wall[i]);
        if (c[t] >= 4 || seenT.has(t)) continue;
        seenT.add(t);
        c[t]++;
        // 14 tiles: best shanten after the best discard, and the widest acceptance at that shanten
        let best = 9, uk = 0;
        for (let d = 0; d < 34; d++) if (c[d]) {
          c[d]--;
          const s2 = MJ.shanten(c, m);
          if (s2 < best) { best = s2; uk = 0; }
          if (s2 === best && W > 1) { let u = 0; for (let x = 0; x < 34; x++) if (c[x] < 4) { c[x]++; if (MJ.shanten(c, m) < s2) u += 4 - c[x] + 1; c[x]--; } uk = Math.max(uk, u); }
          c[d]++;
        }
        c[t]--;
        if (best < sh) { found++; if (uk > pickUk) { pickUk = uk; pick = i; } }
      }
      if (pick >= 0) [this.wall[pick], this.wall[this.livePos]] = [this.wall[this.livePos], this.wall[pick]];
    }
    return this.draw();
  }
  drawRinshan() {
    const id = this.dead[this.rinshanPos++];
    this.liveEnd--;                       // haitei moves one tile earlier
    return id;
  }
  async revealDora() {
    if (this.doraIdx.length >= 5) return;
    this.doraIdx.push(4 + this.doraIdx.length * 2);
    await this.emit('dora', { inds: this.doraInds() });
  }

  // ---------------------------------------------------------------- one turn (after a draw or a call)
  async turn(s, drawn, rinshan) {
    const p = this.P[s];
    const afterCall = drawn == null;
    for (;;) {
      this.curDrawn = drawn; this.curSeat = s;
      const opts = { drawn, rinshan, afterCall };
      const c = MJ.countsIds(p.hand);
      if (!afterCall) {
        const ag = this.agariFor(s, T(drawn), true, { rinshan });
        opts.canTsumo = !!ag; opts.tsumoRes = ag;
        const sealed = this.P.some((q, i) => i !== s && q.fx.seal);   // skill "seal": no riichi for the others this hand
        if (!p.riichi && p.melds.every(m => m.type === 'ankan')) {
          const rd = this.riichiDiscards(p);
          // tenpai but riichi not allowed: tell the player why
          const why = sealed ? 'sealed' : this.scores[s] < 1000 ? 'points' : this.liveLeft() < 4 ? 'wall' : '';
          if (why) { if (rd.length) opts.riichiBlocked = why; }
          else opts.riichi = rd;
        }
        opts.ankans = []; opts.kakans = [];
        if (this.liveLeft() > 0 && this.kans < 4) {
          for (let t = 0; t < 34; t++) if (c[t] === 4 && (!p.riichi || this.riichiKanOk(p, t, drawn))) opts.ankans.push(t);
          if (!p.riichi) for (const m of p.melds) if (m.type === 'pon' && c[m.t] >= 1) opts.kakans.push(m.t);
        }
        if (this.firstGo && p.firstTurn) {
          let k = 0; for (let t = 0; t < 34; t++) if (MJ.isYao(t) && c[t]) k++;
          opts.canKyuushu = k >= 9;
        }
      }
      opts.canSkill = this.canSkill(s);
      opts.forbid = afterCall ? this.kuikae(p) : [];
      opts.mustTsumogiri = p.riichi && !afterCall;
      const a = await this.agents[s].turn(this, s, opts);

      if (a.act === 'skill' && opts.canSkill) {
        await this.useSkill(s);
        if (p.fx.swapped) { drawn = p.fx.swapped; p.fx.swapped = null; }
        continue;
      }
      if (a.act === 'tsumo' && opts.canTsumo) { await this.agari([s], null, true, { rinshan }); return { end: true }; }
      if (a.act === 'kyuushu' && opts.canKyuushu) { await this.abort('kyuushu', s); return { end: true }; }
      if ((a.act === 'ankan' && opts.ankans && opts.ankans.includes(a.t)) || (a.act === 'kakan' && opts.kakans && opts.kakans.includes(a.t))) {
        const r = await this.doKan(s, a.act, a.t);
        return r;
      }
      // discard (or riichi)
      let id = a.id;
      if (opts.mustTsumogiri) id = drawn;
      if (!p.hand.includes(id)) id = afterCall ? p.hand.find(x => !opts.forbid.includes(T(x))) : (drawn != null ? drawn : p.hand[p.hand.length - 1]);
      if (afterCall && opts.forbid.includes(T(id))) id = p.hand.find(x => !opts.forbid.includes(T(x))) || id;
      let declare = false;
      if (a.act === 'riichi' && opts.riichi && opts.riichi.some(x => T(x) === T(id))) declare = true;
      await this.discard(s, id, drawn, declare);
      return { id };
    }
  }

  riichiDiscards(p) {
    const out = [];
    const seen = new Set();
    for (const id of p.hand) {
      const t = T(id); if (seen.has(t)) continue; seen.add(t);
      const h = p.hand.slice(); h.splice(h.indexOf(id), 1);
      const c = MJ.countsIds(h);
      if (MJ.shanten(c, p.melds.length) === 0 && MJ.waits(c, p.melds.length).length) out.push(id);
    }
    return out;
  }
  riichiKanOk(p, t, drawn) {
    if (T(drawn) !== t) return false;
    const before = p.hand.filter(x => x !== drawn);
    const w1 = MJ.waits(MJ.countsIds(before), p.melds.length).join();
    const c = MJ.countsIds(before); c[t] -= 3;
    const w2 = MJ.waits(c, p.melds.length + 1).join();
    return w1 === w2 && w1.length > 0;
  }
  kuikae(p) {
    const m = p.melds[p.melds.length - 1];
    if (!m || !m.justCalled) return [];
    const ct = T(m.called);
    const out = [ct];
    if (m.type === 'chi') {
      const lo = m.t, pos = ct - lo;
      if (pos === 0 && lo % 9 <= 5) out.push(lo + 3);
      if (pos === 2 && lo % 9 >= 1) out.push(lo - 1);
    }
    // never forbid everything
    const left = p.hand.filter(id => !out.includes(T(id)));
    return left.length ? out : [];
  }

  async discard(s, id, drawn, declare) {
    const p = this.P[s];
    p.hand.splice(p.hand.indexOf(id), 1);
    p.hand.sort((a, b) => a - b);
    for (const m of p.melds) m.justCalled = false;
    if (p.ippatsu && !declare) p.ippatsu = false;
    const r = { id, tsumogiri: id === drawn, riichi: declare, taken: false, turn: this.turnCount++ };
    p.river.push(r);
    p.discards.add(T(id));
    p.furitenTemp = false;
    if (declare) {
      p.riichi = true; p.riichiPending = true; p.ippatsu = true; p.riichiTurn = p.river.length - 1;
      if (this.firstGo && p.firstTurn) p.dblRiichi = true;
    }
    p.firstTurn = false;
    // own discard furiten for riichi players
    if (p.riichi) {
      const w = MJ.waits(MJ.countsIds(p.hand), p.melds.length);
      if (w.some(t => p.discards.has(t))) p.furitenRiichi = true;
    }
    await this.emit('discard', { seat: s, id, tsumogiri: r.tsumogiri, riichi: declare });
  }

  // furiten: any wait in own discards / temp / riichi
  isFuriten(s) {
    const p = this.P[s];
    if (p.furitenTemp || p.furitenRiichi) return true;
    const w = MJ.waits(MJ.countsIds(p.hand), p.melds.length);
    return w.some(t => p.discards.has(t));
  }

  agariFor(s, winT, tsumo, extra) {
    const p = this.P[s];
    const closedIds = p.hand.slice();
    if (!tsumo) closedIds.push(extra.ronId);
    const closed = closedIds.map(T);
    const c = MJ.counts(closed);
    if (MJ.shanten(c, p.melds.length) !== -1) return null;
    let aka = 0;
    for (const id of closedIds) if (MJ.RED.has(id)) aka++;
    for (const m of p.melds) for (const id of m.tiles) if (MJ.RED.has(id)) aka++;
    const melds = p.melds.map(m => ({ type: m.type, t: m.t, tiles: m.tiles }));
    const live0 = this.liveLeft() === 0;
    const o = {
      closed, melds, win: winT, tsumo, seatWind: this.seatWind(s), roundWind: this.roundWind(), dealer: this.isDealer(s),
      riichi: p.riichi, dblRiichi: p.dblRiichi, ippatsu: p.riichi && p.ippatsu,
      haitei: tsumo && live0 && !extra.rinshan, houtei: !tsumo && live0 && !extra.chankan,
      rinshan: !!extra.rinshan, chankan: !!extra.chankan,
      tenhou: tsumo && this.firstGo && p.firstTurn && this.isDealer(s),
      chiihou: tsumo && this.firstGo && p.firstTurn && !this.isDealer(s) && p.melds.length === 0,
      doraInd: this.doraInds(), uraInd: this.uraInds(), aka,
      skillHan: p.fx.hanup ? 1 : 0, skillFu: p.fx.hanup ? p.fx.hanup.fu : 0,
    };
    const r = MJ.evaluate(o);
    if (!r) return null;
    r.aka = aka;
    return r;
  }

  // ---------------------------------------------------------------- calls after a discard
  async callPhase(from, id) {
    const t = T(id);
    const opts = [];
    for (let k = 1; k <= 3; k++) {
      const s = (from + k) % 4;
      const p = this.P[s];
      const o = { seat: s, tile: id, from };
      const ag = this.agariFor(s, t, false, { ronId: id });
      if (ag && !this.isFuriten(s)) { o.canRon = true; o.ronRes = ag; }
      if (!p.riichi && this.liveLeft() > 0) {
        const same = p.hand.filter(x => T(x) === t);
        if (same.length >= 2) o.pons = this.ponOptions(same);
        if (same.length === 3 && this.kans < 4) o.minkan = same.slice();
        if (k === 1 && t < 27) o.chis = this.chiOptions(p.hand, t);
        if (o.chis && !o.chis.length) delete o.chis;
      }
      if (o.canRon || o.pons || o.minkan || o.chis) opts.push(o);
    }
    if (!opts.length) { this.settleRiichi(from); return {}; }
    // ask everyone (in parallel for fairness, BOTs answer immediately)
    const answers = await Promise.all(opts.map(o => this.agents[o.seat].react(this, o.seat, o)));
    // ron(s)
    const rons = [];
    opts.forEach((o, i) => {
      if (answers[i] && answers[i].act === 'ron' && o.canRon) rons.push(o.seat);
      else if (o.canRon) { this.P[o.seat].furitenTemp = true; if (this.P[o.seat].riichi) this.P[o.seat].furitenRiichi = true; }
    });
    if (rons.length === 3) { await this.abort('sanchahou'); return { end: true }; }
    if (rons.length) {
      rons.sort((a, b) => ((a - from + 4) % 4) - ((b - from + 4) % 4));
      await this.agari(rons, from, false, { ronId: id });
      return { end: true };
    }
    this.settleRiichi(from);
    // pon / kan first, then chi
    let pick = null;
    opts.forEach((o, i) => {
      const a = answers[i]; if (!a) return;
      if ((a.act === 'pon' && o.pons) || (a.act === 'minkan' && o.minkan)) pick = pick && pick.pri >= 2 ? pick : { o, a, pri: 2 };
      else if (a.act === 'chi' && o.chis && (!pick || pick.pri < 1)) pick = { o, a, pri: 1 };
    });
    if (!pick) return {};
    const s = pick.o.seat, p = this.P[s];
    const a = pick.a;
    let use;
    if (a.act === 'pon') use = (a.use && pick.o.pons.some(u => u.join() === a.use.join())) ? a.use : pick.o.pons[0];
    else if (a.act === 'minkan') use = pick.o.minkan;
    else use = (a.use && pick.o.chis.some(u => u.join() === a.use.join())) ? a.use : pick.o.chis[0];
    for (const x of use) p.hand.splice(p.hand.indexOf(x), 1);
    const tiles = use.concat([id]).sort((x, y) => x - y);
    const type = a.act === 'minkan' ? 'minkan' : a.act;
    const lo = Math.min(...tiles.map(T));
    p.melds.push({ type, t: lo, tiles, called: id, from, justCalled: true });
    this.P[from].river[this.P[from].river.length - 1].taken = true;
    for (const q of this.P) q.ippatsu = false;
    this.firstGo = false;
    if (type === 'minkan') { this.kans++; (this.kanSeats = this.kanSeats || new Set()).add(s); }
    await this.emit('call', { seat: s, from, type, tiles, called: id });
    if (type === 'minkan') await this.revealDora();
    return { caller: s, minkan: type === 'minkan' };
  }
  settleRiichi(s) {
    const p = this.P[s];
    if (p.riichiPending) {
      p.riichiPending = false;
      this.scores[s] -= 1000; this.kyotaku += 1000;
      this.emit('riichi-stick', { seat: s, scores: this.scores.slice(), kyotaku: this.kyotaku });
    }
  }
  ponOptions(same) {
    // prefer keeping a red five in hand when possible
    const out = [];
    const reds = same.filter(x => MJ.RED.has(x)), plain = same.filter(x => !MJ.RED.has(x));
    if (plain.length >= 2) out.push(plain.slice(0, 2));
    if (reds.length && plain.length) out.push([reds[0], plain[0]]);
    return out.length ? out : [same.slice(0, 2)];
  }
  chiOptions(hand, t) {
    const out = [];
    const n = t % 9, pick = tt => hand.find(x => T(x) === tt && !MJ.RED.has(x)) ?? hand.find(x => T(x) === tt);
    const has = tt => hand.some(x => T(x) === tt);
    if (n >= 2 && has(t - 2) && has(t - 1)) out.push([pick(t - 2), pick(t - 1)]);
    if (n >= 1 && n <= 7 && has(t - 1) && has(t + 1)) out.push([pick(t - 1), pick(t + 1)]);
    if (n <= 6 && has(t + 1) && has(t + 2)) out.push([pick(t + 1), pick(t + 2)]);
    // must leave a legal discard (kuikae)
    return out.filter(u => {
      const rest = hand.slice(); for (const x of u) rest.splice(rest.indexOf(x), 1);
      const lo = Math.min(t, ...u.map(T)), pos = t - lo;
      const ban = [t]; if (pos === 0 && lo % 9 <= 5) ban.push(lo + 3); if (pos === 2 && lo % 9 >= 1) ban.push(lo - 1);
      return rest.some(x => !ban.includes(T(x)));
    });
  }

  async doKan(s, kind, t) {
    const p = this.P[s];
    for (const q of this.P) q.ippatsu = false;
    this.firstGo = false;
    if (kind === 'ankan') {
      const tiles = p.hand.filter(x => T(x) === t);
      p.hand = p.hand.filter(x => T(x) !== t);
      p.melds.push({ type: 'ankan', t, tiles, from: s });
      this.kans++; (this.kanSeats = this.kanSeats || new Set()).add(s);
      await this.emit('call', { seat: s, from: s, type: 'ankan', tiles });
      await this.revealDora();
      return { kan: true };
    }
    // kakan: chankan chance
    const id = p.hand.find(x => T(x) === t);
    const opts = [];
    for (let k = 1; k <= 3; k++) {
      const q = (s + k) % 4;
      const ag = this.agariFor(q, t, false, { ronId: id, chankan: true });
      if (ag && !this.isFuriten(q)) opts.push({ seat: q, tile: id, from: s, canRon: true, ronRes: ag, chankan: true });
    }
    if (opts.length) {
      const ans = await Promise.all(opts.map(o => this.agents[o.seat].react(this, o.seat, o)));
      const rons = opts.filter((o, i) => ans[i] && ans[i].act === 'ron').map(o => o.seat);
      opts.forEach((o, i) => { if (!(ans[i] && ans[i].act === 'ron')) { this.P[o.seat].furitenTemp = true; if (this.P[o.seat].riichi) this.P[o.seat].furitenRiichi = true; } });
      if (rons.length) { await this.agari(rons, s, false, { ronId: id, chankan: true }); return { end: true }; }
    }
    p.hand.splice(p.hand.indexOf(id), 1);
    const m = p.melds.find(m => m.type === 'pon' && m.t === t);
    m.type = 'kakan'; m.tiles.push(id); m.added = id;
    this.kans++; (this.kanSeats = this.kanSeats || new Set()).add(s);
    await this.emit('call', { seat: s, from: m.from, type: 'kakan', tiles: m.tiles, added: id });
    await this.revealDora();
    return { kan: true };
  }

  // ---------------------------------------------------------------- payments
  // move points with skill modifiers (wareme doubles, guard halves the payer's side)
  pay(from, to, amt, ron) {
    let m = 1;
    const F = this.P[from].fx, Tt = this.P[to].fx;
    if (F.wareme) m *= 2;
    if (Tt.wareme) m *= Tt.wareme;
    if (F.guard) m *= F.guard;
    if (ron && F.seal) m *= F.seal;
    const v = m === 1 ? amt : Math.ceil(amt * m / 100) * 100;
    this.scores[from] -= v; this.scores[to] += v;
    return v;
  }

  async agari(winners, from, tsumo, extra) {
    const results = [];
    const delta = [0, 0, 0, 0];
    const before = this.scores.slice();
    let sticksTaken = false, first = true;
    for (const w of winners) {
      const p = this.P[w];
      const winId = tsumo ? p.hand[p.hand.length - 1] : extra.ronId;
      const res = this.agariFor(w, T(winId), tsumo, Object.assign({}, extra, { rinshan: extra.rinshan }));
      if (!res) continue;
      const dealer = this.isDealer(w);
      const pays = MJ.payments(res.base, dealer, tsumo);
      const potMul = p.fx.pot || 1;
      const hb = first ? this.honba * potMul : 0; first = false;
      const moves = [];
      if (tsumo) {
        for (let q = 0; q < 4; q++) if (q !== w) {
          const amt = (dealer ? pays.all : (this.isDealer(q) ? pays.dealer : pays.other)) + Math.ceil(hb) * 100;
          moves.push([q, this.pay(q, w, amt)]);
        }
      } else {
        moves.push([from, this.pay(from, w, pays.ron + Math.ceil(hb * 3) * 100, true)]);
      }
      // shugi skill: +500 from each other player per red / ura / ippatsu
      if (p.fx.shugi) {
        const ura = (res.list.find(x => x[0] === 'ura') || [0, 0])[1];
        const ip = res.list.some(x => x[0] === 'ippatsu') ? 1 : 0;
        const n = (res.aka || 0) + ura + ip;
        if (n) for (let q = 0; q < 4; q++) if (q !== w) moves.push([q, this.pay(q, w, p.fx.shugi * n), 'shugi']);
        res.shugi = n;
      }
      if (!sticksTaken) {
        sticksTaken = true;
        const k = this.kyotaku;
        this.scores[w] += k; res.kyotaku = k; this.kyotaku = 0;
        if (p.fx.pot && k) {           // jackpot: the other three add the pot again between them
          const each = Math.ceil(k * (potMul - 1) / 3 / 100) * 100;
          for (let q = 0; q < 4; q++) if (q !== w) { this.scores[q] -= each; this.scores[w] += each; }
          res.kyotaku += each * 3;
        }
      }
      const hand = p.hand.slice(); if (!tsumo) hand.push(winId);
      results.push({ seat: w, from, tsumo, res, moves, hand, melds: p.melds.map(m => Object.assign({}, m)), winId, ura: this.uraInds() });
    }
    for (let i = 0; i < 4; i++) delta[i] = this.scores[i] - before[i];
    const dealerWon = winners.includes(this.kyoku);
    this.lastResult = { type: 'agari', renchan: dealerWon };
    if (dealerWon) this.honba++; else this.honba = 0;
    await this.emit('agari', { results, delta, scores: this.scores.slice(), dora: this.doraInds(), ura: this.uraInds() });
  }

  async exhaustive() {
    const tenpai = this.P.map(p => MJ.shanten(MJ.countsIds(p.hand), p.melds.length) === 0 && MJ.waits(MJ.countsIds(p.hand), p.melds.length).some(t => MJ.countsIds(p.hand)[t] < 4));
    const n = tenpai.filter(Boolean).length;
    const before = this.scores.slice();
    if (n > 0 && n < 4) {
      const get = 3000 / n, give = 3000 / (4 - n);
      // pair each non-tenpai payer with tenpai receivers
      for (let a = 0; a < 4; a++) if (!tenpai[a]) for (let b = 0; b < 4; b++) if (tenpai[b]) this.pay(a, b, give / n);
    }
    const delta = this.scores.map((v, i) => v - before[i]);
    const renchan = tenpai[this.kyoku];
    this.lastResult = { type: 'ryuukyoku', renchan };
    this.honba++;
    await this.emit('ryuukyoku', { tenpai, delta, scores: this.scores.slice(), hands: this.P.map(p => p.hand.slice()) });
  }
  async abort(kind, seat) {
    this.lastResult = { type: 'abort', renchan: true };
    this.honba++;
    for (const p of this.P) if (p.riichiPending) p.riichiPending = false;
    await this.emit('ryuukyoku', { abort: kind, seat, tenpai: [false, false, false, false], delta: [0, 0, 0, 0], scores: this.scores.slice(), hands: this.P.map(p => p.hand.slice()) });
  }

  // ---------------------------------------------------------------- skills
  async useSkill(s) {
    const cost = this.skillCost(s);
    const sk = SK.get(this.chars[s].skill), tier = this.chars[s].tier | 0;
    this.scores[s] -= cost; this.kyotaku += cost;
    this.skillUses[s]++;
    this.P[s].skillUsed = true;
    const info = await sk.use(this, s, SK.val(sk, tier));
    await this.emit('skill', { seat: s, skill: sk.id, tier, cost, info: info || {}, scores: this.scores.slice(), kyotaku: this.kyotaku, char: this.chars[s] });
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = MJGame;
else root.MJGame = MJGame;
})(typeof window !== 'undefined' ? window : globalThis);
