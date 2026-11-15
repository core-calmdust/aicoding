'use strict';
// ルドゥス・ラトルンクロルムのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via konane/coach.js) — shown while the
// player is to move against the AI (and in two-player games on one device): the position at a glance (形勢・取った数・盤上の駒),
// the recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan explained with what it
// does on the board, moves shown on hover / tap with arrows), prioritized "how to think" tips read from the position
// (挟める手・狙われている駒・助けられる味方…), and the verdict on the previous move (◎○△✕).
// There is no opening theory for a reconstructed game: while the counters are being placed the coach teaches the
// principles (side by side with a friend, away from the corners) from the position itself.
// Every fact shown is read from the position (E.effect: what a move encloses / frees); nothing is guessed.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (LatrCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手がどの駒を狙ってくるか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', cap: '取った数', stones: '盤上の駒', stage: '局面',
  'st.open': '配置', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'cap.v': '自分{a}・相手{b}', 'st.v': '自分{a}・相手{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  plH: '配置 — 置き方の考え方', plIntro: '駒を全部置き終わるまで、挟んでも取れません。置き終わった瞬間に挟まれない形を作っておくのが目標です。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.move': '{sq}の駒を{to}へ', 'tt.leap': '{sq}の駒で{to}へ跳ぶ', 'tt.place': '{to}に置く', 'tt.rm': '{e}を取り除く',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから勝ち切れます。取った駒の差を保ったまま、相手の駒を減らしていこう。',
  'c.dbl': '2個挟む', 'b.dbl': '2個同時に挟む', 'x.dbl': '{to}に入ると、相手の駒を{n}個同時に挟めます。相手は全部を助けるのが難しくなります。',
  'c.hit': '挟む', 'b.hit': '相手の駒を挟む', 'x.hit': '相手の{e}を両側から挟みます。裏返った駒は、次の自分の番に取れます。', 'x.hitNow': '相手の{e}を両側から挟んで、その場で取ります。',
  'c.free': '助ける', 'b.free': '味方を助ける', 'x.free': '味方を挟んでいる駒を挟み返します。裏返っていた{e}が自由になります。',
  'c.guard': '守る', 'b.guard': '狙われた駒を守る', 'x.guard': '狙われていた駒を守る手です。この手のあと、相手がすぐ挟める自分の駒は{a}個。',
  'c.leap': '跳ぶ', 'b.leap': '跳んで進む', 'x.leap': '味方を跳び越えて{to}へ。この手のあと、次に挟める相手の駒は{t}個、狙われる自分の駒は{a}個。',
  'c.adv': '寄せる', 'b.adv': '駒を寄せる', 'x.adv': '{to}へ進めます。この手のあと、次に挟める相手の駒は{t}個、狙われる自分の駒は{a}個。',
  'c.rm': '取る', 'b.rm': '挟んだ駒を取る', 'x.rm': '動かせる駒がないので、挟んでいた{e}を取り除くだけの手番です。',
  'c.pair': '並べる', 'b.pair': '味方のとなりに置く', 'x.pair': '味方のとなりの{to}に置きます。縦か横に並んだ駒は、片側を味方が守るので挟まれにくくなります。',
  'c.solo': '離して置く', 'b.solo': '空いた所に置く', 'x.solo': '{to}に置きます。まわりに味方がいない駒は、動かす段階で狙われやすいので気をつけて。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.hit': '💡コツ：相手の駒のとなりに味方がいたら、反対側に動かせる駒を探そう。', 'lp.safe': '💡コツ：動かす前に、相手に片側を押さえられて反対側が空いている駒がないか確かめよう。',
  'lp.place': '💡コツ：置くときは味方と縦か横に並べ、隅は避けよう。',
  'tp.hit': '相手の駒を挟める手があります。探してみよう。', 'tp.dbl': '1手で2個挟める手があります。',
  'tp.hang': '自分の{sq}の駒が狙われています。次の相手の手で挟まれます。', 'tp.rescue': '裏返った味方を助けられます。挟んでいる駒のどちらかを挟み返そう。',
  'tp.lost': '裏返った味方は、次の相手の番に取られます。助ける手がなければ、ほかで取り返そう。',
  'tp.rm': '裏返っている相手の駒は、この番のはじめに取り除かれます。そのあと1手動かせます。',
  'tp.ahead': '取った数でリード（自分{a}・相手{b}）。無理に攻めず、挟まれない形を保とう。', 'tp.behind': '取った数で負けています（自分{a}・相手{b}）。挟める形を作りにいこう。',
  'tp.place': '置き終わるまで駒は取られません。味方どうしを縦か横に並べ、隅は避けよう。',
  'tp.end': '駒が少なくなりました。1個の差が勝敗を決めます。動かす前に、挟まれないかを必ず確かめよう。',
  'tp.rule': '相手の駒を1個にするか、多く取った方の勝ちです。', 'tp.safe': '自分から相手の駒2個の間に入っても、挟まれたことにはなりません。',
  'tp.corner': '隅の駒は、となりの2マスを押さえられるだけで挟まれます。隅には長居しないこと。', 'tp.leapTip': '味方を跳び越えれば、離れたマスにも1手で届きます。',
  'tp.quiet': '取り合いがないまま30手ずつ進むと終了し、取った数で勝負が決まります。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.winning': '有利です。相手の挟み返しがないかだけ確かめて、着実に。', 'tp.losing': '苦しい局面。まずは狙われている駒を守ろう。',
  sep: '、',
  gl: {
    inc: { m: ['裏返った', '裏返って'], t: '裏返った駒（インキトゥス）', d: '両側から挟まれて動けなくなった駒。次の相手の番に取られますが、挟んでいる駒を挟み返せば助かります。' },
    leap: { m: ['跳び越え'], t: '跳び越え', d: 'となりの味方の駒を跳び越えて、すぐ向こうの空きマスへ進む動き。続けて何回でも跳べます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Guess which of your counters they will go for.',
  calc: 'Looking at the candidates…', form: 'Position', cap: 'Taken', stones: 'On board', stage: 'Phase',
  'st.open': 'Placing', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'cap.v': 'you {a} · them {b}', 'st.v': 'you {a} · them {b}',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is your only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan.',
  plH: 'Placing — how to think', plIntro: 'Nothing is captured until every counter is down. Aim for a shape that cannot be enclosed the moment the moves begin.',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.move': 'Move {sq} to {to}', 'tt.leap': 'Leap {sq} to {to}', 'tt.place': 'Place on {to}', 'tt.rm': 'Take off {e}',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees a win from here. Keep your lead in captures and go on reducing their counters.',
  'c.dbl': 'Two at once', 'b.dbl': 'Enclose two at once', 'x.dbl': 'On {to} you enclose {n} enemy counters at once. They can hardly rescue them all.',
  'c.hit': 'Enclose', 'b.hit': 'Enclose a counter', 'x.hit': 'Encloses the enemy counter on {e} from both sides. Face down, it is taken on your next turn.', 'x.hitNow': 'Encloses the enemy counter on {e} from both sides and takes it at once.',
  'c.free': 'Rescue', 'b.free': 'Rescue your counter', 'x.free': 'Encloses one of the holders: your face-down counter on {e} is free again.',
  'c.guard': 'Defend', 'b.guard': 'Defend a counter', 'x.guard': 'Defends a counter under attack. Afterwards the opponent can enclose {a} of your counters at once.',
  'c.leap': 'Leap', 'b.leap': 'Leap forward', 'x.leap': 'Leaps over your own counter to {to}. Afterwards you threaten {t} enemy counter(s) and {a} of yours are under attack.',
  'c.adv': 'Close in', 'b.adv': 'Bring a counter up', 'x.adv': 'Moves to {to}. Afterwards you threaten {t} enemy counter(s) and {a} of yours are under attack.',
  'c.rm': 'Take', 'b.rm': 'Take the blocked counter', 'x.rm': 'None of your counters can move, so this turn only takes off the counter on {e}.',
  'c.pair': 'Side by side', 'b.pair': 'Place next to a friend', 'x.pair': 'Place on {to}, next to a friend. Counters in a row or column cover one side of each other and are harder to enclose.',
  'c.solo': 'Apart', 'b.solo': 'Place in the open', 'x.solo': 'Place on {to}. A counter with no friend nearby is an easy target once the moves begin.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.hit': '💡Tip: a friend next to an enemy counter? Look for a counter that can reach the opposite side.', 'lp.safe': '💡Tip: before moving, look for your counters with an enemy on one side and an empty square opposite.',
  'lp.place': '💡Tip: place counters side by side with a friend, and stay out of the corners.',
  'tp.hit': 'One of your moves encloses an enemy counter. Find it!', 'tp.dbl': 'One move encloses two counters at once.',
  'tp.hang': 'Your counter on {sq} is under attack: the opponent can enclose it next move.', 'tp.rescue': 'Your face-down counter can be rescued: enclose one of its holders.',
  'tp.lost': 'Your face-down counter will be taken on the opponent’s next turn. If it cannot be rescued, win one back elsewhere.',
  'tp.rm': 'The face-down enemy counter is taken off at the start of this turn. Then you make a move.',
  'tp.ahead': 'You lead in captures (you {a}, them {b}). No need to force things — keep a shape that cannot be enclosed.', 'tp.behind': 'You are behind in captures (you {a}, them {b}). Build a shape that encloses.',
  'tp.place': 'Nothing is taken until all counters are down. Put friends side by side and avoid the corners.',
  'tp.end': 'Few counters left: one counter decides the game. Before every move, check that nothing of yours can be enclosed.',
  'tp.rule': 'Reduce the opponent to one counter, or take more than they do.', 'tp.safe': 'A counter that moves in between two enemies is not enclosed.',
  'tp.corner': 'A corner counter is enclosed by just the two squares next to it. Do not linger in a corner.', 'tp.leapTip': 'A leap over your own counter reaches a far square in one move.',
  'tp.quiet': 'After 30 moves each without a capture the game ends and the captures are compared.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.winning': 'You are ahead. Just check for counter-enclosures and play steadily.', 'tp.losing': 'A hard position. First defend the counters under attack.',
  sep: ', ',
  gl: {
    inc: { m: ['face down', 'face-down'], t: 'Face-down counter (incitus)', d: 'A counter enclosed from two sides: it cannot move and is taken on the capturer’s next turn — unless one of its holders is enclosed first.' },
    leap: { m: ['leap', 'Leaps'], t: 'Leap', d: 'A move over one of your own counters onto the empty square just beyond. Several leaps may follow in one move.' },
  },
},
};
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  const l = L(); let x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gl = h => window.CoachKit ? CoachKit.gloss(h, (TX[L()] || TX.en).gl || TX.en.gl) : h;
const pctS = x => Math.round(x * 100) + '%';
const wr = v => (1 + sOfV(v)) / 2;
const SQN = i => E.sqName(i);
// --------------------------------------------------------------------------------------------- position facts
// the counters of player p that the other side could enclose with one move if it were to move now
function targets(pos, p) {
  const q = pos.clone(); q.side = 2 - p; q.last = [-1, -1];
  const out = new Set();
  for (const m of q.movesAfter(-1, [])) { const fx = E.effect(q, E.mv(E.mFrom(m), E.mTo(m))); for (const x of fx.blocks.concat(fx.takes)) out.add(x); }
  return [...out];
}
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.st = [pos.count(us), pos.count(them)];
  f.cap = [pos.cap[us - 1], pos.cap[them - 1]];
  f.inc = [f.st[0] - pos.free(us), f.st[1] - pos.free(them)];
  f.stage = pos.placing ? 'open' : f.st[0] + f.st[1] <= 14 ? 'end' : 'mid';
  f.hit = null; f.hitN = 0; f.rescue = null; f.hang = [];
  if (!pos.placing) {
    for (const m of f.legal) {
      const fx = E.effect(pos, m), k = fx.blocks.length + fx.takes.length;
      if (k > f.hitN) { f.hitN = k; f.hit = m; }
      if (!f.rescue && fx.frees.some(x => pos.owner(x) === us)) f.rescue = m;
    }
    f.hang = targets(pos, us).filter(x => !pos.blocked(x));
  }
  return f;
}
// the plan of a move: what it does on the board
function classify(pos, m, f, v) {
  const us = pos.turn, fr = E.mFrom(m), to = E.mTo(m), fx = E.effect(pos, m);
  const base = { sq: SQN(fr), to: SQN(to), m, n: fx.blocks.length + fx.takes.length };
  if (fx.place) { const pair = E.ADJ[to].some(x => pos.owner(x) === us); return Object.assign(base, { k: pair ? 'pair' : 'solo' }); }
  if (fr === to) return Object.assign(base, { k: 'rm', e: SQN(fx.rm) });
  const q = pos.clone().play(m);
  Object.assign(base, { a: targets(q, us).filter(x => !q.blocked(x)).length, t: targets(q, 3 - us).filter(x => !q.blocked(x)).length });
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  if (base.n >= 2) return Object.assign(base, { k: 'dbl' });
  if (base.n === 1) return Object.assign(base, { k: 'hit', e: SQN(fx.blocks.concat(fx.takes)[0]), now: fx.takes.length > 0 });
  const mine = fx.frees.filter(x => pos.owner(x) === us);
  if (mine.length) return Object.assign(base, { k: 'free', e: SQN(mine[0]) });
  if (f.hang.length && base.a < f.hang.length) return Object.assign(base, { k: 'guard' });
  if (fx.leap) return Object.assign(base, { k: 'leap' });
  return Object.assign(base, { k: 'adv' });
}
const RCLS = { win: 'c-win', dbl: 'c-win', hit: 'c-mat', free: 'c-def', guard: 'c-def', leap: 'c-dev', adv: 'c-dev', rm: 'c-mat', pair: 'c-def', solo: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return k.k === 'rm' ? tx('tt.rm', k) : k.k === 'pair' || k.k === 'solo' ? tx('tt.place', k) : k.k === 'leap' ? tx('tt.leap', k) : tx('tt.move', k); }
const catTxt = k => tx(k.k === 'hit' && k.now ? 'x.hitNow' : 'x.' + k.k, k);
// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, key: '', f: null, lists: new Map(), hov: null, items: null };
let card = null;
function usable() { return !!(!lesson && !puzzle && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online')); }
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || S.lists.get(k) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], cap: [0, 0], inc: [0, 0], st: [0, 0], stage: 'mid', hang: [], hit: null, hitN: 0, rescue: null }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const L = list.slice().sort((a, b) => b.v - a.v), best = L[0].v, wb = wr(best);
  const items = [];
  for (const c of L.slice(0, 6)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, w, cl, pos) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.stage === 'open') { add('tp.place', 90, {}, 1); add('tp.corner', 60); add('tp.rule', 40); add('tp.safe', 30); return out; }
  if (pos.removable().length) add('tp.rm', 96, {}, 1);
  if (f.hitN >= 2) add('tp.dbl', 100, {}, 1); else if (f.hit != null) add('tp.hit', 98, {}, 1);
  if (f.inc[0]) add(f.rescue != null ? 'tp.rescue' : 'tp.lost', 94, {}, 1);
  if (f.hang.length) add('tp.hang', 90, { sq: f.hang.slice(0, 3).map(SQN).join(tx('sep')) }, 1);
  if (f.cap[0] >= f.cap[1] + 2) add('tp.ahead', 60, { a: f.cap[0], b: f.cap[1] }); else if (f.cap[0] + 2 <= f.cap[1]) add('tp.behind', 66, { a: f.cap[0], b: f.cap[1] });
  if (f.stage === 'end') add('tp.end', 62);
  if (pos.quiet >= E.QUIET_MAX - 24) add('tp.quiet', 64);
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  add('tp.rule', 20); add('tp.safe', 24);
  if (E.R.leap) add('tp.leapTip', 26);
  if (E.R.corner) add('tp.corner', 22);
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  const L = listAt(i);
  if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT - 1000 && mine.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && mine.v < -(WINT - 1000)) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (mine.v >= best.v - 10) q = 'best';
  if (L.length === 1) q = 'best';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v), mk = classify(pos.clone(), m, ff, mine.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') body += '<br>' + esc(tx(pos.placing ? 'lp.place' : k.n > mk.n ? 'lp.hit' : 'lp.safe'));
    } else { const k = classify(pos.clone(), m, ff, mine.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function restNow(rv, can) {
  if (can || !card) return false;
  const b = document.body.classList, st = typeof settings !== 'undefined' ? settings : {};
  if (b.contains('in-online') || st.mode === 'online') return false;
  const ls = (typeof lesson !== 'undefined' && !!lesson) || (typeof puzzle !== 'undefined' && !!puzzle && typeof puzzle !== 'function') || b.contains('in-lesson') || b.contains('in-puzzle');
  if (rv && !ls) return false;
  if (ls || b.contains('in-edit') || b.contains('in-study') || b.contains('rated-live') || st.mode === 'watch') return true;
  return !usable();
}
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (LatrCoach.sw) LatrCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  const resting = restNow(rv, can);
  card.classList.toggle('ck-rest', resting);
  if (resting) {
    card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.rvWas = rv;
    S.items = null; S.hov = null;
    return put(CoachKit.lessonRest ? CoachKit.lessonRest(card, `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`) : `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`);
  }
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { S.items = null; return; }
  if (over) {
    S.items = null;
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { S.items = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f = factsNow();
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!gameOver(cur) ? `<small>${esc(tx('st.' + (f.stage || 'mid')))}</small>` : ''}</h3>`;
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  if (!pos.placing) chips.push({ k: tx('cap'), v: esc(tx('cap.v', { a: f.cap[0], b: f.cap[1] })), cls: f.cap[0] > f.cap[1] ? 'pos' : f.cap[0] < f.cap[1] ? 'neg' : '' });
  chips.push({ k: tx('stones'), v: esc(tx('st.v', { a: f.st[0], b: f.st[1] })) });
  h += CoachKit.summary(chips);
  let cl = null;
  {
    cl = candInfo(list, f, pos);
    if (cl && cl.best) {
      const b = cl.best;
      let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
      if (cl.forced) why = esc(tx('recForced'));
      else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
      h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
      h += CoachKit.branches({
        head: tx(pos.placing ? 'plH' : cl.branch ? 'brH' : 'cdH'), intro: gl(esc(tx(pos.placing ? 'plIntro' : cl.branch ? 'brIntro' : 'cdIntro'))),
        items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
      });
    } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
  }
  const tl = tipsOf(f, w, cl, pos);
  if (tl.length) h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => { const v = u == null ? null : +u; if (S.hov !== v) { S.hov = v; renderFx(); } },
    onPlay: u => { try { if (!active() || !myTurn() || !canHumanPlay()) return; const m = +u; if (!posAt(cur).pos.moves().includes(m)) return; S.hov = null; commit(m); } catch (e) {} },
  });
}
function fx(svg, pos) {
  if (!active() || !myTurn() || sel) return;
  const L = S.hov != null ? [S.hov] : [];
  const legal = pos.moves();
  for (const m of L) if (legal.includes(m)) {
    const pth = E.path(pos, m);
    if (pth.length > 1) svgArrow(svg, pth, 'ck');
    else { const [r, c] = dRC(E.mTo(m)), o = document.createElementNS(NS, 'circle'); o.setAttribute('cx', c + 0.5); o.setAttribute('cy', r + 0.5); o.setAttribute('r', 0.42); o.setAttribute('class', 'ring ck'); o.setAttribute('fill', 'none'); o.setAttribute('stroke-width', 0.07); svg.appendChild(o); }
  }
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  LatrCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (LatrCoach.sw) LatrCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.LatrCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx };
})();
