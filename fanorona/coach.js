'use strict';
// ファノロナコーチ (common spec: shared/COACH.md, model: shogi/coach.js, built on the checkers coach) — shown while the
// player is to move against the AI (and in two-player games on one device): the position at a glance (形勢・駒・局面・
// 序盤・強い点), the recommended plan with its reason, the candidate directions (分かれ道: each candidate explained, moves
// shown on hover / tap with arrows on the board), prioritized tips read from the position (取りの義務・大量取り・取られそうな
// 駒・相手の大きな取り・パイカ・終盤…), and the verdict on the previous move (◎○△✕). In the first moves the coach teaches the
// opening choices instead of raw evaluation.
// Sources (checked 2026-11): Wikipedia "Fanorona" (rules, the 2007 solution as a draw with f2-e3A and d3-e3A shown to draw),
// M. Schadd et al. "Best Play in Fanorona leads to Draw" (2008); everything else is from this site's engine (engine.c).
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (FanoronaCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこを取ってくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.even': '互角', 'mat.up': '{x}枚得', 'mat.down': '{x}枚損', 'mat.n': '（{a}対{b}）',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  recForced: '指せる手はこれだけです（取れるときは取るのが義務）。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  'tt.paika': '{sq}の駒を{to}へ', 'tt.cap': '{sq}の駒で{n}枚取る', 'tt.chain': '{sq}の駒で{s}回続けて{n}枚取る',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  opH: '序盤の分かれ道 — 初手の選び方', opIntro: '序盤は評価値の小さな差より、研究されてきた形で指すことが大切です。まずは定番を覚え、慣れたら変わり種も試してみよう。',
  'op.main': '定番', 'op.alt': '変わり種', 'op.book': '序盤',
  'op.w0': 'ファノロナは2007年にコンピューターで解析され、両者が最善を尽くすと引き分けと分かりました。初手は5通りで、f2-e3A と d3-e3A がその引き分けにつながる手として知られています。',
  'op.f2e3.t': 'f2の駒をe3へ（斜めに接近）', 'op.f2e3.x': '中央e3へ斜めに寄って、d4・c5の2枚を取ります。解析で引き分けにつながると示された定番の初手。後手もすぐに大きく取り返してくるので、取り返しの数まで読むのが大切です。',
  'op.d3e3.t': 'd3の駒をe3へ（横に接近）', 'op.d3e3.x': '真ん中の段で中央e3へ寄り、f3を取ります。これも引き分けにつながるとされる定番の初手。取る数は少なくても、取ったあとの形が崩れにくいのが特長です。',
  'op.d3e3w.t': 'd3の駒をe3へ（離脱でc3を取る）', 'op.d3e3w.x': '同じ d3→e3 でも、離れる側のc3を取る変わり種。このサイトのエンジンではほぼ互角の評価です。',
  'op.d2e3.t': 'd2の駒をe3へ（斜めに接近）', 'op.d2e3.x': 'f4・g5の2枚を取る手。このサイトのエンジンの評価では、後手の取り返しが大きく、先手が駒1枚ほど損をしやすいとされます。',
  'op.e2e3.t': 'e2の駒をe3へ（縦に接近）', 'op.e2e3.x': 'e4・e5の2枚を取る手。このサイトのエンジンの評価では、後手の取り返しが大きく、先手が駒1枚以上損をしやすいとされます。',
  'op.next.t': '{sq}の駒を{to}へ', 'op.next.x': '序盤の手順です。この先「{n}」の形になります。', 'op.done.x': 'この手で「{n}」の形になります。',
  bkWhy: 'この局面は序盤の研究範囲です。名前のついた手順から選んでみよう。', prevBook: '序盤の定番どおりの手です。', prevOff: 'この局面の定番は {m} などです。',
  senkei: '序盤', moyo: '{n}模様', fixed: '{n}', strong: '強い点', meC: 'あなた', opC: '相手', who: '{k}（{w}）',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  'lp.shot': '💡コツ：取り方が何通りもあるときは、取った数から「相手に取り返される数」を引いて比べよう。', 'lp.hang': '💡コツ：取らない手（パイカ）を指す前に、そのあと相手に取られる駒ができないか確かめよう。',
  // categories: tag / badge / explanation ({sq} point, {to} landing point, {n} pieces, {s} steps)
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、この手から勝ちまで読み切れています。相手の取り返しに注意して正確に進めよう。',
  'c.chain': '連続取り', 'b.chain': '続けて取る', 'x.chain': '{sq}の駒で{s}回続けて取り、合計{n}枚を取ります。着地した場所で取り返されないかも確かめよう。',
  'c.big': '大量取り', 'b.big': '一列ごと取る', 'x.big': '{sq}の駒で一度に{n}枚を取ります。ファノロナでは並んだ駒が一列まるごと取れるので、数の差が一気に開きます。',
  'c.short': '途中で止める', 'b.short': '取りを止める', 'x.short': '連続で取れるのに、あえて途中で止める手。取りすぎて相手に大きく取り返される場所へ行かないための判断です。',
  'c.cap': '取る', 'b.cap': '取る', 'x.cap': '{sq}の駒で{n}枚取ります。取るのは義務なので、取り方が複数あるときは取ったあとの形と取り返しをくらべて選びます。',
  'c.safe': '守る', 'b.safe': '取られない形', 'x.safe': '{sq}の駒を{to}へ動かし、相手に取る手を与えない形にします。取る手がないときの基本です。',
  'c.save': '逃げる', 'b.save': '駒を逃がす', 'x.save': 'ねらわれている{sq}の駒を{to}へ逃がします。逃げた先でも取られないことが大切です。',
  'c.sac': '駒を渡す', 'b.sac': '駒を渡す', 'x.sac': '{sq}の駒を{to}へ動かし、わざと取らせる手。駒は減りますが、AIの読みでは相手の形を崩すなどで損が小さい手です。',
  'c.strong': '強い点', 'b.strong': '強い点を取る', 'x.strong': '{sq}の駒を斜めの線が通る「強い点」{to}へ。8方向へ動けるので、攻めにも守りにも働きます。',
  'c.wait': '待つ', 'b.wait': '形を保つ', 'x.wait': '{sq}の駒を{to}へ動かし、形を崩さずに相手の出方を待ちます。相手に取る手を与えないことが最優先です。',
  // tips
  'tp.forced': '取れる駒があります。取るのは義務です。取り方が{n}通りあるので、取った数と、そのあと相手に取り返される数をくらべて選ぼう。',
  'tp.forced1': '取れる駒があります。取るのは義務なので、この手を指すしかありません。',
  'tp.both': '同じ動きで「接近」と「離脱」の両方で取れる手があります。両方は取れないので、どちらの列を取るか選びます。',
  'tp.chain': '取ったあと、同じ駒でさらに続けて取れる手があります。続けるかどうかは自由。続けたときの着地点が安全かも確かめよう。',
  'tp.big': '一度に{n}枚取れる手があります。並んだ列を丸ごと取れるのがファノロナの醍醐味です。',
  'tp.hang': '{sq}の駒が取られそうです（相手の番なら取られます）。逃げるか、取られても取り返せる形にしよう。',
  'tp.oppBig': '相手は次に{n}枚まとめて取れる形です。その列を崩すか、取られる前に先に取れないか考えよう。',
  'tp.paika': '取る手がありません（パイカの局面）。相手に取る手を与えないマスへ動かすのが基本です。',
  'tp.ahead': '駒得です。無理に攻めず、相手に大きく取られる形を作らないように進めれば勝ちやすくなります。',
  'tp.behind': '駒損です。相手の駒が列で並んだところをねらって、一気に取り返すチャンスを探そう。',
  'tp.strong': '相手のほうが「強い点」（斜めの線が通る点）に多く駒を置いています。強い点の駒は8方向に動けて、取りにも守りにも強く働きます。',
  'tp.strong2': '「強い点」を多く押さえています。強い点の駒は8方向に動けるので、盤全体ににらみが利きます。',
  'tp.end1': '終盤は、強い点を押さえて相手の駒の逃げ道を減らしていくのが基本です。1〜2枚の差だと勝ち切るのに手数がかかることがあります。',
  'tp.endDef': '駒が少ない側は、相手の駒と一直線に並ばないように動くのが粘りのコツです。並ぶと接近か離脱で取られます。',
  'tp.winning': '優勢です。無理をせず、相手に大きな取りを与えないように進めよう。',
  'tp.losing': '劣勢です。相手の駒が並ぶのを待ち、まとめて取り返すチャンスを探そう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤は大量の取り合いになります。取った数だけでなく、そのあと相手が何枚取り返せるかまで数えるのが大切です。',
  'tp.open2': '連続取りは途中で止めてもかまいません。取り続けた先で大きく取り返されるなら、止めるのも立派な判断です。',
  'tp.mid1': '取る手を選ぶときは「取った数 − 取り返される数」で比べよう。',
  'tp.mid2': '自分の駒が相手の駒と一直線に、1マス空けて並ぶと取られやすくなります（接近されて取られる）。',
  sep: '、',
  gl: {
    force: { m: ['取るのは義務', '取りの義務'], t: '取りの義務', d: '取れる手があるときは、取らない手（パイカ）は指せません。取り方が複数あるときはどれを選んでもかまいません。' },
    approach: { m: ['接近'], t: '接近取り', d: '相手の駒に向かって1歩進み、進んだ先のすぐ隣にある相手の駒と、その先に続けて並ぶ相手の駒を一列まるごと取る取り方。' },
    withdraw: { m: ['離脱'], t: '離脱取り', d: '隣にある相手の駒から真っすぐ離れるように1歩動き、その駒と、その向こうに続けて並ぶ相手の駒を取る取り方。' },
    paika: { m: ['パイカ'], t: 'パイカ', d: '駒を取らない普通の移動。取れる手が1つもないときだけ指せます。' },
    strong: { m: ['強い点'], t: '強い点', d: '斜めの線が通っている交点。ここにいる駒は8方向に動けます（斜めの線がない点では縦横の4方向だけ）。' },
    chain: { m: ['連続取り', '続けて取'], t: '連続取り', d: '取った駒が同じ手番でさらに取ること。毎回向きを変え、同じ点には戻れません。続けるかどうかは自由です。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how to think) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is off. Turn on the switch at the top right to see how to think about the position and what the candidate moves are about.',
  overRv: 'The game is over. Analyse it, and this box shows a move-by-move review (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Try to guess what it will capture next — guessing right is how reading improves.', over: 'The game is over. Use [Analyse] under the record to review it.',
  calc: 'Thinking about the candidates…', form: 'Position', mat: 'Pieces', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'much better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'much worse', 'f.lost': 'lost',
  'mat.even': 'even', 'mat.up': '+{x}', 'mat.down': '−{x}', 'mat.n': ' ({a} v {b})',
  recWhy: 'The first choice here is the "{c}" plan. Position: {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} in winning chances): play accurately here.',
  recBranch: 'The candidates are close — a branching point. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot. This one should be played without hesitation.',
  recForced: 'This is the only legal move (captures are compulsory).',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse. Playing the plan you are comfortable with is the fastest way to improve.',
  cdH: 'Candidate moves and plans', cdIntro: 'The top candidates, explained plan by plan.',
  'tt.paika': 'Move the piece on {sq} to {to}', 'tt.cap': 'Capture {n} with the piece on {sq}', 'tt.chain': 'Capture {n} in {s} steps with the piece on {sq}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a little worse', 'gap.bad': 'worse',
  'q.best': 'best', 'q.good': 'good', 'q.dubious': 'dubious', 'q.bad': 'mistake',
  opH: 'Opening choices — the first move', opIntro: 'In the opening, well-studied moves matter more than small differences in evaluation. Learn the standard moves first, then try the others.',
  'op.main': 'standard', 'op.alt': 'sideline', 'op.book': 'opening',
  'op.w0': 'Fanorona was solved by computer in 2007: with best play it is a draw. The first player has five first moves; f2-e3A and d3-e3A are the ones shown to lead to that draw.',
  'op.f2e3.t': 'f2 to e3 (diagonal approach)', 'op.f2e3.x': 'Steps diagonally to the centre and captures d4 and c5. A standard first move, shown to lead to a draw. The second player captures back at once, so count the recapture too.',
  'op.d3e3.t': 'd3 to e3 (approach along the middle row)', 'op.d3e3.x': 'Steps into the centre along the middle row and captures f3. Also a standard move leading to a draw: it takes little, but keeps a solid shape.',
  'op.d3e3w.t': 'd3 to e3 (withdrawal, capturing c3)', 'op.d3e3w.x': 'The same step, but capturing c3 behind by withdrawal. This site\'s engine rates it about equal.',
  'op.d2e3.t': 'd2 to e3 (diagonal approach)', 'op.d2e3.x': 'Captures f4 and g5. By this site\'s engine the second player\'s recapture is large and the first player tends to lose about one piece.',
  'op.e2e3.t': 'e2 to e3 (straight approach)', 'op.e2e3.x': 'Captures e4 and e5. By this site\'s engine the second player\'s recapture is large and the first player tends to lose a piece or more.',
  'op.next.t': '{sq} to {to}', 'op.next.x': 'An opening move. It leads to "{n}".', 'op.done.x': 'With this move the game reaches "{n}".',
  bkWhy: 'This position is still opening theory. Choose one of the named lines.', prevBook: 'A standard opening move.', prevOff: 'The standard moves here are {m}.',
  senkei: 'Opening', moyo: '{n} (likely)', fixed: '{n}', strong: 'Strong points', meC: 'you', opC: 'opponent', who: '{k} ({w})',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: 'The AI\'s first choice was {m} ({c}).', prevAltOk: 'As good as the AI\'s first choice {m} ({c}).',
  'lp.shot': '💡 Tip: when there are several captures, compare "pieces taken − pieces you lose in reply".', 'lp.hang': '💡 Tip: before a non-capturing move (paika), check that it does not leave a piece to be captured.',
  'c.win': 'Winning line', 'b.win': 'Finish the game', 'x.win': 'The AI has calculated a forced win from this move. Watch out for recaptures and finish accurately.',
  'c.chain': 'Capture chain', 'b.chain': 'Keep capturing', 'x.chain': 'The piece on {sq} captures {s} times in a row, {n} pieces in all. Check that it is not taken where it lands.',
  'c.big': 'Big capture', 'b.big': 'Take a whole line', 'x.big': 'The piece on {sq} takes {n} pieces at once. In Fanorona a whole row of pieces goes, so the count can swing quickly.',
  'c.short': 'Stop early', 'b.short': 'Stop the chain', 'x.short': 'More captures were possible, but this stops on purpose — so the piece does not end where the opponent takes back even more.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'The piece on {sq} captures {n}. Captures are compulsory, so when there are several, compare the shape afterwards and the recaptures.',
  'c.safe': 'Stay safe', 'b.safe': 'Give nothing', 'x.safe': 'Move the piece on {sq} to {to} and leave the opponent no capture. The basic idea when there is nothing to take.',
  'c.save': 'Escape', 'b.save': 'Save a piece', 'x.save': 'The piece on {sq} is attacked; move it to {to}, where it is safe.',
  'c.sac': 'Sacrifice', 'b.sac': 'Give a piece', 'x.sac': 'Move the piece on {sq} to {to}, letting it be taken on purpose. By the AI\'s reading the loss is small (the opponent\'s shape suffers).',
  'c.strong': 'Strong point', 'b.strong': 'Take a strong point', 'x.strong': 'Move the piece on {sq} to the strong point {to}, where diagonals cross. It can move in 8 directions there, for attack and defence.',
  'c.wait': 'Wait', 'b.wait': 'Keep the shape', 'x.wait': 'Move the piece on {sq} to {to} and keep a solid shape while waiting for the opponent. Giving nothing to capture comes first.',
  'tp.forced': 'You can capture, and capturing is compulsory. There are {n} ways: compare the pieces you take with the pieces the opponent can take back.',
  'tp.forced1': 'You can capture; captures are compulsory, so this is the only move.',
  'tp.both': 'One of your steps can capture either by approach or by withdrawal. You cannot take both lines — choose one.',
  'tp.chain': 'After a capture, the same piece can go on capturing. Going on is optional: check that the landing point is safe.',
  'tp.big': 'You can take {n} pieces at once — taking a whole line is the heart of Fanorona.',
  'tp.hang': 'The piece(s) on {sq} could be captured (if it were the opponent\'s turn). Move away, or make a recapture possible.',
  'tp.oppBig': 'The opponent threatens to take {n} pieces at once next. Break up that line, or capture first.',
  'tp.paika': 'Nothing to capture (a paika position). Move to a point that gives the opponent no capture.',
  'tp.ahead': 'You are ahead. No need to force things: avoid shapes that let the opponent take a lot at once.',
  'tp.behind': 'You are behind. Look for a chance to take back a whole line when the opponent\'s pieces line up.',
  'tp.strong': 'The opponent holds more strong points (where diagonals cross). Pieces there move in 8 directions and work hard in attack and defence.',
  'tp.strong2': 'You hold more strong points. Pieces there move in 8 directions and watch the whole board.',
  'tp.end1': 'In the endgame, hold the strong points and take away the enemy pieces\' escape routes. With a lead of only one or two it can take many moves to finish.',
  'tp.endDef': 'With fewer pieces, avoid standing in line with an enemy piece: in line you can be taken by approach or withdrawal.',
  'tp.winning': 'You are winning. Play safely and give the opponent no big captures.',
  'tp.losing': 'You are losing. Wait for the opponent\'s pieces to line up and look for a big recapture.',
  'tp.branch': 'The candidates are close — a branching point. Decide on a plan first, then pick the move.',
  'tp.sharp': 'The best move is far better than the second ({x} in winning chances). Playing this one right decides the game.',
  'tp.open1': 'The opening is a big exchange of captures. Count not only what you take but also what the opponent takes back.',
  'tp.open2': 'You may stop a capture chain at any step. If going on lands you where the opponent takes back a lot, stopping is a good decision.',
  'tp.mid1': 'Choose between captures by "taken − taken back".',
  'tp.mid2': 'A piece standing in line with an enemy piece, one point apart, can be taken by approach.',
  sep: ', ',
  gl: {
    force: { m: ['capturing is compulsory', 'captures are compulsory', 'compulsory'], t: 'Compulsory capture', d: 'When a capture is possible, a non-capturing move (paika) is not allowed. With several captures you may choose any of them.' },
    approach: { m: ['approach'], t: 'Approach', d: 'Step towards an enemy piece: the enemy piece next to the landing point is captured, with the enemy pieces directly behind it in that line.' },
    withdraw: { m: ['withdrawal'], t: 'Withdrawal', d: 'Step straight away from an adjacent enemy piece: it is captured, with the enemy pieces behind it in that line.' },
    paika: { m: ['paika'], t: 'Paika', d: 'A move that captures nothing. Allowed only when no capture is possible.' },
    strong: { m: ['strong points', 'strong point'], t: 'Strong point', d: 'A point where diagonals cross. A piece there can move in 8 directions (elsewhere only 4).' },
    chain: { m: ['capture chain', 'going on capturing'], t: 'Capture chain', d: 'The capturing piece capturing again in the same turn. It must change direction each time and may not return to a point it visited. Going on is optional.' },
  },
},
};
// Alquerque (alquerque/ runs this coach with the rule 'alq'): the texts that differ — jumps instead of approach /
// withdrawal, the chain must go on, no backward steps, the waiting battle of the ending. Stored as 'A.<key>' (gloss: Agl);
// tx() takes them first while the rule is 'alq'. Other languages: coach-i18n.js (FanoronaCoach.mergeAlq).
const AQ = {
ja: {
  oppTurn: '相手の手番です。相手が次にどの駒を跳び越えてくるか、予想してみよう。予想が当たるほど読みの力がつきます。',
  'tt.cap': '{sq}の駒で跳び越して{n}枚取る', 'tt.chain': '{sq}の駒で{s}回続けて跳び、{n}枚取る',
  'b.big': 'まとめて取る', 'x.big': '{sq}の駒で続けて跳び、一度に{n}枚取ります。最後の着地点で跳び返されないかも確かめよう。',
  'x.chain': '{sq}の駒で{s}回続けて跳び、合計{n}枚を取ります。跳べる限り跳び続けるのが決まりです。最後の着地点で跳び返されないかも確かめよう。',
  'x.cap': '{sq}の駒で跳び越して{n}枚取ります。取るのは義務なので、取り方が複数あるときは着地したあとに跳び返されないかをくらべて選びます。',
  'x.safe': '{sq}の駒を{to}へ動かし、相手に跳ぶ手を与えない形にします。駒の向こう側の点がふさがっていれば跳ばれません。',
  'x.save': 'ねらわれている{sq}の駒を{to}へ逃がします。逃げた先で、相手から見て向こう側の点が空いていないか（跳ばれないか）が大切です。',
  'x.sac': '{sq}の駒を{to}へ動かし、わざと跳ばせる手。取りは義務なので相手の駒を誘い出せます。AIの読みでは、跳び返しなどで損が小さい（または得になる）手です。',
  'c.strong': '斜めの点', 'b.strong': '斜めの点へ', 'x.strong': '{sq}の駒を斜めの線が通る点{to}へ。斜めにも動け、斜めにも跳べるので、攻めにも守りにも働く点です。',
  'x.wait': '{sq}の駒を{to}へ動かし、形を崩さずに待ちます。駒は後ろへ戻れないので、むやみに前へ出ず、動ける手を残すことも大切です。',
  strong: '斜めの点', mobK: '動ける手',
  'lp.shot': '💡コツ：取り方が何通りもあるときは、取った数から「跳び返される数」を引いてくらべよう。',
  'lp.hang': '💡コツ：駒を動かす前に、相手から見てその駒の向こう側の点が空いていないか（跳び越されないか）を確かめよう。',
  'tp.chain': '続けて跳べる取りがあります。跳べる限り最後まで跳ぶのが決まりです。最後の着地点が安全かを確かめて選ぼう。',
  'tp.big': '続けて跳んで、一度に{n}枚取れる手があります。最後の着地点で跳び返されないかも確かめよう。',
  'tp.hang': '{sq}の駒が跳ばれそうです（相手の番なら取られます）。向こう側の点を味方でふさぐか、逃げるか、取られても跳び返せる形にしよう。',
  'tp.oppBig': '相手は次に{n}枚続けて跳べる形です。着地点を味方の駒でふさぐか、先に取れないか考えよう。',
  'tp.paika': '取る手がありません。駒は前か横にしか進めないので、相手に跳ぶ手を与えない点へ、戻れないことも考えて動かそう。',
  'tp.behind': '駒損です。相手の駒の向こう側が空いているところをねらい、続けて跳べる形を作って取り返そう。',
  'tp.losing': '劣勢です。わざと1枚跳ばせて相手の駒を誘い出し、まとめて跳び返す逆転の筋を探そう。',
  'tp.strong': '相手のほうが斜めの線が通る点に多く駒を置いています。その点の駒は斜めにも動けて跳べるので、盤ににらみが利きます。',
  'tp.strong2': '斜めの線が通る点を多く押さえています。斜めにも動ける・跳べる駒は、攻めにも守りにも強く働きます。',
  'tp.end1': '終盤は「あと何手動けるか」の勝負です。駒は後ろへ戻れないので、動ける手がなくなった側が負け。手待ちの手を残し、相手の駒の逃げ道を減らそう。',
  'tp.endDef': '駒が少ない側は、相手の駒と隣り合って向こう側が空いた形を作らないのが粘りのコツです。横に動ける余地を残しておこう。',
  'tp.mob': '動ける手（取らない手）の数は あなた{a}・相手{b} です。動ける手がなくなると負けなので、手数を残している側が終盤で有利になります。',
  'tp.open1': '序盤は中央 c3 のまわりで取り合いが始まります。取るのは義務なので、わざと跳ばせてから跳び返す「取らせて取る」筋に注意しよう。',
  'tp.open2': '駒は後ろへは戻れません（取るときの跳び越しだけはどの向きにもできます）。前へ出すぎず、後ろの段の駒は守りに残しておこう。',
  'tp.mid1': '跳び越しは、向こう側の点が空いているときだけできます。自分の駒のすぐ後ろを味方でふさぐと、その駒は取られません。',
  'tp.mid2': '取る手を選ぶときは「取った数 − 跳び返される数」でくらべよう。',
  Agl: {
    force: { m: ['取るのは義務', '取りの義務'], t: '取りの義務', d: '取れる手があるときは、取らない手は指せません。取り方が複数あるときはどれを選んでもかまいません。' },
    jump: { m: ['跳び越して', '跳び越え', '跳び越'], t: '跳び越して取る', d: '線の上で隣にいる相手の駒を跳び越え、すぐ向こうの空いた点に着地して、その駒を取ります。取るときはどの向き（後ろも）にも跳べます。' },
    chain: { m: ['続けて跳び', '続けて跳ぶ', '続けて跳べ', '続けて跳ん'], t: '連続跳び', d: '着地した点からさらに跳べるときは、同じ手番で跳び続けなければなりません（途中で止められません）。' },
    strong: { m: ['斜めの線が通る点', '斜めの点'], t: '斜めの線が通る点', d: '斜めの線が交わる点（盤の点の半分）。ここの駒は斜めにも動けて、斜めにも跳べます。' },
    noback: { m: ['後ろへ戻れない', '後ろへは戻れません'], t: '後ろへは戻れない', d: '取らない手は、前か横への1歩だけ。後ろへ戻れるのは、跳び越して取るときだけです。' },
  },
},
en: {
  oppTurn: 'Your opponent is to move. Try to guess which piece it will jump next — guessing right is how reading improves.',
  'tt.cap': 'Jump and take {n} with the piece on {sq}', 'tt.chain': 'Jump {s} times with the piece on {sq}, taking {n}',
  'b.big': 'Take several', 'x.big': 'The piece on {sq} jumps on and on, taking {n} at once. Check that it cannot be jumped back where it finally lands.',
  'x.chain': 'The piece on {sq} jumps {s} times in a row, {n} pieces in all. A chain must go on as long as it can. Check that it cannot be jumped back where it lands.',
  'x.cap': 'The piece on {sq} jumps and takes {n}. Captures are compulsory, so when there are several, compare whether the piece can be jumped back after landing.',
  'x.safe': 'Move the piece on {sq} to {to} and leave the opponent no jump. A piece whose far side is covered cannot be jumped.',
  'x.save': 'The piece on {sq} is attacked; move it to {to}. What matters is that the point behind it (seen from the opponent) is not empty there.',
  'x.sac': 'Move the piece on {sq} to {to}, letting it be jumped on purpose. Captures are compulsory, so this lures an enemy piece; by the AI\'s reading the loss is small (or it wins material back).',
  'c.strong': 'Diagonal point', 'b.strong': 'To a diagonal point', 'x.strong': 'Move the piece on {sq} to {to}, a point where diagonals cross. It can step and jump diagonally there, in attack and defence.',
  'x.wait': 'Move the piece on {sq} to {to} and keep a solid shape while waiting. Pieces cannot step back, so do not rush forward: keeping moves in hand matters.',
  strong: 'Diagonal points', mobK: 'Moves left',
  'lp.shot': '💡 Tip: when there are several captures, compare "pieces taken − pieces jumped back".',
  'lp.hang': '💡 Tip: before a move, check the point behind each piece (seen from the opponent): if it is empty, the piece can be jumped.',
  'tp.chain': 'A capture can go on with more jumps. A chain must go on as long as it can: check that the last landing point is safe.',
  'tp.big': 'A chain of jumps takes {n} pieces at once. Check that the piece cannot be jumped back where it lands.',
  'tp.hang': 'The piece(s) on {sq} could be jumped (if it were the opponent\'s turn). Cover the point behind with a piece of yours, move away, or make a jump back possible.',
  'tp.oppBig': 'The opponent threatens a chain of {n} jumps next. Cover a landing point with one of your pieces, or capture first.',
  'tp.paika': 'Nothing to capture. Pieces only step forward or sideways, so move to a point that gives the opponent no jump — remembering you cannot come back.',
  'tp.behind': 'You are behind. Aim at enemy pieces with an empty point behind them, and build a chain of jumps to win material back.',
  'tp.losing': 'You are losing. Look for a comeback: offer one piece to lure an enemy piece, then jump back several.',
  'tp.strong': 'The opponent holds more points where diagonals cross. Pieces there can step and jump diagonally and watch more of the board.',
  'tp.strong2': 'You hold more points where diagonals cross. Pieces that can step and jump diagonally are strong in attack and defence.',
  'tp.end1': 'The ending is a battle of moves left: pieces cannot step back, and a side with no move loses. Keep waiting moves in hand and take away the enemy pieces\' room.',
  'tp.endDef': 'With fewer pieces, avoid standing next to an enemy piece with an empty point behind you, and keep room to step sideways.',
  'tp.mob': 'Non-capturing moves available: you {a}, opponent {b}. A side with no move loses, so the side with more moves in hand is better in the ending.',
  'tp.open1': 'The opening fight starts around the centre c3. Captures are compulsory, so watch for "give one, take two": a piece offered to be jumped, then a jump back.',
  'tp.open2': 'Pieces cannot step back (only a capturing jump may go in any direction). Do not rush forward; keep the back-row pieces for defence.',
  'tp.mid1': 'A jump needs an empty point just beyond. Cover the point right behind a piece with a friendly piece and it cannot be taken.',
  'tp.mid2': 'Choose between captures by "taken − jumped back".',
  Agl: {
    force: { m: ['capturing is compulsory', 'captures are compulsory', 'compulsory'], t: 'Compulsory capture', d: 'When a capture is possible, a non-capturing move is not allowed. With several captures you may choose any of them.' },
    jump: { m: ['jumped back', 'jumps', 'jump'], t: 'Jump capture', d: 'Jump over an adjacent enemy piece along a line to the empty point just beyond; the jumped piece is taken. A capturing jump may go in any direction, backwards too.' },
    chain: { m: ['chain of jumps', 'chain'], t: 'Jump chain', d: 'If the piece can jump again from where it lands, it must go on jumping in the same turn — it cannot stop halfway.' },
    strong: { m: ['diagonals cross', 'diagonal point'], t: 'Diagonal points', d: 'The points where diagonal lines cross (half of the board). A piece there can also step and jump diagonally.' },
    noback: { m: ['cannot step back', 'cannot come back'], t: 'No steps back', d: 'A non-capturing move is one step forward or sideways. Only a capturing jump may go backwards.' },
  },
},
};
function mergeAlq(more) { for (const l in more) { const T = TX[l] = TX[l] || {}; for (const k in more[l]) { if (k === 'Agl') T.Agl = Object.assign({}, T.Agl || {}, more[l].Agl); else T['A.' + k] = more[l][k]; } } }
mergeAlq(AQ);
const isAlq = () => typeof gv !== 'undefined' && gv === 'alq';
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  const l = L(); let x;
  if (isAlq()) { const a = 'A.' + k; x = TX[l][a]; if (x === undefined) x = TX.en[a]; if (x === undefined) x = TX.ja[a]; }
  if (x === undefined) x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const glSet = () => { const T = TX[L()] || TX.en; return isAlq() ? (T.Agl || TX.en.Agl) : (T.gl || TX.en.gl); };
const gl = h => window.CoachKit ? CoachKit.gloss(h, glSet()) : h;
const pctS = x => Math.round(x * 100) + '%';

// --------------------------------------------------------------------------------------------- position facts
const wr = v => (1 + sOfV(v)) / 2;
const nm = i => E.pname(i);
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves(); f.capN = pos.hasCaps() ? f.legal.length : 0;
  f.cnt = [pos.count(us), pos.count(them)]; f.mat = f.cnt[0] - f.cnt[1];
  const tot = f.cnt[0] + f.cnt[1];
  f.stage = tot <= 12 ? 'end' : (n < 8 && tot >= 30) ? 'open' : 'mid';
  f.big = 0; f.chain = false; f.both = false;
  if (f.capN) {
    for (const m of f.legal) { f.big = Math.max(f.big, capCountIn(pos, m)); if (m.split('-').length > 2) f.chain = true; }
    const first = pos.capSteps(null), seen = new Set();
    for (const x of first) { const k = x.from + ':' + x.to; if (seen.has(k)) { f.both = true; break; } seen.add(k); }
  }
  f.hang = [...threatened(pos, us)];
  const q = pos.clone(); q.side ^= 1;
  f.oppBig = bestCapture(q);
  f.strong = [0, 0]; for (let i = 0; i < E.NP; i++) if (E.strong(i)) { if (pos.at(i) === us) f.strong[0]++; else if (pos.at(i) === them) f.strong[1]++; }
  if (isAlq()) { f.mob = [alqSteps(pos, us), alqSteps(pos, them)]; f.stage = tot <= 8 ? 'end' : (n < 6 && tot >= 20) ? 'open' : 'mid'; }
  return f;
}
// Alquerque: the non-capturing steps player p could make (forward / sideways along a line to an empty point)
function alqSteps(pos, p) {
  let n = 0;
  for (let i = 0; i < E.NP; i++) if (E.valid(i) && pos.at(i) === p) for (let d = 0; d < 8; d++) { const t = E.NB[d][i]; if (t >= 0 && !pos.at(t) && (p === P1 ? E.DR[d] >= 0 : E.DR[d] <= 0)) n++; }
  return n;
}
// what a candidate move is about
function classify(pos, m, f, v) {
  const fr = E.mFrom(m), to = E.mTo(m), steps = m.split('-').length - 1, n = capCountIn(pos, m);
  const r = { sq: nm(fr), to: nm(to), n, s: steps, m };
  const mk = k => Object.assign(r, { k });
  if (v != null && v > WINT) return mk('win');
  if (n) {
    // a shorter chain than possible
    if (pos.moves().some(x => x !== m && x.startsWith(m + '-'))) return mk('short');
    if (steps >= 2) return mk('chain');
    if (n >= 3) return mk('big');
    return mk('cap');
  }
  const after = pos.clone().play(m), lose = bestCapture(after);
  if (lose >= 1 && matAfter(pos, m) <= -1) return mk('sac');
  if (f.hang.includes(fr) && !threatened(after, f.us).has(to)) return mk('save');
  if (!lose && f.oppBig) return mk('safe');
  if (E.strong(to) && !E.strong(fr)) return mk('strong');
  return mk(lose ? 'sac' : 'wait');
}
const CCLS = { win: 'c-mate', chain: 'c-mat', big: 'c-mat', cap: 'c-mat', short: 'c-def', safe: 'c-def', save: 'c-def', sac: 'c-atk', strong: 'c-dev', wait: 'c-calm' };
const RCLS = { win: 'r-mate', save: 'r-def', safe: 'r-def', short: 'r-def' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) {
  if (k.n && k.s >= 2) return tx('tt.chain', { sq: k.sq, n: k.n, s: k.s });
  if (k.n) return tx('tt.cap', { sq: k.sq, n: k.n });
  return tx('tt.paika', { sq: k.sq, to: k.to });
}
const catTxt = k => tx('x.' + k.k, { sq: k.sq, to: k.to, n: k.n, s: k.s });

