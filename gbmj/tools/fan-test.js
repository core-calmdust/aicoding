// 番種判定の固定テスト（2006年版の付録の例・正誤表・FAQ #22 の例と、照合で裁定した形）。node gbmj/tools/fan-test.js
'use strict';
const G = require('../fan.js');
const P = s => { const out = []; let buf = []; for (const ch of s.replace(/\s+/g, '')) { if (/\d/.test(ch)) buf.push(+ch); else if ('mps'.includes(ch)) { const b = { m: 0, p: 9, s: 18 }[ch]; for (const n of buf) out.push(b + n - 1); buf = []; } else out.push({ E: 27, S: 28, W: 29, N: 30, P: 31, F: 32, C: 33 }[ch]); } return out; };
const M = (k, s) => ({ k, t: P(s)[0] });
let fail = 0, n = 0;
function T(name, o, expect, pts) {
  n++;
  const r = G.calc(Object.assign({ melds: [], tsumo: false, flowers: 0, seat: 0, round: 0 }, o, { hand: P(o.hand), win: P(o.win)[0] }));
  const got = r.ok ? r.fans.map(f => G.FANS[f.id][2] + (f.n > 1 ? 'x' + f.n : '')).sort().join(' ') : 'NG:' + r.err;
  const want = expect.split(' ').sort().join(' ');
  const okPts = pts === undefined || (r.ok && r.pts === pts);
  if (got !== want || !okPts) { fail++; console.log('NG', name, '\n  got :', got, r.pts, '\n  want:', want, pts); }
}
// 套算一次（FAQ #22）：花龍＋余りの順子は1回だけ
T('花龍の余り', { hand: '123s 456m 789p 789m E', win: 'E' }, '花龙 门前清 喜相逢 单钓将');
// FAQ #22：234C 567C 234D 567D は2点の組を3つまで
T('2組×2', { hand: '234m 567m 234p 567p 8m', win: '8m' }, '平和 断幺 缺一门 门前清 喜相逢 喜相逢 连六'.replace('喜相逢 喜相逢', '喜相逢x2'));
// 三色三節高＋双同刻（4つ目の刻子は使用済みの1つとだけ）
T('三色三節高＋双同刻', { melds: [M('pon', '222m')], hand: '333p 444s 222p 5s', win: '5s' }, '三暗刻 三色三节高 碰碰和 双同刻 断幺');
// 清么九＋双同刻×2（2006年版 Fan 8 の例）
T('清么九 双同刻x2', { hand: '111m 999m 111p 999p 1s', win: '1s' }, '清幺九 四暗刻 双同刻x2 单钓将');
// 九蓮宝灯：么九刻なし、ツモは不求人（2006 Fan 4）
T('九蓮 ロン5', { hand: '1112345678999m', win: '5m' }, '九莲宝灯 双暗刻');
T('九蓮 ツモ1', { hand: '1112345678999m', win: '1m', tsumo: true }, '九莲宝灯 清龙 四归一 不求人');
// 緑一色＋混一色（2006 Fan 3 の例2）
T('緑一色 混一色', { hand: '22334466888s FF', win: 'F' }, '绿一色 混一色 箭刻 门前清 一般高');
// 槓（Sloper の8例：PyMahjongGB と同じ扱い、明暗槓6点・双暗槓8点）
T('明槓＋暗槓', { melds: [M('kan', '1111m'), M('ankan', '5555p')], hand: '222s 678p 3s', win: '3s' }, '双明杠 双暗刻 幺九刻 无字', 6 + 2 + 1 + 1);
T('双暗槓', { melds: [M('ankan', '1111m'), M('ankan', '5555p')], hand: '678s 222s 3s', win: '3s' }, '三暗刻 双暗杠 门前清 幺九刻 无字', 16 + 8 + 2 + 1 + 1);
T('四暗槓', { melds: [M('ankan', '1111m'), M('ankan', '5555p'), M('ankan', '2222s'), M('ankan', '9999s')], hand: '3s', win: '3s' }, '四杠 四暗刻 幺九刻x2 无字', 155);
T('明槓4つ', { melds: [M('kan', '1111m'), M('kan', '5555p'), M('kan', '2222s'), M('kan', '9999s')], hand: '3s', win: '3s' }, '四杠 全求人 幺九刻x2 无字');
// 風：圏風・門風の刻子に么九刻を付けない、三風刻は風の么九刻を含む
T('三風刻', { melds: [M('pon', 'EEE'), M('pon', 'SSS')], hand: 'WWW 123m 5p', win: '5p', seat: 2, round: 1 }, '三风刻 圈风刻 门风刻 缺一门 单钓将');
// 和絶張：自分の立牌に同じ牌があると付かない／自分のポンの牌なら自動
T('和絶張なし', { melds: [M('pon', 'EEE')], hand: '55m 88p 123s 234s', win: '8p', tsumo: true, last: true, seat: 3, round: 3 }, '幺九刻 自摸');
// 七対・十三么・全不靠・組合龍
T('七対ツモ', { hand: '1199m 22p 3388s EE C', win: 'C', tsumo: true }, '七对 五门齐 不求人');
T('十三么', { hand: '19m19p19s ESWNPF C', win: 'C' }, '十三幺');
T('全不靠＋組合龍', { hand: '147m 258s 369p ESWP', win: 'F' }, '全不靠 组合龙');
T('組合龍＋平和', { melds: [M('chi', '123p')], hand: '147m 258s 369p 5m', win: '5m' }, '组合龙 平和 单钓将');
// 天津2006の追加裁定（オプション、既定オフ）
T('七対＋緑一色（本文）', { hand: '22224466888s FF', win: '8s' }, '绿一色 七对 混一色 四归一x2');
T('七対＋緑一色（天津）', { hand: '22224466888s FF', win: '8s', tianjin: true }, '绿一色 七对 混一色');
T('七対＋清么九（天津）', { hand: '1111m 99m 11p 99p 11s 9s', win: '9s', tianjin: true }, '清幺九 七对');
T('組合龍＋辺張（本文）', { hand: '147m 258p 369s 12m EE', win: '3m' }, '组合龙 门前清 边张');
T('組合龍＋辺張（天津）', { hand: '147m 258p 369s 12m EE', win: '3m', tianjin: true }, '组合龙 门前清');
// 8点未満も計算は返す（和了できるかはゲーム側で8点以上を見る）
T('鳴いた安手', { melds: [M('chi', '234m'), M('chi', '678p')], hand: '345s 66s EE', win: '6s', seat: 1, round: 2 }, '无番和', 8);
console.log(`${n - fail} / ${n} 通過`);
process.exit(fail ? 1 : 0);
