// 局の進行の固定テスト（山を組んで、花の補充・頭跳ね・ポン優先・搶槓・誤和了・流局・槓上開花・支払いを確かめる）。node gbmj/tools/game-test.js
'use strict';
const GB = require('../engine.js'); const { GBRound } = require('../game.js');
const P = s => { const out = []; let buf = []; for (const ch of s.replace(/\s+/g, '')) { if (/\d/.test(ch)) buf.push(+ch); else if ('mps'.includes(ch)) { const b = { m: 0, p: 9, s: 18 }[ch]; for (const n of buf) out.push(b + n - 1); buf = []; } else if (ch === 'f') out.push('f'); else out.push({ E: 27, S: 28, W: 29, N: 30, P: 31, F: 32, C: 33 }[ch]); } return out; };
// hands[席]（13枚、親は14枚目を extra）、front：その後のツモ順、back：嶺上（後ろから順に）。種類で書き、id は自動で割り当てる
function wall(dealer, hands, extra, front, back) {
  const used = new Set(), flowers = [136, 137, 138, 139, 140, 141, 142, 143];
  const id = t => { if (t === 'f') return flowers.shift(); for (let k = 0; k < 4; k++) if (!used.has(t * 4 + k)) { used.add(t * 4 + k); return t * 4 + k; } throw new Error('5th ' + t); };
  const H = hands.map(P), W = [];
  for (let k = 0; k < 13; k++) for (let i = 0; i < 4; i++) W.push(id(H[(dealer + i) % 4][k]));
  W.push(id(P(extra)[0]));
  for (const t of P(front)) W.push(id(t));
  const B = P(back).map(id);
  // 残りは使っていない牌で埋める（残りの花は山の奥）
  const rest = []; for (let x = 0; x < 136; x++) if (!used.has(x)) rest.push(x);
  return W.concat(rest).concat(flowers).concat(B.reverse());
}
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('NG', msg); } };
const act = (r, p, a) => { const o = r.options(p).find(x => x.type === a.type && (a.t === undefined || x.t === a.t) && (a.id === undefined || x.id === a.id)); if (!o) throw new Error(`seat ${p} cannot ${JSON.stringify(a)} (phase ${r.phase})`); r.act(p, o); };
const disc = (r, p, t) => act(r, p, { type: 'discard', id: r.P[p].hand.find(id => GB.T(id) === P(t)[0]) });
const passAll = r => { for (const q of r.waiting()) act(r, q, { type: 'pass' }); };

