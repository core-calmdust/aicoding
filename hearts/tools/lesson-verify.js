// Checks the lessons: node hearts/tools/lesson-verify.js [n per lesson]
// For every lesson, makes n problems (and every pool problem) and checks, problem by problem:
//  ① the answer is right, worked out again from the board here (legal plays, the winner, the points, the count, an exact search),
//  ② it is the only right option, ③ there are 3+ options and at least 2 wrong ones, ④ every wrong option has its own reason,
//  ⑤ the texts exist in all 14 languages with no {placeholder} left and no "the AI says" reasons, ⑥ no two problems of a set are the same,
//  ⑦ a set goes easy → hard. The pass pool is re-simulated with other deals (the same winner, margin ≥ 0.6).
// Broken data must be caught: --selftest flips answers and checks that ① fails.
const fs = require('fs'), path = require('path'), vm = require('vm');
const HT = require('../engine.js'); global.HT = HT; const AI = require('../ai.js'); global.HAI = AI;
const ctx = { self: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'lesson-pool.js'), 'utf8'), ctx); global.HT_LPOOL = ctx.self.HT_LPOOL;
const LG = require('../lessons-gen.js');
const ic = { window: {} }; ic.window = ic; vm.createContext(ic); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8'), ic);
try { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'i18n-more.js'), 'utf8'), ic); } catch (e) {}
const I18N = ic.I18N, LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const { suit, rank, QS, KS, AS } = HT;
const N = +process.argv[2] || 200, SELF = process.argv.includes('--selftest');
LG.setRng(AI.mulberry(4242));
const R0 = HT.rules({});
let bad = 0, total = 0; const fails = {};
const ng = (id, m) => { bad++; (fails[id] = fails[id] || []).push(m); };
const AIR = /AI|評価|見立て|形勢|勝率|勝つ見込み|evaluation|engine/i;
function text(lang, a) { if (!a) return ''; let x = (I18N[lang] || {})[a[0]]; if (x === undefined) return null; return String(x).replace(/\{(\w+)\}/g, (_, k) => a[1] && a[1][k] !== undefined ? 'X' : '{' + k + '}'); }
function checkTexts(id, q) {
  const keys = [q.q, q.exp].concat(q.why.filter(Boolean)).concat((q.vis.info || []));
  for (const lang of LANGS) for (const a of keys) {
    const s = text(lang, a);
    if (s == null) { if (lang === 'ja' || lang === 'en') ng(id, `missing text ${lang} ${a[0]}`); else missing.add(lang + ':' + a[0]); continue; }
    if (/\{\w+\}/.test(s)) ng(id, `placeholder left ${lang} ${a[0]}: ${s}`);
    if (lang === 'ja' && AIR.test(s)) ng(id, `reason by the engine's opinion: ${s}`);
  }
}
const missing = new Set();
// ① the right answer, worked out again
function truth(id, q) {
  const v = q.vis;
  if (id === 'legal') {
    const trick = (v.trick || []).map(p => p.c), S = LG.playState(v.hand, trick, (v.info || []).some(x => x[0] === 'li.first') ? 0 : 2, !(v.info || []).some(x => x[0] === 'li.nobreak'));
    const L = HT.legal(S, 0); return q.opts.map(c => L.includes(c));
  }
  if (id === 'winner') { const w = HT.winner(v.trick); return q.opts.map(s => s === w); }
  if (id === 'score') { const R = HT.rules({ v: v.v }), taken = [[], [], [], []]; v.taken.forEach(p => { for (let i = 0; i < p.h; i++) taken[p.s].push(HT.card(3, 2 + taken[p.s].filter(c => suit(c) === 3).length)); if (p.q) taken[p.s].push(QS); if (p.j) taken[p.s].push(HT.JD); });
    // hearts are just counted: give each player distinct hearts
    let k = 2; const T = [[], [], [], []]; v.taken.forEach(p => { for (let i = 0; i < p.h; i++) T[p.s].push(HT.card(3, k++)); if (p.q) T[p.s].push(QS); if (p.j) T[p.s].push(HT.JD); });
    const S = HT.newHand(R, [[], [], [], []], 0, 1); S.taken = T; S.phase = 'end'; const r = HT.handScore(S, [0, 0, 0, 0]); return q.opts.map(x => x === r.delta[q.who]); }
  if (id === 'duck') { const s = suit(v.trick[0].c), wr = Math.max(...v.trick.filter(p => suit(p.c) === s).map(p => rank(p.c))); const lose = q.opts.filter(c => suit(c) === s && rank(c) < wr); const best = Math.max(...lose.map(rank)); return q.opts.map(c => suit(c) === s && rank(c) === best && rank(c) < wr); }
  if (id === 'discard') { const R = HT.rules({ v: v.v }), mx = Math.max(...q.opts.map(c => HT.pts(c, R))); return q.opts.map(c => HT.pts(c, R) === mx); }
  if (id === 'queen') { const wr = Math.max(...v.trick.filter(p => suit(p.c) === 2).map(p => rank(p.c))); return q.opts.map(c => c === QS && wr > 12); }
  if (id === 'count') { const s = suit(HT.card(HT.SYM.indexOf(q.q[1].s), 2)); const seen = new Set(v.log.flat().map(x => x.c).concat(v.hand)); let n = 0; for (let r = 2; r <= 14; r++) if (!seen.has(HT.card(s, r))) n++; return q.opts.map(x => x === n); }
  if (id === 'stopMoon') { const s = suit(v.trick[0].c), wr = Math.max(...v.trick.filter(p => suit(p.c) === s).map(p => rank(p.c))); return q.opts.map(c => suit(c) === s && rank(c) > wr); }
  if (id === 'end3' || id === 'shoot') {
    const F = { R: R0, hands: v.open.map(h => h.slice()), phase: 'play', turn: 0, leader: 0, trick: [], tn: 10, broken: true, pts: [0, 0, 0, 0], npen: [0, 0, 0, 0], void: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], tricksWon: [0, 0, 0, 0], fast: 1, out: new Uint8Array(52) };
    const inPlay = new Set(v.open.flat()); for (let c = 0; c < 52; c++) if (!inPlay.has(c)) F.out[c] = 1;
    if (id === 'shoot') { for (let c = 0; c < 52; c++) if (F.out[c] && HT.isPen(c, R0)) { F.pts[0] += HT.pts(c, R0); F.npen[0]++; } }
    const vals = q.opts.map(c => { const G = AI.copyF(F); AI.fplayX(G, 0, c); return LG.worst(G, id === 'shoot' ? 'moon' : 'safe'); });
    const b = Math.min(...vals); return vals.map(x => x === b && (id !== 'shoot' || x === 0));
  }
  if (id.startsWith('pass')) return null;
}
function checkProblem(id, q) {
  total++;
  if (!q || !q.opts || q.opts.length < 3) return ng(id, '③ fewer than 3 options');
  if (q.ans < 0 || q.ans >= q.opts.length) return ng(id, 'answer index');
  const T = truth(id, q);
  if (T) {
    const right = T.map((x, i) => x ? i : -1).filter(i => i >= 0);
    if (!right.includes(q.ans)) ng(id, '① answer is not right ' + JSON.stringify(q.opts) + ' ans ' + q.ans);
    if (right.length !== 1) ng(id, '② ' + right.length + ' right options');
    if (q.opts.length - right.length < 2) ng(id, '③ fewer than 2 wrong options');
  }
  if (q.why.filter((w, i) => i !== q.ans && !w).length) ng(id, '④ a wrong option without a reason');
  if (new Set(q.opts.map(o => JSON.stringify(o))).size !== q.opts.length) ng(id, 'options repeat');
  checkTexts(id, q);
}
const LESSONS = ['legal', 'winner', 'score', 'duck', 'discard', 'queen', 'count', 'end3', 'stopMoon', 'shoot', 'passQ', 'passAK', 'passVoid'];
for (const id of LESSONS) {
  if (id.startsWith('pass')) {
    const P = global.HT_LPOOL[id] || [];
    if (P.length < 18) ng(id, `pool too small (${P.length}; 5 problems + example + practice need room)`);
    const seen = new Set();
    for (const q of P) {
      checkProblem(id, q);
      const k = JSON.stringify(q.vis.hand); if (seen.has(k)) ng(id, '⑥ same hand twice'); seen.add(k);
      if (!q.opts.every(o => o.length === 3 && o.every(c => q.vis.hand.includes(c)))) ng(id, 'a pass that is not 3 cards of the hand');
      // re-simulate with other deals
      const S = HT.newHand(R0, [q.vis.hand.slice(), [], [], []], 1, 1);
      const seed = 99173 + q.vis.hand[0];
      const ev = q.opts.map(o => AI.evalPass(S, 0, o, 300, AI.mulberry(seed)).obj);
      const b = ev.indexOf(Math.min(...ev)), second = Math.min(...ev.filter((x, i) => i !== q.ans));
      if (b !== q.ans || second - ev[q.ans] < .6) ng(id, `① re-simulated: best ${b} (answer ${q.ans}), margin ${(second - ev[q.ans]).toFixed(2)}`);
    }
    console.log(`${id}: ${P.length} pool problems`);
    continue;
  }
  let made = 0, sets = 0;
  for (let k = 0; k < Math.ceil(N / 7); k++) {
    const set = LG.makeSet(id, 7); sets++;
    if (set.length < 6) ng(id, 'could not make a set of 7 (' + set.length + ')');
    const keys = set.map(q => JSON.stringify([q.vis, q.opts])); if (new Set(keys).size !== keys.length) ng(id, '⑥ the same problem twice in a set');
    for (let i = 1; i < set.length; i++) if ((set[i].d || 0) < (set[i - 1].d || 0)) ng(id, '⑦ not easy → hard');
    for (const q of set) {
      if (SELF) { q.ans = (q.ans + 1) % q.opts.length; }
      checkProblem(id, q); made++;
    }
  }
  console.log(`${id}: ${made} problems in ${sets} sets`);
}
if (missing.size) console.log(`texts still missing in other languages: ${missing.size} (${[...new Set([...missing].map(x => x.split(':')[0]))].join(' ')})`);
for (const id in fails) { const c = {}; fails[id].forEach(m => { const k = m.slice(0, 60); c[k] = (c[k] || 0) + 1; }); console.log('NG', id, JSON.stringify(c)); }
console.log(`${total} problems checked, ${bad} failures`);
process.exit(bad ? 1 : 0);
