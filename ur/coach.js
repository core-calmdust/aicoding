/* ur/coach.js — ウル王朝のゲームのコーチ（共通仕様 shared/COACH.md、見た目は shared/coachkit.js）。
   AI戦・二人対戦で、自分の手番に表示：手番側の勝率・レース差（残り歩数）・中央のロゼット・ゴール数（要約）、推奨方針（理由つき）、
   分かれ道（上位の候補を方針で分類：取る／中央のロゼット／ロゼット／ゴール／逃げる／入場／前進／守る…、ホバー・タップで盤に矢印）、
   考え方のヒント（各駒が取られる確率、出目の確率、中央ロゼットの価値、序盤の考え方、終盤のレース）、前の手の評価（◎○△✕）。
   評価はすべてこのサイトのエンジン（ur/engine.js：期待値探索＋学習評価。RoyalUr.net の完全解析表に対する誤差は RULES-RESEARCH.md）。
   ルールの事実の出典：RoyalUr.net のルール（https://royalur.net/rules）と RoyalUr-Java（RULES-RESEARCH.md）。
   Texts: TX.ja / TX.en here, the other languages in coach-i18n.js (UrCoach.merge). */
(() => {
'use strict';
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レート戦・オンライン・AI同士・レッスン・パズルの間、コーチはお休みです。AIとの対局や二人対戦に戻ると再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、勝率・取られる確率・候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の番です。相手がどの目で、どの駒を取りにくるか予想してみよう。',
  calc: '候補手を考えています…',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  wp: '勝率', race: 'レース', center: '中央ロゼット', home: 'ゴール',
  'race.v': '{d}歩 {w}', 'race.ahead': 'リード', 'race.behind': 'ビハインド', 'race.even': '互角',
  'c8.me': 'あなた', 'c8.op': '相手', 'c8.none': '空き',
  rollFirst: 'まずサイコロを振ろう。出目の確率は 0：1/16・1：4/16・2：6/16・3：4/16・4：1/16。2がいちばん出やすい目です。',
  recWhy: 'この出目の第一候補は「{c}」の方針です。この手のあとの勝率は {p}%。',
  recSharp: '2番目の候補との差が大きく（勝率で {x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: '動かせる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。',
  cdH: '候補手と方針', cdIntro: '上位の候補を方針ごとに解説します（行にマウスを乗せる／タップすると盤に矢印）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'tt.enter': '入場して{to}へ', 'tt.move': '{from}の駒を{to}へ', 'tt.home': '{from}の駒をゴールへ',
  'c.home': 'ゴール', 'b.home': 'ゴールする', 'x.home': 'ちょうどの目でゴール。1枚ゴールさせると、残りの道（レース）が一気に縮まります。',
  'c.cap': '取る', 'b.cap': '相手の駒を取る', 'x.cap': '相手の駒を取って振り出しに戻します。相手は{d}歩も損をします。',
  'c.center': '中央ロゼット', 'b.center': '中央のロゼットを確保', 'x.center': '中央のロゼット（道の8マス目）は取られない安全地帯で、もう一度振れます。相手の通り道をふさぐ要所です。',
  'c.ros': 'ロゼット', 'b.ros': 'ロゼットでもう一度', 'x.ros': 'ロゼットに止まって、もう一度振れます。手数を1回得するのと同じです。',
  'c.escape': '逃げる', 'b.escape': 'ねらわれた駒を逃がす', 'x.escape': 'ねらわれていた駒（取られる確率 {r0}%）を、{r1}% のマスへ逃がします。',
  'c.safe': '守る', 'b.safe': '取られにくく指す', 'x.safe': 'この手のあと、あなたの駒が次に取られる確率は合計 {r}%。危険の小さい手です。',
  'c.enter': '入場', 'b.enter': '駒を増やす', 'x.enter': '新しい駒を盤に入れます。自陣の1〜4マス目は相手が来られない安全地帯です。',
  'c.adv': '前進', 'b.adv': '先へ進める', 'x.adv': '盤上の駒を進めてレースを縮めます。進めた先で取られないかも確かめよう（取られる確率 {r}%）。',
  'c.hold': '居座る', 'b.hold': '中央のロゼットを守る', 'x.hold': '中央のロゼットの駒は動かさず、別の駒で目を使います。相手の通り道をふさいだまま進められます。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.risk': '{p}の駒が次の相手の番で取られる確率は {r}%（相手の駒の1〜4マス先にいる）。', 'tp.riskBig': '{p}の駒は特にねらわれています（{r}%）。距離2は6/16＝38%で最も危険です。',
  'tp.safe': 'あなたの駒は今、どれも取られない位置にいます。', 'tp.center': '中央のロゼット（8マス目）は取られず、もう一度振れる最重要のマス。取れるなら取り、取ったら簡単には動かさないのが基本です。',
  'tp.centerOp': '相手が中央のロゼットにいます。そこには止まれないので、中央の列を通るときは追い越すように進もう。',
  'tp.prob': '出目の確率：0は1/16、1は4/16、2は6/16、3は4/16、4は1/16。',
  'tp.open': '序盤：自陣の1〜4マス目は相手に取られない安全地帯。4の目なら入場でロゼット（4マス目）に止まり、もう一度振れます。',
  'tp.open2': '序盤：自陣のロゼット（4マス目）から中央のロゼット（8マス目）へはちょうど4。駒を待機させておくと中央を取る機会が増えます。',
  'tp.race': 'もう取り合いのないレースです。目を無駄にしないよう、ゴールまでの残りが合う駒を動かそう。', 'tp.raceAhead': 'レースは {d}歩リード。取られる危険を減らして逃げ切りを。', 'tp.raceBehind': 'レースは {d}歩ビハインド。相手の駒を取る機会をねらおう。',
  'tp.exact': 'ゴールはちょうどの目だけ。14マス目の駒は1、13マス目は2…と、ゴールまでの残りの目を覚えておこう。',
  'tp.blitz': 'ブリッツでは取るともう一度振れ、ロゼットも安全ではありません。', 'tp.masters': 'マスターズは3個のサイコロ（0は4として数える）。ロゼットも安全ではありません。',
  'q.best': '◎ 最善', 'q.good': '○ 良い手', 'q.dubious': '△ 疑問手', 'q.bad': '✕ 悪手',
  prev: '前の手 {m}：{q}', prevBest: 'AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。勝率の差 {x}。', prevForced: '動かせる手が1つだけの局面でした。',
  'lp.cap': '💡コツ：取れる手があるときは、取ったあとに自分の駒が取り返される確率と比べよう。', 'lp.risk': '💡コツ：指す前に、動かした駒が相手の駒の1〜4マス先にならないか確かめよう。', 'lp.center': '💡コツ：中央のロゼットは簡単に明け渡さないこと。',
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during rated and online games, AI vs AI, lessons and puzzles. It comes back when you play the AI or a friend.',
  offNote: 'The coach is off. Switch it on at the top right to see win chances, capture risks and explained candidate moves.',
  overRv: 'The game is over. Analyse it and a move-by-move review (best moves, mistakes and why) appears here.',
  oppTurn: 'Your rival’s turn. Guess which roll would let them hit which of your pieces.',
  calc: 'Thinking about the candidates…',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  wp: 'Win', race: 'Race', center: 'Middle rosette', home: 'Home',
  'race.v': '{d} {w}', 'race.ahead': 'ahead', 'race.behind': 'behind', 'race.even': 'even',
  'c8.me': 'you', 'c8.op': 'rival', 'c8.none': 'empty',
  rollFirst: 'Roll first. The chances: 0 is 1/16, 1 is 4/16, 2 is 6/16, 3 is 4/16, 4 is 1/16 — 2 is the most common roll.',
  recWhy: 'For this roll the first choice is “{c}”. Your win chance after it: {p}%.',
  recSharp: 'The second choice is clearly worse ({x} less) — play this one precisely.',
  recBranch: 'The candidates are close: a fork in the road. Pick the plan you like.',
  recOnly: 'This is the only move.',
  brH: 'Fork — plans to choose from', brIntro: 'None of these is much worse than another.',
  cdH: 'Candidates and plans', cdIntro: 'The best candidates, by plan (hover or tap a row to see the arrow on the board).',
  'gap.best': 'Best', 'gap.eq': 'About the same', 'gap.lt': 'A bit worse', 'gap.bad': 'Worse',
  'tt.enter': 'Enter to {to}', 'tt.move': 'Piece on {from} to {to}', 'tt.home': 'Piece on {from} home',
  'c.home': 'Home', 'b.home': 'Bring a piece home', 'x.home': 'Home with the exact roll — every piece home shortens your race a lot.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'Send the rival piece back to the start: they lose {d} steps.',
  'c.center': 'Middle rosette', 'b.center': 'Take the middle rosette', 'x.center': 'The middle rosette (square 8) is safe and gives another roll. It blocks your rival’s road.',
  'c.ros': 'Rosette', 'b.ros': 'Rosette: roll again', 'x.ros': 'Land on a rosette and roll again — like gaining a whole turn.',
  'c.escape': 'Escape', 'b.escape': 'Save a threatened piece', 'x.escape': 'Moves the threatened piece ({r0}% to be hit) to a square with {r1}%.',
  'c.safe': 'Safe', 'b.safe': 'Play safe', 'x.safe': 'After this move your pieces are hit next turn with {r}% in total — a low-risk move.',
  'c.enter': 'Enter', 'b.enter': 'Bring in a piece', 'x.enter': 'Brings a new piece on. Squares 1–4 of your own row can never be reached by your rival.',
  'c.adv': 'Advance', 'b.adv': 'Move ahead', 'x.adv': 'Moves a piece ahead to shorten your race. Check it is not easy to hit there ({r}%).',
  'c.hold': 'Hold', 'b.hold': 'Keep the middle rosette', 'x.hold': 'Leaves the piece on the middle rosette and uses the roll elsewhere, so the rival’s road stays blocked.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fold',
  'tp.risk': 'Your piece on {p} is hit next turn with {r}% (it stands 1–4 squares ahead of a rival piece).', 'tp.riskBig': 'Your piece on {p} is in real danger ({r}%). Two squares ahead is the worst: 6/16 = 38%.',
  'tp.safe': 'None of your pieces can be hit right now.', 'tp.center': 'The middle rosette (square 8) is safe and gives another roll — the key square. Take it when you can and do not leave it lightly.',
  'tp.centerOp': 'Your rival holds the middle rosette. You cannot land there, so pass it in one go.',
  'tp.prob': 'Roll chances: 0 is 1/16, 1 is 4/16, 2 is 6/16, 3 is 4/16, 4 is 1/16.',
  'tp.open': 'Opening: squares 1–4 of your row are safe from your rival. With a 4 you enter onto the rosette (square 4) and roll again.',
  'tp.open2': 'Opening: from your rosette (square 4) the middle rosette (square 8) is exactly 4 away. A piece waiting there gets more chances at the centre.',
  'tp.race': 'No more contact: a pure race. Do not waste pips — move the piece whose distance home fits the roll.', 'tp.raceAhead': 'You lead the race by {d}. Cut the risks and run home.', 'tp.raceBehind': 'You trail the race by {d}. Look for chances to hit.',
  'tp.exact': 'You go home only with the exact roll: from square 14 you need 1, from 13 you need 2, and so on.',
  'tp.blitz': 'In Blitz a capture gives another roll, and rosettes are not safe.', 'tp.masters': 'Masters uses three dice (0 counts as 4), and rosettes are not safe.',
  'q.best': '◎ Best', 'q.good': '○ Good', 'q.dubious': '△ Dubious', 'q.bad': '✕ Mistake',
  prev: 'Last move {m}: {q}', prevBest: 'Same as the AI’s first choice.', prevAlt: 'The AI’s first choice was {m} ({c}), {x} better.', prevForced: 'There was only one move.',
  'lp.cap': '💡Tip: when you can capture, compare it with the risk of being hit back.', 'lp.risk': '💡Tip: before moving, check the piece does not land 1–4 squares ahead of a rival piece.', 'lp.center': '💡Tip: do not give up the middle rosette lightly.',
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
function riskSum(st, side) { return E.hitRisk(st, side).reduce((a, b) => a + b, 0); }
function centerOf(st) { const r = rl(st); for (const s of [0, 1]) for (const p of st.pos[s]) if (p >= 1 && p < r.goal && r.rosIdx[p] && r.shared[s][p] && E.coords(st.rule, s, p)[1] === 3) return s; return -1; }
// contact: both sides still have a piece that has not passed the last shared square (a capture can still happen)
function contact(st) { const r = rl(st); return [0, 1].every(sd => { const last = r.shared[sd].lastIndexOf(true); return st.pos[sd].some(p => p <= last); }); }
function stage(st) { const r = rl(st); const h = st.pos[0].concat(st.pos[1]); const started = h.filter(p => p > 0).length; if (game.plies.length < 8 && started <= 4) return 'open'; return contact(st) ? 'mid' : 'end'; }
function classify(st, m, before) {
  const r = rl(st), me = st.turn, after = E.apply(st, m).state;
  const rAfter = E.hitRisk(after, me), rBefore = E.hitRisk(st, me);
  const k = m.piece != null ? m.piece : st.pos[me].indexOf(m.from);
  // the middle rosette is a safe square only where rosettes are safe (Finkel); in Blitz / Masters it is just a rosette
  const isCenter = r.safeRosettes && m.to < r.goal && r.rosIdx[m.to] && r.shared[me][m.to];
  const fromCenter = r.safeRosettes && m.from > 0 && r.rosIdx[m.from] && r.shared[me][m.from];
  const cAfter = rAfter.reduce((a, b) => a + b, 0), r0 = k >= 0 ? rBefore[k] : 0, r1 = k >= 0 ? rAfter[k] : 0;
  let kind;
  if (m.finish) kind = 'home';
  else if (m.capture) kind = 'cap';
  else if (isCenter) kind = 'center';
  else if (m.rosette) kind = 'ros';
  else if (r0 > .15 && r1 < r0 - .1) kind = 'escape';
  else if (m.enter) kind = 'enter';
  else if (r.safeRosettes && centerOf(st) === me && !fromCenter && st.pos[me].some(p => p > 0 && r.rosIdx[p] && r.shared[me][p])) kind = 'hold';
  else if (cAfter < .1) kind = 'safe';
  else kind = 'adv';
  const opBack = m.capture ? m.to : 0;
  return { k: kind, r: Math.round(cAfter * 100), r0: Math.round(r0 * 100), r1: Math.round(r1 * 100), d: opBack };
}
function ttl(st, m) { const r = rl(st); return m.enter ? tx('tt.enter', { to: m.to }) : m.finish ? tx('tt.home', { from: m.from }) : tx('tt.move', { from: m.from, to: m.to }); }
function listFor(st, n) {
  const key = E.key(st) + '#' + n;
  if (S.lists.has(key)) return S.lists.get(key);
  const v = E.evaluate(st, n); S.lists.set(key, v); if (S.lists.size > 300) S.lists.delete(S.lists.keys().next().value);
  return v;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= .01 ? ['gap.eq', 'g1'] : d <= .04 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const CCLS = { home: 'c-mat', cap: 'c-atk', center: 'c-mat', ros: 'c-dev', escape: 'c-def', safe: 'c-def', enter: 'c-dev', adv: 'c-dev', hold: 'c-def' };
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
  if (g >= 2) { const c = classify(st, best.move).k; h += ' ' + tx(c === 'cap' ? 'lp.cap' : c === 'center' || c === 'hold' ? 'lp.center' : 'lp.risk'); }
  return CoachKit.verdict(g, esc(tx('prev', { m: mt, q: tx(qs) })), esc(h));
}
function summary(st) {
  const me = st.turn, r = rl(st), rc = E.raceCount(st), d = rc.pips[1 - me] - rc.pips[me];
  const w = E.winProb(st), c8 = centerOf(st), chips = [];
  if (settings.eval) chips.push({ k: tx('wp'), v: esc(pct(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('race'), v: esc(tx('race.v', { d: Math.abs(d), w: tx(d > 0 ? 'race.ahead' : d < 0 ? 'race.behind' : 'race.even') })), cls: d > 0 ? 'pos' : d < 0 ? 'neg' : '' });
  if (st.rule === 'finkel') chips.push({ k: tx('center'), v: esc(tx(c8 === me ? 'c8.me' : c8 < 0 ? 'c8.none' : 'c8.op')), cls: c8 === me ? 'pos' : c8 >= 0 ? 'neg' : '' });
  chips.push({ k: tx('home'), v: esc(`${st.pos[me].filter(p => p >= r.goal).length} : ${st.pos[1 - me].filter(p => p >= r.goal).length}`) });
  return { html: CoachKit.summary(chips), d };
}
function tipsOf(st, cl, d) {
  const me = st.turn, r = rl(st), risk = E.hitRisk(st, me), list = [], stg = stage(st);
  st.pos[me].forEach((p, k) => { if (p > 0 && p < r.goal && risk[k] > .005) list.push({ v: risk[k], k: risk[k] >= .3 ? 'tp.riskBig' : 'tp.risk', p }); });
  list.sort((a, b) => b.v - a.v);
  const out = list.slice(0, 2).map(x => ({ html: esc(tx(x.k, { p: x.p, r: Math.round(x.v * 100) })), hi: x.v >= .3 }));
  if (!list.length && st.pos[me].some(p => p > 0 && p < r.goal)) out.push({ html: esc(tx('tp.safe')) });
  if (st.rule === 'blitz') out.push({ html: esc(tx('tp.blitz')) }); else if (st.rule === 'masters') out.push({ html: esc(tx('tp.masters')) });
  if (stg === 'open') { out.push({ html: esc(tx('tp.open')), hi: true }); if (st.rule === 'finkel') out.push({ html: esc(tx('tp.open2')) }); }
  const c8 = centerOf(st);
  if (st.rule === 'finkel') out.push({ html: esc(tx(c8 >= 0 && c8 !== me ? 'tp.centerOp' : 'tp.center')) });
  if (stg === 'end') out.push({ html: esc(tx('tp.race')), hi: true });
  else if (Math.abs(d) >= 6) out.push({ html: esc(tx(d > 0 ? 'tp.raceAhead' : 'tp.raceBehind', { d: Math.abs(d) })) });
  if (st.pos[me].some(p => p >= r.goal - 4 && p < r.goal)) out.push({ html: esc(tx('tp.exact')) });
  out.push({ html: esc(tx('tp.prob')) });
  return out;
}
let calcT = 0;
function render() {
  if (!card) return;
  if (UrCoach.sw) UrCoach.sw.sync();
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
  if (over) return put(H() + `<p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''), () => { const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => window.UrRv && UrRv.run(); });
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
  UrCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => { settings.coach = !!v; save(); CoachKit.flash(tx(v ? 'on' : 'off')); coachHover = null; render(); renderBoard(); }, label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function relabel() { if (UrCoach.sw) UrCoach.sw.sync(); if (card) card.dataset.h = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l]); }
window.UrCoach = { init, render, relabel, merge, tx, TX, active, usable, classify };
})();
