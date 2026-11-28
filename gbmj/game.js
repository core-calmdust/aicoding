// 国標麻将（MCR 2006）の局と1試合（16局＝4圏、毎局親交代）の進行。手番ごとに止まる状態機械で、UI と node の自動対局の両方から使う。
//
//   const m = new GBMatch({ seed }); let r = m.nextRound();
//   while (r.phase !== 'end') { for (const p of r.waiting()) r.act(p, chooseFrom(r.options(p))); }
//   m.finishRound(r);
//
// 局面：phase = 'turn'（手番の人が 和了/暗槓/加槓/捨て牌）| 'claim'（捨て牌に 和了/ポン/大明槓/チー/パス）| 'rob'（加槓に搶槓/パス）| 'end'
// 座席 0〜3 は反時計回り（i の下家が i+1）。親は東、i+1 が南。
(function (root) {
'use strict';
const GB = root.GB || (typeof require !== 'undefined' ? require('./engine.js') : null);
const GBFan = root.GBFan || (typeof require !== 'undefined' ? require('./fan.js') : null);
const T = GB.T;

class GBRound {
  constructor(o) {
    this.rand = o.rand;
    this.dealer = o.dealer;           // 親の席
    this.wind = o.wind;               // 圏風 0〜3
    this.no = o.no || 0;              // 試合の何局目（0〜15）
    this.wall = o.wall || GB.newWall(this.rand);
    this.front = 0; this.back = this.wall.length;   // 前から引く、嶺上（槓・花の補充）は後ろから
    this.P = [0, 1, 2, 3].map(i => ({ hand: [], melds: [], flowers: [], discards: [], dead: false, penalty: 0 }));
    this.log = [];
    this.result = null;
    this.events = [];                 // UI 用の出来事（{ev, p, …}）
    this.deal();
  }
  seatWind(p) { return (p - this.dealer + 4) % 4; }
  left() { return this.back - this.front; }
  emit(ev, d) { const e = Object.assign({ ev }, d); this.events.push(e); this.log.push(e); }

  // ---------------------------------------------------------------- 配牌と花の補充
  drawFront() { return this.wall[this.front++]; }
  drawBack() { return this.wall[--this.back]; }
  deal() {
    for (let k = 0; k < 13; k++) for (let i = 0; i < 4; i++) this.P[(this.dealer + i) % 4].hand.push(this.drawFront());
    this.P[this.dealer].hand.push(this.drawFront());
    // 親から順に花を出して補充（2006 3.5.7.6）、誰も持っていなくなるまで
    for (let again = true; again;) {
      again = false;
      for (let i = 0; i < 4; i++) {
        const p = (this.dealer + i) % 4, P = this.P[p];
        for (;;) {
          const f = P.hand.find(GB.isFlower);
          if (f === undefined || !this.left()) break;
          P.hand.splice(P.hand.indexOf(f), 1); P.flowers.push(f);
          const r = this.drawBack(); P.hand.push(r); again = true;
          this.emit('flower', { p, id: f, deal: true });
        }
      }
    }
    for (const P of this.P) P.hand.sort((a, b) => a - b);
    this.cur = this.dealer;
    this.phase = 'turn';
    this.drawn = null;                // ツモった牌（id）
    this.afterKong = false;           // 槓の補充牌（嶺上）を引いた直後
    this.claimedTurn = false;         // チー・ポンの直後（槓・和了はできない）
    this.firstTurn = true;
    this.emit('deal', { dealer: this.dealer });
  }
  // ツモ（花なら補充を続ける）。山が尽きていれば流局
  draw(p, fromBack) {
    const P = this.P[p];
    for (;;) {
      if (!this.left()) { this.endDraw(); return false; }
      const id = fromBack ? this.drawBack() : this.drawFront();
      if (GB.isFlower(id)) {
        P.flowers.push(id); this.emit('flower', { p, id });
        fromBack = true; this.afterKong = false;             // 花の補充牌での和了は自摸（槓上開花ではない、2006 Fan 46・81）
        continue;
      }
      P.hand.push(id); this.drawn = id;
      this.emit('draw', { p, id, back: !!fromBack });
      return true;
    }
  }

  // ---------------------------------------------------------------- 和了の判定
  meldsOf(p) { return this.P[p].melds.map(m => ({ k: m.k === 'kakan' || m.k === 'minkan' ? 'kan' : m.k, t: m.t })); }
  visibleCount(t, except) {         // 卓上に見えている牌の数（捨て牌・副露。暗槓は伏せるので数えない）
    let n = 0;
    for (let i = 0; i < 4; i++) {
      for (const d of this.P[i].discards) if (!d.claimed && T(d.id) === t && d.id !== except) n++;
      for (const m of this.P[i].melds) if (m.k !== 'ankan') for (const id of m.ids) if (T(id) === t && id !== except) n++;
    }
    return n;
  }
  // 和了の番を計算（hand：和了牌を除く立牌の id、win：和了牌の id）
  score(p, winId, how) {
    const P = this.P[p];
    const hand = P.hand.filter(id => id !== winId).map(T);
    const o = {
      melds: this.meldsOf(p), hand, win: T(winId), tsumo: how === 'tsumo',
      flowers: P.flowers.length, seat: this.seatWind(p), round: this.wind,
      kong: how === 'tsumo' ? this.afterKong : how === 'rob',
      wallLast: how === 'tsumo' ? !this.left() : (how === 'ron' && !this.left()),
      last: this.visibleCount(T(winId), winId) === 3,
    };
    return GBFan.calc(o);
  }
  canWin(p, winId, how) {
    if (this.P[p].dead) return null;
    const r = this.score(p, winId, how);
    return r.ok ? r : null;
  }

  // ---------------------------------------------------------------- 選べる行動
  waiting() {
    if (this.phase === 'turn') return [this.cur];
    if (this.phase === 'claim' || this.phase === 'rob') return this.claimers.filter(p => !(p in this.answers));
    return [];
  }
  options(p) {
    const P = this.P[p], out = [];
    if (this.phase === 'turn' && p === this.cur) {
      if (!this.claimedTurn && this.drawn != null) {
        const r = this.canWin(p, this.drawn, 'tsumo');
        if (r) out.push({ type: 'hu', pts: r.pts, fan: r, low: r.pts < GB.MIN });
      }
      if (!this.claimedTurn && this.left() > 0) {
        const c = GB.countsIds(P.hand);
        for (let t = 0; t < 34; t++) if (c[t] === 4) out.push({ type: 'ankan', t });
        for (const m of P.melds) if (m.k === 'pon' && c[m.t] >= 1) out.push({ type: 'kakan', t: m.t });
      }
      const seen = new Set();
      for (const id of P.hand) { if (seen.has(id)) continue; seen.add(id); out.push({ type: 'discard', id }); }
      return out;
    }
    if (this.phase === 'claim' && this.claimers.includes(p)) {
      const id = this.discard, t = T(id), c = GB.countsIds(P.hand);
      const r = this.canWin(p, id, 'ron');
      if (r) out.push({ type: 'hu', pts: r.pts, fan: r, low: r.pts < GB.MIN });
      if (this.left() > 0) {
        if (c[t] >= 2) out.push({ type: 'pon', t });
        if (c[t] >= 3) out.push({ type: 'kan', t });
        if (p === (this.cur + 1) % 4 && t < 27) {
          const n = t % 9;
          for (const b of [t - 2, t - 1, t]) {
            if (b < t - n || b % 9 > 6 || b < 0) continue;
            if (Math.floor(b / 9) !== Math.floor(t / 9)) continue;
            const need = [b, b + 1, b + 2].filter(x => x !== t);
            if (need.every(x => c[x] >= 1)) out.push({ type: 'chi', t: b });
          }
        }
      }
      out.push({ type: 'pass' });
      return out;
    }
    if (this.phase === 'rob' && this.claimers.includes(p)) {
      const r = this.canWin(p, this.robTile, 'rob');
      if (r) out.push({ type: 'hu', pts: r.pts, fan: r, low: r.pts < GB.MIN });
      out.push({ type: 'pass' });
      return out;
    }
    return out;
  }

  // ---------------------------------------------------------------- 行動
  act(p, a) {
    if (this.phase === 'turn') return this.actTurn(p, a);
    if (this.phase === 'claim' || this.phase === 'rob') { this.answers[p] = a; if (this.waiting().length === 0) this.resolveClaims(); return; }
    throw new Error('act in phase ' + this.phase);
  }
  takeFromHand(p, t, n) {
    const P = this.P[p], ids = [];
    for (let i = P.hand.length - 1; i >= 0 && ids.length < n; i--) if (T(P.hand[i]) === t) ids.push(P.hand.splice(i, 1)[0]);
    if (ids.length < n) throw new Error('not enough tiles');
    return ids;
  }
  actTurn(p, a) {
    if (p !== this.cur) throw new Error('not your turn');
    const P = this.P[p];
    if (a.type === 'hu') {
      const r = this.canWin(p, this.drawn, 'tsumo');
      if (!r || this.claimedTurn) throw new Error('illegal tsumo');
      if (r.pts < GB.MIN) return this.falseHu(p, r);
      return this.endWin(p, null, this.drawn, r, 'tsumo');
    }
    if (a.type === 'ankan' || a.type === 'kakan') {
      if (this.claimedTurn || !this.left()) throw new Error('illegal kong');
      if (a.type === 'ankan') {
        const ids = this.takeFromHand(p, a.t, 4);
        P.melds.push({ k: 'ankan', t: a.t, ids, from: p });
        this.emit('kong', { p, k: 'ankan', t: a.t });
        this.afterKongDraw(p);
        return;
      }
      const m = P.melds.find(x => x.k === 'pon' && x.t === a.t);
      const id = this.takeFromHand(p, a.t, 1)[0];
      // 加槓は搶槓の機会（ほかの3人がロンできる）
      this.robTile = id; this.robMeld = m; this.robber = p;
      this.claimers = [1, 2, 3].map(k => (p + k) % 4).filter(q => this.canWin(q, id, 'rob'));
      this.emit('kakan', { p, t: a.t, id });
      if (this.claimers.length) { this.phase = 'rob'; this.answers = {}; return; }
      this.finishKakan();
      return;
    }
    if (a.type === 'discard') {
      const i = P.hand.indexOf(a.id);
      if (i < 0) throw new Error('no such tile');
      P.hand.splice(i, 1); P.hand.sort((x, y) => x - y);
      P.discards.push({ id: a.id, claimed: false });
      this.discard = a.id; this.drawn = null; this.afterKong = false; this.claimedTurn = false; this.firstTurn = false;
      this.emit('discard', { p, id: a.id });
      this.phase = 'claim'; this.answers = {};
      this.claimers = [1, 2, 3].map(k => (p + k) % 4);
      this.claimers = this.claimers.filter(q => this.options(q).some(o => o.type !== 'pass'));
      if (!this.claimers.length) this.resolveClaims();
      return;
    }
    throw new Error('bad action ' + a.type);
  }
  afterKongDraw(p) {
    this.cur = p; this.claimedTurn = false;
    if (this.draw(p, true)) { this.afterKong = true; this.phase = 'turn'; }
  }
  finishKakan() {
    const m = this.robMeld; m.k = 'kakan'; m.ids.push(this.robTile);
    this.robTile = null;
    this.afterKongDraw(this.robber);
  }
  falseHu(p, r) {
    // 8点未満の和了宣言：ほかの3人に10点ずつ払い、この局は和了できない（2006 3.11.6.6）
    const P = this.P[p];
    P.dead = true; P.penalty -= 30;
    for (let k = 1; k < 4; k++) this.P[(p + k) % 4].penalty += 10;
    this.emit('falsehu', { p, pts: r ? r.pts : 0 });
  }
  resolveClaims() {
    const from = this.phase === 'rob' ? this.robber : this.cur;
    const order = [1, 2, 3].map(k => (from + k) % 4);
    const ans = this.answers || {};
    // 誤和了（8点未満）の宣言は罰を受けて取り消し、ほかの宣言で続ける
    for (const q of order) { const a = ans[q]; if (a && a.type === 'hu') { const o = this.options(q).find(x => x.type === 'hu'); if (!o) { delete ans[q]; } else if (o.pts < GB.MIN) { this.falseHu(q, o.fan); delete ans[q]; } } }
    // 和了：放銃者の下家に近い人が優先（2006 3.7.2.4）
    for (const q of order) {
      const a = ans[q];
      if (a && a.type === 'hu') {
        if (this.phase === 'rob') { const r = this.canWin(q, this.robTile, 'rob'); return this.endWin(q, this.robber, this.robTile, r, 'rob'); }
        const r = this.canWin(q, this.discard, 'ron');
        this.P[from].discards[this.P[from].discards.length - 1].claimed = true;
        return this.endWin(q, from, this.discard, r, 'ron');
      }
    }
    if (this.phase === 'rob') { this.phase = 'turn'; this.finishKakan(); return; }
    // ポン・大明槓はチーより優先
    for (const q of order) {
      const a = ans[q];
      if (a && (a.type === 'pon' || a.type === 'kan')) {
        const t = T(this.discard);
        const ids = this.takeFromHand(q, t, a.type === 'pon' ? 2 : 3).concat([this.discard]);
        this.P[from].discards[this.P[from].discards.length - 1].claimed = true;
        this.P[q].melds.push({ k: a.type === 'pon' ? 'pon' : 'minkan', t, ids, from, got: this.discard });
        this.emit(a.type, { p: q, from, t, id: this.discard });
        this.cur = q; this.drawn = null;
        if (a.type === 'kan') { this.afterKongDraw(q); return; }
        this.claimedTurn = true; this.phase = 'turn';
        return;
      }
    }
    const nx = (from + 1) % 4;
    const ac = ans[nx];
    if (ac && ac.type === 'chi') {
      const t = T(this.discard), ids = [this.discard];
      for (const x of [ac.t, ac.t + 1, ac.t + 2]) if (x !== t) ids.push(this.takeFromHand(nx, x, 1)[0]);
      this.P[from].discards[this.P[from].discards.length - 1].claimed = true;
      this.P[nx].melds.push({ k: 'chi', t: ac.t, ids, from, got: this.discard });
      this.emit('chi', { p: nx, from, t: ac.t, id: this.discard });
      this.cur = nx; this.drawn = null; this.claimedTurn = true; this.phase = 'turn';
      return;
    }
    // 誰も取らない：下家がツモ
    this.cur = nx; this.claimedTurn = false;
    if (this.draw(nx, false)) this.phase = 'turn';
  }

  // ---------------------------------------------------------------- 終局
  endWin(p, from, winId, r, how) {
    const pts = r.total;      // 花牌を含む
    const pay = [0, 0, 0, 0];
    if (how === 'tsumo') { for (let k = 1; k < 4; k++) { const q = (p + k) % 4; pay[q] -= pts + 8; pay[p] += pts + 8; } }
    else { for (let k = 1; k < 4; k++) { const q = (p + k) % 4; const x = q === from ? pts + 8 : 8; pay[q] -= x; pay[p] += x; } }
    for (let i = 0; i < 4; i++) pay[i] += this.P[i].penalty;
    if (how !== 'tsumo') this.P[p].hand.push(winId);
    if (how === 'rob') this.robTile = null;
    this.result = { type: 'win', p, from, how, winId, fan: r, pay };
    this.phase = 'end';
    this.emit('win', { p, from, how, id: winId, pts });
  }
  endDraw() {
    const pay = this.P.map(P => P.penalty);
    this.result = { type: 'draw', pay };
    this.phase = 'end';
    this.emit('exhaust', {});
  }
  // 牌の枚数の検査（自動対局の違反チェック用）
  audit() {
    const seen = new Set(); const add = id => { if (seen.has(id)) throw new Error('dup tile ' + id); seen.add(id); };
    for (let i = this.front; i < this.back; i++) add(this.wall[i]);
    for (const P of this.P) {
      for (const id of P.hand) add(id);
      for (const id of P.flowers) add(id);
      for (const d of P.discards) if (!d.claimed) add(d.id);
      for (const m of P.melds) for (const id of m.ids) add(id);
    }
    if (this.robTile != null) add(this.robTile);
    if (seen.size !== GB.N_TILES) throw new Error('tile count ' + seen.size);
    for (let i = 0; i < 4; i++) {
      const P = this.P[i], n = P.hand.length + P.melds.length * 3;
      const want = (this.phase === 'turn' && i === this.cur) || (this.phase === 'end' && this.result.type === 'win' && i === this.result.p) ? 14 : 13;
      if (n !== want) throw new Error(`seat ${i} has ${n} tiles (phase ${this.phase})`);
      if (P.hand.some(GB.isFlower)) throw new Error('flower in hand');
    }
  }
}

class GBMatch {
  constructor(o) {
    o = o || {};
    this.seed = o.seed == null ? (Math.random() * 2 ** 32) >>> 0 : o.seed;
    this.rand = GB.rng(this.seed);
    this.hands = o.hands || 16;       // 16局＝東南西北の4圏
    this.scores = [0, 0, 0, 0];
    this.no = 0;
    this.history = [];
    this.dealer0 = o.dealer0 != null ? o.dealer0 : 0;
  }
  get over() { return this.no >= this.hands; }
  nextRound() {
    const dealer = (this.dealer0 + this.no) % 4, wind = Math.floor(this.no / 4) % 4;
    this.round = new GBRound({ rand: this.rand, dealer, wind, no: this.no });
    return this.round;
  }
  finishRound(r) {
    for (let i = 0; i < 4; i++) this.scores[i] += r.result.pay[i];
    this.history.push({ no: this.no, dealer: r.dealer, wind: r.wind, result: r.result });
    this.no++;
  }
  // 順位点（2006 3.9.2：1位4・2位2・3位1・4位0）。同点は同じ順位
  ranks() {
    return this.scores.map(s => 1 + this.scores.filter(x => x > s).length);
  }
  tablePoints() { const tp = [4, 2, 1, 0]; return this.ranks().map(r => tp[r - 1]); }
}

const API = { GBRound, GBMatch };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else Object.assign(root, API);
})(typeof window !== 'undefined' ? window : globalThis);
