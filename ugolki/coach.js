'use strict';
// ウゴルキのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via checkers/coach.js) — shown while the player is to
// move against the AI (and in two-player games on one device): the position at a glance (形勢・レースの手数差・陣地・自陣の残り・
// 定跡), the recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan explained, moves shown on
// hover / tap with arrows on the board), prioritized "how to think" tips read from the position (長い跳び・道・取り残し・40手
// ルール・陣地の埋め方…), and the verdict on the previous move (◎○△✕). In the first moves the coach teaches opening theory.
// Sources of the opening / strategy texts (checked 2026-11): I. Troitsky's textbook of classic ugolki (ilya-troitskiy.narod.ru:
// the Standard opening and Luzhin's opening, building a barrier, "roads", the final shape of the house, counting moves),
// gamerules.ru and sports.ru (rules: 40-move and 80-move rules, draw when Black finishes one move later).
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (UgolkiCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次にどの道を使って跳んでくるか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', race: 'レース', stage: '局面', home: '陣地',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'race.even': '五分', 'race.up': '約{x}手リード', 'race.down': '約{x}手遅れ', 'home.v': '{a}/{n}枚（自陣に{h}枚）',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく遅れます。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.jump': '{sq}の駒を{to}へ跳ぶ（{n}回）', 'tt.step': '{sq}の駒を{to}へ', 'tt.enter': '{sq}の駒を陣地の{to}へ',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから陣地完成まで読み切れています。最後まで手数を正確に。',
  'c.long': '大ジャンプ', 'b.long': '大きく跳ぶ', 'x.long': '{sq}の駒が{n}回続けて跳び、一気に{g}マス進みます。跳べる道があるうちに使うのが基本です。',
  'c.jump': 'ジャンプ', 'b.jump': '跳んで進む', 'x.jump': '{sq}の駒が駒を跳び越えて{g}マス進みます。1歩ずつより速い進み方です。',
  'c.enter': '陣地に入る', 'b.enter': '陣地へ入れる', 'x.enter': '{sq}の駒を相手の陣地（{to}）に入れます。入った駒が奥のマスをふさがないかも確かめよう。',
  'c.deep': '奥を埋める', 'b.deep': '陣地の奥を埋める', 'x.deep': '陣地の中で{sq}の駒を奥（{to}）へ詰めます。奥から埋めると、残りの駒が入る場所が空きます。',
  'c.leave': '自陣を出る', 'b.leave': '自陣から出す', 'x.leave': 'まだ自陣にいる{sq}の駒を外へ出します。40手までに全部出ないと負けなので、遅れている駒は早めに。',
  'c.road': '道を作る', 'b.road': '道を作る', 'x.road': '{sq}の駒を{to}へ。この駒が「はしご」の段になり、後ろの仲間が跳んで進めるようになります。',
  'c.block': '道をふさぐ', 'b.block': '相手の道をふさぐ', 'x.block': '{sq}の駒を{to}へ。相手が跳ぶのに使いたいマスを先にふさぎ、相手の進みを遅らせます。',
  'c.lag': '遅れた駒', 'b.lag': '遅れた駒を進める', 'x.lag': 'いちばん遅れている{sq}の駒を進めます。最後は遅れた駒が手数を決めるので、取り残さないのが大切です。',
  'c.step': '前進', 'b.step': '1歩進める', 'x.step': '{sq}の駒を{to}へ1歩進めます。次に跳べる形を作れる場所を選ぼう。',
  'c.back': '下がる', 'b.back': '一度下がる', 'x.back': '{sq}の駒を一度下げます。遠回りに見えても、次に大きく跳ぶための準備になることがあります。',
  opH: '序盤の分かれ道 — 定跡の選び方', opIntro: '序盤は、昔から研究されてきた出方（定跡）で自陣から速く駒を出すのが基本です。',
  'op.book': '定跡', 'op.main': '定番', 'op.alt': '変わり種',
  'op.w0': '3×3の古典ルールでは、いちばんよく指されるのは「標準の定跡」（c2-c4 から）。最速で駒を出す「ルージンの定跡」（c2-d2 から）もあります。',
  'op.c2c4.t': 'c2の駒をc4へ跳ぶ（標準）', 'op.c2c4.x': '「標準の定跡」の1手目。c3を跳び越えて一気に前へ。形が安定していて、最初の7手ほどはほぼ予定どおりに指せます。',
  'op.c2d2.t': 'c2の駒をd2へ（ルージン）', 'op.c2d2.x': '「ルージンの定跡」の1手目。いちばん速く駒を出せる手順ですが、相手の応じ方で崩れやすく、5手目ごろから自分で工夫が必要です。',
  'op.c3d3.t': 'c3の駒をd3へ', 'op.c3d3.x': '横に1歩出して道を作る、落ち着いた出方。うしろの駒がd3を使って跳べるようになります。',
  'op.b3d3.t': 'b3の駒をd3へ跳ぶ', 'op.b3d3.x': '横向きに跳んで出る手。陣の真ん中を空けるので、残りの駒が動きやすくなります。',
  'op.next.t': '{sq}の駒を{to}へ', 'op.next.x': '定跡の手順です。この先「{n}」の形になります。', 'op.done.x': 'この手で「{n}」の形が完成します。',
  bkWhy: 'この局面は定跡の範囲です。名前のついた定跡の手順から選んでみよう。', prevBook: '定跡どおりの手です。', prevOff: 'この局面の定跡は {m} などです。',
  senkei: '定跡', moyo: '{n}模様', fixed: '{n}',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.jump': '💡コツ：指す前に、どの駒がいちばん遠くまで跳べるか、全部の駒を順に確かめよう。', 'lp.road': '💡コツ：動かしたあと、その駒が相手の跳び台（道）にならないか確かめよう。',
  'tp.long': '{sq}の駒が{n}回続けて跳べます。長い跳びは大きな得です。', 'tp.oppLong': '相手の{sq}の駒が次に{n}回続けて跳べる形です。その道をふさげないか考えよう。',
  'tp.limit': '自陣にまだ{h}枚残っています。40手ルールまであと{n}手。先に出しておこう。', 'tp.limitHot': 'あと{n}手で40手ルール！ 自陣の{h}枚を出さないと負けになります。',
  'tp.oppLimit': '相手の自陣にまだ{h}枚残っています。出口をふさぐと、相手は40手ルールで苦しくなります。',
  'tp.lag': '{sq}の駒が遅れています（あと{d}マス）。最後はいちばん遅れた駒が手数を決めます。',
  'tp.ahead': 'レースで約{x}手リード。無理に相手の邪魔をせず、自分の駒を速く運ぶのが安全です。', 'tp.behind': 'レースで約{x}手遅れています。相手の道をふさいだり、相手の陣地の出口を使わせない工夫が必要です。',
  'tp.fill': '陣地の奥（いちばん隅）から埋めると、最後の駒が入りやすくなります。', 'tp.lastTwo': '残り2枚。陣地の手前のマスを1つ空けておくと、最後の2枚が2手で入れます。',
  'tp.draw': '先手が先に完成しても、後手が次の1手で完成すれば引き分け。後手は1手遅れまでなら追いつけます。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.open1': '序盤は自陣の駒をまとめて外へ。いちばん奥のa1（相手はh8）の駒は出にくいので、道を作って早めに。',
  'tp.open2': '自陣を出るときは、相手の陣地まで跳びきらず、手前で止めて「壁」を作ると相手の出方を邪魔できます。',
  'tp.mid1': '駒はかたまりで進めよう。ばらばらになると跳ぶための道がなくなります。', 'tp.mid2': '相手の駒も跳び台になります。相手の陣形の中を通る道も探そう。',
  'tp.winning': '有利です。手数を数えて、相手が追いつけないか確かめよう。', 'tp.losing': '苦しい局面。相手の最後の数手をふさぐ手がないか探そう。',
  sep: '、',
  gl: {
    road: { m: ['道', 'はしご'], t: '道（はしご）', d: '駒が1マスおきに並んだ列。その上を跳んで一気に進めます。' },
    house: { m: ['陣地'], t: '陣地', d: '相手が最初に駒を置いていた隅のマス（3×3なら9マス）。ここを全部うめれば勝ち。' },
    limit: { m: ['40手ルール'], t: '40手ルール', d: '40手（斜めありは30手）までに自陣の駒を全部出さないと負けになる決まり。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Guess which road they will use to jump next.',
  calc: 'Looking at the candidates…', form: 'Position', race: 'Race', stage: 'Phase', home: 'House',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'race.even': 'Level', 'race.up': '~{x} moves ahead', 'race.down': '~{x} moves behind', 'home.v': '{a}/{n} (still home: {h})',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move loses a lot of time. Play this one.', recForced: 'This is the only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan.',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.jump': 'Jump {sq} to {to} ({n} hops)', 'tt.step': '{sq} to {to}', 'tt.enter': '{sq} into the house at {to}',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees the house completed from here. Count the moves carefully to the end.',
  'c.long': 'Long jump', 'b.long': 'Jump far', 'x.long': 'The piece on {sq} hops {n} times in a row and gains {g} squares at once. Use a road while it is there.',
  'c.jump': 'Jump', 'b.jump': 'Jump ahead', 'x.jump': 'The piece on {sq} jumps over a piece and gains {g} squares — faster than stepping.',
  'c.enter': 'Enter the house', 'b.enter': 'Bring a piece home', 'x.enter': 'The piece on {sq} enters the opponent’s corner at {to}. Check it does not block a deeper square.',
  'c.deep': 'Fill the back', 'b.deep': 'Fill the deep squares', 'x.deep': 'Inside the house, move {sq} deeper to {to}. Filling from the back leaves room for the others.',
  'c.leave': 'Leave home', 'b.leave': 'Get out of your corner', 'x.leave': 'The piece on {sq} is still in your own corner. All must leave within 40 moves or you lose, so move late ones early.',
  'c.road': 'Build a road', 'b.road': 'Build a road', 'x.road': '{sq} to {to}: this piece becomes a rung of a ladder, so the pieces behind can jump along it.',
  'c.block': 'Block a road', 'b.block': 'Block their road', 'x.block': '{sq} to {to}: you take a square the opponent wants to jump onto and slow them down.',
  'c.lag': 'Straggler', 'b.lag': 'Bring up the straggler', 'x.lag': 'Move the piece left furthest behind ({sq}). At the end the last piece decides how many moves you need.',
  'c.step': 'Step', 'b.step': 'Step forward', 'x.step': '{sq} one step to {to}. Prefer squares that set up a jump next move.',
  'c.back': 'Step back', 'b.back': 'Step back first', 'x.back': '{sq} steps back. It looks slow, but it can prepare a long jump next move.',
  opH: 'Opening crossroads — choosing a line', opIntro: 'In the opening, use the known lines to get your pieces out of your corner fast.',
  'op.book': 'Book', 'op.main': 'Main', 'op.alt': 'Sideline',
  'op.w0': 'In the classic 3×3 game the most played line is the Standard opening (starting c2-c4). Luzhin’s opening (starting c2-d2) gets the pieces out fastest.',
  'op.c2c4.t': 'Jump c2 to c4 (Standard)', 'op.c2c4.x': 'The first move of the Standard opening: over c3 and forward at once. It is stable and the first seven moves usually go as planned.',
  'op.c2d2.t': 'c2 to d2 (Luzhin)', 'op.c2d2.x': 'The first move of Luzhin’s opening, the fastest way out — but it breaks easily, and from about move 5 you must improvise.',
  'op.c3d3.t': 'c3 to d3', 'op.c3d3.x': 'A calm step to the side that builds a road: the pieces behind can jump using d3.',
  'op.b3d3.t': 'Jump b3 to d3', 'op.b3d3.x': 'A sideways jump out that empties the middle of the corner, so the others move freely.',
  'op.next.t': '{sq} to {to}', 'op.next.x': 'A book move. This leads to “{n}”.', 'op.done.x': 'With this move the “{n}” shape is complete.',
  bkWhy: 'This position is still in the books. Try one of the named lines.', prevBook: 'A book move.', prevOff: 'The book moves here are {m} and others.',
  senkei: 'Opening', moyo: '{n} (likely)', fixed: '{n}',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.jump': '💡Tip: before moving, check every piece for the longest jump it can make.', 'lp.road': '💡Tip: after your move, check the piece does not become a stepping stone for the opponent.',
  'tp.long': 'The piece on {sq} can hop {n} times in a row. Long jumps are a big gain.', 'tp.oppLong': 'The opponent’s piece on {sq} can hop {n} times next move. Can you block that road?',
  'tp.limit': '{h} of your pieces are still at home; {n} moves to the 40-move rule. Get them out.', 'tp.limitHot': 'Only {n} moves to the 40-move rule! Move your {h} piece(s) out of your corner or you lose.',
  'tp.oppLimit': 'The opponent still has {h} piece(s) at home. Blocking their exit makes the 40-move rule hurt them.',
  'tp.lag': 'The piece on {sq} lags behind ({d} squares to go). The last piece decides the finish.',
  'tp.ahead': 'About {x} moves ahead in the race. Bring your pieces home rather than fighting.', 'tp.behind': 'About {x} moves behind. Block their roads or their exit to catch up.',
  'tp.fill': 'Fill the house from the deepest corner square, so the last pieces still have room to enter.', 'tp.lastTwo': 'Two pieces left: keep one near square of the house empty and they enter in two moves.',
  'tp.draw': 'If White finishes first and Black finishes on the very next move, it is a draw: Black may be one move behind.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.open1': 'In the opening, move your pieces out together. The deep corner piece (a1, for Black h8) gets out last — build it a road early.',
  'tp.open2': 'When leaving home, do not always jump all the way: stopping short builds a wall that hinders the opponent.',
  'tp.mid1': 'Advance as a group. Scattered pieces leave no roads to jump on.', 'tp.mid2': 'The opponent’s pieces are stepping stones too. Look for roads through their formation.',
  'tp.winning': 'You are ahead. Count the moves to make sure they cannot catch up.', 'tp.losing': 'A hard position. Look for a move that blocks their last steps.',
  sep: ', ',
  gl: {
    road: { m: ['roads', 'road', 'ladder'], t: 'Road (ladder)', d: 'Pieces standing with a gap between each, so a piece can hop along them far in one move.' },
    house: { m: ['house'], t: 'House', d: 'The opponent’s starting corner (9 squares in 3×3). Fill it all to win.' },
    limit: { m: ['40-move rule'], t: '40-move rule', d: 'All your pieces must have left your own corner after 40 moves (30 with diagonals), or you lose.' },
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
const D = p => E.DIST()[p];
// the longest jump chain each side has (hops, from)
function longest(pos, p) {
  const q = pos.clone(); if (q.turn !== p) q.side ^= 1;
  let best = { n: 0, f: -1, g: 0 };
  for (const m of q.moves()) { if (m === E.PASS || !E.isJump(q, m)) continue; const n = E.path(q, m).length - 1, g = D(p)[E.mFrom(m)] - D(p)[E.mTo(m)]; if (g > best.g || (g === best.g && n > best.n)) best = { n, f: E.mFrom(m), g }; }
  return best;
}
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.dist = [Math.max(0, pos.dist(us)), Math.max(0, pos.dist(them))];
  f.inT = [pos.inTarget(us), pos.inTarget(them)]; f.home = [pos.inHome(us), pos.inHome(them)];
  f.N = E.HOMEL()[us].length;
  f.mv = [pos.movesOf(us), pos.movesOf(them)];
  f.stage = n < 12 && f.home[0] + f.home[1] >= 6 ? 'open' : f.inT[0] + f.inT[1] >= f.N ? 'end' : 'mid';
  f.my = longest(pos, us); f.op = longest(pos, them);
  let far = -1, fd = -1; for (let i = 0; i < 64; i++) if (pos.owner(i) === us && !E.target(us)[i] && D(us)[i] > fd) { fd = D(us)[i]; far = i; }
  f.far = far; f.farD = fd; f.avg = f.N - f.inT[0] ? f.dist[0] / (f.N - f.inT[0]) : 0;
  return f;
}
function classify(pos, m, f, v) {
  const us = pos.turn, fr = E.mFrom(m), to = E.mTo(m), g = D(us)[fr] - D(us)[to], T = E.target(us), H = E.HOME()[us];
  const hops = E.path(pos, m).length - 1, jump = E.isJump(pos, m);
  const base = { sq: SQN(fr), to: SQN(to), n: hops, g, m };
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  if (T[fr] && T[to] && g > 0) return Object.assign(base, { k: 'deep' });
  if (!T[fr] && T[to]) return Object.assign(base, { k: 'enter' });
  if (jump && hops >= 2 && g >= 3) return Object.assign(base, { k: 'long' });
  if (H[fr] && !H[to] && f.home[0] && f.mv[0] >= E.R.limit - 14) return Object.assign(base, { k: 'leave' });
  if (fr === f.far && f.farD >= f.avg + 3) return Object.assign(base, { k: 'lag' });
  if (jump && g > 0) return Object.assign(base, { k: 'jump' });
  if (g < 0) return Object.assign(base, { k: 'back' });
  // a step that lets the opponent's best jump get shorter → blocking; one that gives our pieces a new jump → road
  const after = pos.clone().play(m);
  const opBefore = f.op.g, opAfter = longest(after, 3 - us).g;
  if (opAfter + 2 <= opBefore) return Object.assign(base, { k: 'block' });
  const myAfter = longest(after, us).g;
  if (myAfter >= f.my.g + 2) return Object.assign(base, { k: 'road' });
  if (H[fr] && !H[to]) return Object.assign(base, { k: 'leave' });
  return Object.assign(base, { k: 'step' });
}
const RCLS = { win: 'c-win', long: 'c-mat', jump: 'c-mat', enter: 'c-win', deep: 'c-win', leave: 'c-dev', road: 'c-dev', block: 'c-def', lag: 'c-dev', step: 'c-dev', back: 'c-def' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return k.k === 'enter' || k.k === 'deep' ? tx('tt.enter', k) : E.isJump(posAt(cur).pos, k.m) ? tx('tt.jump', k) : tx('tt.step', k); }
const catTxt = k => tx('x.' + k.k, k);
// --------------------------------------------------------------------------------------------- openings (book: openings.json)
const SETS = () => (typeof OPEN !== 'undefined' && OPEN && OPEN.sets) ? OPEN.sets : [];
const opName = s => (typeof LL === 'function' ? LL(s.title) : s.id);
// the first move: the two classic choices first, then sidelines
const THEORY = { '': [['c2:c4', 'main', 'c2c4'], ['c2-d2', 'main', 'c2d2'], ['c3-d3', 'alt', 'c3d3'], ['b3:d3', 'alt', 'b3d3']] };
function gameNames(i) { const p = E.Pos.from(null), out = []; for (let j = 0; j < i; j++) { out.push(E.name(p, moves[j])); p.play(moves[j]); } return out; }
function openingType(names) {
  if (gv !== 'c33' || startSpec) return null;
  const live = SETS().filter(s => { const L = s.moves.split(' '); return names.every((x, j) => j >= L.length || x === L[j]); });
  const done = SETS().find(s => { const L = s.moves.split(' '); return names.length >= L.length && L.every((x, j) => names[j] === x); });
  if (!names.length) return null;
  if (done) return { name: opName(done), fixed: true };
  if (live.length === 1) return { name: opName(live[0]), fixed: false };
  return null;
}
// book moves for the position after ply i: [{ u, kind, key?, sets, done? }]
function bookAt(i) {
  if (startSpec || gv !== 'c33' || i > 14) return null;
  const names = gameNames(i), key = names.join(' ');
  if (THEORY[key]) return THEORY[key].map(([u, kind, k]) => ({ u, kind, key: k }));
  const nx = new Map();
  for (const s of SETS()) {
    const L = s.moves.split(' ');
    if (L.length > i && names.every((x, j) => x === L[j])) { const u = L[i], e = nx.get(u) || { u, kind: 'book', sets: [] }; e.sets.push(s); if (L.length === i + 1) e.done = s; nx.set(u, e); }
  }
  return nx.size ? [...nx.values()] : null;
}
const isBook = (i, nm) => { const b = bookAt(i); return !!(b && b.some(x => x.u === nm)); };
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
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], dist: [0, 0], inT: [0, 0], home: [0, 0], N: 9, mv: [0, 0], my: { n: 0 }, op: { n: 0 }, far: -1 }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const L = list.slice().sort((a, b) => b.v - a.v), best = L[0].v, wb = wr(best);
  const items = [];
  for (const c of L.slice(0, 5)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const raceMoves = f => Math.round((f.dist[1] - f.dist[0]) / 2.5);
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const lim = E.R.limit, left = lim - f.mv[0];
  if (f.home[0] && left <= 8) add('tp.limitHot', 100, { n: Math.max(0, left), h: f.home[0] }, 1);
  else if (f.home[0] && left <= 16) add('tp.limit', 80, { n: left, h: f.home[0] });
  if (f.my.n >= 2 && f.my.g >= 4) add('tp.long', 90, { sq: SQN(f.my.f), n: f.my.n }, 1);
  if (f.op.n >= 2 && f.op.g >= 5) add('tp.oppLong', 78, { sq: SQN(f.op.f), n: f.op.n }, 1);
  if (f.home[1] && lim - f.mv[1] <= 14) add('tp.oppLimit', 60, { h: f.home[1] });
  if (f.far >= 0 && f.farD >= f.avg + 4 && f.stage !== 'open') add('tp.lag', 64, { sq: SQN(f.far), d: f.farD });
  const r = raceMoves(f);
  if (r >= 2) add('tp.ahead', 54, { x: r }); else if (r <= -2) add('tp.behind', 54, { x: -r });
  if (f.stage === 'end') { add('tp.fill', 50); if (f.N - f.inT[0] === 2) add('tp.lastTwo', 70); add('tp.draw', 30); }
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage === 'open') { add('tp.open1', 24); add('tp.open2', 20); }
  else if (f.stage === 'mid') { add('tp.mid1', 26); add('tp.mid2', 18); }
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  if (isBook(i, nm)) return CoachKit.verdict(0, esc(tx('prev', { m: mv, q: tx('q.best') })), esc(tx('prevBook')));
  const L = listAt(i); if (!L || !L.length) return '';
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
      const k = classify(pos.clone(), best.m, ff, best.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') {
        const bk = bookAt(i); if (bk) body = esc(tx('prevOff', { m: bk.map(x => x.u).slice(0, 2).join(tx('sep')) })) + ' ' + body;
        body += '<br>' + esc(tx(E.isJump(pos, best.m) && !E.isJump(pos, m) ? 'lp.jump' : 'lp.road'));
      }
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
  if (UgolkiCoach.sw) UgolkiCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  const resting = restNow(rv, can);
  card.classList.toggle('ck-rest', resting);
  if (resting) {
    card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.rvWas = rv;
    S.items = null; S.hov = null;
    return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`);
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
  const cl = candInfo(list, f, pos);
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  const r = raceMoves(f);
  chips.push({ k: tx('race'), v: esc(r === 0 ? tx('race.even') : tx(r > 0 ? 'race.up' : 'race.down', { x: Math.abs(r) })), cls: r > 0 ? 'pos' : r < 0 ? 'neg' : '' });
  chips.push({ k: tx('home'), v: esc(tx('home.v', { a: f.inT[0], n: f.N, h: f.home[0] })), cls: f.home[0] && E.R.limit - f.mv[0] <= 10 ? 'neg' : '' });
  const ot = openingType(gameNames(cur));
  if (ot && cur < 24) chips.push({ k: tx('senkei'), v: esc(tx(ot.fixed ? 'fixed' : 'moyo', { n: ot.name })) });
  h += CoachKit.summary(chips);
  const bk = f.legal.length > 1 ? bookAt(cur) : null;
  let opItems = null;
  if (bk) {
    opItems = [];
    for (const b of bk) {
      const m = E.parse(pos, b.u); if (m == null) continue;
      const sq = SQN(E.mFrom(m)), to = SQN(E.mTo(m));
      if (b.key) opItems.push({ tag: tx('op.' + b.kind), cls: b.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + b.key + '.t')), text: gl(esc(tx('op.' + b.key + '.x'))), move: String(m), mvName: b.u, m });
      else {
        const nm = b.done ? opName(b.done) : b.sets.map(opName).slice(0, 3).join(tx('sep'));
        opItems.push({ tag: tx('op.book'), cls: 'c-mat', title: esc(tx('op.next.t', { sq, to })), text: gl(esc(tx(b.done ? 'op.done.x' : 'op.next.x', { n: nm }))), move: String(m), mvName: b.u, m });
      }
    }
    if (!opItems.length) opItems = null;
  }
  if (opItems) {
    S.items = opItems.map(x => x.m);
    let intro = esc(tx('opIntro'));
    if (cur === 0) intro += ' ' + esc(tx('op.w0'));
    if (!bk[0].key) h += CoachKit.rec(tx('op.book'), gl(esc(tx('bkWhy'))), '');
    h += CoachKit.branches({ head: tx('opH'), intro: gl(intro), reveal: true, items: opItems });
  } else if (cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
    if (cl.forced) why = esc(tx('recForced'));
    else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
    });
  } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
  const tl = tipsOf(f, w, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
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
  for (const m of L) if (legal.includes(m)) svgArrow(svg, E.path(pos, m), 'ck');
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  UgolkiCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (UgolkiCoach.sw) UgolkiCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.UgolkiCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx, isBook, openingType };
})();