// --------------------------------------------------------------------------------------------- openings (first moves + openings.json)
const THEORY = { '': [['f2-e3A', 'main', 'f2e3'], ['d3-e3A', 'main', 'd3e3'], ['d3-e3W', 'alt', 'd3e3w'], ['d2-e3A', 'alt', 'd2e3'], ['e2-e3A', 'alt', 'e2e3']] };
const opName = s => (s.title && (s.title[LANG] || s.title.en)) || s.id;
function gameNames(i) { return moves.slice(0, i); }
const SETS = () => (typeof OPEN !== 'undefined' && OPEN && OPEN.sets) ? OPEN.sets : [];
function openingType(names) {
  if (startSpec || !names.length || gv !== 'sivy') return null;
  let done = null; const live = [];
  for (const s of SETS()) {
    const L = s.moves.split(' ');
    if (L.length <= names.length && L.every((x, j) => x === names[j])) { if (!done || L.length > done.L) done = { s, L: L.length }; }
    else if (L.length > names.length && names.every((x, j) => x === L[j])) live.push(s);
  }
  if (live.length === 1 && (!done || names.length < 4)) return { name: opName(live[0]), fixed: false };
  if (done) return { name: opName(done.s), fixed: true };
  if (!live.length) return null;
  return { name: opName(live[0]), fixed: false };
}
function bookAt(i) {
  if (startSpec || i > 6 || gv !== 'sivy') return null;
  const names = gameNames(i), key = names.join(' ');
  if (THEORY[key]) return THEORY[key].map(([u, kind, k]) => ({ u, kind, key: k }));
  const nx = new Map();
  for (const s of SETS()) {
    const L = s.moves.split(' ');
    if (L.length > i && names.every((x, j) => x === L[j])) { const u = L[i], e = nx.get(u) || { u, kind: 'book', sets: [] }; e.sets.push(s); if (L.length === i + 1) e.done = s; nx.set(u, e); }
  }
  return nx.size ? [...nx.values()] : null;
}
const isBook = (i, m) => { const b = bookAt(i); return !!(b && b.some(x => x.u === m)); };

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, key: '', f: null, lists: new Map(), hov: null, items: null };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !rgame && !ken && gv !== 'telo' && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online'));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || S.lists.get(k) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], capN: 0, hang: [], strong: [0, 0], cnt: [0, 0], mat: 0, big: 0, oppBig: 0 }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const L = list.slice().sort((a, b) => b.v - a.v), best = L[0].v, wb = wr(best);
  const items = [];
  for (const c of L.slice(0, 4)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length && it.k.k !== 'cap') continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.capN) add(f.legal.length > 1 ? 'tp.forced' : 'tp.forced1', 100, { n: f.legal.length }, 1);
  if (f.big >= 3) add('tp.big', 92, { n: f.big }, 1);
  if (f.both && !isAlq()) add('tp.both', 86, null, 1);
  if (f.chain) add('tp.chain', 84);
  if (f.hang.length && !f.capN) add('tp.hang', 88, { sq: f.hang.map(nm).join(tx('sep')) }, 1);
  if (f.oppBig >= 3 && !f.capN) add('tp.oppBig', 82, { n: f.oppBig }, 1);
  if (!f.capN) add('tp.paika', 60);
  if (f.mat >= 1) add('tp.ahead', 54); else if (f.mat <= -1) add('tp.behind', 54);
  if (w != null) { if (w >= .8) add('tp.winning', 48); else if (w <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage !== 'open') { if (f.strong[1] > f.strong[0] + 1) add('tp.strong', 44); else if (f.strong[0] > f.strong[1] + 1) add('tp.strong2', 20); }
  if (f.stage === 'end') add(f.mat < 0 ? 'tp.endDef' : 'tp.end1', 46);
  if (f.mob && (f.stage === 'end' || f.mob[0] <= 3)) add('tp.mob', f.mob[0] < f.mob[1] ? 62 : 42, { a: f.mob[0], b: f.mob[1] }, f.mob[0] < f.mob[1] ? 1 : 0);
  if (f.stage === 'open') { add('tp.open1', 40); add('tp.open2', 30); }
  else if (f.stage === 'mid') { add('tp.mid1', 24); add('tp.mid2', 16); }
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i];
  const mv = (i + 1) + '. ' + E.name(pos, m);
  if (isBook(i, m)) return CoachKit.verdict(0, esc(tx('prev', { m: mv, q: tx('q.best') })), esc(tx('prevBook')));
  const L = listAt(i); if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT) || loss >= 0.3) q = 'bad';
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
        body += '<br>' + esc(tx(E.isCap(m) ? 'lp.shot' : 'lp.hang'));
      }
    } else { const k = classify(pos.clone(), m, ff, mine.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (FanoronaCoach.sw) FanoronaCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
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
  chips.push({ k: tx('mat'), v: esc((f.mat === 0 ? tx('mat.even') : tx(f.mat > 0 ? 'mat.up' : 'mat.down', { x: Math.abs(f.mat) })) + tx('mat.n', { a: f.cnt[0], b: f.cnt[1] })), cls: f.mat > 0 ? 'pos' : f.mat < 0 ? 'neg' : '' });
  const ot = openingType(gameNames(cur));
  if (ot && cur < 20) chips.push({ k: tx('senkei'), v: esc(tx(ot.fixed ? 'fixed' : 'moyo', { n: ot.name })) });
  if (f.mob && f.stage === 'end') {   // Alquerque ending: the moves left decide
    chips.push({ k: tx('who', { k: tx('mobK'), w: tx('meC') }), v: String(f.mob[0]), cls: f.mob[0] > f.mob[1] ? 'pos' : f.mob[0] < f.mob[1] ? 'neg' : '' });
    chips.push({ k: tx('who', { k: tx('mobK'), w: tx('opC') }), v: String(f.mob[1]) });
  } else {
    chips.push({ k: tx('who', { k: tx('strong'), w: tx('meC') }), v: String(f.strong[0]), cls: f.strong[0] > f.strong[1] ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('strong'), w: tx('opC') }), v: String(f.strong[1]) });
  }
  h += CoachKit.summary(chips);
  const bk = f.legal.length > 1 ? bookAt(cur) : null;
  let opItems = null;
  if (bk) {
    opItems = [];
    for (const b of bk) {
      if (!f.legal.includes(b.u)) continue;
      const m = b.u, sq = nm(E.mFrom(m)), to = nm(E.mTo(m));
      if (b.key) opItems.push({ tag: tx('op.' + b.kind), cls: b.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + b.key + '.t')), text: gl(esc(tx('op.' + b.key + '.x'))), move: m, mvName: m, m });
      else {
        const n2 = b.done ? opName(b.done) : b.sets.map(opName).slice(0, 3).join(tx('sep'));
        opItems.push({ tag: tx('op.book'), cls: 'c-mat', title: esc(tx('op.next.t', { sq, to })), text: gl(esc(tx(b.done ? 'op.done.x' : 'op.next.x', { n: n2 }))), move: m, mvName: m, m });
      }
    }
    if (!opItems.length) opItems = null;
  }
  if (opItems) {
    S.items = opItems.map(x => x.m);
    let intro = esc(tx('opIntro'));
    if (cur === 0 && !startSpec) intro += ' ' + esc(tx('op.w0'));
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
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: d.u, mvName: d.nm }; }),
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
    onHover: u => { const v = u == null || u === '' ? null : String(u); if (S.hov !== v) { S.hov = v; renderFx(); } },
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
  CoachKit.css(); CoachKit.glossBind(glSet);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  FanoronaCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (FanoronaCoach.sw) FanoronaCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.FanoronaCoach = { init, render, relabel, merge, mergeAlq, tx, TX, active, usable, cands, fx, isBook, openingType };
})();
