// ur/tools/fix_ramp_choice.js — 追47（2026-11-24 担当C）：準備（ramp）の選ぶ問題に、答えの理由（why）と誤答それぞれの説明（ngo）をつける。
// 出目の確率：「いちばん出やすい出目は？」（c.most / c.mostNg）。残り歩数：合計（c.pips、少なすぎ・多すぎ）。tools/lesson-verify.js ur が数え直す。
'use strict';
const fs = require('fs'), path = require('path'), E = require('../engine.js');
const W = [1, 4, 6, 4, 1], MSG = {};
MSG['c.most'] = { ja: '2 は16通り中6通りで、いちばん出やすい出目です（1と3は4通り、0と4は1通り）。', en: 'A 2 comes up 6 ways in 16, the most of any roll (1 and 3: 4 ways; 0 and 4: 1 way).', zh: '2 在16种里有6种，最常出现（1和3各4种，0和4各1种）。', ko: '2는 16가지 중 6가지로 가장 잘 나와요(1과 3은 4가지, 0과 4는 1가지).', es: 'El 2 sale de 6 formas de 16, más que ninguna (1 y 3: 4; 0 y 4: 1).', fr: 'Le 2 sort de 6 façons sur 16, le plus souvent (1 et 3 : 4 ; 0 et 4 : 1).', pt: 'O 2 sai de 6 formas em 16, mais que qualquer outro (1 e 3: 4; 0 e 4: 1).', de: 'Die 2 kommt auf 6 von 16 Arten, am häufigsten (1 und 3: 4; 0 und 4: 1).', hi: '2 सोलह में से 6 तरह आता है, सबसे ज़्यादा (1 और 3: 4; 0 और 4: 1)।', ar: 'الرمية 2 تأتي بـ6 طرق من 16، أكثر من غيرها (1 و3: 4؛ 0 و4: 1).', ru: 'Двойка выпадает 6 способами из 16 — чаще всех (1 и 3: по 4; 0 и 4: по 1).', 'zh-TW': '2 在16種裡有6種，最常出現（1和3各4種，0和4各1種）。', id: 'Angka 2 muncul 6 cara dari 16, paling sering (1 dan 3: 4; 0 dan 4: 1).', tr: '2, 16 yolun 6\'sında gelir, en sık atış budur (1 ve 3: 4; 0 ve 4: 1).' };
MSG['c.mostNg'] = { ja: '{x} が出るのは16通り中 {m}通りで、2 の6通りより少ないです。', en: '{x} comes up only {m} ways in 16, fewer than the 6 of a 2.', zh: '{x} 在16种里只有 {m} 种，比2的6种少。', ko: '{x}는 16가지 중 {m}가지로, 2의 6가지보다 적어요.', es: 'El {x} sale de {m} formas de 16, menos que las 6 del 2.', fr: 'Le {x} ne sort que de {m} façons sur 16, moins que les 6 du 2.', pt: 'O {x} sai de {m} formas em 16, menos que as 6 do 2.', de: 'Die {x} kommt nur auf {m} von 16 Arten, weniger als die 6 der 2.', hi: '{x} सोलह में से केवल {m} तरह आता है, 2 के 6 से कम।', ar: 'الرمية {x} تأتي بـ{m} طرق فقط من 16، أقل من 6 للرمية 2.', ru: '{x} выпадает лишь {m} способами из 16 — меньше, чем 6 у двойки.', 'zh-TW': '{x} 在16種裡只有 {m} 種，比2的6種少。', id: 'Angka {x} hanya muncul {m} cara dari 16, lebih sedikit dari 6 untuk angka 2.', tr: '{x}, 16 yolun yalnızca {m}\'inde gelir; 2\'nin 6\'sından az.' };
// 準備の選ぶ問題に why・ngo をつける（gen_lessons_lut.js からも使う）
function most(P) { P.why = ['c.most', {}]; P.ngo = P.opts.map((x, i) => i === P.ans ? null : ['c.mostNg', { x, m: W[+x] }]); return P; }
function pips(R) { const m = E.raceCount(Object.assign({ winner: -1, turn: 0 }, R.s)).pips[0]; R.why = ['c.pips', { m }]; R.ngo = R.opts.map((x, i) => i === R.ans ? null : [+x < m ? 'c.lowNg' : 'c.highNg', { x }]); return R; }
module.exports = { MSG, most, pips };
if (require.main === module) {
const FILE = path.join(__dirname, '..', 'lessons.json'), D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
Object.assign(D.msg, MSG);
const P = D.steps.find(s => s.id === 'prob').ramp.find(r => r.kind === 'choice');
most(P);
const R = D.steps.find(s => s.id === 'race').ramp.find(r => r.kind === 'choice'); pips(R);
fs.writeFileSync(FILE, JSON.stringify(D));
console.log('prob', JSON.stringify(P.ngo), 'race', JSON.stringify(R.why), JSON.stringify(R.ngo));
}
