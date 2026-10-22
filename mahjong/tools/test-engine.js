const MJ = require('../engine.js');
let fail = 0;
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, a, '!=', b); } }
const sh = s => { const t = MJ.parse(s); return MJ.shanten(MJ.counts(t), 0); };
eq(sh('123m456p789s11122z'), -1, 'agari');
eq(sh('123m456p789s1122z'), 0, 'tenpai');
eq(sh('19m19p19s1234567z'), 0, 'kokushi tenpai');
eq(sh('1133557799m11p2z'), 0, 'chiitoi tenpai');
eq(sh('147m258p369s1234z'), 6, 'worst-ish');
const W = s => MJ.waits(MJ.counts(MJ.parse(s)), 0).map(t => MJ.NAMES[t]).join(' ');
eq(W('1112345678999m'), '1m 2m 3m 4m 5m 6m 7m 8m 9m', 'chuuren waits');
eq(W('23m456p789s11122z'), '1m 4m', 'ryanmen');
function ev(closed, win, opt = {}) {
  const c = MJ.parse(closed); const w = MJ.parse(win)[0]; c.push(w);
  return MJ.evaluate(Object.assign({ closed: c, melds: [], win: w, tsumo: false, seatWind: 28, roundWind: 27, doraInd: [], aka: 0 }, opt));
}
let r = ev('234m456p678s2378s', '9s', {}); // invalid? 
r = ev('234m456p678s23s55p', '4s'); eq([r.han, r.fu], [2, 30], 'pinfu tanyao ron'); 
r = ev('234m456p678s23s55p', '4s', { tsumo: true }); eq([r.han, r.fu], [3, 20], 'pinfu tanyao tsumo');
r = ev('123m456p789s11z12m', '3m', { riichi: true }); console.log(r.list, r.fu);
r = ev('111222333m55p78s', '9s'); console.log('sanankou-ish', r.list, r.fu, r.han);
r = ev('19m19p19s1234567z', '1z'); eq(r.yakumanN, 2, 'kokushi 13 wait');
r = ev('1112345678999m', '5m'); eq(r.yakumanN, 2, 'junsei chuuren');
r = ev('555666777z111m2p', '2p'); console.log(r.list);
r = ev('234m234m55p678s99s', '9s', {riichi:true}); console.log('iipeikou shanpon', r.list, r.fu);
r = ev('1122334455667z', '7z'); console.log(r && r.list);
console.log(MJ.payments(MJ.limitBase(3, 30), false, false), MJ.payments(MJ.limitBase(4, 30), true, true), MJ.payments(MJ.limitBase(1,30),false,true));
// perf
let t0 = Date.now(); for (let i = 0; i < 2000; i++) MJ.shanten(MJ.counts(MJ.parse('147m258p369s12345z')), 0); console.log('shanten x2000', Date.now() - t0, 'ms');
console.log(fail ? fail + ' failures' : 'ok');
