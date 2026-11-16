// レッスン・パズルの生成と点検で共通に使うもの（node 用）。局面はすべて「手番＝手前（side 0）」に直してある。
const E = require('../engine.js');
function rng(seed) { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
// 手番を side 0 に直す（盤は180度回すと同じ形なので、駒・宝を入れ替えるだけ）
function norm(s) { if (s.turn === 0) return E.clone(s); const t = E.clone(s); t.pos = [s.pos[1].slice(), s.pos[0].slice()]; t.gold = [s.gold[1], s.gold[0]]; t.dir = [s.dir[1], s.dir[0]]; t.turn = 0; return t; }
const pack = s => ({ rule: s.rule, pos: [s.pos[0].slice().sort((a, b) => b - a), s.pos[1].slice().sort((a, b) => b - a)], turn: 0, gold: s.gold.slice(), pool: s.pool });
const unpack = p => { const s = E.newGame(p.rule); s.pos = [p.pos[0].slice(), p.pos[1].slice()]; s.turn = 0; if (p.gold) s.gold = p.gold.slice(); if (p.pool != null) s.pool = p.pool; return s; };
// 次の相手の番で取られる確率（広く知られたルール：中央のマスだけ）。app.js の hitRisk と同じ
function hitRisk(st, side) {
  const R = E.RULES[st.rule], out = st.pos[side].map(() => 0); if (!R.capture) return out;
  const s2 = E.clone(st), op = 1 - side; s2.turn = op;
  for (let k = 1; k < E.STEPS.length; k++) {
    const hit = new Set();
    for (const m of E.legalMoves(s2, E.STEPS[k])) { if (!m.capture) continue; const q = E.qOf(R, op, m.to, s2.dir[op]); st.pos[side].forEach((i, x) => { if (i >= 1 && i <= R.L && E.qOf(R, side, i, st.dir[side]) === q) hit.add(x); }); }
    hit.forEach(x => { out[x] += E.PROB[k]; });
  }
  return out;
}
const riskAfter = (st, m, n) => { const a = E.apply(st, m, n).state; return a.round !== st.round || a.winner >= 0 ? 0 : hitRisk(a, 0).reduce((x, y) => x + y, 0); };
function stuckProb(st) { let p = 0; for (let k = 1; k < E.STEPS.length; k++) if (!E.legalMoves(st, E.STEPS[k]).length) p += E.PROB[k]; return p; }
const stuckAfter = (st, m, n) => { const a = E.apply(st, m, n).state; if (a.winner >= 0 || a.round !== st.round) return 0; const b = E.clone(a); b.turn = 0; return stuckProb(b); };
// 最善手の種類（テーマ）
function kindOf(st, n, ev) {
  const R = E.RULES[st.rule], b = ev[0].move, alt = ev.slice(1).map(e => e.move);
  if (b.finish) return 'goal';
  if (b.capture) return 'cap';
  if (b.again) return 'again';
  if (b.enter) return 'enter';
  if (!b.pen && ev[1].move.pen) return 'pen';
  if (R.capture && riskAfter(st, ev[1].move, n) - riskAfter(st, b, n) >= .12) return 'safe';
  if (R.penStuck && stuckAfter(st, ev[1].move, n) - stuckAfter(st, b, n) >= .15) return 'stuck';
  if (!st.pos[0].includes(0) && st.pos[0].filter(p => p > R.L).length >= 2) return 'race';
  return 'choose';
}
// 自己対局から「2つ以上の手がある局面＋目」を集める
function* positions(rule, seed, games) {
  const rnd = rng(seed);
  for (let g = 0; g < games; g++) {
    let s = E.newGame(rule, { first: g & 1 }), k = 0; const la = 4 + Math.floor(rnd() * 15), lb = 4 + Math.floor(rnd() * 15);
    while (s.winner < 0 && k++ < 3000) {
      const d = E.rollDice(rnd), ms = E.legalMoves(s, d.n);
      if (ms.length >= 2 && rnd() < .3) yield { s: norm(s), n: d.n };
      const m = E.think(s, d.n, s.turn === 0 ? la : lb, { rng: rnd }); s = E.apply(s, m, d.n).state;
    }
  }
}
// 点検：深さ2と深さ3の両方で同じ手が最善で、2番目との差がはっきりしているか
function judge(st, n, minGap) {
  const e2 = E.evaluate(st, n, 2); if (e2.length < 2) return null;
  const g2 = e2[0].wp - e2[1].wp; if (g2 < minGap) return null;
  if (e2[0].wp < .08 || e2[0].wp > .96) return null;
  const e3 = E.evaluate(st, n, 3); if (e3[0].move.from !== e2[0].move.from || e3[0].wp - e3[1].wp < minGap * .6) return null;
  return { ev: e2, gap: g2, gap3: e3[0].wp - e3[1].wp };
}
const pct = x => Math.round(x * 100);
const cellOf = (st, i) => { const c = E.coords(st.rule, 0, i, 1); return { r: c[0], c: c[1] }; };
// ヒントで光らせるマス：テーマに関係するマス（腕の先・印のマス・中央）のうち、今の目で届くもの＋最善手の行き先
function lookOf(st, n, kind, best) {
  const R = E.RULES[st.rule], out = [], seen = new Set(), add = (i, type) => { if (i < 1 || i > R.L) return; const c = cellOf(st, i), k = c.r + ',' + c.c; if (seen.has(k)) return; seen.add(k); out.push(Object.assign(c, { type })); };
  for (const p of st.pos[0]) { if (p < 1 || p > R.L) continue; const to = p + n; if (to > R.L) continue; const kd = E.kind(st.rule, 0, to, 1); if (kd === 'p') add(to, 'danger'); else if (kd === 'e' && kind === 'again') add(to, 'glow'); }
  if (best && best.to <= R.L && !out.some(o => o.type === 'glow')) add(best.to, 'glow');
  return out;
}
// 理由の文のひな形（msg）に入れる値
function whyOf(st, n, kind, ev) { const R = E.RULES[st.rule]; return ['w.' + kind, { a: pct(ev[0].wp), b: pct(ev[1].wp), p: R.penSq }]; }
function ngOf(st, n, kind, ev) {
  const R = E.RULES[st.rule], out = {}, a = pct(ev[0].wp);
  for (const e of ev.slice(1)) {
    const m = e.move, x = pct(e.wp); let k = 'n.gen';
    if (m.pen) k = 'n.pen'; else if (kind === 'again') k = 'n.noAgain'; else if (kind === 'goal') k = 'n.noGoal'; else if (kind === 'cap') k = 'n.noCap'; else if (kind === 'enter') k = 'n.noEnter';
    else if (kind === 'safe' && riskAfter(st, m, n) > .1) k = 'n.risk'; else if (kind === 'stuck') k = 'n.stuck';
    out[String(m.from)] = [k, { x, a, p: R.penSq, r: pct(riskAfter(st, m, n)), s: pct(stuckAfter(st, m, n)) }];
  }
  return out;
}
// 文言（ここには ja / en を書く。残りの12言語は learn_i18n.js の表から TR.fill が足す）。{a}＝最善手の勝率、{b}＝次善、{x}＝選んだ手の勝率
const MSG = {
  'w.again': { ja: '腕の先のマスに止まって、もう一度投げられます。勝率 {a}%（次善 {b}%）。', en: 'It lands on an arm end, so you throw again. Win chance {a}% (next best {b}%).' },
  'w.enter': { ja: '「1」の目は6回に1回ほど。入れられるときに入れておくと、次から使える目が増えます。勝率 {a}%（次善 {b}%）。', en: 'A 1 comes only about one throw in six. Entering now gives you more usable throws later. Win chance {a}% (next best {b}%).' },
  'w.pen': { ja: '印のマスを避けて、宝を払わずに進めます。勝率 {a}%（次善 {b}%）。', en: 'It avoids the marked square, so you pay nothing. Win chance {a}% (next best {b}%).' },
  'w.goal': { ja: 'ちょうどの目で上がり。相手から宝を1もらえます。勝率 {a}%（次善 {b}%）。', en: 'Home with the exact throw — you take 1 from your rival. Win chance {a}% (next best {b}%).' },
  'w.cap': { ja: '中央で相手の駒を取ります。相手の駒は待ちに戻り、宝を1もらえます。勝率 {a}%（次善 {b}%）。', en: 'A capture in the centre: the rival piece goes back to waiting and you take 1. Win chance {a}% (next best {b}%).' },
  'w.safe': { ja: '中央で取られる危険を小さくする手です。勝率 {a}%（次善 {b}%）。', en: 'This keeps the risk of being captured in the centre low. Win chance {a}% (next best {b}%).' },
  'w.stuck': { ja: '次の番に動かせなくなる目を減らす手です（動かせないと場へ払います）。勝率 {a}%（次善 {b}%）。', en: 'It leaves fewer throws that would leave you stuck next turn (stuck means paying the pool). Win chance {a}% (next best {b}%).' },
  'w.race': { ja: '上がりまでの残りを、使いやすい数にしておく手です。勝率 {a}%（次善 {b}%）。', en: 'It leaves distances to home that more throws can use. Win chance {a}% (next best {b}%).' },
  'w.choose': { ja: 'この目では、この駒を進めるのがいちばんです。勝率 {a}%（次善 {b}%）。', en: 'With this throw, this piece is the one to move. Win chance {a}% (next best {b}%).' },
  'n.pen': { ja: '印のマスに止まるので、相手へ宝を{p}払います。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'That lands on a marked square, so you pay {p}. This move: {x}%; the best move: {a}%.' },
  'n.noAgain': { ja: 'もう一度投げられる手がありました。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'There was a move that throws again. This move: {x}%; the best move: {a}%.' },
  'n.noGoal': { ja: '上がれる駒がありました。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'A piece could go home. This move: {x}%; the best move: {a}%.' },
  'n.noCap': { ja: '中央で相手の駒を取れました。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'You could capture in the centre. This move: {x}%; the best move: {a}%.' },
  'n.noEnter': { ja: '「1」の目で待ちの駒を入れられました。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'The 1 could bring a waiting piece on. This move: {x}%; the best move: {a}%.' },
  'n.risk': { ja: 'この手のあと、中央で取られる確率が {r}% 残ります。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'After this move you are captured in the centre with {r}%. This move: {x}%; the best move: {a}%.' },
  'n.stuck': { ja: 'この手のあと、次の番に動かせない確率が {s}% あります。この手の勝率は {x}%、いちばん良い手は {a}% です。', en: 'After this move, {s}% of your next throws leave you stuck. This move: {x}%; the best move: {a}%.' },
  'n.gen': { ja: 'この手の勝率は {x}%。いちばん良い手は {a}% です。', en: 'This move: {x}%. The best move: {a}%.' },
};
const UI = {
  qMove: { ja: '{n}マス進めます。いちばん良い手はどれ？', en: 'You may move {n}. Which move is best?' },
  qChoice: { ja: '答えを選ぼう', en: 'Choose the answer' },
  roll: { ja: '豆の目 {n}', en: 'Throw {n}' },
  correct: { ja: '正解！', en: 'Correct!' },
  wrong: { ja: 'もっと良い手があります。', en: 'There is a better move.' },
  wrongChoice: { ja: '別の答えを考えてみましょう。', en: 'Have another look at the choices.' },   // 選ぶ問題用（「手」ではないので wrong は使わない。「まちがい」とも言わない）
  best: { ja: 'いちばん良い手', en: 'Best move' }, answer: { ja: '答えを見る', en: 'Show answer' }, hint: { ja: 'ヒント', en: 'Hint' }, next: { ja: '次へ', en: 'Next' },
  pass: { ja: '合格！', en: 'Passed!' }, score: { ja: '{n}点', en: '{n} pts' }, needPass: { ja: '100点満点・75点以上で合格です。', en: '100 points in all; 75 to pass.' },
  rampStep: { ja: '準備 {i}/{n}', en: 'Warm-up {i}/{n}' }, rampMain: { ja: '採点問題へ', en: 'To the scored problems' }, rampSkip: { ja: '準備をとばす', en: 'Skip the warm-up' },
  rampNote: { ja: '（準備の問題は採点しません）', en: '(Warm-up: not scored)' }, rampGood: { ja: 'その通り！', en: 'That’s it!' }, rampRetry: { ja: 'もう一度考えてみよう。困ったら「ヒント」を押してね。', en: 'Think again. Press “Hint” if you are stuck.' },
  look: { ja: '光っているマス・赤い輪のマスを見てみよう。', en: 'Look at the glowing and red-ringed squares.' }, ans: { ja: '答え：{m}', en: 'Answer: {m}' },
  enter: { ja: '入場', en: 'enter' }, home: { ja: '上がり', en: 'home' },
};
const TR = require('./learn_i18n.js'); TR.fill(MSG); TR.fill(UI);   // 12言語を足す
module.exports = { TR, E, rng, norm, pack, unpack, hitRisk, riskAfter, stuckProb, stuckAfter, kindOf, positions, judge, pct, cellOf, lookOf, whyOf, ngOf, MSG, UI };
