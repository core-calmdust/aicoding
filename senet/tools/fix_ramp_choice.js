// senet/tools/fix_ramp_choice.js — 追46（2026-11-24 担当C）：準備（ramp）の選ぶ問題に、答えの理由（why）と誤答それぞれの説明（ngo）をつける。
// 投げ棒の確率：「いちばん出やすい目は？」（c.most / c.mostNg）。残りのマス：合計（c.pips、少なすぎ・多すぎ）。tools/lesson-verify.js senet が数え直す。
'use strict';
const fs = require('fs'), path = require('path'), F = require('./senet_lessfacts.js'), WT = require('./learn_text_water.js');
const FILE = path.join(__dirname, '..', 'lessons.json'), D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
Object.assign(D.msg, WT.MSG);
const P = D.steps.find(s => s.id === 'prob').ramp.find(r => r.kind === 'choice');
P.why = ['c.most', {}]; P.ngo = P.opts.map((x, i) => i === P.ans ? null : ['c.mostNg', { x, m: F.W16[+x] }]);
const R = D.steps.find(s => s.id === 'race').ramp.find(r => r.kind === 'choice'), m = F.pipsOf(R.s.pos[0]);
R.why = ['c.pips', { m }]; R.ngo = R.opts.map((x, i) => i === R.ans ? null : [+x < m ? 'c.lowNg' : 'c.highNg', { x }]);
fs.writeFileSync(FILE, JSON.stringify(D));
console.log('prob', JSON.stringify(P.ngo), 'race', m, JSON.stringify(R.ngo));
