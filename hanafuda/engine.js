/* Hanafuda Koi-Koi engine (rules, yaku, scoring). Pure logic; used by the page, the AI worker and node tests.
   Card id = month*4 + k (month 0..11). See claude/hanafuda-spec.md for the rule sources. */
(function (root) {
  'use strict';
  // per month: the four cards in order [type, sub]
  const DEF = [
    [['hikari', 'crane'], ['tan', 'aka'], ['kasu'], ['kasu']],            // 1 松
    [['tane', 'uguisu'], ['tan', 'aka'], ['kasu'], ['kasu']],             // 2 梅
    [['hikari', 'curtain'], ['tan', 'miyoshino'], ['kasu'], ['kasu']],   // 3 桜
    [['tane', 'hototogisu'], ['tan', 'plain'], ['kasu'], ['kasu']],      // 4 藤
    [['tane', 'bridge'], ['tan', 'plain'], ['kasu'], ['kasu']],          // 5 菖蒲
    [['tane', 'butterfly'], ['tan', 'ao'], ['kasu'], ['kasu']],          // 6 牡丹
    [['tane', 'boar'], ['tan', 'plain'], ['kasu'], ['kasu']],            // 7 萩
    [['hikari', 'moon'], ['tane', 'geese'], ['kasu'], ['kasu']],         // 8 芒
    [['tane', 'sake'], ['tan', 'ao'], ['kasu'], ['kasu']],               // 9 菊
    [['tane', 'deer'], ['tan', 'ao'], ['kasu'], ['kasu']],               // 10 紅葉
    [['hikari', 'rainman'], ['tane', 'swallow'], ['tan', 'plain'], ['kasu', 'lightning']], // 11 柳
    [['hikari', 'phoenix'], ['kasu'], ['kasu'], ['kasu', 'yellow']],     // 12 桐
  ];
  const CARDS = [];
  for (let m = 0; m < 12; m++) for (let k = 0; k < 4; k++) {
    const d = DEF[m][k];
    CARDS.push({ id: m * 4 + k, m, k, type: d[0], sub: d[1] || null });
  }
  const ID = {};
  CARDS.forEach(c => { if (c.sub && !ID[c.sub]) ID[c.sub] = c.id; });
  ID.akatan = [1, 5, 9]; ID.aotan = [21, 33, 37];
  const month = id => id >> 2;

  // ---------- rule options ----------
  const DEFAULT_OPTS = {
    months: 12,          // 12 / 6 / 3
    koiBonus: 'opp2',    // 'opp2' = 相手がこいこい中なら2倍 (任天堂), 'self' = 自分のこいこい回数＋1倍, 'none'
    over7: true,         // 7点以上は2倍
    koiLimit: 'once',    // 'once' = こいこい後は次の役で終わり (任天堂), 'multi' = 何度でも
    viewing: 'on',       // 花見で一杯・月見で一杯: 'on' / 'off' / 'rain' (柳の光を取っていると無効)
    sakeKasu: true,      // 菊に盃をカスにも数える
    plusExtra: false,    // 猪鹿蝶・赤短・青短に、増えた枚数ぶん+1
    handYaku: true,      // 手四・くっつき 6点
    noYaku: 'nogame',    // 'nogame' (親交代) / 'oyaken' (親に6点、親続投)
    nextOya: 'winner',   // 'winner' / 'alternate'
  };
  const PRESETS = {
    nintendo: {},
    app: { koiBonus: 'opp2', koiLimit: 'multi', plusExtra: true, noYaku: 'oyaken' },
    soft: { koiBonus: 'self', over7: false, koiLimit: 'multi', viewing: 'rain', months: 6 },
  };
  function opts(o) { return Object.assign({}, DEFAULT_OPTS, o || {}); }

  // ---------- yaku ----------
  // returns {list:[{id,pts}], total}
  function yaku(caps, o) {
    o = o || DEFAULT_OPTS;
    const has = new Uint8Array(48);
    for (const c of caps) has[c] = 1;
    let lights = 0, tane = 0, tan = 0, kasu = 0;
    for (const c of caps) {
      const t = CARDS[c].type;
      if (t === 'hikari') lights++; else if (t === 'tane') tane++; else if (t === 'tan') tan++; else kasu++;
    }
    if (o.sakeKasu && has[ID.sake]) kasu++;
    const rain = !!has[ID.rainman];
    const L = [];
    if (lights === 5) L.push({ id: 'goko', pts: 10 });
    else if (lights === 4) L.push(rain ? { id: 'ameshiko', pts: 7 } : { id: 'shiko', pts: 8 });
    else if (lights === 3 && !rain) L.push({ id: 'sanko', pts: 5 });
    const viewOK = o.viewing === 'on' || (o.viewing === 'rain' && !rain);
    if (viewOK && has[ID.sake]) {
      if (has[ID.curtain]) L.push({ id: 'hanami', pts: 5 });
      if (has[ID.moon]) L.push({ id: 'tsukimi', pts: 5 });
    }
    if (has[ID.boar] && has[ID.deer] && has[ID.butterfly]) L.push({ id: 'inoshikacho', pts: 5 + (o.plusExtra ? tane - 3 : 0) });
    const aka = has[1] && has[5] && has[9], ao = has[21] && has[33] && has[37];
    if (aka && ao) L.push({ id: 'akaao', pts: 10 + (o.plusExtra ? tan - 6 : 0) });
    else if (aka) L.push({ id: 'akatan', pts: 5 + (o.plusExtra ? tan - 3 : 0) });
    else if (ao) L.push({ id: 'aotan', pts: 5 + (o.plusExtra ? tan - 3 : 0) });
    if (tane >= 5) L.push({ id: 'tane', pts: tane - 4 });
    if (tan >= 5) L.push({ id: 'tan', pts: tan - 4 });
    if (kasu >= 10) L.push({ id: 'kasu', pts: kasu - 9 });
    let total = 0;
    for (const y of L) total += y.pts;
    return { list: L, total };
  }

  // hand yaku at the deal: teshi (4 of a month) / kuttsuki (4 pairs)
  function handYaku(hand) {
    const cnt = new Array(12).fill(0);
    for (const c of hand) cnt[month(c)]++;
    if (cnt.some(n => n === 4)) return { id: 'teshi', pts: 6 };
    if (cnt.filter(n => n === 2).length === 4) return { id: 'kuttsuki', pts: 6 };
    return null;
  }

  // ---------- RNG ----------
  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, r) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---------- one hand (月) ----------
  // phase: 'play' (choose hand card) | 'pickPlay' (choose field card for the played card) |
  //        'pickDraw' (choose field card for the drawn card) | 'koi' (stop or koi-koi) | 'over'
  function deal(seed, oya, o) {
    o = opts(o);
    const r = rng(seed);
    for (let guard = 0; guard < 100; guard++) {
      const deck = shuffle([...Array(48).keys()], r);
      // dealt 2 at a time: field, ko, oya (Nintendo's order: 場・相手・自分) x4
      const hands = [[], []], field = [];
      const ko = 1 - oya;
      for (let i = 0; i < 4; i++) {
        field.push(deck.pop(), deck.pop());
        hands[ko].push(deck.pop(), deck.pop());
        hands[oya].push(deck.pop(), deck.pop());
      }
      const fc = new Array(12).fill(0);
      for (const c of field) fc[month(c)]++;
      if (fc.some(n => n === 4)) continue;                  // 場に同じ月4枚 → 配り直し
      const s = {
        o, oya, turn: oya, deck, hands, field, caps: [[], []], phase: 'play',
        koi: [0, 0], lastPts: [0, 0], pending: null, drawn: null, log: [], result: null, turns: 0,
        seen: [],  // non-capturing discards: {p, card, fieldMonths} (used by the AI's hand inference)
      };
      sortHands(s);
      if (o.handYaku) {
        for (const p of [oya, ko]) {
          const hy = handYaku(hands[p]);
          if (hy) { s.phase = 'over'; s.result = { winner: p, pts: hy.pts, base: hy.pts, mult: 1, yaku: [hy], hand: true }; return s; }
        }
      }
      return s;
    }
    throw new Error('deal failed');
  }
  function sortHands(s) { for (const h of s.hands) h.sort((a, b) => a - b); }

  function matches(field, c) { const m = month(c); return field.filter(f => month(f) === m); }

  function clone(s) {
    return {
      o: s.o, oya: s.oya, turn: s.turn, deck: s.deck.slice(), hands: [s.hands[0].slice(), s.hands[1].slice()],
      field: s.field.slice(), caps: [s.caps[0].slice(), s.caps[1].slice()], phase: s.phase,
      koi: s.koi.slice(), lastPts: s.lastPts.slice(), pending: s.pending, drawn: s.drawn, log: s.log.slice(),
      result: s.result, turns: s.turns, seen: s.seen,
    };
  }

  // legal actions for the side to move
  function actions(s) {
    switch (s.phase) {
      case 'play': return s.hands[s.turn].slice();
      case 'pickPlay': case 'pickDraw': return matches(s.field, s.pending);
      case 'koi': return canKoi(s) ? ['stop', 'koi'] : ['stop'];
      default: return [];
    }
  }
  function canKoi(s) {
    // the last turn of the hand cannot continue; 'once' rule: after a koi-koi the next yaku ends the hand
    if (s.hands[0].length === 0 && s.hands[1].length === 0) return false;
    if (s.o.koiLimit === 'once' && (s.koi[0] + s.koi[1]) > 0) return false;
    return true;
  }

  function take(s, p, c, f) {
    // c captures f (and if 3 of the month lie on the field, all of them)
    const m = month(c);
    const same = s.field.filter(x => month(x) === m);
    let got;
    if (same.length === 3) got = same;
    else got = [f];
    s.field = s.field.filter(x => got.indexOf(x) < 0);
    s.caps[p].push(c, ...got);
    return got;
  }

  // apply an action; returns the new state (input not mutated)
  function apply(s0, a) {
    const s = clone(s0);
    const p = s.turn;
    if (s.phase === 'play') {
      const i = s.hands[p].indexOf(a);
      if (i < 0) throw new Error('not in hand');
      s.hands[p].splice(i, 1);
      const ms = matches(s.field, a);
      if (ms.length === 0) {
        s.seen = s.seen.concat([{ p, card: a, fieldMonths: s.field.map(month) }]);
        s.field.push(a); s.log.push({ p, kind: 'play', card: a, got: [] });
      } else if (ms.length === 2) { s.phase = 'pickPlay'; s.pending = a; s.log.push({ p, kind: 'play', card: a, got: null }); return s; }
      else { const got = take(s, p, a, ms[0]); s.log.push({ p, kind: 'play', card: a, got }); }
      return draw(s);
    }
    if (s.phase === 'pickPlay') {
      const got = take(s, p, s.pending, a);
      s.log[s.log.length - 1].got = got;
      s.pending = null; s.phase = 'play';
      return draw(s);
    }
    if (s.phase === 'pickDraw') {
      const got = take(s, p, s.pending, a);
      s.log[s.log.length - 1].got = got;
      s.pending = null;
      return endTurn(s);
    }
    if (s.phase === 'koi') {
      if (a === 'stop') return finish(s, p);
      s.koi[p]++;
      s.log.push({ p, kind: 'koi' });
      return next(s);
    }
    throw new Error('bad phase ' + s.phase);
  }

  function draw(s) {
    const p = s.turn;
    const c = s.deck.pop();
    s.drawn = c;
    const ms = matches(s.field, c);
    if (ms.length === 0) { s.field.push(c); s.log.push({ p, kind: 'draw', card: c, got: [] }); }
    else if (ms.length === 2) { s.phase = 'pickDraw'; s.pending = c; s.log.push({ p, kind: 'draw', card: c, got: null }); return s; }
    else { const got = take(s, p, c, ms[0]); s.log.push({ p, kind: 'draw', card: c, got }); }
    return endTurn(s);
  }

  function endTurn(s) {
    const p = s.turn;
    s.turns++;
    const y = yaku(s.caps[p], s.o);
    if (y.total > s.lastPts[p]) {
      s.phase = 'koi';
      s.yakuNow = y;
      if (!canKoi(s)) return finish(s, p);   // must stop
      return s;
    }
    return next(s);
  }

  function next(s) {
    s.phase = 'play';
    s.lastPts[s.turn] = Math.max(s.lastPts[s.turn], yaku(s.caps[s.turn], s.o).total);
    s.turn = 1 - s.turn;
    if (s.hands[0].length === 0 && s.hands[1].length === 0) {
      s.phase = 'over';
      if (s.o.noYaku === 'oyaken') s.result = { winner: s.oya, pts: 6, base: 6, mult: 1, yaku: [{ id: 'oyaken', pts: 6 }], draw: true };
      else s.result = { winner: -1, pts: 0, base: 0, mult: 1, yaku: [], draw: true };
    }
    return s;
  }

  function finish(s, p) {
    const y = yaku(s.caps[p], s.o);
    let mult = 1;
    const notes = [];
    if (s.o.over7 && y.total >= 7) { mult *= 2; notes.push('over7'); }
    if (s.o.koiBonus === 'opp2' && s.koi[1 - p] > 0) { mult *= 2; notes.push('koigaeshi'); }
    if (s.o.koiBonus === 'self' && s.koi[p] > 0) { mult *= (1 + s.koi[p]); notes.push('koi' + s.koi[p]); }
    s.phase = 'over';
    s.result = { winner: p, pts: y.total * mult, base: y.total, mult, yaku: y.list, notes };
    return s;
  }

  // next hand's oya
  function nextOya(s) {
    const r = s.result;
    if (s.o.nextOya === 'alternate') return 1 - s.oya;
    if (r.winner >= 0) return r.winner;
    return s.o.noYaku === 'oyaken' ? s.oya : 1 - s.oya;   // 任天堂: ノーゲームは親交代
  }

  // the oya draw before the first hand: each draws a card; earlier month (then higher card) is oya
  function cardRank(c) { const t = CARDS[c].type; return t === 'hikari' ? 4 : t === 'tane' ? 3 : t === 'tan' ? 2 : 1; }
  function oyaDraw(seed) {
    const r = rng(seed);
    for (;;) {
      const d = shuffle([...Array(48).keys()], r);
      const a = d[0], b = d[1];
      if (month(a) !== month(b)) return { cards: [a, b], oya: month(a) < month(b) ? 0 : 1 };
      if (cardRank(a) !== cardRank(b)) return { cards: [a, b], oya: cardRank(a) > cardRank(b) ? 0 : 1 };
    }
  }

  // yaku progress (for coach/AI): how many of each set are held
  function progress(caps, o) {
    const has = new Uint8Array(48); for (const c of caps) has[c] = 1;
    const cnt = t => caps.filter(c => CARDS[c].type === t).length;
    return {
      lights: cnt('hikari'), tane: cnt('tane'), tan: cnt('tan'), kasu: cnt('kasu') + ((o || DEFAULT_OPTS).sakeKasu && has[ID.sake] ? 1 : 0),
      isc: has[ID.boar] + has[ID.deer] + has[ID.butterfly], aka: has[1] + has[5] + has[9], ao: has[21] + has[33] + has[37],
      sake: has[ID.sake], moon: has[ID.moon], curtain: has[ID.curtain], rain: has[ID.rainman],
    };
  }

  const API = { CARDS, ID, DEF, month, DEFAULT_OPTS, PRESETS, opts, yaku, handYaku, deal, actions, apply, canKoi, nextOya, oyaDraw, clone, matches, progress, rng, shuffle, cardRank };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HF = API;
})(typeof self !== 'undefined' ? self : this);
