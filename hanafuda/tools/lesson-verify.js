// node hanafuda/tools/lesson-verify.js : checks every lesson problem against the engine / AI
//  tap & pick problems: the answer is the unique best (same month / most cards / most points), every option is legal
//  koi problems: AI Lv.20 (several seeds) prefers the answer by at least 1 point
const HF = require('../engine.js'), AI = require('../ai.js');
global.window = { HFApp: { LANG: () => 'ja', esc: s => s, t: s => s, openOv() {}, closeOv() {}, sfx() {} }, HF, HFCards: { face: () => '' } };
global.document = { addEventListener() {}, getElementById() { return null; } };
global.localStorage = { getItem() { return null; }, setItem() {} };
require('../lessons.js');
const P = window.HFLessons.PROBLEMS;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } };
for (const it of P) {
  const R = Object.fromEntries(it.rows);
  if (it.kind === 'month') {
    const same = R.field.filter(c => HF.month(c) === HF.month(R.hand[0]));
    ok(same.length === 1 && same[0] === it.ans, it.id + ' unique same month');
  } else if (it.kind === 'most' || it.kind === 'points') {
    const caps = R.caps || [];
    const val = h => { const ms = R.field.filter(c => HF.month(c) === HF.month(h)); const got = ms.length === 3 ? ms : ms.length ? [ms[0]] : [];
      return it.kind === 'most' ? got.length : (ms.length === 2 ? -99 : HF.yaku(caps.concat(h, got), HF.opts({})).total); };
    const vs = R.hand.map(h => [h, val(h)]).sort((a, b) => b[1] - a[1]);
    ok(vs[0][0] === it.ans && vs[0][1] > vs[1][1], it.id + ' unique best ' + JSON.stringify(vs));
  } else if (it.kind === 'pick') {
    const caps = R.caps || [];
    const opts = R.field.filter(c => HF.month(c) === HF.month(it.played));
    ok(opts.length === 2, it.id + ' two matches');
    const vs = opts.map(f => [f, HF.yaku(caps.concat(it.played, f), HF.opts({})).total * 10 + (HF.CARDS[f].type === 'tane' ? 1 : 0)]).sort((a, b) => b[1] - a[1]);
    ok(vs[0][0] === it.ans && vs[0][1] > vs[1][1], it.id + ' unique pick ' + JSON.stringify(vs));
  } else if (it.kind === 'koi') {
    const s = window.HFLessons.koiState(it);
    ok(HF.yaku(s.caps[0], s.o).total > 0 && HF.canKoi(s), it.id + ' a real koi decision');
    const tot = { stop: 0, koi: 0 }, N = 8;
    for (let k = 0; k < N; k++) { const r = AI.choose(s, 20, 1000 + k * 77); r.scores.forEach(x => { tot[x.a] += x.v / N; }); }
    const other = it.ans === 'stop' ? 'koi' : 'stop';
    console.log(' ', it.id, 'stop', tot.stop.toFixed(2), 'koi', tot.koi.toFixed(2));
    ok(tot[it.ans] - tot[other] >= 1, it.id + ' answer better by >= 1 point');
  }
  console.log(it.id, 'checked');
}
// overlap: no two problems with the same rows
const keys = P.map(p => JSON.stringify(p.rows));
ok(new Set(keys).size === keys.length, 'no duplicate positions');
console.log(fail ? 'FAILED ' + fail : 'all ok');
process.exit(fail ? 1 : 0);
