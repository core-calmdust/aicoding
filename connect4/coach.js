'use strict';
// Connect Four coach (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・局面・序盤の型・勝ちマスの数と効く段・中央列), the recommended
// plan with its reason, the candidate directions (分かれ道: the solver's top columns classified into Connect Four plans —
// win / block / double threat / make a winning cell / centre / cut the opponent's line / extend your line / follow-up / wait),
// prioritized "how to think" tips read from the position (wins now, the opponent's wins, cells not to play under,
// stacked winning cells, odd / even rows, claimeven follow-up, centre …) and the verdict on the previous move.
// The first moves are taught from opening theory (the solved results of the first moves: Allis / Allen 1988) and the
// game's own solved opening data (book.json / tree.bin, through the analysis worker), not from raw evaluation.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (C4Coach.merge).
// index.html: C4Coach.render() after every refresh; C4Coach.cands(key, list) when the analysis list arrives.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補の手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次にどの列に入れてくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［解析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補の手を読んでいます…', form: '形勢', stage: '局面', 'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  opType: '序盤の型', moyo: '{n}模様', fixed: '{n}',
  'op.center': '初手中央', 'op.stack': '中央積み', 'op.adj': '中央＋隣', 'op.wide': '中央対外側', 'op.side': '初手中央外し',
  who: '{k}（{w}）', thH: '勝ちマス', meC: 'あなた', opC: '相手', 'th.none': 'なし', 'th.n': '{n}つ（効く段{k}）', ctr: '中央d列', ctrV: '{a}対{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢：{f}。',
  recSharp: '2番目の候補とは結果が大きく違います。ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの列はすべて結果が悪くなります（負け・引き分けに変わります）。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも結果は同じです。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補の手と方針', cdIntro: 'AI（完全読みのソルバー）の上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る', 'gap.res': '結果が変わる',
  'r.win': '勝ち', 'r.winN': '{n}手で勝ち', 'r.draw': '引き分け', 'r.loss': '負け', 'r.lossN': '{n}手で負け',
  opH: '序盤の分かれ道 — 理論で選ぶ', opIntro: 'コネクトフォーは1988年に完全に解析され、初手ごとの結果が分かっています。まずは定番の手を覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種',
  bkH: '序盤データの候補 — 解析済みの結果', bkIntro: 'この局面はゲームに入っている解析データ（完全読みの結果）の範囲です。序盤は評価値の小さな差より、結果（勝ち・引き分け・負け）で手を選ぶのが大切です。', bkWhy: 'この局面は解析データの範囲です。いちばん結果の良い手は {m}（{c}・{r}）です。',
  'o1.d.t': 'd1：中央に置く', 'o1.d.x': 'もっとも強い初手。完全に指せば先手が必ず勝てることが、1988年にJ・D・アレンとV・アリスによって証明されています。中央の列は4つ並びの線がいちばん多く通ります。',
  'o1.c.t': 'c1・e1：中央の隣に置く', 'o1.c.x': '中央の隣の初手。理論上は引き分けになる手で、先手の勝ちはなくなりますが、すぐに負けるわけでもありません（e1はc1の左右反転）。',
  'o1.b.t': 'b1・f1：外側に置く', 'o1.b.x': '理論上は後手が勝てる初手です（後手が正しく指すと最後の42手目で先手の負け）。中央を相手に渡すので、はじめのうちは避けよう。',
  'o1.a.t': 'a1・g1：端に置く', 'o1.a.x': '端の列は通る4つ並びの線が少なく、理論上は後手の勝ちになる初手です。',
  'o2.d.t': 'd2：中央に重ねる', 'o2.d.x': '後手でも中央を取りにいく手。先手が完全に指せばどこに置いても後手の負けですが、中央の列を相手ひとりに使わせないことが大切です。',
  'o2.c.t': 'c1・e1：中央の隣に置く', 'o2.c.x': '中央の隣で1段目の横の線を押さえる手。理論上は負けですが、先手が正しく指し続けないと勝てない形になります。',
  'o2.b.t': 'b1・f1・a1・g1：外側に置く', 'o2.b.x': '中央から離れる手。中央を先手に明け渡すので、先手が攻めやすくなります。',
  'sk.center': '初手中央：先手が中央に置いた形。完全に指せば先手必勝（1988年に解析）。後手はどこに置いても理論上は負けなので、相手が間違えやすい形を選びます。',
  'sk.stack': '中央積み：先手と後手が中央のd列に積み合う形。d1・d2のあと、先手の勝ち手はd3だけです（解析データ）。',
  'sk.adj': '中央＋隣：後手が中央の隣（c列・e列）に置いた形。1段目の横の線をめぐる戦いになります。',
  'sk.wide': '中央対外側：後手が中央から離れた列に置いた形。中央の主導権は先手が持っています。',
  'sk.side': '初手中央外し：先手が中央以外から始めた形。理論上、c列・e列なら引き分け、それより外なら後手の勝ちです。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '{c}の方針で、AIの第一候補と同じ結果の手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevRes: 'この手で結果が「{a}」から「{b}」に変わりました。', prevOpen: '序盤の理論では {m} がより良い結果になる手です。',
  'q.best': '最善', 'q.good': '好手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  // plans: tag / badge / explanation ({x}: the cell)
  'c.win': '勝ち', 'b.win': '4つ並べる', 'x.win': '{x}に入れると4つ並んで、その場で勝ちです。ほかの手を考える前に、まず自分の勝ちを確かめよう。',
  'c.block': '受け', 'b.block': 'ふさぐ', 'x.block': '相手は次に{x}で4つ並べられます。ここをふさがないと負けてしまいます。',
  'c.double': '両狙い', 'b.double': '勝ちマスを2つ作る', 'x.double': '置いたあと勝ちマスが2つ同時にできる（ダブルリーチ）か、縦に重なります。相手は1つしかふさげないので、勝ちに近づく強い手です。',
  'c.threat': '勝ちマス作り', 'b.threat': '勝ちマスを作る', 'x.threat': '{x}に勝ちマス（あと1つで4つ並ぶ空きマス）を作る方針。勝ちマスは数より段が大事で、{par}',
  'x.parG': 'これは自分に効く段（{p}）の勝ちマスです。終盤、相手がその真下を埋めざるを得なくなる段です。', 'x.parB': 'これは自分には効きにくい段（{p}）なので、ほかの勝ちマスと組み合わせて使おう。',
  'c.center': '中央', 'b.center': '中央を取る', 'x.center': '中央のd列は4つ並びの線がいちばん多く通る列です（横の4つ並びは必ずd列を通ります）。中央を多く押さえるほど、勝ちマスを作りやすくなります。',
  'c.deny': '妨害', 'b.deny': '線を切る', 'x.deny': '相手の石がつながりかけている線に割り込んで、相手が勝ちマスを作れる場所を減らす方針。',
  'c.build': '形作り', 'b.build': '線をのばす', 'x.build': '自分の石の近くに置いて、4つ並びの線（横・縦・斜め）を増やす方針。線が多いほど、あとで勝ちマスを作りやすくなります。',
  'c.follow': 'フォローアップ', 'b.follow': '重ねる', 'x.follow': '相手が置いた列にそのまま重ねて、全部の列の高さを偶数にそろえる方針。後手はこれを続けると偶数段のマスを取れるので、偶数段の勝ちマスが生きてきます。',
  'c.wait': '手待ち', 'b.wait': '安全に待つ', 'x.wait': '急ぎの用がないとき、相手の勝ちマスの真下を避けて安全な列に置く方針。終盤は置ける列が減るので、安全な手を残しておくことが大切です。',
  'tt.win': '{col}列に入れて4つ並べる', 'tt.block': '{col}列で相手の勝ちマスをふさぐ', 'tt.double': '{col}列で勝ちマスを2つ作る', 'tt.threat': '{col}列で勝ちマスを作る', 'tt.center': '中央のd列に置く', 'tt.deny': '{col}列で相手の線を切る', 'tt.build': '{col}列で自分の線をのばす', 'tt.follow': '{col}列に重ねる', 'tt.wait': '{col}列に置いて待つ',
  odd: '奇数段', even: '偶数段',
  // tips
  'tp.win': '{x}に入れれば4つ並んで勝ちです！',
  'tp.block': '相手は次に{x}で4つ並べられます。まずここをふさごう。',
  'tp.double': '相手の勝ちマスが{x}と2か所あります（ダブルリーチ）。両方はふさげないので、先に自分が勝てる手がないか探そう。',
  'tp.under': '{col}列に入れると、真上の{x}が相手の勝ちマスなので、相手がすぐそこに入れて勝ちます。この列は避けよう。',
  'tp.underOwn': '{x}はあなたの勝ちマスです。その真下（{col}列）を自分で埋めると、相手にふさがれてしまいます。',
  'tp.stack': 'あなたの勝ちマスが{x}で縦に重なっています。下をふさがれても上で勝てる、とても強い形です。',
  'tp.oppStack': '相手の勝ちマスが{x}で縦に重なっています。その列の下を埋めると上で勝たれるので注意しよう。',
  'tp.parG': 'あなたの勝ちマスのうち{n}つ（{x}）が、あなたに効く段（{p}）にあります。終盤まで残せば、相手がその真下を埋めざるを得なくなります。',
  'tp.parB': 'あなたの勝ちマス（{x}）は、あなたには効きにくい段にあります。{who}は{p}の勝ちマスをねらおう。',
  'tp.oppPar': '相手の勝ちマス{x}は、相手に効く段にあります。その下のマスを最後まで埋めずにすむよう、早めに対策を考えよう。',
  'tp.follow': '後手のあなたが{col}列に重ねると、全部の列の高さが偶数にそろいます。これを続ける（フォローアップ）と偶数段のマスを取れます。ただし相手の勝ちマスがないか毎回確かめよう。',
  'tp.center': '中央のd列はあなた{a}個、相手{b}個です。序盤は中央とその近くに置くと、4つ並びの線を多く作れます。',
  'tp.open1': '序盤は中央のd列とその近く（c〜e列）が大切です。端の列は通る線が少ないので、はじめは避けよう。',
  'tp.open2': '置く前に、その真上のマスが相手にとってどんなマスになるかも考えよう（あなたが置くと、相手はその上に置けるようになります）。',
  'tp.mid1': '勝ちマスは数より段が大事。先手は奇数段（1・3・5段）、後手は偶数段（2・4・6段）の勝ちマスが終盤に生きます。',
  'tp.mid2': '毎手、①自分が4つ並べられるマス ②相手が4つ並べられるマス、の順に確かめよう。',
  'tp.end1': '終盤は置ける列が減ります。相手の勝ちマスの真下しか置けない状態（ツークツワンク）にならないよう、安全な列を残しておこう。',
  'tp.end2': '残りのマスの数を数えると、どちらが最後にどの段に置くことになるかが分かります。',
  'tp.won': '読み切りで勝ちの局面です。最善の手を続ければ勝てます。',
  'tp.lost': '読み切りでは負けの局面です。相手が間違えやすい、長く粘れる手を選ぼう。',
  'tp.drawn': '読み切りでは引き分けの局面です。負けない手を続けながら、相手のミスを待とう。',
  'tp.branch': '候補の手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善の手と2番目の手で結果が変わる局面です。ここを正確に指せるかが勝負の分かれ目。',
  sep: '・',
  gl: {
    kachi: { m: ['勝ちマス'], t: '勝ちマス', d: 'そこに置けば4つ並ぶ空きマス（スレット）。真下が埋まっていればすぐ置けますが、宙に浮いていれば下が埋まるまで置けません。' },
    double: { m: ['ダブルリーチ'], t: 'ダブルリーチ', d: '勝ちマスが同時に2つできること。相手は1手で1か所しかふさげないので、もう1か所で勝てます。' },
    odd: { m: ['効く段', '奇数段', '偶数段'], t: '奇数段・偶数段', d: '下から数えた段の偶奇。先手は奇数段（1・3・5）、後手は偶数段（2・4・6）の勝ちマスが終盤に生きます（アリスの理論）。' },
    zug: { m: ['ツークツワンク'], t: 'ツークツワンク', d: '置きたくなくても置かなければならず、どこに置いても損をする状態。コネクトフォーでは終盤、相手の勝ちマスの真下に置かされることを指します。' },
    follow: { m: ['フォローアップ'], t: 'フォローアップ（クレームイーブン）', d: '相手が置いた列に重ねて置き続けること。全部の列の高さが偶数のときに後手がこれを続けると、偶数段のマスを全部取れます（アリスの「クレームイーブン」）。' },
    yomi: { m: ['読み切り'], t: '読み切り', d: 'コンピュータが最後まで読んで、完全に指したときの結果（勝ち・引き分け・負け）が分かっていること。' },
    center: { m: ['中央のd列', '中央'], t: '中央の列', d: '7列の真ん中のd列。横の4つ並びはすべてこの列を通り、もっとも価値の高い列です。' },
    solver: { m: ['ソルバー'], t: 'ソルバー', d: '局面を最後まで読み切って、正確な結果を出すプログラム。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess which column they will play — the more often you guess right, the stronger your reading gets.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Reading the candidate moves…', form: 'Position', stage: 'Phase', 'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  opType: 'Opening', moyo: 'heading for {n}', fixed: '{n}',
  'op.center': 'Centre start', 'op.stack': 'Centre stack', 'op.adj': 'Centre + neighbour', 'op.wide': 'Centre vs outside', 'op.side': 'Off-centre start',
  who: '{k} ({w})', thH: 'Winning cells', meC: 'you', opC: 'opponent', 'th.none': 'none', 'th.n': '{n} ({k} on working rows)', ctr: 'Centre column d', ctrV: '{a} vs {b}',
  recWhy: 'The first choice here is the "{c}" plan. Position: {f}.',
  recSharp: 'The second choice gives a different result — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other column gives a worse result (a draw or a loss) — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'These all give the same result. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: "The AI's (a perfect solver's) top candidates, explained plan by plan.",
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse', 'gap.res': 'changes the result',
  'r.win': 'win', 'r.winN': 'win in {n}', 'r.draw': 'draw', 'r.loss': 'loss', 'r.lossN': 'loss in {n}',
  opH: 'Opening crossroads — choose by theory', opIntro: 'Connect Four was solved in 1988, so the result of every first move is known. Learn the standard moves first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  bkH: 'Opening data — solved results', bkIntro: "This position is covered by the game's built-in solved opening data. In the opening, choose by result (win / draw / loss) rather than by small evaluation differences.", bkWhy: 'This position is in the solved opening data. The best result comes from {m} ({c}, {r}).',
  'o1.d.t': 'd1: play the centre', 'o1.d.x': 'The strongest first move. In 1988 James D. Allen and Victor Allis proved that the first player wins with perfect play after it. More lines of four pass through the centre column than any other.',
  'o1.c.t': 'c1 / e1: next to the centre', 'o1.c.x': 'A first move next to the centre. With perfect play it is a draw: the first player gives up the win, but is not lost either (e1 is the mirror image of c1).',
  'o1.b.t': 'b1 / f1: on the outside', 'o1.b.x': 'In theory the second player wins after this first move (with correct play the first player loses on the 42nd move). It hands over the centre, so avoid it at first.',
  'o1.a.t': 'a1 / g1: on the edge', 'o1.a.x': 'Few lines of four pass through an edge column; in theory the second player wins after this first move.',
  'o2.d.t': 'd2: stack on the centre', 'o2.d.x': 'Takes the centre even as the second player. With perfect play by the first player every reply loses, but it matters not to let the opponent have the centre column alone.',
  'o2.c.t': 'c1 / e1: next to the centre', 'o2.c.x': 'Holds the bottom row next to the centre. It loses in theory, but the first player must keep finding the right moves to win.',
  'o2.b.t': 'b1, f1, a1, g1: on the outside', 'o2.b.x': 'Moves away from the centre and gives it to the first player, who then attacks more easily.',
  'sk.center': 'Centre start: the first player opened in the centre. With perfect play the first player wins (solved in 1988); every reply loses in theory, so the second player chooses positions where mistakes are easy.',
  'sk.stack': 'Centre stack: both players stack in the centre column d. After d1 d2, d3 is the first player\'s only winning move (solved data).',
  'sk.adj': 'Centre + neighbour: the second player answered next to the centre (column c or e). The fight is about the bottom row.',
  'sk.wide': 'Centre vs outside: the second player answered away from the centre. The first player holds the initiative in the centre.',
  'sk.side': 'Off-centre start: the first player did not open in the centre. In theory c or e is a draw, anything further out a win for the second player.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move with the same result as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevRes: 'This move changed the result from "{a}" to "{b}".', prevOpen: 'In opening theory {m} gives a better result.',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Inaccuracy', 'q.bad': 'Mistake',
  'c.win': 'Win', 'b.win': 'Make four', 'x.win': 'Playing {x} makes four in a row and wins at once. Before anything else, check your own win.',
  'c.block': 'Block', 'b.block': 'Block', 'x.block': 'The opponent can make four at {x} next. Block it, or you lose.',
  'c.double': 'Double threat', 'b.double': 'Two winning cells', 'x.double': 'After this move you have two winning cells at once (a double threat), or two stacked on top of each other. The opponent can only block one — a strong move toward the win.',
  'c.threat': 'Winning cell', 'b.threat': 'Make a winning cell', 'x.threat': 'Create a winning cell (an empty cell that completes four) at {x}. The row of a winning cell matters more than how many you have: {par}',
  'x.parG': 'this one is on a row that works for you ({p}) — late in the game the opponent is forced to fill the cell below it.', 'x.parB': 'this one is on a row that rarely works for you ({p}), so combine it with other winning cells.',
  'c.center': 'Centre', 'b.center': 'Take the centre', 'x.center': 'More lines of four pass through the centre column d than any other (every horizontal four uses it). The more of the centre you hold, the easier it is to make winning cells.',
  'c.deny': 'Cut', 'b.deny': 'Cut a line', 'x.deny': "Drop into a line where the opponent's discs are joining up, leaving them fewer places to make winning cells.",
  'c.build': 'Build', 'b.build': 'Extend your lines', 'x.build': 'Play next to your own discs to open more lines of four (across, up, diagonal). More lines means more chances for winning cells later.',
  'c.follow': 'Follow-up', 'b.follow': 'Stack on top', 'x.follow': 'Play on top of the opponent\'s last disc so every column has an even height again. Doing this all the time the second player gets the even-row cells, so even-row winning cells come to life.',
  'c.wait': 'Wait', 'b.wait': 'Wait safely', 'x.wait': "When nothing is urgent, play a safe column that is not directly under the opponent's winning cell. In the endgame fewer columns are left, so keeping safe moves in reserve matters.",
  'tt.win': 'Make four in column {col}', 'tt.block': "Block the opponent's cell in column {col}", 'tt.double': 'Two winning cells with column {col}', 'tt.threat': 'Make a winning cell with column {col}', 'tt.center': 'Play the centre column d', 'tt.deny': "Cut the opponent's line in column {col}", 'tt.build': 'Extend your line in column {col}', 'tt.follow': 'Stack on column {col}', 'tt.wait': 'Wait in column {col}',
  odd: 'odd rows', even: 'even rows',
  'tp.win': 'Play {x}: four in a row and you win!',
  'tp.block': 'The opponent can make four at {x} next. Block it first.',
  'tp.double': 'The opponent has two winning cells, {x} (a double threat). You cannot block both — look for a win of your own first.',
  'tp.under': 'Column {col}: the cell above, {x}, is the opponent\'s winning cell — they would drop in and win. Avoid this column.',
  'tp.underOwn': '{x} is your winning cell. Filling the cell under it yourself (column {col}) lets the opponent block it.',
  'tp.stack': 'Your winning cells at {x} are stacked on top of each other. Even if the lower one is blocked you win on the upper one — a very strong shape.',
  'tp.oppStack': 'The opponent\'s winning cells at {x} are stacked. Filling the bottom of that column lets them win above — careful.',
  'tp.parG': '{n} of your winning cells ({x}) are on rows that work for you ({p}). Keep them to the end and the opponent will be forced to fill the cell below.',
  'tp.parB': 'Your winning cells ({x}) are on rows that rarely work for you. As the {who}, aim for winning cells on {p}.',
  'tp.oppPar': "The opponent's winning cell {x} is on a row that works for them. Plan early so you are not the one forced to fill the cell below it.",
  'tp.follow': 'As the second player, stacking on column {col} makes every column even again. Keep following up and you get the even-row cells — but check for the opponent\'s winning cells every time.',
  'tp.center': 'Centre column d: you {a}, opponent {b}. In the opening, playing in and near the centre gives you the most lines of four.',
  'tp.open1': 'In the opening the centre column d and its neighbours (c–e) matter most. Edge columns take part in few lines — avoid them at first.',
  'tp.open2': 'Before playing, think about the cell right above it: once you fill a cell, the opponent can play on top of it.',
  'tp.mid1': 'Row matters more than number: winning cells on odd rows (1, 3, 5) work for the first player, on even rows (2, 4, 6) for the second.',
  'tp.mid2': 'Every move, check in this order: (1) can you make four? (2) can the opponent make four?',
  'tp.end1': "Fewer columns are left in the endgame. Keep safe columns so you are not forced to play under the opponent's winning cell (zugzwang).",
  'tp.end2': 'Count the empty cells: it tells you who will have to play on which row at the end.',
  'tp.won': 'Solved: this position is a win. Keep playing the best moves and you win.',
  'tp.lost': 'Solved: this position is lost. Choose moves that last long and where the opponent can go wrong.',
  'tp.drawn': 'Solved: this position is a draw. Keep playing safe moves and wait for a mistake.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move and the second one lead to different results. Finding it may decide the game.',
  sep: ', ',
  gl: {
    kachi: { m: ['winning cells', 'winning cell'], t: 'Winning cell (threat)', d: 'An empty cell that would complete four. If the cell below is filled you can play it at once; if it is floating, it has to wait until the cells below are filled.' },
    double: { m: ['double threat'], t: 'Double threat', d: 'Two winning cells at the same time. The opponent can block only one per move, so you win on the other.' },
    odd: { m: ['odd rows', 'even rows', 'rows that work'], t: 'Odd and even rows', d: 'Rows counted from the bottom. Winning cells on odd rows (1, 3, 5) work for the first player, on even rows (2, 4, 6) for the second (Allis\'s theory).' },
    zug: { m: ['zugzwang'], t: 'Zugzwang', d: 'Having to move when every move hurts. In Connect Four: being forced late in the game to play directly under the opponent\'s winning cell.' },
    follow: { m: ['follow up', 'following up', 'Follow-up'], t: 'Follow-up (claimeven)', d: 'Always playing on top of the opponent\'s last disc. When every column has an even height, the second player who keeps doing this gets every even-row cell (Allis\'s "claimeven").' },
    yomi: { m: ['Solved'], t: 'Solved', d: 'The computer has read the position to the end, so the result with perfect play (win, draw or loss) is known.' },
    center: { m: ['centre column'], t: 'Centre column', d: 'Column d, the middle of the seven. Every horizontal four passes through it — the most valuable column.' },
    solver: { m: ['perfect solver'], t: 'Solver', d: 'A program that reads a position to the end and gives its exact result.' },
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
const C = 7, R = 6, FILES = 'abcdefg';
const cell = (c, r) => FILES[c] + (r + 1);   // column a-g + row from the bottom (always written LTR)
const ltr = s => '⁦' + s + '⁩';

// ------------------------------------------------------------------------------------------- position facts
const gridOfS = mv => { const g = Array.from({ length: C }, () => []); for (let i = 0; i < mv.length; i++) g[mv.charCodeAt(i) - 49].push(i & 1 ? 2 : 1); return g; };
const at = (g, c, r) => (c < 0 || c >= C || r < 0 || r >= R) ? -1 : (g[c][r] || 0);
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
function fours(g, c, r, p) {   // does p at (c, r) complete four (ignores gravity)
  for (const [dc, dr] of DIRS) {
    let n = 1;
    for (let s = 1; s < 4 && at(g, c + dc * s, r + dr * s) === p; s++) n++;
    for (let s = 1; s < 4 && at(g, c - dc * s, r - dr * s) === p; s++) n++;
    if (n >= 4) return true;
  }
  return false;
}
function threatsOf(g, p) { const out = []; for (let c = 0; c < C; c++) for (let r = g[c].length; r < R; r++) if (fours(g, c, r, p)) out.push({ c, r, now: r === g[c].length }); return out; }
const goodRow = (p, r) => p === 1 ? (r % 2 === 0) : (r % 2 === 1);   // row index 0 = row 1 (odd) → first player
const play = (g, c, p) => { const h = g.map(x => x.slice()); h[c].push(p); return h; };
// open windows of four through (c, r): [mine (no opponent disc, ≥1 mine), theirs (no mine, ≥2 theirs)]
function windows(g, c, r, p) {
  const q = 3 - p; let mine = 0, theirs = 0;
  for (const [dc, dr] of DIRS) for (let k = -3; k <= 0; k++) {
    let a = 0, b = 0, ok = true;
    for (let s = 0; s < 4; s++) { const x = c + dc * (k + s), y = r + dr * (k + s), v = at(g, x, y); if (v < 0) { ok = false; break; } if (x === c && y === r) continue; if (v === p) a++; else if (v === q) b++; }
    if (!ok) continue;
    if (!b && a) mine++;
    if (!a && b >= 2) theirs++;
  }
  return [mine, theirs];
}
const stacked = th => th.filter(t => th.some(u => u.c === t.c && u.r === t.r + 1));
function facts(mv) {
  const g = gridOfS(mv), n = mv.length, p = n & 1 ? 2 : 1, q = 3 - p;
  const f = { g, n, p, q };
  f.my = threatsOf(g, p); f.op = threatsOf(g, q);
  f.winNow = f.my.filter(t => t.now); f.lossNow = f.op.filter(t => t.now);
  f.under = []; f.underOwn = [];
  for (let c = 0; c < C; c++) { const h = g[c].length; if (h >= R - 1) continue; if (f.op.some(t => t.c === c && t.r === h + 1)) f.under.push({ c, r: h + 1 }); else if (f.my.some(t => t.c === c && t.r === h + 1)) f.underOwn.push({ c, r: h + 1 }); }
  f.myStack = stacked(f.my); f.opStack = stacked(f.op);
  f.myGood = f.my.filter(t => goodRow(p, t.r)); f.opGood = f.op.filter(t => goodRow(q, t.r) && !t.now);
  f.ctr = [g[3].filter(x => x === p).length, g[3].filter(x => x === q).length];
  const open = g.filter(x => x.length < R).length;
  f.stage = n < 8 ? 'open' : (n >= 28 || open <= 3) ? 'end' : 'mid';
  // claimeven follow-up: second player to move, exactly one odd-height column = the one just played
  if (p === 2 && n) { const lc = mv.charCodeAt(n - 1) - 49, odd = g.map((x, i) => x.length & 1 ? i : -1).filter(i => i >= 0); f.follow = odd.length === 1 && odd[0] === lc && g[lc].length < R ? lc : -1; } else f.follow = -1;
  f.op1 = n >= 1 ? mv[0] : ''; f.op2 = n >= 2 ? mv[1] : '';
  f.opType = !n ? null : f.op1 !== '4' ? 'side' : n < 2 ? 'center' : f.op2 === '4' ? 'stack' : (f.op2 === '3' || f.op2 === '5') ? 'adj' : 'wide';
  return f;
}
// what a candidate column is about
function classify(f, c) {
  const g = f.g, r = g[c].length, p = f.p;
  const k = x => ({ k: x, c, r, x: cell(c, r) });
  if (fours(g, c, r, p)) return k('win');
  if (f.lossNow.some(t => t.c === c)) return k('block');
  const h = play(g, c, p), th = threatsOf(h, p), nw = th.filter(t => !f.my.some(u => u.c === t.c && u.r === t.r));
  if (th.filter(t => t.now).length >= 2 || (nw.length && stacked(th).some(t => nw.some(u => (u.c === t.c && (u.r === t.r || u.r === t.r + 1)))))) return k('double');
  if (nw.length) { const o = k('threat'); o.t = nw.find(t => goodRow(p, t.r)) || nw[0]; return o; }
  if (c === f.follow && f.stage !== 'open') return k('follow');
  if (c === 3 && f.stage !== 'end') return k('center');
  const [mine, theirs] = windows(g, c, r, p);
  if (theirs >= 2 && theirs >= mine) return k('deny');
  if (mine >= 3) return k('build');
  if (c === f.follow) return k('follow');
  return k('wait');
}
const CCLS = { win: 'c-mate', block: 'c-def', double: 'c-atk', threat: 'c-atk', center: 'c-mat', deny: 'c-def', build: 'c-dev', follow: 'c-calm', wait: 'c-calm' };
const RCLS = { win: 'r-mate', block: 'r-def', deny: 'r-def' };

// ------------------------------------------------------------------------------------------- solver lists
const LISTS = new Map();   // move string → analysis list (mover's view)
function cands(key, list) { if (!list || !list.length) return; LISTS.set(key, list.map(e => ({ ...e }))); if (LISTS.size > 400) LISTS.delete(LISTS.keys().next().value); S.cls = null; render(); }
const proven = e => e.kind !== 'heur';
const cls3 = e => proven(e) ? Math.sign(e.v) : null;
function resWord(e, nm) {
  if (!proven(e)) return '';
  if (e.v > 0) return e.kind === 'exact' ? tx('r.winN', { n: 22 - e.v - (nm >> 1) }) : tx('r.win');
  if (e.v < 0) return e.kind === 'exact' ? tx('r.lossN', { n: typeof lossIn === 'function' ? lossIn(e, nm) : '' }) : tx('r.loss');
  return tx('r.draw');
}
const resPlain = x => tx(x > 0 ? 'r.win' : x < 0 ? 'r.loss' : 'r.draw');
function candInfo(key, f) {
  const list = LISTS.get(key); if (!list) return null;
  if (S.cls && S.cls.key === key && S.cls.list === list) return S.cls;
  const PRI = { win: 9, block: 8, double: 7, threat: 6, center: 5, follow: 4, deny: 3, build: 2, wait: 1 };
  const g = f.g, pr = c => PRI[classify(f, c).k] || 0;
  const sorted = list.filter(e => g[e.c].length < R).sort((a, b) => (rankOf(b) - rankOf(a)) || (pr(b.c) - pr(a.c)));   // equal results: the plan a player should see first
  if (!sorted.length) return null;
  const best = sorted[0], sb = sOf(best);
  const items = sorted.slice(0, 4).map(e => {
    const k = classify(f, e.c), bc = cls3(best), ec = cls3(e);
    const resChange = bc !== null && ec !== null && ec < bc;
    return { e, k, u: e.c, drop: resChange ? 1 : Math.max(0, sb - sOf(e)), resChange, res: resWord(e, f.n) };
  });
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => !d.resChange && d.drop <= 0.05);
  const second = items[1];
  const allProven = list.every(proven);
  const r = { key, list, items, dirs, best: items[0], allProven, branch: close.length >= 2 && items[0].k.k !== 'win',
    only: !!(second && second.resChange && items.slice(1).every(x => x.resChange)), sharp: !!(second && (second.resChange || second.drop >= 0.18)) };
  if (best.kind === 'exact' && best.v > 0 && 22 - best.v - (f.n >> 1) <= 1) r.branch = false;
  if (cls3(best) === -1) r.branch = false;   // lost anyway: not a choice of plans
  S.cls = r; return r;
}
function gapOf(d, i) {
  if (i === 0) return ['gap.best', 'g0'];
  if (d.resChange) return ['gap.res', 'g3'];
  return d.drop <= 0.05 ? ['gap.eq', 'g1'] : d.drop <= 0.18 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3'];
}
function ttl(k) { return tx('tt.' + k.k, { col: FILES[k.c] }); }
function catTxt(k, f) {
  if (k.k === 'threat') { const t = k.t || k, gd = goodRow(f.p, t.r); return tx('x.threat', { x: ltr(cell(t.c, t.r)), par: tx(gd ? 'x.parG' : 'x.parB', { p: tx(t.r % 2 === 0 ? 'odd' : 'even') }) }); }
  if (k.k === 'block') { const t = f.lossNow.find(x => x.c === k.c); return tx('x.block', { x: ltr(t ? cell(t.c, t.r) : k.x) }); }
  return tx('x.' + k.k, { x: ltr(k.x) });
}

// ------------------------------------------------------------------------------------------- opening theory (first two plies)
const OPEN = {
  '': [['4', 'main', 'o1.d'], ['3', 'main', 'o1.c'], ['2', 'alt', 'o1.b'], ['1', 'alt', 'o1.a']],
  '4': [['4', 'main', 'o2.d'], ['3', 'main', 'o2.c'], ['2', 'alt', 'o2.b']],
};
function openingOf(key) {
  const e = OPEN[key]; if (!e) return null;
  const list = LISTS.get(key), g = gridOfS(key), nm = key.length;
  return e.map(([d, kind, k]) => { const c = +d - 1, x = list && list.find(y => y.c === c); return { u: c, kind, k, res: x ? resWord(x, nm) : '', cls: x ? cls3(x) : null, mv: cell(c, g[c].length) }; });
}

// ------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, cls: null, op: null, hov: null };
let card = null;
function usable() {
  if (lesson || puzzle) return false;
  if (settings.mode !== 'ai' && settings.mode !== 'pvp') return false;
  if (window.rtGame && rtGame()) return false;
  if (typeof rbCons === 'function' && rbCons()) return false;
  return true;
}
function active() { return !!(settings.coach && usable()); }
function overNow() { return gameOver(moves); }
function myTurn() { return !overNow() && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveOf(moves) === humanColor); }
function verdictHtml() {
  // the player's last move (pvp: the last move)
  const n = moves.length; if (!n) return '';
  let i = n - 1;
  if (settings.mode === 'ai') { while (i >= 0 && toMoveOf(moves.slice(0, i)) !== humanColor) i--; if (i < 0) return ''; }
  const before = moves.slice(0, i), list = LISTS.get(before); if (!list || !list.length) return '';
  const c = moves.charCodeAt(i) - 49, mine = list.find(e => e.c === c); if (!mine) return '';
  const after = moves.slice(0, i + 1), st = statusOf(after), mv = ltr(cell(c, gridOfS(before)[c].length));
  let me = mine;
  if (st.winner && !st.resign) me = { c, kind: 'exact', v: 1 }; else if (st.draw) me = { c, kind: 'exact', v: 0 };
  const sorted = list.slice().sort((a, b) => rankOf(b) - rankOf(a)), best = sorted[0];
  const bc = cls3(best), mc = cls3(me);
  let q;
  if (bc !== null && mc !== null && mc < bc) q = i <= 1 ? 'dubious' : 'bad';
  else if (rankOf(me) >= rankOf(best) || (mc !== null && mc === bc && (me.kind !== 'exact' || best.kind !== 'exact' || Math.abs(best.v - me.v) < 4))) q = rankOf(me) >= rankOf(best) ? 'best' : 'good';
  else q = sOf(best) - sOf(me) >= 0.18 ? 'dubious' : 'good';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  const f = facts(before);
  let body = '';
  const kb = classify(f, best.c), bn = ltr(cell(best.c, f.g[best.c].length));
  if (best.c === c || q === 'best') body = esc(tx('prevBest', { c: tx('c.' + classify(f, c).k) }));
  else {
    if (q === 'bad' || (q === 'dubious' && mc !== null && bc !== null && mc < bc)) body = esc(tx('prevRes', { a: resPlain(bc), b: resPlain(mc) })) + ' ';
    body += esc(tx(i <= 1 && OPEN[before] ? 'prevOpen' : 'prevAlt', { m: bn, c: tx('c.' + kb.k) }));
  }
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (C4Coach.sw) C4Coach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const over = overNow(), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on);
  card.classList.toggle('ck-over', can && over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { clearFx(); return; }
  if (over) {
    clearFx();
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(typeof t === 'function' ? t('rv.btn') : 'Review')}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { clearFx(); return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const fAll = facts(moves.slice(0, cur));
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!overNow() ? `<small>${esc(tx('st.' + fAll.stage))}</small>` : ''}</h3>`;
  if (overNow()) { clearFx(); h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (cur !== moves.length || reviewing) { clearFx(); h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { clearFx(); h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const key = moves, f = fAll, cl = candInfo(key, f);
  if (S.hovKey !== key) { S.hovKey = key; S.hov = null; }
  // summary chips
  const chips = [];
  const ev = evals[cur];
  if (ev && settings.eval) { const mine = ev.side ? (ev.side === f.p ? 'pos' : 'neg') : (ev.kind === 'heur' ? ((f.p === 1 ? ev.s : -ev.s) > 0.08 ? 'pos' : (f.p === 1 ? ev.s : -ev.s) < -0.08 ? 'neg' : '') : ''); chips.push({ k: tx('form'), v: esc(evalText(ev)), cls: mine }); }
  if (f.opType) chips.push({ k: tx('opType'), v: esc(tx(f.n >= 8 ? 'fixed' : 'moyo', { n: tx('op.' + f.opType) })) });
  const thv = (all, good) => all.length ? tx('th.n', { n: all.length, k: good.length }) : tx('th.none');
  if (f.n >= 4) {
    chips.push({ k: tx('who', { k: tx('thH'), w: tx('meC') }), v: esc(thv(f.my, f.myGood)), cls: f.myGood.length ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('thH'), w: tx('opC') }), v: esc(thv(f.op, f.op.filter(t => goodRow(f.q, t.r)))), cls: f.op.filter(t => goodRow(f.q, t.r)).length ? 'neg' : '' });
  }
  if (f.stage !== 'end' && f.n >= 2) chips.push({ k: tx('ctr'), v: esc(tx('ctrV', { a: f.ctr[0], b: f.ctr[1] })) });
  h += CoachKit.summary(chips);
  S.op = null;
  const op = openingOf(key);
  if (op) {
    S.op = op.map(d => ({ u: d.u }));
    h += CoachKit.branches({
      head: tx('opH'), intro: esc(tx('opIntro')), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx(d.k + '.t')), text: gl(esc(tx(d.k + '.x'))), gap: d.res, gcls: d.cls === 1 ? 'g0' : d.cls === 0 ? 'g1' : d.cls === -1 ? 'g3' : '', move: String(d.u), mvName: ltr(d.mv) })),
    });
  } else if (cl && cl.best) {
    const b = cl.best, book = cl.allProven && f.n < 12;
    let why = book ? esc(tx('bkWhy', { m: ltr(b.k.x), c: tx('c.' + b.k.k), r: b.res || '' })) : esc(tx('recWhy', { c: tx('c.' + b.k.k), f: evalText(ev) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp')); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(book ? 'bkH' : cl.branch ? 'brH' : 'cdH'), intro: esc(tx(book ? 'bkIntro' : cl.branch ? 'brIntro' : 'cdIntro')), reveal: book,
      items: cl.dirs.map((d, i) => { const gp = gapOf(d, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k, f))), gap: tx(gp[0]) + (d.res ? ' · ' + d.res : ''), gcls: gp[1], move: String(d.u), mvName: ltr(d.k.x) }; }),
    });
    if (book) S.op = cl.dirs.map(d => ({ u: d.u }));
  } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function tipsOf(f, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const cs = list => list.map(t => ltr(cell(t.c, t.r))).join(tx('sep'));
  if (f.winNow.length) add('tp.win', 100, { x: cs(f.winNow.slice(0, 1)) }, 1);
  if (f.lossNow.length >= 2) add('tp.double', 95, { x: cs(f.lossNow) }, 1);
  else if (f.lossNow.length) add('tp.block', 96, { x: cs(f.lossNow) }, 1);
  if (f.under.length && !f.winNow.length) add('tp.under', 90, { col: FILES[f.under[0].c], x: ltr(cell(f.under[0].c, f.under[0].r)) }, 1);
  if (f.underOwn.length && !f.winNow.length) add('tp.underOwn', 70, { col: FILES[f.underOwn[0].c], x: ltr(cell(f.underOwn[0].c, f.underOwn[0].r)) });
  if (f.myStack.length && !f.winNow.length) { const t = f.myStack[0]; add('tp.stack', 80, { x: cs([t, { c: t.c, r: t.r + 1 }]) }); }
  if (f.opStack.length) { const t = f.opStack[0]; add('tp.oppStack', 78, { x: cs([t, { c: t.c, r: t.r + 1 }]) }, 1); }
  if (f.myGood.length) add('tp.parG', 60, { n: f.myGood.length, x: cs(f.myGood.slice(0, 3)), p: tx(f.p === 1 ? 'odd' : 'even') });
  else if (f.my.length) add('tp.parB', 50, { x: cs(f.my.slice(0, 3)), who: typeof t === 'function' ? t(f.p === 1 ? 'ng.first' : 'ng.second') : '', p: tx(f.p === 1 ? 'odd' : 'even') });
  if (f.opGood.length) add('tp.oppPar', 58, { x: cs(f.opGood.slice(0, 2)) });
  if (f.follow >= 0 && !f.lossNow.length && f.stage !== 'open') add('tp.follow', 48, { col: FILES[f.follow] });
  if (f.opType && f.n < 14) add('sk.' + f.opType, f.n < 4 ? 47 : 34);
  if (f.stage === 'open') { add('tp.center', 44, { a: f.ctr[0], b: f.ctr[1] }); add('tp.open1', 40); add('tp.open2', 30); }
  else if (f.stage === 'mid') { add('tp.mid1', 36); add('tp.mid2', 26); }
  else { add('tp.end1', 42); add('tp.end2', 24); add('tp.mid1', 20); }
  const best = cl && cl.best && cl.best.e;
  if (best && proven(best) && f.n >= 4) add(best.v > 0 ? 'tp.won' : best.v < 0 ? 'tp.lost' : 'tp.drawn', 46);
  if (cl && cl.branch) add('tp.branch', 52);
  if (cl && cl.sharp && !f.winNow.length && !f.lossNow.length) add('tp.sharp', 54);
  return out.sort((a, b) => b.pr - a.pr);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => { S.hov = u == null ? null : +u; drawFx(); },
  });
  // touch (iPhone): a tap toggles the candidate on the board. The pointer type is taken from pointerdown, because a
  // tap's click is not a PointerEvent (or reports "mouse") on some WebKit versions
  card.querySelectorAll('.ck-bi[data-mv]').forEach(b => {
    b.onclick = e => {
      if (S.pt === 'mouse') return;   // mouse: hover shows it
      e.stopPropagation();
      const mv = +b.dataset.mv, on = S.hov !== mv;
      S.hov = on ? mv : null; drawFx(); markRows();
    };
  });
  markRows();
  drawFx();
}
function markRows() {
  if (!card) return;
  card.querySelectorAll('.ck-bi[data-mv]').forEach(b => b.classList.toggle('ck-hov', S.hov != null && +b.dataset.mv === S.hov));
  if (S.hov != null) card.dataset.ckSel = String(S.hov); else delete card.dataset.ckSel;
}
// the hovered / tapped candidate's cell on the board: a ring on the cell the disc would land in
function clearFx() { if (typeof fxEl !== 'undefined' && fxEl) fxEl.querySelectorAll('.ck-mark').forEach(x => x.remove()); }
function drawFx() {
  clearFx();
  if (!active() || !myTurn() || typeof fxEl === 'undefined') return;
  const g = gridOfS(moves);
  let list = [];
  if (S.op) list = S.hov != null ? S.op.filter(d => d.u === S.hov) : [];
  else if (S.cls) list = S.hov != null ? S.cls.dirs.filter(d => d.u === S.hov) : [];
  list.forEach((d, i) => {
    const c = d.u; if (g[c].length >= R) return;
    const el = document.createElement('div'); el.className = 'mark ok ck-mark'; discPos(el, c, g[c].length);
    if (S.hov == null) { el.dataset.n = String(i + 1); }
    fxEl.appendChild(el);
  });
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (card) card.addEventListener('pointerdown', e => { S.pt = e.pointerType; }, true);
  { const rc = document.getElementById('reviewCard'); if (rc) { rc.dataset.itc = 'coach'; if (window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); } }
  if (settings.coach === undefined) settings.coach = true;
  C4Coach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  render();
  if (v && myTurn() && !LISTS.get(moves) && typeof analyzeCurrent === 'function') analyzeCurrent(busyToken);
}
function relabel() { if (C4Coach.sw) C4Coach.sw.sync(); S.cls = null; card && (card.dataset.h = ''); render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.C4Coach = { init, render, relabel, merge, tx, TX, active, cands, drawFx };
})();
