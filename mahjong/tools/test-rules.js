// 雀華：ルールの自動テスト（ユーザー 2026-11-18「ルールの自動テストもお願いします」）
//   node mahjong/tools/test-rules.js        → 全部通れば "ok"、失敗があれば件数を出して exit 1
// 点数計算（engine.js）、局の精算・終局判定・途中流局・流し満貫・パオ（game.js）、BOT同士の対局で点数が消えないこと。
'use strict';
const MJ = require('../engine.js');
const MJGame = require('../game.js');
const { Bot } = require('../ai.js');

let fail = 0, n = 0;
const eq = (a, b, msg) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, '\n   got ', JSON.stringify(a), '\n   want', JSON.stringify(b)); } };
const T = id => id >> 2;

// ---------------------------------------------------------------- 点数計算
// closed: 和了牌を除いた手牌、win: 和了牌。seatWind 28（南家）・roundWind 27（東場）、ドラなし（表示牌は 9z 相当にしない：doraInd []）
function ev(closed, win, opt = {}) {
  const c = MJ.parse(closed), w = MJ.parse(win)[0]; c.push(w);
  return MJ.evaluate(Object.assign({ closed: c, melds: [], win: w, tsumo: false, seatWind: 28, roundWind: 27, dealer: false, doraInd: [], uraInd: [], aka: 0 }, opt));
}
const pts = (r, dealer, tsumo) => MJ.payments(r.base, dealer, tsumo);
const has = (r, k) => r.list.some(x => x[0] === k);
let r;
r = ev('234m456p678s23s55p', '4s'); eq([r.han, r.fu, pts(r, false, false).ron], [2, 30, 2000], '平和・断幺九 ロン 2翻30符 2000');
r = ev('234m456p678s23s55p', '4s', { tsumo: true }); eq([r.han, r.fu, pts(r, false, true)], [3, 20, { dealer: 1300, other: 700 }], '平和ツモ・断幺九 3翻20符 700/1300');
r = ev('234m456p678s23s55p', '4s', { dealer: true }); eq(pts(r, true, false).ron, 2900, '親 2翻30符 2900');
r = ev('113355m2277p88s6z', '6z'); eq([r.han, r.fu, pts(r, false, false).ron], [2, 25, 1600], '七対子 25符2翻 1600');
r = ev('99m19p19s1234567z', '1m'); eq([r.yakumanN, pts(r, false, false).ron], [1, 32000], '国士無双（単騎） 32000');
r = ev('19m19p19s1234567z', '1z'); eq(r.yakumanN, 2, '国士無双十三面 ダブル役満');
r = ev('1112345678999m', '5m'); eq(r.yakumanN, 2, '純正九蓮宝燈 ダブル役満');
r = ev('555666777z111m2p', '2p'); eq(has(r, 'daisangen') || has(r, 'tsuuiisou') || r.yakumanN >= 1, true, '大三元を含む役満');
r = ev('234m456p678s23s55p', '4s', { riichi: true, ippatsu: true, tsumo: true, doraInd: [MJ.parse('4p')[0]] });   // ドラ 5p ×3
eq([r.han, r.limit, pts(r, false, true)], [8, 'baiman', { dealer: 8000, other: 4000 }], '立直一発ツモ平和断幺ドラ3 = 8翻 倍満 4000/8000');
r = ev('234m456p678s23s55p', '4s', { riichi: true, tsumo: true, doraInd: [MJ.parse('4p')[0]] });
eq([r.han, r.limit, pts(r, true, true)], [7, 'haneman', { all: 6000 }], '親 7翻 跳満 6000オール');
r = ev('123m456p789s11z12m', '3m', { riichi: true }); eq(has(r, 'riichi') && !has(r, 'pinfu'), true, '役牌の雀頭は平和にならない');
r = ev('111222333m55p78s', '9s'); eq(has(r, 'sanankou'), true, '三暗刻');
eq(MJ.payments(MJ.limitBase(3, 30), false, false).ron, 3900, '子 3翻30符 3900');
eq(MJ.payments(MJ.limitBase(4, 30), true, true).all, 3900, '親ツモ 4翻30符 3900オール');
eq(MJ.payments(MJ.limitBase(4, 40), false, false).ron, 8000, '子 4翻40符 満貫 8000');
eq(MJ.payments(MJ.limitBase(1, 30), false, true), { dealer: 500, other: 300 }, '子ツモ 1翻30符 300/500');

