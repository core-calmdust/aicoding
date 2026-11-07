/* senet/coach.js — セネトのコーチ（共通仕様 shared/COACH.md、見た目は shared/coachkit.js）。
   AI戦・二人対戦で、自分の手番に表示：勝率・レース差・上がった枚数（要約）、推奨方針（理由つき）、
   分かれ道（上位の候補を方針で分類：上がり／入れ替え／美の家／出口へ／ペア／壁／逃げる／前進…、ホバー・タップで盤に矢印）、
   考え方のヒント（各駒が入れ替えられる確率、出目の確率、もう一度投げる目、美の家と出口の目）、前の手の評価（◎○△✕）。
   評価はこのサイトのエンジン（senet/engine.js：期待値探索＋自己対局で学習した評価）。ルールの出典は senet/tools/RULES-RESEARCH.md。
   Texts: CTX.ja / CTX.en here, the other languages in coach-i18n.js (SenetCoach.merge). */
(() => {
'use strict';
const CTX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レート戦・オンライン・AI同士・レッスン・パズルの間、コーチはお休みです。AIとの対局や二人対戦に戻ると再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、勝率・入れ替えられる確率・候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の番です。相手がどの目で、どの駒と入れ替えにくるか予想してみよう。',
  calc: '候補手を考えています…',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  wp: '勝率', race: 'レース', home: '上がり', walls: '壁',
  'race.v': '{d}歩 {w}', 'race.ahead': 'リード', 'race.behind': 'ビハインド', 'race.even': '互角',
  rollFirst: 'まず棒を投げよう。出目の確率は 1：4/16・2：6/16・3：4/16・4：1/16・5：1/16。1・4・5 ならもう一度投げられます。',
  recWhy: 'この出目の第一候補は「{c}」の方針です。この手のあとの勝率は {p}%。',
  recSharp: '2番目の候補との差が大きく（勝率で {x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: '動かせる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。',
  cdH: '候補手と方針', cdIntro: '上位の候補を方針ごとに解説します（行にマウスを乗せる／タップすると盤に矢印）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'tt.move': '{from}の駒を{to}へ', 'tt.home': '{from}の駒を上がりへ', 'tt.water': '{from}の駒を水の家へ（{to}へ戻る）',
  'c.home': '上がり', 'b.home': '駒を上げる', 'x.home': 'ちょうどの目で盤から上げます。1枚上がるごとに、相手より先に全部上げる勝負が近づきます。',
  'c.cap': '入れ替え', 'b.cap': '相手の駒と入れ替える', 'x.cap': '相手の駒と入れ替えて、{d}マス後ろへ下げます。こちらは前へ、相手は後ろへ。',
  'c.beauty': '美の家', 'b.beauty': '美の家（26）に入る', 'x.beauty': 'すべての駒は26の美の家にちょうど止まらないと先へ行けません。ここは入れ替えられない安全なマスです。',
  'c.exit': '出口へ', 'b.exit': '出口のマスへ進む', 'x.exit': '美の家から {to} へ。{to} からは {e} の目で上がれます（1回の投げで {p}%）。',
  'c.pair': 'ペア', 'b.pair': '味方と並べて守る', 'x.pair': '味方の駒と隣り合わせにします。2枚並んだ駒は入れ替えられません。',
  'c.wall': '壁', 'b.wall': '3枚の壁を作る', 'x.wall': '3枚以上並ぶと壁になり、相手はその先へ跳び越せません。相手の駒を足止めできます。',
  'c.escape': '逃げる', 'b.escape': 'ねらわれた駒を逃がす', 'x.escape': 'ねらわれていた駒（入れ替えられる確率 {r0}%）を、{r1}% のマスへ逃がします。',
  'c.safe': '守る', 'b.safe': '入れ替えられにくく指す', 'x.safe': 'この手のあと、あなたの駒が次に入れ替えられる確率は合計 {r}%。危険の小さい手です。',
  'c.adv': '前進', 'b.adv': '先へ進める', 'x.adv': '駒を進めてレースを縮めます。進めた先で入れ替えられないかも確かめよう（{r}%）。',
  'c.water': '水の家', 'b.water': '水の家に落ちる', 'x.water': '27の水の家に止まると、15の再生の家へ戻されます。ほかに手がないときだけにしたい手です。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.risk': '{p}の駒が次の相手の番で入れ替えられる確率は {r}%（相手の駒の1〜5マス先にひとりでいる）。', 'tp.riskBig': '{p}の駒は特にねらわれています（{r}%）。相手の2マス先は 6/16＝38% で最も危険です。',
  'tp.safe': 'あなたの駒は今、どれも入れ替えられない位置にいます。',
  'tp.pair': '2枚並べると入れ替えられず、3枚並べると相手は跳び越せない壁になります。',
  'tp.prob': '出目の確率：1は4/16、2は6/16、3は4/16、4は1/16、5は1/16。1・4・5（合わせて6/16）はもう一度投げられます。',
  'tp.open': '序盤：先頭の駒をどんどん進めるより、2枚・3枚と並べて相手の通り道をふさぐのが基本です。',
  'tp.beauty': '26の美の家にはちょうどの目で止まる必要があります。26を越える目では動けないので、手前の駒の距離を意識しよう。',
  'tp.water': '美の家（26）の駒は、1の目で動かすと水の家に落ちて15へ戻ります。1が出たら、なるべくほかの駒で使おう。',
  'tp.exits': '上がりの目：26は5、28は3（25%）、29は2（38%）、30は1（25%）。29がいちばん上がりやすい出口です。',
  'tp.race': 'もう入れ替えのないレースです。出口の目を待つ駒が多いほど遅れます。', 'tp.raceAhead': 'レースは {d}歩リード。入れ替えの危険を減らして逃げ切りを。', 'tp.raceBehind': 'レースは {d}歩ビハインド。相手の駒と入れ替える機会をねらおう。',
  'q.best': '◎ 最善', 'q.good': '○ 良い手', 'q.dubious': '△ 疑問手', 'q.bad': '✕ 悪手',
  prev: '前の手 {m}：{q}', prevBest: 'AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。勝率の差 {x}。', prevForced: '動かせる手が1つだけの局面でした。',
  'lp.cap': '💡コツ：入れ替えられるときは、そのあと自分の駒が入れ替え返される確率と比べよう。', 'lp.risk': '💡コツ：指す前に、動かした駒が相手の駒の1〜5マス先にひとりで立たないか確かめよう。', 'lp.pair': '💡コツ：2枚並べた駒を崩すと、入れ替えのねらいになります。',
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during rated and online games, AI vs AI, lessons and puzzles. It comes back when you play the AI or a friend.',
  offNote: 'The coach is off. Switch it on at the top right to see win chances, swap risks and explained candidate moves.',
  overRv: 'The game is over. Analyse it and a move-by-move review (best moves, mistakes and why) appears here.',
  oppTurn: 'Your rival’s turn. Guess which throw would let them swap with which of your pieces.',
  calc: 'Thinking about the candidates…',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  wp: 'Win', race: 'Race', home: 'Off', walls: 'Walls',
  'race.v': '{d} {w}', 'race.ahead': 'ahead', 'race.behind': 'behind', 'race.even': 'even',
  rollFirst: 'Throw first. The chances: 1 is 4/16, 2 is 6/16, 3 is 4/16, 4 is 1/16, 5 is 1/16. A 1, 4 or 5 lets you throw again.',
  recWhy: 'For this throw the first choice is “{c}”. Your win chance after it: {p}%.',
  recSharp: 'The second choice is clearly worse ({x} less) — play this one precisely.',
  recBranch: 'The candidates are close: a fork in the road. Pick the plan you like.',
  recOnly: 'This is the only move.',
  brH: 'Fork — plans to choose from', brIntro: 'None of these is much worse than another.',
  cdH: 'Candidates and plans', cdIntro: 'The best candidates, by plan (hover or tap a row to see the arrow on the board).',
  'gap.best': 'Best', 'gap.eq': 'About the same', 'gap.lt': 'A bit worse', 'gap.bad': 'Worse',
  'tt.move': 'Piece on {from} to {to}', 'tt.home': 'Piece on {from} off', 'tt.water': 'Piece on {from} into the water (back to {to})',
  'c.home': 'Bear off', 'b.home': 'Bear a piece off', 'x.home': 'Off the board with the exact throw. Each piece off brings you closer to winning the race.',
  'c.cap': 'Swap', 'b.cap': 'Swap with a rival piece', 'x.cap': 'Swap places with the rival piece and push it {d} squares back: you go forward, it goes back.',
  'c.beauty': 'House of Beauty', 'b.beauty': 'Enter the House of Beauty (26)', 'x.beauty': 'Every piece must stop exactly on 26, the House of Beauty, before going on. Pieces there cannot be swapped.',
  'c.exit': 'To an exit', 'b.exit': 'Move on to an exit square', 'x.exit': 'From the House of Beauty to {to}. From {to} a {e} bears off ({p}% per throw).',
  'c.pair': 'Pair', 'b.pair': 'Pair up to protect', 'x.pair': 'Puts the piece next to a friend. Two pieces side by side cannot be swapped.',
  'c.wall': 'Wall', 'b.wall': 'Build a wall of three', 'x.wall': 'Three or more in a row make a wall your rival cannot jump past — it holds their pieces back.',
  'c.escape': 'Escape', 'b.escape': 'Save a threatened piece', 'x.escape': 'Moves the threatened piece ({r0}% to be swapped) to a square with {r1}%.',
  'c.safe': 'Safe', 'b.safe': 'Play safe', 'x.safe': 'After this move your pieces are swapped next turn with {r}% in total — a low-risk move.',
  'c.adv': 'Advance', 'b.adv': 'Move ahead', 'x.adv': 'Moves a piece ahead to shorten your race. Check it is not easy to swap there ({r}%).',
  'c.water': 'Water', 'b.water': 'Fall into the water', 'x.water': 'Stopping on 27, the House of Water, sends the piece back to 15, the House of Rebirth. Only when nothing else is possible.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fold',
  'tp.risk': 'Your piece on {p} is swapped next turn with {r}% (it stands alone 1–5 squares ahead of a rival piece).', 'tp.riskBig': 'Your piece on {p} is in real danger ({r}%). Two squares ahead of a rival is the worst: 6/16 = 38%.',
  'tp.safe': 'None of your pieces can be swapped right now.',
  'tp.pair': 'Two in a row cannot be swapped; three in a row make a wall your rival cannot jump.',
  'tp.prob': 'Throw chances: 1 is 4/16, 2 is 6/16, 3 is 4/16, 4 is 1/16, 5 is 1/16. A 1, 4 or 5 (6/16 together) gives another throw.',
  'tp.open': 'Opening: rather than racing your front piece, line pieces up in twos and threes to block your rival’s road.',
  'tp.beauty': 'You must land exactly on 26, the House of Beauty. A throw that would pass 26 cannot be used, so watch the distances.',
  'tp.water': 'A piece on 26 moved with a 1 falls into the water and goes back to 15. With a 1, use another piece if you can.',
  'tp.exits': 'Bearing off: from 26 a 5, from 28 a 3 (25%), from 29 a 2 (38%), from 30 a 1 (25%). 29 is the easiest exit.',
  'tp.race': 'No more contact: a pure race. Pieces waiting on an exit square slow you down.', 'tp.raceAhead': 'You lead the race by {d}. Cut the risks and run home.', 'tp.raceBehind': 'You trail the race by {d}. Look for swaps.',
  'q.best': '◎ Best', 'q.good': '○ Good', 'q.dubious': '△ Dubious', 'q.bad': '✕ Mistake',
  prev: 'Last move {m}: {q}', prevBest: 'Same as the AI’s first choice.', prevAlt: 'The AI’s first choice was {m} ({c}), {x} better.', prevForced: 'There was only one move.',
  'lp.cap': '💡Tip: when you can swap, compare it with the risk of being swapped back.', 'lp.risk': '💡Tip: before moving, check the piece does not stand alone 1–5 squares ahead of a rival piece.', 'lp.pair': '💡Tip: breaking up a pair gives your rival a target.',
},
};
const S = { lists: new Map(), open: false, hov: null };
let card = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tx(k, v) { let x = (CTX[LANG] || CTX.en)[k]; if (x === undefined) x = CTX.en[k]; if (x === undefined) x = CTX.ja[k]; if (x === undefined) return k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pct = x => Math.round(x * 100) + '%';
function usable() { return !!game && !special && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp'); }
function active() { return !!settings.coach && usable(); }
function mine() { const st = curState(); return settings.mode === 'pvp' || st.turn === game.human; }
const rl = st => E.RULES[st.rule];
function riskSum(st, side) { return E.hitRisk(st, side).reduce((a, b) => a + b, 0); }
// contact: a piece of one side still stands behind a piece of the other on squares 1–25 (a swap can still happen)
function contact(st) { const a = st.pos[0].filter(p => p <= 25), b = st.pos[1].filter(p => p <= 25); return a.some(p => b.some(q => q > p)) || b.some(p => a.some(q => q > p)); }
function stage(st) { if (game.plies.length < 12) return 'open'; return contact(st) ? 'mid' : 'end'; }
function wallsOf(st, sd) { const b = E.board(st); let n = 0; for (let q = 1; q <= 30; q++) if (b[q] === sd && (q === 1 || b[q - 1] !== sd)) { let z = q; while (z + 1 <= 30 && b[z + 1] === sd) z++; if (z - q + 1 >= 3) n++; } return n; }
function classify(st, m) {
  const me = st.turn, after = E.apply(st, m).state, b = E.board(after);
  const rAfter = E.hitRisk(after, me), rBefore = E.hitRisk(st, me);
  const k = m.piece != null ? m.piece : st.pos[me].indexOf(m.from);
  const cAfter = rAfter.reduce((a, b) => a + b, 0), r0 = k >= 0 ? rBefore[k] : 0, r1 = k >= 0 ? rAfter[k] : 0;
  const to = m.to, pair = !m.finish && !m.water && to <= 25 && ((to > 1 && b[to - 1] === me) || b[to + 1] === me);
  let kind;
  if (m.finish) kind = 'home';
  else if (m.water) kind = 'water';
  else if (m.capture) kind = 'cap';
  else if (to === 26) kind = 'beauty';
  else if (m.from === 26) kind = 'exit';
  else if (r0 > .15 && r1 < r0 - .1) kind = 'escape';
  else if (wallsOf(after, me) > wallsOf(st, me)) kind = 'wall';
  else if (pair) kind = 'pair';
  else if (cAfter < .1) kind = 'safe';
  else kind = 'adv';
  const e = E.EXIT[to] || 0, pe = e ? Math.round(E.PROB[e] * 100) : 0;
  return { k: kind, r: Math.round(cAfter * 100), r0: Math.round(r0 * 100), r1: Math.round(r1 * 100), d: m.capture ? m.to - m.from : 0, to: m.water ? m.dest : to, e, p: pe };
}
function ttl(st, m) { return m.water ? tx('tt.water', { from: m.from, to: m.dest }) : m.finish ? tx('tt.home', { from: m.from }) : tx('tt.move', { from: m.from, to: m.to }); }
function listFor(st, n) {
  const key = E.key(st) + '#' + n;
  if (S.lists.has(key)) return S.lists.get(key);
  const v = E.evaluate(st, n); S.lists.set(key, v); if (S.lists.size > 300) S.lists.delete(S.lists.keys().next().value);
  return v;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= .01 ? ['gap.eq', 'g1'] : d <= .04 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const CCLS = { home: 'c-mat', cap: 'c-atk', beauty: 'c-mat', exit: 'c-dev', pair: 'c-def', wall: 'c-def', escape: 'c-def', safe: 'c-def', adv: 'c-dev', water: 'c-atk' };
function qOf(loss, only) { return only || loss < .005 ? 0 : loss < .03 ? 1 : loss < .08 ? 2 : 3; }
function verdictHtml() {
  // the last move of the player whose turn it is now (two players: the last move of either side)
  const L = game.plies; let i = cur - 1;
  while (i >= 0 && !(L[i].m && (settings.mode === 'pvp' || L[i].s === game.human))) i--;
  if (i < 0 || cur - i > 4) return '';
  const p = L[i], st = posAt(i); if (!p.n) return '';
  const ev = listFor(st, p.n); if (!ev.length) return '';
  const pl = ev.find(e => e.move.from === p.m.from), best = ev[0], loss = Math.max(0, best.wp - (pl ? pl.wp : best.wp));
  const g = qOf(loss, ev.length === 1), qs = ['q.best', 'q.good', 'q.dubious', 'q.bad'][g];
  const mt = plyText(st, p, false);
  let h = ev.length === 1 ? tx('prevForced') : g === 0 ? tx('prevBest') : tx('prevAlt', { m: plyText(st, { s: p.s, n: p.n, m: best.move }, false), c: tx('c.' + classify(st, best.move).k), x: pct(loss) });
  if (g >= 2) { const c = classify(st, best.move).k; h += ' ' + tx(c === 'cap' ? 'lp.cap' : c === 'pair' || c === 'wall' ? 'lp.pair' : 'lp.risk'); }
  return CoachKit.verdict(g, esc(tx('prev', { m: mt, q: tx(qs) })), esc(h));
}
function summary(st) {
  const me = st.turn, r = rl(st), rc = E.raceCount(st), d = rc.pips[1 - me] - rc.pips[me];
  const w = E.winProb(st), chips = [];
  if (settings.eval) chips.push({ k: tx('wp'), v: esc(pct(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('race'), v: esc(tx('race.v', { d: Math.abs(d), w: tx(d > 0 ? 'race.ahead' : d < 0 ? 'race.behind' : 'race.even') })), cls: d > 0 ? 'pos' : d < 0 ? 'neg' : '' });
  const wa = wallsOf(st, me), wb = wallsOf(st, 1 - me); if (wa || wb) chips.push({ k: tx('walls'), v: esc(`${wa} : ${wb}`), cls: wa > wb ? 'pos' : wa < wb ? 'neg' : '' });
  chips.push({ k: tx('home'), v: esc(`${st.pos[me].filter(p => p >= r.goal).length} : ${st.pos[1 - me].filter(p => p >= r.goal).length}`) });
  return { html: CoachKit.summary(chips), d };
}
function tipsOf(st, cl, d) {
  const me = st.turn, r = rl(st), risk = E.hitRisk(st, me), list = [], stg = stage(st), roll = curRoll();
  st.pos[me].forEach((p, k) => { if (p > 0 && p < r.goal && risk[k] > .005) list.push({ v: risk[k], k: risk[k] >= .3 ? 'tp.riskBig' : 'tp.risk', p }); });
  list.sort((a, b) => b.v - a.v);
  const out = list.slice(0, 2).map(x => ({ html: esc(tx(x.k, { p: x.p, r: Math.round(x.v * 100) })), hi: x.v >= .3 }));
  if (!list.length && st.pos[me].some(p => p < r.goal)) out.push({ html: esc(tx('tp.safe')) });
  if (stg === 'open') out.push({ html: esc(tx('tp.open')), hi: true });
  if (st.pos[me].includes(26) && roll && roll.n === 1) out.push({ html: esc(tx('tp.water')), hi: true });
  if (st.pos[me].some(p => p >= 18 && p < 26)) out.push({ html: esc(tx('tp.beauty')) });
  if (st.pos[me].some(p => p >= 26 && p < r.goal)) out.push({ html: esc(tx('tp.exits')) });
  if (stg !== 'end') out.push({ html: esc(tx('tp.pair')) });
  if (stg === 'end') out.push({ html: esc(tx('tp.race')), hi: true });
  else if (Math.abs(d) >= 8) out.push({ html: esc(tx(d > 0 ? 'tp.raceAhead' : 'tp.raceBehind', { d: Math.abs(d) })) });
  out.push({ html: esc(tx('tp.prob')) });
  return out;
}
let calcT = 0;
function render() {
  if (!card) return;
  if (SenetCoach.sw) SenetCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = !!game && game.plies.length > 0 && overNow(), playing = !!game && !over && atLatest() && !reviewing;
  const can = usable() && (playing || (over && !rv));
  const resting = !can && !rv && (!!special || !!rgame || settings.mode === 'watch' || settings.mode === 'online');
  if (resting) { card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.hov = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`); }
  const on = active();
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) return;
  const H = st => `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${st ? `<small>${esc(tx('st.' + stage(st)))}</small>` : ''}</h3>`;
  if (over) return put(H() + `<p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''), () => { const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => window.SenetRv && SenetRv.run(); });
  if (!on) return put(H() + `<p class="ck-muted">${esc(tx('offNote'))}</p>`);
  const st = curState();
  let h = H(st);
  if (!mine() || isAI(st.turn)) { S.hov = null; coachHover = null; return put(h + `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml()); }
  const sm = summary(st); h += sm.html;
  const r = curRoll();
  let cl = null;
  if (!r) h += CoachKit.rec(t('roll'), esc(tx('rollFirst')), '');
  else if (r.n) {
    const key = E.key(st) + '#' + r.n;
    if (!S.lists.has(key)) { h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; clearTimeout(calcT); calcT = setTimeout(() => { listFor(st, r.n); render(); }, 30); }
    else {
      const ev = S.lists.get(key);
      if (ev.length) {
        const items = ev.slice(0, 4).map((e, i) => ({ e, c: classify(st, e.move), drop: ev[0].wp - e.wp, i }));
        const b = items[0], sharp = ev.length > 1 ? ev[0].wp - ev[1].wp : 0, branch = ev.length > 1 && sharp < .01;
        let why = esc(tx('recWhy', { c: tx('c.' + b.c.k), p: Math.round(b.e.wp * 100) }));
        if (ev.length === 1) why = esc(tx('recOnly')); else if (sharp >= .05) why += ' ' + esc(tx('recSharp', { x: pct(sharp) })); else if (branch) why += ' ' + esc(tx('recBranch'));
        h += CoachKit.rec(tx('b.' + b.c.k), why, '');
        if (ev.length > 1) h += CoachKit.branches({ head: tx(branch ? 'brH' : 'cdH'), intro: esc(tx(branch ? 'brIntro' : 'cdIntro')), items: items.map(x => { const g = gapOf(x.drop, x.i); return { tag: tx('c.' + x.c.k), cls: CCLS[x.c.k] || '', title: esc(ttl(st, x.e.move)), text: esc(tx('x.' + x.c.k, x.c)), gap: tx(g[0]) + (x.drop > .005 ? ' −' + pct(x.drop) : ''), gcls: g[1], move: String(x.e.move.from) }; }) });
      }
    }
  }
  const tl = tipsOf(st, cl, sm.d);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl, open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h, after) {
  if (card.dataset.h !== h) {
    const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
    CoachKit.bind(card, {
      onMore: () => { S.open = !S.open; render(); },
      onHover: u => { const st = curState(), r = curRoll(); let m = null; if (u != null && u !== '' && r && r.n) m = E.legalMoves(st, r.n).find(x => String(x.from) === String(u)) || null; if ((m && m.from) !== (coachHover && coachHover.from)) { coachHover = m; renderBoard(); } },
      onPlay: u => { try { if (!active() || !myTurnHuman() || animating) return; const st = curState(), r = curRoll(); if (!r || !r.n) return; const m = E.legalMoves(st, r.n).find(x => String(x.from) === String(u)); if (m) { coachHover = null; play(m); } } catch (e) {} },
    });
  }
  if (after) after();
}
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css();
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  SenetCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => { settings.coach = !!v; save(); CoachKit.flash(tx(v ? 'on' : 'off')); coachHover = null; render(); renderBoard(); }, label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function relabel() { if (SenetCoach.sw) SenetCoach.sw.sync(); if (card) card.dataset.h = ''; render(); }
function merge(more) { for (const l in more) CTX[l] = Object.assign({}, CTX[l] || {}, more[l]); }
window.SenetCoach = { init, render, relabel, merge, tx, CTX, active, usable, classify };
})();
