/* patolli/coach.js — パトリのコーチ（共通仕様 shared/COACH.md、見た目は shared/coachkit.js）。ur/coach.js を土台にした。
   AI戦・二人対戦で、自分の手番に表示：手番側の勝率・レースの差（残りのマス）・宝・上がった数（要約）、推奨方針（理由つき）、
   候補手と方針（上がる／取る／もう一度のマス／印のマス／逃げる／入場／前進。行にマウス・タップで盤に矢印）、
   考え方のヒント（「1」でしか入れないこと、動けない確率、もう一度のマス・印のマスに届く目、中央で取られる確率、豆の確率）、
   前の手の評価（◎○△✕）。評価はこのサイトのエンジン（patolli/engine.js：期待値探索）の勝率。
   ルールの事実は claude/patolli-spec.md のとおり（当時のルールは伝わっていない。歴史の話はここでは書かない）。
   文言：ここに TX.ja / TX.en、ほかの言語は coach-i18n.js（PatolliCoach.merge）。 */
(() => {
'use strict';
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レート戦・オンライン・AI同士・レッスン・パズルの間、コーチはお休みです。AIとの対局や二人対戦に戻ると再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、勝率・宝の損得・候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の番です。どの目が出ると相手が得をするか、予想してみよう。',
  calc: '候補手を考えています…',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  wp: '勝率', race: 'レース', gold: '宝', 'gold.pool': '（場 {p}）', home: '上がり',
  'race.v': '{d}マス {w}', 'race.ahead': 'リード', 'race.behind': 'ビハインド', 'race.even': '互角',
  rollFirst: 'まず豆を投げよう。印の出た数だけ進みます：1 は 16%、2 は 31%、3 は 31%、4 は 16%。5個とも印なら 10（3%）、0個は進めません（3%）。',
  recWhy: 'この目の第一候補は「{c}」の方針です。この手のあとの勝率は {p}%。',
  recSharp: '2番目の候補との差が大きく（勝率で {x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: '動かせる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。',
  cdH: '候補手と方針', cdIntro: '候補を方針ごとに解説します（行にマウスを乗せる／タップすると盤に矢印）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'tt.enter': '入場して{to}マス目へ', 'tt.move': '{from}マス目の駒を{to}マス目へ', 'tt.home': '{from}マス目の駒を上がりへ',
  'c.home': '上がる', 'b.home': '駒を上げる', 'x.home': 'ちょうどの目で上がり。相手から宝を{a}もらえます。',
  'c.cap': '取る', 'b.cap': '中央で相手の駒を取る', 'x.cap': '中央のマスで相手の駒を取ります。相手の駒は待ちに戻り、宝を1もらえます。',
  'c.again': 'もう一度', 'b.again': '腕の先でもう一度投げる', 'x.again': '腕の先の丸いマスに止まると、もう一度投げられます。1回の番で2回動けます。',
  'c.pen': '印のマス', 'b.pen': '印のマスに止まる（払う）', 'x.pen': '印のマスに止まるので、相手へ宝を{a}払います。同じ目を別の駒で使えないか、先に確かめたい手です。',
  'c.escape': '逃げる', 'b.escape': 'ねらわれた駒を逃がす', 'x.escape': '中央でねらわれていた駒（取られる確率 {r0}%）を、{r1}% のマスへ動かします。',
  'c.enter': '入場', 'b.enter': '駒を盤に入れる', 'x.enter': '待ちの駒を盤に入れます。盤に自分の駒があるとき、入れるのは「1」の目だけ（16%）なので、入れられるときに入れるのが基本です。',
  'c.risk': '中央へ', 'b.risk': '中央のマスへ進む', 'x.risk': '中央のマスに止まります。次の相手の番で取られる確率は {r1}% です。',
  'c.adv': '前進', 'b.adv': '先へ進める', 'x.adv': '盤上の駒を進めます（上がりまで残り {left}マス）。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.risk': '中央にいる{p}マス目の駒は、次の相手の番で取られる確率が {r}% あります。',
  'tp.centre': '相手の駒を取れるのも、取られるのも、中央の4マスだけ。ほかのマスでは相手の駒に止まれません。',
  'tp.goldLow': 'あなたの宝は残り {a}。0 になると負けです。印のマスと 0 の目に注意。',
  'tp.enter1': '待ちの駒が {n}個。盤に自分の駒があるとき、入れるのは「1」の目（16%）だけです。',
  'tp.enterFree': '盤に自分の駒がないので、次はどの目でも入れます（進む数だけ先のマスへ）。',
  'tp.stuck': '今の形だと、次の番に動かせない目が出る確率が {p}% あります（出ると場へ {a}）。動かせる駒を増やしておくと減らせます。',
  'tp.again': '{p}マス目の駒は {n} の目で腕の先に止まり、もう一度投げられます。',
  'tp.pen': '{p}マス目の駒は {n} の目で印のマスに止まります（相手へ {a}）。別の駒で目を使えるようにしておこう。',
  'tp.exact': '上がりはちょうどの目だけ。最後のマスの駒は 1、その手前は 2…と、上がりまでの残りを数えておこう。',
  'tp.raceAhead': 'レースは {d}マスのリード。宝を払うマスを避けて逃げ切ろう。', 'tp.raceBehind': 'レースは {d}マスのビハインド。もう一度のマスで手数をかせごう。',
  'tp.openBell': '序盤：最初の1個はどの目でも入れます。2個目からは「1」待ちなので、盤上の駒でもう一度のマス（腕の先）をねらいながら待ちます。',
  'tp.openPop': '序盤：入れるのは「1」の目だけ。出発マスは中央なので、相手の駒が近くにいると取られます。',
  'tp.prob': '豆の確率：1＝16%、2＝31%、3＝31%、4＝16%、10＝3%、0＝3%。',
  'tp.goldBell': 'ベルの復元の勝ち負けは「先に6個上げるか」で決まります。ここの勝率は宝の数を数えていません。宝は勝ったときの取り分です。',
  'q.best': '◎ 最善', 'q.good': '○ 良い手', 'q.dubious': '△ 疑問手', 'q.bad': '✕ 悪手',
  prev: '前の手 {m}：{q}', prevBest: 'AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。勝率の差 {x}。', prevForced: '動かせる手が1つだけの局面でした。',
  'lp.pen': '💡コツ：印のマスに止まる手は、ほかの駒で同じ目を使えないか先に確かめよう。', 'lp.again': '💡コツ：腕の先（もう一度のマス）に届く駒がないか、最初に探そう。', 'lp.centre': '💡コツ：中央の4マスは取り合いの場所。止まる前に相手の駒との距離を数えよう。', 'lp.count': '💡コツ：どの駒を動かすと次に使える目が増えるかを比べよう。',
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during rated and online games, AI vs AI, lessons and puzzles. It comes back when you play the AI or a friend.',
  offNote: 'The coach is off. Switch it on at the top right to see win chances, stake counts and explained candidate moves.',
  overRv: 'The game is over. Analyse it and a move-by-move review (best moves, mistakes and why) appears here.',
  oppTurn: 'Your rival’s turn. Guess which throw would suit them best.',
  calc: 'Thinking about the candidates…',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  wp: 'Win', race: 'Race', gold: 'Stakes', 'gold.pool': ' (pool {p})', home: 'Home',
  'race.v': '{d} {w}', 'race.ahead': 'ahead', 'race.behind': 'behind', 'race.even': 'even',
  rollFirst: 'Throw the beans first. You move as many squares as marked beans: 1 is 16%, 2 is 31%, 3 is 31%, 4 is 16%. All five marked is 10 (3%); none is no move (3%).',
  recWhy: 'For this throw the first choice is “{c}”. Your win chance after it: {p}%.',
  recSharp: 'The second choice is clearly worse ({x} less) — play this one precisely.',
  recBranch: 'The candidates are close: a fork in the road. Pick the plan you like.',
  recOnly: 'This is the only move.',
  brH: 'Fork — plans to choose from', brIntro: 'None of these is much worse than another.',
  cdH: 'Candidates and plans', cdIntro: 'The candidates, by plan (hover or tap a row to see the arrow on the board).',
  'gap.best': 'Best', 'gap.eq': 'About the same', 'gap.lt': 'A bit worse', 'gap.bad': 'Worse',
  'tt.enter': 'Enter to square {to}', 'tt.move': 'Piece on {from} to {to}', 'tt.home': 'Piece on {from} home',
  'c.home': 'Home', 'b.home': 'Bring a piece home', 'x.home': 'Home with the exact throw — you take {a} from your rival.',
  'c.cap': 'Capture', 'b.cap': 'Capture in the centre', 'x.cap': 'Capture the rival piece on a centre square: it goes back to waiting and you take 1.',
  'c.again': 'Again', 'b.again': 'Arm end: throw again', 'x.again': 'Land on a rounded arm-end square and you throw again — two moves in one turn.',
  'c.pen': 'Marked', 'b.pen': 'Land on a marked square (pay)', 'x.pen': 'This lands on a marked square, so you pay {a} to your rival. First check whether another piece can use the same throw.',
  'c.escape': 'Escape', 'b.escape': 'Save a threatened piece', 'x.escape': 'Moves the piece threatened in the centre ({r0}% to be captured) to a square with {r1}%.',
  'c.enter': 'Enter', 'b.enter': 'Bring a piece on', 'x.enter': 'Brings a waiting piece on. With pieces already on the board only a 1 (16%) enters, so enter when you can.',
  'c.risk': 'Centre', 'b.risk': 'Step onto a centre square', 'x.risk': 'Lands on a centre square. It is captured on your rival’s next turn with {r1}%.',
  'c.adv': 'Advance', 'b.adv': 'Move ahead', 'x.adv': 'Moves a piece ahead ({left} squares from home).',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fold',
  'tp.risk': 'Your piece on {p} in the centre is captured next turn with {r}%.',
  'tp.centre': 'Captures happen only on the four centre squares. Elsewhere you cannot land on a rival piece.',
  'tp.goldLow': 'You have {a} left. At 0 you lose — beware of marked squares and of throwing 0.',
  'tp.enter1': '{n} piece(s) waiting. With pieces on the board, only a 1 (16%) brings one on.',
  'tp.enterFree': 'You have no piece on the board, so any throw enters (onto the square it counts to).',
  'tp.stuck': 'As things stand, {p}% of your next throws leave you with no move (then you pay {a} to the pool). More pieces that can move lower it.',
  'tp.again': 'Your piece on {p} reaches an arm end with a {n} and throws again.',
  'tp.pen': 'Your piece on {p} lands on a marked square with a {n} ({a} to your rival). Keep another piece able to use that throw.',
  'tp.exact': 'You go home only with the exact throw: 1 from the last square, 2 from the one before, and so on.',
  'tp.raceAhead': 'You lead the race by {d}. Avoid paying squares and run home.', 'tp.raceBehind': 'You trail the race by {d}. Use the arm ends to gain extra throws.',
  'tp.openBell': 'Opening: your first piece enters with any throw. After that you wait for 1s, so aim the piece on the board at the arm ends meanwhile.',
  'tp.openPop': 'Opening: only a 1 enters. The entry square is in the centre, where a nearby rival piece can capture.',
  'tp.prob': 'Bean chances: 1 = 16%, 2 = 31%, 3 = 31%, 4 = 16%, 10 = 3%, 0 = 3%.',
  'tp.goldBell': 'In Bell’s rules the winner is whoever brings six home first. The win chance here does not count stakes: they are what the winner takes.',
  'q.best': '◎ Best', 'q.good': '○ Good', 'q.dubious': '△ Dubious', 'q.bad': '✕ Mistake',
  prev: 'Last move {m}: {q}', prevBest: 'Same as the AI’s first choice.', prevAlt: 'The AI’s first choice was {m} ({c}), {x} better.', prevForced: 'There was only one move.',
  'lp.pen': '💡Tip: before landing on a marked square, check whether another piece can use the same throw.', 'lp.again': '💡Tip: first look for a piece that reaches an arm end (throw again).', 'lp.centre': '💡Tip: the four centre squares are where captures happen — count the distance to rival pieces first.', 'lp.count': '💡Tip: compare which move leaves you more usable throws next turn.',
},
};
const S = { lists: new Map(), open: false, hov: null };
let card = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tx(k, v) { let x = (TX[LANG] || TX.en)[k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pct = x => Math.round(x * 100) + '%';
function usable() { return !!game && !special && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp'); }
function active() { return !!settings.coach && usable(); }
function mine() { const st = curState(); return settings.mode === 'pvp' || st.turn === game.human; }
const rl = st => E.RULES[st.rule];
const onBoard = (st, sd) => st.pos[sd].filter(p => p >= 1 && p <= rl(st).L).length;
// 次の番に「動かせる駒がない」目が出る確率（0 の目は除く）
function stuckProb(st) { let p = 0; for (let k = 1; k < E.STEPS.length; k++) if (!E.legalMoves(st, E.STEPS[k]).length) p += E.PROB[k]; return p; }
function stage(st) { const r = rl(st), all = st.pos[0].concat(st.pos[1]); const started = all.filter(p => p > 0).length, home = all.filter(p => p > r.L).length; if (started <= 3 && st.round === 1 && game.plies.length < 14) return 'open'; return home >= r.pieces ? 'end' : 'mid'; }
// 手の方針：上がる／取る（中央）／もう一度のマス／印のマス（払う）／危険から逃げる／入場／前進
function classify(st, m, n) {
  const r = rl(st), me = st.turn, after = E.apply(st, m, n != null ? n : m.to - m.from).state;
  const k = st.pos[me].indexOf(m.from), rB = hitRisk(st, me), rA = after.round === st.round ? hitRisk(after, me) : rB.map(() => 0);
  const r0 = k >= 0 ? rB[k] : 0, r1 = k >= 0 ? rA[k] : 0, cAfter = rA.reduce((a, b) => a + b, 0);
  let kind;
  if (m.finish) kind = 'home';
  else if (m.capture) kind = 'cap';
  else if (m.again) kind = 'again';
  else if (m.pen) kind = 'pen';
  else if (r0 > .1 && r1 < r0 - .08) kind = 'escape';
  else if (m.enter) kind = 'enter';
  else if (r.capture && r1 > .1) kind = 'risk';
  else kind = 'adv';
  return { k: kind, r: Math.round(cAfter * 100), r0: Math.round(r0 * 100), r1: Math.round(r1 * 100), a: m.pen ? Math.min(r.penSq, st.gold[me]) : r.home, to: m.to, left: r.goal - m.to };
}
function ttl(st, m) { return m.enter ? tx('tt.enter', { to: m.to }) : m.finish ? tx('tt.home', { from: m.from }) : tx('tt.move', { from: m.from, to: m.to }); }
function listFor(st, n) {
  const key = E.key(st) + '#' + n;
  if (S.lists.has(key)) return S.lists.get(key);
  const v = E.evaluate(st, n, 2); S.lists.set(key, v); if (S.lists.size > 300) S.lists.delete(S.lists.keys().next().value);
  return v;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= .01 ? ['gap.eq', 'g1'] : d <= .04 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const CCLS = { home: 'c-mat', cap: 'c-atk', again: 'c-dev', pen: 'c-atk', escape: 'c-def', enter: 'c-dev', risk: 'c-atk', adv: 'c-dev' };
function qOf(loss, only) { return only || loss < .005 ? 0 : loss < .03 ? 1 : loss < .08 ? 2 : 3; }
function verdictHtml() {
  // 直前の自分の手（二人対戦はどちらかの直前の手）
  const L = game.plies; let i = cur - 1;
  while (i >= 0 && !(L[i].m && (settings.mode === 'pvp' || L[i].s === game.human))) i--;
  if (i < 0 || cur - i > 4) return '';
  const p = L[i], st = posAt(i); if (!p.n) return '';
  const ev = listFor(st, p.n); if (!ev.length) return '';
  const pl = ev.find(e => e.move.from === p.m.from), best = ev[0], loss = Math.max(0, best.wp - (pl ? pl.wp : best.wp));
  const g = qOf(loss, ev.length === 1), qs = ['q.best', 'q.good', 'q.dubious', 'q.bad'][g];
  const mt = plyText(st, p, false);
  let h = ev.length === 1 ? tx('prevForced') : g === 0 ? tx('prevBest') : tx('prevAlt', { m: plyText(st, { s: p.s, n: p.n, m: best.move }, false), c: tx('c.' + classify(st, best.move, p.n).k), x: pct(loss) });
  if (g >= 2) { const c = classify(st, best.move, p.n).k, mine = pl ? classify(st, pl.move, p.n).k : ''; h += ' ' + tx(mine === 'pen' ? 'lp.pen' : c === 'again' ? 'lp.again' : c === 'cap' || mine === 'risk' ? 'lp.centre' : 'lp.count'); }
  return CoachKit.verdict(g, esc(tx('prev', { m: mt, q: tx(qs) })), esc(h));
}
function summary(st) {
  const me = st.turn, r = rl(st), rc = race(st), d = rc.pips[1 - me] - rc.pips[me];
  const w = E.winProb(st, 1), chips = [];
  if (settings.eval) chips.push({ k: tx('wp'), v: esc(pct(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('race'), v: esc(tx('race.v', { d: Math.abs(d), w: tx(d > 0 ? 'race.ahead' : d < 0 ? 'race.behind' : 'race.even') })), cls: d > 0 ? 'pos' : d < 0 ? 'neg' : '' });
  chips.push({ k: tx('gold'), v: esc(`${st.gold[me]} : ${st.gold[1 - me]}` + (st.pool ? tx('gold.pool', { p: st.pool }) : '')), cls: st.gold[me] > st.gold[1 - me] ? 'pos' : st.gold[me] < st.gold[1 - me] ? 'neg' : '' });
  chips.push({ k: tx('home'), v: esc(`${st.pos[me].filter(p => p >= r.goal).length} : ${st.pos[1 - me].filter(p => p >= r.goal).length}`) });
  return { html: CoachKit.summary(chips), d };
}
function tipsOf(st, cl, d) {
  const me = st.turn, r = rl(st), out = [], stg = stage(st), wait = st.pos[me].filter(p => p === 0).length, on = onBoard(st, me);
  // 取られる危険（広く知られたルール：中央の4マスだけ）
  if (r.capture) {
    const risk = hitRisk(st, me), list = [];
    st.pos[me].forEach((p, k) => { if (p >= 1 && p <= r.L && risk[k] > .005) list.push({ v: risk[k], p }); });
    list.sort((a, b) => b.v - a.v);
    list.slice(0, 2).forEach(x => out.push({ html: esc(tx('tp.risk', { p: x.p, r: Math.round(x.v * 100) })), hi: x.v >= .2 }));
    out.push({ html: esc(tx('tp.centre')) });
    if (st.gold[me] <= 2) out.push({ html: esc(tx('tp.goldLow', { a: st.gold[me] })), hi: true });
  }
  // 入場：盤に駒があれば「1」の目だけ
  if (wait) out.push({ html: esc(tx(r.enterAny && !on ? 'tp.enterFree' : 'tp.enter1', { n: wait })), hi: stg === 'open' });
  // 動けない確率（ベル：動けないと場へ払う）
  if (r.penStuck && on) { const sp = stuckProb(st); if (sp >= .12) out.push({ html: esc(tx('tp.stuck', { p: Math.round(sp * 100), a: r.penStuck })), hi: sp >= .4 }); }
  // もう一度のマス・印のマスに届く目
  const reach = { e: [], p: [] };
  st.pos[me].forEach(p => { if (p < 1 || p > r.L) return; for (const n of [1, 2, 3, 4]) { const to = p + n; if (to > r.L) continue; const kd = E.kind(st.rule, me, to, st.dir[me]); if (kd === 'e' || kd === 'p') reach[kd].push({ p, n }); } });
  if (reach.e.length) out.push({ html: esc(tx('tp.again', { p: reach.e[0].p, n: reach.e[0].n })) });
  if (reach.p.length) out.push({ html: esc(tx('tp.pen', { p: reach.p[0].p, n: reach.p[0].n, a: r.penSq })) });
  if (st.pos[me].some(p => p >= r.goal - 4 && p <= r.L)) out.push({ html: esc(tx('tp.exact')) });
  if (Math.abs(d) >= 12) out.push({ html: esc(tx(d > 0 ? 'tp.raceAhead' : 'tp.raceBehind', { d: Math.abs(d) })) });
  if (stg === 'open') out.push({ html: esc(tx(r.rounds ? 'tp.openPop' : 'tp.openBell')) });
  if (!r.rounds) out.push({ html: esc(tx('tp.goldBell')) });
  out.push({ html: esc(tx('tp.prob')) });
  return out;
}
let calcT = 0;
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (PatolliCoach.sw) PatolliCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = !!game && game.plies.length > 0 && overNow(), playing = !!game && !over && atLatest() && !reviewing;
  const can = usable() && (playing || (over && !rv));
  const resting = !can && !rv && (!!special || !!rgame || settings.mode === 'watch' || settings.mode === 'online');
  if (resting) { card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.hov = null; return put(CoachKit.lessonRest ? CoachKit.lessonRest(card, `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`) : `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`); }
  const on = active();
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) return;
  const H = st => `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${st ? `<small>${esc(tx('st.' + stage(st)))}</small>` : ''}</h3>`;
  if (over) return put(H() + `<p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''), () => { const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => window.PatolliRv && PatolliRv.run(); });
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
        const items = ev.slice(0, 5).map((e, i) => ({ e, c: classify(st, e.move, r.n), drop: ev[0].wp - e.wp, i }));
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
  PatolliCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => { settings.coach = !!v; save(); CoachKit.flash(tx(v ? 'on' : 'off')); coachHover = null; render(); renderBoard(); }, label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function relabel() { if (PatolliCoach.sw) PatolliCoach.sw.sync(); if (card) card.dataset.h = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l]); }
window.PatolliCoach = { init, render, relabel, merge, tx, TX, active, usable, classify };
})();
