/* ludo/coach.js — ルドー・パチーシのコーチ（共通仕様 shared/COACH.md、見た目は shared/coachkit.js）。
   AI戦・二人以上の対戦で、人の番に表示：勝率・上がり・残りの歩数・ねらわれている駒（要約）、推奨方針（理由つき）、
   分かれ道（上位の候補を方針で分類：上がり／取る／出す／ホーム列・自分の道／安全マス・城／逃げる／ペア／前進／パス。
   ホバー・タップで盤に印）、考え方のヒント（各駒が取られる確率、目の確率、安全マス・城、ペア、恵み）、前の手の評価（◎○△✕）。
   評価はこのサイトのエンジン（ludo/engine.js の Lv.20：次の1投までの期待値。勝率は自己対局から当てはめた式 E.winProb）。
   ルール：ルドーは Ludo King に近い既定、パチーシは代表的なルール（claude/ludo-spec.md）。
   Texts: CTX.ja / CTX.en here, the other languages in coach-i18n.js (LudoCoach.merge). Uses the globals of app.js. */
(() => {
'use strict';
const CTX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レート戦・AI同士・レッスン・パズルの間、コーチはお休みです。AIとの対局や二人以上の対戦に戻ると再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、勝率・取られる確率・候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '{p}の番です。どの目が出たら、あなたのどの駒がねらわれるか考えてみよう。',
  calc: '候補手を考えています…',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  wp: '勝率', home: '上がり', left: '残り', danger: 'ねらわれ', 'left.v': '{a}歩（相手 {b}）', 'danger.v': '{n}つ',
  rollFirst: { ludo: 'まず振ろう。どの目も 1/6。6なら駒を出せて、もう一度振れます（6が3回続くと交代）。', pachisi: 'まず投げよう。口が上の数で目が決まります：2〜4 がよく出て、25・10・6 は「恵み」（駒を出せて、もう一度投げられる）。' },
  recWhy: 'この目の第一候補は「{c}」の方針です。この手のあとの勝率は {p}%。',
  recSharp: '2番目の候補との差が大きく（勝率で {x}）、ここは正確に選びたい場面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: '動かせる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。',
  cdH: '候補手と方針', cdIntro: '上位の候補を方針ごとに解説します（行にマウスを乗せる／タップすると盤に印）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'tt.enter': '陣地の駒を出す', 'tt.move': '{from}マス目の駒を{to}マス目へ', 'tt.home': '{from}マス目の駒を上がりへ', 'tt.pass': 'パス（動かさない）',
  'c.home': '上がり', 'b.home': '駒を上げる', 'x.home': 'ちょうどの目でゴールへ。上がった駒はもう取られません。{again}',
  'c.cap': '取る', 'b.cap': '相手の駒を取る', 'x.cap': '{v}の駒（{d}マス進んでいた）を振り出しに戻します。取ったらもう一度{roll}。',
  'c.enter': '出す', 'b.enter': '陣地から駒を出す', 'x.enter': '新しい駒を盤に出します。使える駒が増えると、目の使い道が増えます。',
  'c.column': { ludo: 'ホーム列', pachisi: '自分の道' }, 'b.column': { ludo: 'ホーム列に入る', pachisi: '自分の道に戻る' },
  'x.column': { ludo: '自分の色のホーム列に入ります。ここではもう取られません。', pachisi: '自分の腕の外側の列に戻ってきました。もうすぐチャルコーニへ帰れます。' },
  'c.safe': { ludo: '安全マス', pachisi: '城' }, 'b.safe': { ludo: '安全マスに止まる', pachisi: '城に入る' },
  'x.safe': { ludo: '星やスタートのマスでは取られません。', pachisi: '×印の城では取られず、相手は同じ城に止まれません。' },
  'c.escape': '逃げる', 'b.escape': 'ねらわれた駒を逃がす', 'x.escape': 'ねらわれていた駒（取られる確率 {r0}%）を、{r1}% のマスへ逃がします。',
  'c.pair': 'ペア', 'b.pair': '2つ並べて守る', 'x.pair': '同じ色の駒2つが並んだマスには、相手は止まれません（取られない）。',
  'c.adv': '前進', 'b.adv': '先へ進める', 'x.adv': '駒を進めてゴールに近づけます。進めた先で取られる確率は {r}%。',
  'c.pass': 'パス', 'b.pass': 'パスする', 'x.pass': '動かすと悪くなるときは、パスもできます（パチーシ）。',
  'w.again': '（ルドーではもう一度振れます）', 'w.roll': { ludo: '振れます', pachisi: '投げられます' },
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.risk': '{p}マス目の駒が次に取られる確率は {r}%。', 'tp.riskBig': '{p}マス目の駒は特にねらわれています（{r}%）。後ろ1〜6マスに相手の駒がいるマスは危険です。',
  'tp.safe': 'あなたの駒は今、どれも取られにくい位置にいます。',
  'tp.six': '陣地の駒は6でしか出られません（1回で 1/6＝17%）。6が出たら、出すか進めるかを比べよう。',
  'tp.star': '星とスタートのマスは安全マス。そこにいる駒は取られません。',
  'tp.pair': '同じ色2つが並ぶと、相手はそのマスに止まれません。危ない場所では並べて守ろう。',
  'tp.column': 'ホーム列に入った駒はもう安全。真ん中へはちょうどの目で入ります。',
  'tp.exact': '上がりにはちょうどの目が必要です。ホーム列の手前の駒は、余る目では動けません。',
  'tp.cowrie': '口が上の数と確率：0→25（1/64）、1→10（6/64）、2（15/64）、3（20/64）、4（15/64）、5（6/64）、6（1/64）。25・10・6 は恵み。',
  'tp.castle': '×印の城は安全。相手の駒がいる城には止まれないので、城は通り道をふさぐ壁にもなります。',
  'tp.team': '向かい合う色は味方。味方の駒とは同じマスに並べられ、取り合いません。',
  'tp.last': '上がりの1マス手前の駒は、恵み（25・10・6）の1歩でしか上がれません。早めに手前で止めないように。',
  'tp.grace': '恵みの目では、その数だけ進む代わりに駒1つを1マスだけ進めることもできます。',
  'tp.ahead': '勝率はリード（{p}%）。取られる危険の小さい手で逃げ切りをねらおう。', 'tp.behind': '勝率はビハインド（{p}%）。相手の駒を取る機会をねらおう。',
  'tp.prob': 'どの目も 1/6。6のあとはもう一度振れます。駒の後ろ1〜6マスにいる相手の駒は、1回でそのマスに届く可能性があります。',
  'q.best': '◎ 最善', 'q.good': '○ 良い手', 'q.dubious': '△ 疑問手', 'q.bad': '✕ 悪手',
  prev: '前の手 {m}：{q}', prevBest: 'AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。勝率の差 {x}。', prevForced: '動かせる手が1つだけでした。',
  'lp.cap': '💡コツ：取れる駒があるときは、まず取ることを考えよう（取るともう一度）。', 'lp.risk': '💡コツ：動かした先が相手の駒の1〜6マス先にならないか確かめよう。', 'lp.enter': '💡コツ：6が出たら、駒を出すかどうかを必ず比べよう。',
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during rated games, AI vs AI, lessons and puzzles. It comes back when you play the AI or friends.',
  offNote: 'The coach is off. Switch it on at the top right to see win chances, capture risks and explained candidate moves.',
  overRv: 'The game is over. Analyse it and a move-by-move review (best moves, mistakes and why) appears here.',
  oppTurn: '{p} to play. Which roll would let them hit which of your pieces?',
  calc: 'Thinking about the candidates…',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  wp: 'Win', home: 'Home', left: 'To go', danger: 'Threatened', 'left.v': '{a} (rival {b})', 'danger.v': '{n}',
  rollFirst: { ludo: 'Roll first. Each number is 1/6. A 6 brings a piece out and rolls again (three 6s in a row end the turn).', pachisi: 'Throw first. The mouths up set the throw: 2–4 are common; 25, 10 and 6 are graces (bring a piece in and throw again).' },
  recWhy: 'For this roll the first choice is “{c}”. Your win chance after it: {p}%.',
  recSharp: 'The second choice is clearly worse ({x} less) — choose carefully here.',
  recBranch: 'The candidates are close: a fork in the road. Pick the plan you like.',
  recOnly: 'This is the only move.',
  brH: 'Fork — plans to choose from', brIntro: 'None of these is much worse than another.',
  cdH: 'Candidates and plans', cdIntro: 'The best candidates, by plan (hover or tap a row to see it on the board).',
  'gap.best': 'Best', 'gap.eq': 'About the same', 'gap.lt': 'A bit worse', 'gap.bad': 'Worse',
  'tt.enter': 'Bring a piece out', 'tt.move': 'Piece on {from} to {to}', 'tt.home': 'Piece on {from} home', 'tt.pass': 'Pass (no move)',
  'c.home': 'Home', 'b.home': 'Bring a piece home', 'x.home': 'Into the centre with the exact roll. A piece home can no longer be hit. {again}',
  'c.cap': 'Capture', 'b.cap': 'Capture a rival piece', 'x.cap': 'Sends the {v} piece ({d} squares along) back to its start. A capture {roll} again.',
  'c.enter': 'Bring out', 'b.enter': 'Bring a piece out', 'x.enter': 'Puts a new piece on the board. More pieces in play means more ways to use each roll.',
  'c.column': { ludo: 'Home column', pachisi: 'Own lane' }, 'b.column': { ludo: 'Enter the home column', pachisi: 'Back to your own lane' },
  'x.column': { ludo: 'Into your colour’s home column, where it can no longer be hit.', pachisi: 'Back on the outer lane of your own arm — almost home to the charkoni.' },
  'c.safe': { ludo: 'Safe square', pachisi: 'Castle' }, 'b.safe': { ludo: 'Stop on a safe square', pachisi: 'Into a castle' },
  'x.safe': { ludo: 'Pieces on a star or a start square cannot be hit.', pachisi: 'A piece in a castle (×) cannot be hit, and rivals cannot stop on that castle.' },
  'c.escape': 'Escape', 'b.escape': 'Save a threatened piece', 'x.escape': 'Moves the threatened piece ({r0}% to be hit) to a square with {r1}%.',
  'c.pair': 'Pair', 'b.pair': 'Pair up to protect', 'x.pair': 'Rivals cannot stop on a square held by two pieces of one colour, so neither can be hit.',
  'c.adv': 'Advance', 'b.adv': 'Move ahead', 'x.adv': 'Moves a piece closer to home. Chance to be hit there: {r}%.',
  'c.pass': 'Pass', 'b.pass': 'Pass', 'x.pass': 'When every move makes things worse, you may pass (pachisi).',
  'w.again': '(In ludo you roll again.)', 'w.roll': { ludo: 'rolls', pachisi: 'throws' },
  tipsH: 'Things to think about', more: 'More tips ({n})', less: 'Less',
  'tp.risk': 'Your piece on {p} is hit next turn with {r}%.', 'tp.riskBig': 'Your piece on {p} is in real danger ({r}%). Rival pieces 1–6 squares behind can reach it.',
  'tp.safe': 'None of your pieces is easy to hit right now.',
  'tp.six': 'Pieces in the yard come out only on a 6 (1/6 = 17% per roll). On a 6, compare bringing out with moving on.',
  'tp.star': 'Stars and start squares are safe: pieces there cannot be hit.',
  'tp.pair': 'Two pieces of one colour on a square block it: rivals cannot stop there. Pair up in dangerous places.',
  'tp.column': 'A piece in the home column is safe for good. It needs the exact roll to reach the centre.',
  'tp.exact': 'Going home needs the exact number. A piece near the end cannot use a roll that is too big.',
  'tp.cowrie': 'Mouths up and chances: 0→25 (1/64), 1→10 (6/64), 2 (15/64), 3 (20/64), 4 (15/64), 5 (6/64), 6 (1/64). 25, 10 and 6 are graces.',
  'tp.castle': 'Castles (×) are safe. Rivals cannot stop on a castle you hold, so a castle also blocks their way.',
  'tp.team': 'Opposite colours are partners: they can share a square and never capture each other.',
  'tp.last': 'A piece one short of home needs the single step of a grace (25, 10, 6). Don’t park there too early.',
  'tp.grace': 'With a grace you may move one piece a single step instead of the full throw.',
  'tp.ahead': 'You are ahead ({p}%). Prefer low-risk moves and run home.', 'tp.behind': 'You are behind ({p}%). Look for chances to capture.',
  'tp.prob': 'Each number is 1/6 and a 6 rolls again. A rival piece 1–6 squares behind yours can reach it in one roll.',
  'q.best': '◎ Best', 'q.good': '○ Good', 'q.dubious': '△ Dubious', 'q.bad': '✕ Mistake',
  prev: 'Last move {m}: {q}', prevBest: 'The AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}). Win chance difference {x}.', prevForced: 'That was the only move.',
  'lp.cap': '💡Tip: when a capture is on, think about it first (it earns another roll).', 'lp.risk': '💡Tip: check the piece doesn’t end 1–6 squares in front of a rival.', 'lp.enter': '💡Tip: on a 6, always weigh bringing a piece out.',
},
};
const S = { lists: new Map(), open: false };
let card = null, calcT = 0;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tx(k, v) {
  let x = (CTX[LANG] || CTX.en)[k]; if (x === undefined) x = CTX.en[k]; if (x === undefined) return k;
  if (x && typeof x === 'object') x = x[G && G.state ? G.state.rule : 'ludo'] || x.ludo;
  if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const pct = x => Math.round(x * 100) + '%';
function usable() { return !!G && !SP && !G.rated && (G.mode === 'ai' || G.mode === 'pvp'); }
function active() { return settings.coach !== false && usable(); }
const lastOf = st => E.lastOf(st);
function stage(st) { const L = lastOf(st), me = st.turn, tot = st.pos[me].reduce((a, p) => a + (p < 0 ? 0 : Math.min(p, L)), 0) / (4 * L); return tot < .2 ? 'open' : tot < .65 ? 'mid' : 'end'; }
function leftOf(st, seat) { const L = lastOf(st); return st.pos[seat].reduce((a, p) => a + (p < 0 ? L + 6 : Math.max(0, L - p)), 0); }
function threats(st, seat) { const L = lastOf(st); return st.pos[seat].map(p => p < 0 || p >= L ? 0 : E.threatProb(st, seat, p)); }
function classify(st, m, th) {
  const seat = st.turn, rule = st.rule, L = lastOf(st);
  if (!m || m.pass) return { k: 'pass' };
  const after = E.apply(st, m, th).state, r1 = m.home ? 0 : E.threatProb(after, seat, m.to), r0 = m.enter ? 0 : E.threatProb(st, seat, m.from);
  const col = rule === 'ludo' ? 51 : 75;
  let k;
  if (m.home) k = 'home';
  else if (m.cap && m.cap.length) k = 'cap';
  else if (m.enter) k = 'enter';
  else if (m.to >= col && m.from < col) k = 'column';
  else if (r0 > .12 && r1 < r0 - .08) k = 'escape';
  else if (E.isSafe(rule, E.cellOf(rule, seat, m.to))) k = 'safe';
  else if (rule === 'ludo' && after.pos[seat].filter((p, i) => i !== m.k && p === m.to).length >= 1) k = 'pair';
  else k = 'adv';
  const v = m.cap && m.cap.length ? m.cap[0] : null;
  return { k, r: Math.round(r1 * 100), r0: Math.round(r0 * 100), r1: Math.round(r1 * 100), v: v ? colName(v.seat) : '', d: v ? Math.max(0, st.pos[v.seat][v.k]) + 1 : 0,
    again: rule === 'ludo' ? tx('w.again') : '', roll: tx('w.roll') };
}
function ttl(m) { return !m || m.pass ? tx('tt.pass') : m.enter ? tx('tt.enter') : m.home ? tx('tt.home', { from: m.from + 1 }) : tx('tt.move', { from: m.from + 1, to: m.to + 1 }); }
const mvName = m => !m || m.pass ? '—' : (m.enter ? '▶' : (m.from + 1) + '→') + (m.home ? '⌂' : m.to + 1) + (m.cap && m.cap.length ? '×' : '') + (m.one ? '¹' : '');
function listFor(st, th) {
  const key = JSON.stringify([st.pos, st.turn, st.streak, th.v, th.grace]);
  if (S.lists.has(key)) return S.lists.get(key);
  const v = E.rank(st, th); S.lists.set(key, v); if (S.lists.size > 200) S.lists.delete(S.lists.keys().next().value);
  return v;
}
const same = (a, b) => !!a && !!b && (a.pass ? !!b.pass : !b.pass && a.k === b.k && a.to === b.to && a.k2 === b.k2 && !!a.back === !!b.back && String(a.use || '') === String(b.use || ''));
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= .01 ? ['gap.eq', 'g1'] : d <= .04 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const CCLS = { home: 'c-mat', cap: 'c-atk', enter: 'c-dev', column: 'c-mat', safe: 'c-def', escape: 'c-def', pair: 'c-def', adv: 'c-dev', pass: '' };
function qOf(loss, only) { return only || loss < .005 ? 0 : loss < .03 ? 1 : loss < .08 ? 2 : 3; }
function judge(p) {   // a recorded ply { seat, s, thr, m } → { q, loss, best, played, ev }
  const ev = listFor(p.s, p.thr); if (!ev.length) return null;
  const pl = ev.find(e => same(e.move, p.m)), b = ev[0], loss = Math.max(0, b.wp - (pl ? pl.wp : b.wp));
  const real = ev.filter(e => !e.move.pass).length;
  return { q: qOf(loss, real <= 1 && ev.length <= 2), loss, best: b, played: pl, ev, forced: real <= 1 && ev.length <= 2 };
}
function verdictHtml() {
  const L = G.plies || []; let i = L.length - 1;
  while (i >= 0 && !(G.mode === 'pvp' || L[i].seat === G.state.seats.find(x => G.state.ctrl[x] === 0) || G.state.ctrl[L[i].seat] === 0)) i--;
  if (i < 0 || L.length - i > 8) return '';
  const p = L[i]; if (!p.m || p.m.pass && p.forced) return '';
  const j = judge(p); if (!j) return '';
  const qs = ['q.best', 'q.good', 'q.dubious', 'q.bad'][j.q];
  const pst = { ...p.s }; const prevCol = G.state.rule;
  let h = j.forced ? tx('prevForced') : j.q === 0 ? tx('prevBest') : tx('prevAlt', { m: mvName(j.best.move), c: tx('c.' + classify(pst, j.best.move, p.thr).k), x: pct(j.loss) });
  if (j.q >= 2) { const c = classify(pst, j.best.move, p.thr).k; h += ' ' + tx(c === 'cap' ? 'lp.cap' : c === 'enter' ? 'lp.enter' : 'lp.risk'); }
  void prevCol;
  return CoachKit.verdict(j.q, esc(tx('prev', { m: mvName(p.m), q: tx(qs) })), esc(h));
}
function summary(st) {
  const me = st.turn, tm = st.team[me], L = lastOf(st), chips = [];
  const w = E.winProb(st, tm);
  chips.push({ k: tx('wp'), v: esc(pct(w)), cls: w >= .55 ? 'pos' : w <= .4 ? 'neg' : '' });
  const mine = st.seats.filter(x => st.team[x] === tm), others = st.seats.filter(x => st.team[x] !== tm);
  const sideLeft = tmSeats => tmSeats.reduce((a, x) => a + leftOf(st, x), 0);
  const a = sideLeft(mine);
  let b = Infinity; if (st.rule === 'pachisi') b = sideLeft(others); else for (const x of others) b = Math.min(b, leftOf(st, x));
  chips.push({ k: tx('left'), v: esc(tx('left.v', { a, b })), cls: a < b ? 'pos' : a > b ? 'neg' : '' });
  const hm = mine.reduce((s, x) => s + st.pos[x].filter(p => p >= L).length, 0);
  let ho = 0; if (st.rule === 'pachisi') ho = others.reduce((s, x) => s + st.pos[x].filter(p => p >= L).length, 0); else for (const x of others) ho = Math.max(ho, st.pos[x].filter(p => p >= L).length);
  chips.push({ k: tx('home'), v: esc(`${hm} : ${ho}`), cls: hm > ho ? 'pos' : hm < ho ? 'neg' : '' });
  const dn = threats(st, me).filter(r => r >= .15).length;
  if (dn) chips.push({ k: tx('danger'), v: esc(tx('danger.v', { n: dn })), cls: 'neg' });
  return { html: CoachKit.summary(chips), w };
}
function tipsOf(st, w) {
  const me = st.turn, L = lastOf(st), risk = threats(st, me), list = [], rule = st.rule;
  st.pos[me].forEach((p, k) => { if (risk[k] > .01) list.push({ v: risk[k], k: risk[k] >= .3 ? 'tp.riskBig' : 'tp.risk', p: p + 1 }); });
  list.sort((a, b) => b.v - a.v);
  const out = list.slice(0, 2).map(x => ({ html: esc(tx(x.k, { p: x.p, r: Math.round(x.v * 100) })), hi: x.v >= .3 }));
  if (!list.length && st.pos[me].some(p => p >= 0 && p < L)) out.push({ html: esc(tx('tp.safe')) });
  const yard = st.pos[me].some(p => p < 0);
  if (rule === 'ludo') {
    if (yard) out.push({ html: esc(tx('tp.six')), hi: stage(st) === 'open' });
    out.push({ html: esc(tx('tp.star')) });
    out.push({ html: esc(tx('tp.pair')) });
    if (st.pos[me].some(p => p >= 40 && p < L)) out.push({ html: esc(tx(st.pos[me].some(p => p >= 51 && p < L) ? 'tp.column' : 'tp.exact')) });
  } else {
    if (st.pos[me].some(p => p === L - 1)) out.push({ html: esc(tx('tp.last')), hi: true });
    out.push({ html: esc(tx('tp.castle')) });
    out.push({ html: esc(tx('tp.team')) });
    out.push({ html: esc(tx('tp.grace')) });
  }
  if (w >= .62) out.push({ html: esc(tx('tp.ahead', { p: Math.round(w * 100) })) });
  else if (w <= .3) out.push({ html: esc(tx('tp.behind', { p: Math.round(w * 100) })) });
  out.push({ html: esc(tx(rule === 'ludo' ? 'tp.prob' : 'tp.cowrie')) });
  return out;
}
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (LudoCoach.sw) LudoCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = !!G && G.state.over, playing = !!G && !over && !VIEW;
  const can = usable() && (playing || (over && !rv));
  const resting = !can && !rv && !!G && (!!SP || !!G.rated || G.mode === 'watch');
  if (resting) { card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); return put(CoachKit.lessonRest ? CoachKit.lessonRest(card, `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`) : `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`); }
  const on = active();
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (!can) return;
  const H = st => `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${st ? `<small>${esc(tx('st.' + stage(st)))}</small>` : ''}</h3>`;
  if (over) return put(H() + `<p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(window.LudoRv ? LudoRv.tr('btn') : 'Review')}</button></div>` + (on ? verdictHtml() : ''), () => { const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => window.LudoRv && LudoRv.run(); });
  if (!on) return put(H() + `<p class="ck-muted">${esc(tx('offNote'))}</p>`);
  const st = G.state;
  let h = H(st);
  if (!humanSeat(st.turn)) { setHover(null); return put(h + `<p class="ck-muted">${esc(tx('oppTurn', { p: colName(st.turn) }))}</p>` + verdictHtml()); }
  const sm = summary(st); h += sm.html;
  const th = G.thr;
  if (!th) h += CoachKit.rec(t(st.rule === 'pachisi' ? 'btn.throw' : 'btn.roll'), esc(tx('rollFirst')), '');
  else {
    const key = JSON.stringify([st.pos, st.turn, st.streak, th.v, th.grace]);
    if (!S.lists.has(key)) { h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; clearTimeout(calcT); calcT = setTimeout(() => { if (G && G.state === st && G.thr === th) { listFor(st, th); render(); } }, 30); }
    else {
      const ev = S.lists.get(key).filter(e => !e.move.forfeit);
      const real = ev.filter(e => !e.move.pass);
      if (real.length) {
        const items = ev.slice(0, 4).map((e, i) => ({ e, c: classify(st, e.move, th), drop: ev[0].wp - e.wp, i }));
        const b = items[0], sharp = ev.length > 1 ? ev[0].wp - ev[1].wp : 0, branch = ev.length > 1 && sharp < .01;
        let why = esc(tx('recWhy', { c: tx('c.' + b.c.k), p: Math.round(b.e.wp * 100) }));
        if (ev.length === 1 || (real.length === 1 && st.rule === 'ludo')) why = esc(tx('recOnly')); else if (sharp >= .05) why += ' ' + esc(tx('recSharp', { x: pct(sharp) })); else if (branch) why += ' ' + esc(tx('recBranch'));
        h += CoachKit.rec(tx('b.' + b.c.k), why, '');
        if (ev.length > 1) h += CoachKit.branches({ head: tx(branch ? 'brH' : 'cdH'), intro: esc(tx(branch ? 'brIntro' : 'cdIntro')), items: items.map(x => { const g = gapOf(x.drop, x.i); return { tag: tx('c.' + x.c.k), cls: CCLS[x.c.k] || '', title: esc(ttl(x.e.move)), text: esc(tx('x.' + x.c.k, x.c)), gap: tx(g[0]) + (x.drop > .005 ? ' −' + pct(x.drop) : ''), gcls: g[1], move: String(x.e.i), mvName: esc(mvName(x.e.move)) }; }) });
      }
    }
  }
  const tl = tipsOf(st, sm.w);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl, open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