// ---------------------------------------------------------------- 局の精算（game.js）
const ids = s => { const used = {}; return MJ.parse(s).map(t => { const k = used[t] = (used[t] || 0); used[t]++; return t * 4 + k; }); };
function game(o = {}) {
  const g = new MJGame({ agents: [0, 1, 2, 3].map(() => new Bot(2)), chars: [null, null, null, null], seed: 1, oya: 0, rules: Object.assign({ skills: false }, o.rules) });
  g.dead = ids('9999m9999p9999s99z'.slice(0)).concat([0, 0, 0, 0]).slice(0, 14);   // 嶺上・ドラ表示牌（9m → ドラ 1m、9p → 1p ほか、手牌と重ならない）
  g.doraIdx = [4]; g.livePos = 0; g.liveEnd = 0; g.kans = 0; g.kanSeats = new Set(); g.firstGo = false;
  g.P = [0, 1, 2, 3].map(s => ({ seat: s, hand: [], melds: [], river: [], riichi: false, dblRiichi: false, ippatsu: false, riichiTurn: -1, furitenTemp: false, furitenRiichi: false, discards: new Set(), skUsed: [false, false], fx: {}, firstTurn: false }));
  return g;
}
const TENPAI = '123m456m789m123p5p', NOTEN = '147m258p369s1234z';
const river = (s, taken) => MJ.parse(s).map((t, i) => ({ id: t * 4 + 3, tsumogiri: false, riichi: false, taken: !!(taken && taken.includes(i)), turn: i }));
(async () => {
  // 流局のノーテン罰符
  for (const [tp, want] of [[[1, 0, 0, 0], [3000, -1000, -1000, -1000]], [[1, 1, 0, 0], [1500, 1500, -1500, -1500]], [[1, 1, 1, 0], [1000, 1000, 1000, -3000]], [[0, 0, 0, 0], [0, 0, 0, 0]], [[1, 1, 1, 1], [0, 0, 0, 0]]]) {
    const g = game(); g.P.forEach((p, s) => { p.hand = ids(tp[s] ? TENPAI : NOTEN); p.river = river('5m'); });
    let got; g.ui = async (e, d) => { if (e === 'ryuukyoku') got = d; };
    await g.exhaustive(); eq(got.delta, want, `ノーテン罰符 テンパイ${tp.join('')}`); eq(g.lastResult.renchan, !!tp[0], '親テンパイで連荘');
  }
  // 流し満貫（子）：罰符の代わりに満貫ツモ相当、鳴かれた捨て牌があれば不成立
  { const g = game(); g.P.forEach((p, s) => { p.hand = ids(s === 0 ? TENPAI : NOTEN); p.river = river(s === 2 ? '19m1z9p7z' : '5m5p'); });
    let got; g.ui = async (e, d) => { if (e === 'ryuukyoku') got = d; };
    await g.exhaustive(); eq([got.delta, got.nagashi], [[-4000, -2000, 8000, -2000], [2]], '流し満貫（子） 2000/4000、罰符なし'); eq(g.lastResult.renchan, true, '流し満貫でも親テンパイなら連荘'); }
  { const g = game(); g.P.forEach((p, s) => { p.hand = ids(NOTEN); p.river = river(s === 0 ? '19m1z' : '5m'); });
    let got; g.ui = async (e, d) => { if (e === 'ryuukyoku') got = d; };
    await g.exhaustive(); eq(got.delta, [12000, -4000, -4000, -4000], '流し満貫（親） 4000オール'); }
  { const g = game(); g.P.forEach((p, s) => { p.hand = ids(s === 1 ? TENPAI : NOTEN); p.river = river(s === 2 ? '19m1z' : '5m', s === 2 ? [1] : null); });
    let got; g.ui = async (e, d) => { if (e === 'ryuukyoku') got = d; };
    await g.exhaustive(); eq([got.nagashi, got.delta], [null, [-1000, 3000, -1000, -1000]], '捨て牌を鳴かれたら流し満貫にならない'); }

  // パオ（大三元）：3つ目の三元牌をポンさせた人の責任払い
  const daisangen = (g, w) => {
    const p = g.P[w];
    p.melds = [31, 32, 33].map(t => ({ type: 'pon', t, tiles: [t * 4, t * 4 + 1, t * 4 + 2], called: t * 4 + 2, from: 2 }));
    p.hand = ids('123m4m'); p.pao = { seat: 2, yaku: 'daisangen' };
  };
  { const g = game(); daisangen(g, 1); g.P[1].hand.push(ids('44m')[1]);
    let got; g.ui = async (e, d) => { if (e === 'agari') got = d; };
    await g.agari([1], null, true, {}); eq([got.delta, got.results[0].res.pao], [[0, 32000, -32000, 0], 2], 'パオ ツモ：全額を責任者が払う'); }
  { const g = game(); daisangen(g, 1);
    let got; g.ui = async (e, d) => { if (e === 'agari') got = d; };
    await g.agari([1], 3, false, { ronId: ids('44m')[1] }); eq(got.delta, [0, 32000, -16000, -16000], 'パオ 他家からロン：放銃者と折半'); }
  { const g = game(); daisangen(g, 1);
    let got; g.ui = async (e, d) => { if (e === 'agari') got = d; };
    await g.agari([1], 2, false, { ronId: ids('44m')[1] }); eq(got.delta, [0, 32000, -32000, 0], 'パオの責任者が放銃：通常どおり全額'); }
  { const g = game(); daisangen(g, 1); g.honba = 2; g.P[1].hand.push(ids('44m')[1]);
    let got; g.ui = async (e, d) => { if (e === 'agari') got = d; };
    await g.agari([1], null, true, {}); eq(got.delta, [0, 32600, -32600, 0], 'パオ ツモ：積み棒も責任者'); }
  // パオが付く条件（ポンで3つ目の三元牌・4つ目の風牌）
  { const g = game(); g.agents = [0, 1, 2, 3].map(() => ({ react: async (gg, s, o) => (s === 1 && o.pons ? { act: 'pon' } : { act: 'pass' }), interactive: false }));
    g.P[1].melds = [31, 32].map(t => ({ type: 'pon', t, tiles: [t * 4, t * 4 + 1, t * 4 + 2], from: 3 })); g.P[1].hand = ids('77z123m456p9s'); g.liveEnd = 50;
    g.P[0].hand = ids('7z' + '123456789m1234p').slice(0, 14); g.P[0].river = [];
    const id = g.P[0].hand[0]; g.P[0].hand.splice(0, 1); g.P[0].river.push({ id, taken: false });
    await g.callPhase(0, id); eq(g.P[1].pao, { seat: 0, yaku: 'daisangen' }, '3つ目の三元牌をポン → パオ'); }

  // 途中流局
  { const g = game(); g.firstGo = true; g.P.forEach(p => { p.river = river('1z'); }); eq(g.midAbort(), 'suufon', '四風連打'); }
  { const g = game(); g.firstGo = true; g.P.forEach((p, s) => { p.river = river(s === 3 ? '2z' : '1z'); }); eq(g.midAbort(), null, '風がそろわなければ続行'); }
  { const g = game(); g.firstGo = true; g.P.forEach(p => { p.river = river('5m'); }); eq(g.midAbort(), null, '字牌でなければ四風連打にならない'); }
  { const g = game(); g.firstGo = false; g.P.forEach(p => { p.river = river('1z'); }); eq(g.midAbort(), null, '鳴きが入った後は四風連打にならない'); }
  { const g = game(); g.P.forEach(p => { p.riichi = true; p.river = river('5m5p'); }); eq(g.midAbort(), 'suucha', '四家立直'); }
  { const g = game(); g.P.forEach((p, s) => { p.riichi = s < 3; p.river = river('5m5p'); }); eq(g.midAbort(), null, '3人立直は続行'); }

  // ---------------------------------------------------------------- 終局判定
  const end = (o) => { const g = game({ rules: o.rules }); Object.assign(g, { oya0: o.oya0 ?? 0, round: o.round ?? 1, kyoku: o.kyoku ?? 3, over: false, lastResult: o.res, scores: o.scores }); g.checkEnd(); return g.over; };
  for (let oya0 = 0; oya0 < 4; oya0++) {
    const d = (oya0 + 3) % 4, top = [24000, 24000, 24000, 24000], low = [33000, 33000, 33000, 33000]; top[d] = 28000 + 3200; low[d] = 1000;
    eq(end({ oya0, res: { renchan: true }, scores: top }), true, `オーラス親トップ(3万点以上)でアガリ止め 起家${oya0}`);
    eq(end({ oya0, res: { renchan: true }, scores: low }), false, `オーラス親がトップでなければ続行 起家${oya0}`);
  }
  eq(end({ res: { renchan: true }, scores: [26000, 24000, 24000, 26000] }), false, '親トップでも3万点未満なら続行');
  eq(end({ res: { renchan: false }, scores: [31000, 23000, 23000, 23000] }), true, 'オーラス子のアガリで3万点以上がいれば終局');
  eq(end({ res: { renchan: false }, scores: [26000, 25000, 25000, 24000] }), false, '誰も3万点未満なら西入');
  eq(end({ round: 2, kyoku: 0, res: { renchan: false }, scores: [31000, 23000, 23000, 23000] }), true, '西入後は3万点を超えた時点で終局');
  eq(end({ round: 2, kyoku: 3, res: { renchan: false }, scores: [26000, 25000, 25000, 24000] }), true, '西4局で必ず終局');
  eq(end({ round: 0, kyoku: 1, res: { renchan: false }, scores: [-100, 40100, 30000, 30000] }), true, '箱下（トビ）で終局');
  eq(end({ round: 0, kyoku: 3, res: { renchan: true }, scores: [31000, 23000, 23000, 23000], rules: { length: 'east' } }), false, '東風戦：オーラス親が非トップなら続行');
  eq(end({ round: 0, kyoku: 1, res: { renchan: false }, scores: [40000, 20000, 20000, 20000] }), false, '途中の局は続行');

  // ---------------------------------------------------------------- BOT同士の対局：点数が消えない・例外が出ない
  let leak = 0, errs = 0, aborts = {};
  for (let i = 0; i < 12; i++) {
    const g = new MJGame({ agents: [3, 3, 2, 1].map(l => new Bot(l)), chars: [null, null, null, null], seed: 500 + i, oya: i % 4, rules: { skills: false, length: i % 2 ? 'east' : 'south' },
      ui: async (e, d) => { if (e === 'ryuukyoku' && d.abort) aborts[d.abort] = (aborts[d.abort] || 0) + 1; if ((e === 'agari' || e === 'ryuukyoku') && d.scores.reduce((a, b) => a + b, 0) + g.kyotaku !== 100000) leak++; } });
    try { await g.run(); if (g.scores.reduce((a, b) => a + b, 0) + g.kyotaku !== 100000) leak++; } catch (e) { errs++; console.log(e.stack); }
  }
  eq([leak, errs], [0, 0], 'BOT対局12回：点数の合計が10万点のまま・例外なし');

  console.log(fail ? `${fail}/${n} FAILED` : `ok (${n} checks)`);
  process.exit(fail ? 1 : 0);
})();