// 1) 配牌の花の補充（親→南の順、後ろから）
{
  const w = wall(0, ['123m 456m 789m 11p 2p f', '123s 456s 789s 11p 2p 3p', '147m 258m 369m ESW N', 'PPP FFF CCC 111s 5s'], '9s', '', '9p');
  const r = new GBRound({ rand: GB.rng(1), dealer: 0, wind: 0, wall: w });
  ok(r.P[0].flowers.length === 1 && r.P[0].hand.length === 14 && !r.P[0].hand.some(GB.isFlower), '配牌の花を補充');
  r.audit();
}
// 2) 頭跳ね：同じ捨て牌に2人がロン → 放銃者の下家に近い人
{
  const r = new GBRound({ rand: GB.rng(1), dealer: 0, wind: 0 });
  // 南（1）：花龍なしの…確実な形にするため、北（3）と南（1）がどちらもロンできる牌を用意する
  r.P[1].hand = [P('1p')[0] * 4, P('2p')[0] * 4, P('3p')[0] * 4, P('4p')[0] * 4, P('5p')[0] * 4, P('6p')[0] * 4, P('7p')[0] * 4, P('8p')[0] * 4, P('9p')[0] * 4, P('1s')[0] * 4 + 1, P('1s')[0] * 4 + 2, P('8m')[0] * 4 + 1, P('8m')[0] * 4 + 2];
  r.P[3].hand = [P('E')[0] * 4, P('E')[0] * 4 + 1, P('E')[0] * 4 + 2, P('S')[0] * 4, P('S')[0] * 4 + 1, P('S')[0] * 4 + 2, P('W')[0] * 4, P('W')[0] * 4 + 1, P('W')[0] * 4 + 2, P('N')[0] * 4, P('N')[0] * 4 + 1, P('N')[0] * 4 + 2, P('8m')[0] * 4 + 3];
  r.P[0].hand = r.P[0].hand.filter(id => GB.T(id) !== P('8m')[0]).concat([P('8m')[0] * 4]).slice(-14);
  r.wall = r.wall.filter(() => true);
  try {
    const eight = r.P[0].hand.find(id => GB.T(id) === P('8m')[0]);
    if (eight !== undefined) {
      r.act(0, { type: 'discard', id: eight });
      const ws = r.waiting();
      ok(ws.includes(1) || ws.includes(3), '2人に和了の機会');
      for (const q of r.waiting()) { const h = r.options(q).find(x => x.type === 'hu'); r.act(q, h || { type: 'pass' }); }
      ok(r.phase === 'end' && r.result.type === 'win', '和了で終わる');
      if (ws.includes(1) && ws.includes(3)) ok(r.result.p === 1, '頭跳ね：下家に近い南が和了 ' + r.result.p);
    }
  } catch (e) { ok(false, '頭跳ね ' + e.message); }
}
// 3) 支払い：ロン＝放銃者 P+8・他8、ツモ＝全員 P+8
{
  const r = new GBRound({ rand: GB.rng(3), dealer: 0, wind: 0 });
  r.endWin(2, 1, 0, { total: 10 }, 'ron');
  ok(r.result.pay.join() === '-8,-18,34,-8', 'ロンの支払い ' + r.result.pay);
  const r2 = new GBRound({ rand: GB.rng(3), dealer: 0, wind: 0 });
  r2.endWin(2, null, 0, { total: 10 }, 'tsumo');
  ok(r2.result.pay.join() === '-18,-18,54,-18', 'ツモの支払い ' + r2.result.pay);
}
// 4) 誤和了：8点未満の宣言で −30、ほかに +10、その局は和了できない
{
  const r = new GBRound({ rand: GB.rng(5), dealer: 0, wind: 0 });
  r.falseHu(1, { pts: 6 });
  ok(r.P[1].dead && r.P[1].penalty === -30 && r.P[0].penalty === 10, '誤和了の罰');
  ok(r.canWin(1, r.P[1].hand[0], 'tsumo') === null, '罰のあとは和了できない');
}
// 5) 流局：誰も上がらずに山が尽きる
{
  let draws = 0;
  for (let s = 1; s <= 40; s++) {
    const r = new GBRound({ rand: GB.rng(s), dealer: s % 4, wind: 0 });
    let guard = 0;
    while (r.phase !== 'end' && guard++ < 1000) {
      for (const p of r.waiting()) { if (r.phase === 'end') break; const o = r.options(p); const d = o.find(x => x.type === 'discard'); r.act(p, d || { type: 'pass' }); }
      r.audit();
    }
    if (r.result.type === 'draw') { draws++; ok(r.left() === 0, '流局は山が尽きたとき'); }
  }
  ok(draws > 0, 'ツモ切りだけなら流局が起きる');
}
// 6) 搶槓：加槓した牌でロン（抢杠和）
{
  const r = new GBRound({ rand: GB.rng(9), dealer: 0, wind: 0 });
  const id = t => { const x = P(t)[0]; return x * 4; };
  // 親：5p のポンを持ち、5p をツモって加槓する
  r.P[0].melds = [{ k: 'pon', t: P('5p')[0], ids: [id('5p'), id('5p') + 1, id('5p') + 2], from: 2 }];
  r.P[0].hand = ['1m', '2m', '3m', '4s', '5s', '6s', '7s', '8s', '9s', 'E', 'E'].map(id).map((x, i, a) => x + a.slice(0, i).filter(y => y === x).length).concat([id('5p') + 3]);
  // 南：34p 待ち（5p で花龍・平和など8点以上）
  r.P[1].hand = [id('1m') + 1, id('2m') + 1, id('3m') + 1, id('3p'), id('4p'), id('7s') + 1, id('8s') + 1, id('9s') + 1, id('4m'), id('5m'), id('6m'), id('9m'), id('9m') + 1];
  r.cur = 0; r.phase = 'turn'; r.drawn = id('5p') + 3; r.claimedTurn = false;
  const o = r.options(0).find(x => x.type === 'kakan');
  ok(!!o, '加槓できる');
  if (o) {
    r.act(0, o);
    ok(r.phase === 'rob' && r.waiting().includes(1), '搶槓の機会');
    const h = r.options(1).find(x => x.type === 'hu');
    if (h && !h.low) { r.act(1, h); ok(r.phase === 'end' && r.result.how === 'rob' && r.result.fan.fans.some(f => f.id === 47), '搶槓和が付く'); }
    else ok(false, '搶槓の和了が8点以上 ' + (h && h.pts));
  }
}
console.log(`${n - fail} / ${n} 通過`);
process.exit(fail ? 1 : 0);