// hover / tap on a candidate: its piece and its destination are marked on the board (app.js previewMove)
let hov = null;
function setHover(m) { if ((m && JSON.stringify([m.k, m.to, m.pass])) === (hov && JSON.stringify([hov.k, hov.to, hov.pass]))) return; hov = m; if (typeof previewMove === 'function') previewMove(m); }
function moveAt(u) { if (u == null || u === '' || !G || !G.thr) return null; const ms = E.legalMoves(G.state, G.thr); return ms[+u] || null; }
function put(h, after) {
  if (card.dataset.h !== h) {
    const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
    CoachKit.bind(card, {
      onMore: () => { S.open = !S.open; render(); },
      onHover: u => setHover(moveAt(u)),
      onPlay: u => { try { const m = moveAt(u); if (!m || !active() || !humanSeat(G.state.turn) || busy) return; setHover(null); commit(m); } catch (e) {} },
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
  LudoCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => settings.coach !== false, set: v => { settings.coach = !!v; save(); CoachKit.flash(tx(v ? 'on' : 'off')); setHover(null); render(); }, label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function relabel() { if (LudoCoach.sw) LudoCoach.sw.sync(); if (card) card.dataset.h = ''; render(); }
function merge(more) { for (const l in more) CTX[l] = Object.assign({}, CTX[l] || {}, more[l]); }
window.LudoCoach = { init, render, relabel, merge, tx, CTX, active, usable, classify, judge, listFor, mvName, ttl, same };
})();
