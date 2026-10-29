'use strict';
// ヘックス・コーチ (common spec shared/COACH.md, model: shogi/coach.js; look and behaviour: shared/coachkit.js) — shown while the
// player is to move against the AI (and in local two-player games): the position at a glance (形勢・局面・開局の型・連結の状態 for
// both sides), the recommended plan with its reason, the candidate directions (分かれ道: the AI's top cells classified into Hex plans —
// connect / block / bridge / edge template / intrusion …, each explained, the cells revealed on demand and ringed on the board),
// prioritized "how to think" tips read from the position, and the verdict on the previous move (◎○△✕).
// The first moves are taught from opening theory and the page's opening data (openings.json: the first-move map = Red's winrate after
// every first move, and the studied lines), not from raw evaluation.
// Sources for the texts: M. Seymour "Hex: A Strategy Guide" (mseymour.ca), E. Silverman "A Beginner's Guide to Hex",
// C. Sangwin "The game of Hex" (Edinburgh), BGA "Tips hex", HexWiki (ziggurat).
// Texts: TX[lang] (en fallback); zh … ar live in coach-i18n.js (HexCoach.merge).
// app.js: HexCoach.init() before the header bar; HexCoach.render() after every refresh (renderInfo) and when the analysis arrives;
// HexCoach.fx() at the end of renderFx (rings on the revealed / hovered candidates).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこに打ってくるか、予想してみよう。予想が当たるほど読みの力がつきます。', overRv: '対局が終わりました。解析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝ち（必勝の連結あり）', 'f.lost': '負け（相手に必勝の連結）', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recWin: 'AIはこの局面を、正しく打てば必ずつながる「必勝」と読んでいます。第一候補は「{c}」の方針です。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に打ちたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず打ちたい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で打つのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  opH: '1手目の選び方 — 開局の考え方', opIntro: '1手目は評価値ではなく、開局の考え方で選びます。数字はこのページのAIが調べた「その1手目のあとの赤の勝率」（1手目マップ）です。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.fairEdge.t': 'ふちで公平に始める', 'op.fairEdge.x': 'スワップありでは、1手目は「強すぎず弱すぎない」手がよい手です。強い手はスワップで相手のものになり、弱すぎる手は不利になるからです。ふちの手は弱めで、スワップされにくい開局として強い人がよく使います。',
  'op.obtuse.t': '鈍角の角の近くで始める', 'op.obtuse.x': '鈍角の角（盤の2つの広い角）の近くは、公平な開局としてよく打たれる場所です。短い対角線の戦いや、辺のラダーにも役立つ石になります。',
  'op.center.t': '中央に打つ', 'op.center.x': '中央の1手目はいちばん強い手です。スワップありではほぼ確実にスワップされ、相手の石になってしまいます。',
  'op.centerNs.t': '中央に打つ', 'op.centerNs.x': 'スワップなしでは、中央がいちばん強い1手目です。赤の2辺のどちらにも近く、どの方向にもブリッジで伸ばせます。',
  'op.diag.t': '短い対角線の上に打つ', 'op.diag.x': '鈍角の2つの角を結ぶ「短い対角線」の上の手も強い1手目です。中央の次に有力な場所です。',
  'op.swap.t': 'スワップする（{m}をもらう）', 'op.swap.x': '赤の1手目 {m} は、1手目マップで赤の勝率{p}%の強い手です。スワップすればその石があなたのものになります。強い1手目はスワップするのが基本です。',
  'op.noSwap.t': 'スワップせずにふつうに打つ', 'op.noSwap.x': '赤の1手目 {m} は、1手目マップで赤の勝率{p}%の弱めの手です。スワップせず、中央付近の自分に有利な場所に打ちましょう。',
  'op.noSwapW.t': 'ふつうに打つ', 'op.noSwapW.x': '赤の1手目 {m} は赤の勝率{p}%。スワップしてもしなくても大差のない、公平な1手目です。',
  'op.fair': '赤 {p}%',
  bkH: '定跡の候補 — 開局研究の手順', bkIntro: 'このページの「定跡研究」で、AIが打った代表的な手順です。序盤は評価値の小さな差より、手順の意味を覚えることが大切です。', 'bk.tag': '定跡', bkWhy: 'この局面は定跡研究の手順の範囲です。手順の次の手は {m}：{x}',
  typeH: '開局', moyo: '{n}模様', fixed: '{n}', 'ot.sw': '{n}→スワップ',
  'ot.center': '中央開局', 'ot.diag': '短い対角線の開局', 'ot.obtuse': '鈍角の角の開局', 'ot.acute': '鋭角の角の開局', 'ot.edge': 'ふちの開局', 'ot.row2': '2段目の開局', 'ot.mid': '中間の開局',
  conH: '連結', who: '{k}（{w}）', meC: 'あなた', opC: '相手', 'cn.st': '{e}/2辺を確保・あと{n}マス', 'cn.none': 'もうつながれない',
  'ed.row': '{r}段目の辺', 'ed.col': '{c}列の辺',
  // plans: tag / badge / explanation
  'c.win': '連結', 'b.win': 'つなぎ切る', 'x.win': 'この手で自分の2辺がつながる、勝ちの手です。',
  'c.block': '必ず止める', 'b.block': '止める', 'x.block': '相手はあと1手でつながります。ここをふさがないと負けなので、まず止めます。',
  'c.save': 'ブリッジを守る', 'b.save': '守る', 'x.save': '相手がブリッジの片方の空きマスに割り込んできました。もう片方に打てば、2つの石はつながったままです。',
  'c.swap': 'スワップ', 'b.swap': 'スワップ', 'x.swap': '赤の1手目を自分の石にする方針です。強い1手目なら、それをもらうのがいちばん得です。',
  'c.dual': '攻防の手', 'b.dual': '攻防', 'x.dual': '自分の連結を進めながら、相手の連結も遠くする一石二鳥の手です。ヘックスでは「守りは攻め」：よい手はたいてい両方の役をこなします。',
  'c.edge': '辺へつなぐ', 'b.edge': '辺へつなぐ', 'x.edge': '自分の石を辺につなぐ方針です。2段目の石は下の2マスが空いていれば辺とつながり、3段目の石もジッグラトの範囲が空いていればつながります（テンプレート）。',
  'c.bridge': 'ブリッジで伸ばす', 'b.bridge': '伸ばす', 'x.bridge': '自分の石からブリッジの位置に打って伸ばす方針です。間の2マスのどちらに打たれても、もう片方でつながるので、となりに打つより速く安全に進めます。',
  'c.dblock': '離れて止める', 'b.dblock': '止める', 'x.dblock': '相手の進路の少し先に打って止める方針です。すぐとなりで止めるとブリッジで回りこまれやすいので、離れて止めるほうが効果的です。',
  'c.ablock': 'つけて止める', 'b.ablock': '止める', 'x.ablock': '相手の石に直接つけて止める方針です。相手の伸びる方向を限定できますが、ブリッジで回りこまれないかを確かめよう。',
  'c.intrude': '割り込み', 'b.intrude': '割り込む', 'x.intrude': '相手のブリッジの空きマスに打つ方針です。相手は受けるしかありませんが、受けられればつながったままなので、割り込んだ石が自分に役立つ向きを選ぶのがコツです。',
  'c.connect': 'つなぐ', 'b.connect': 'つなぐ', 'x.connect': '自分の石のとなりに打って、しっかりつなぐ方針です。確実ですが進む速さはブリッジより遅めです。',
  'c.center': '中央を取る', 'b.center': '中央へ', 'x.center': '盤の中央を取る方針です。中央の石はどの方向にも伸ばせ、相手の連結もじゃましやすい場所です。',
  'c.shape': '形を整える', 'b.shape': '整える', 'x.shape': '石の配置を整えて、次の狙いを準備する方針です。',
  'tt.win': '{s}の列をつなぎ切る', 'tt.win0': '自分の2辺をつなぎ切る', 'tt.block': '相手の{o}の列の最後のすき間をふさぐ', 'tt.block0': '相手の最後のすき間をふさぐ',
  'tt.save': '{s}と{s2}のブリッジを守る', 'tt.swap': 'スワップ：赤の{o}を自分の石にする',
  'tt.dual': '{s}の石から伸ばし、相手の{o}の進路もふさぐ', 'tt.edge': '{s}の石を{e}につなぐ', 'tt.edge0': '{e}に石を置く', 'tt.bridge': '{s}の石からブリッジで伸ばす',
  'tt.dblock': '相手の{o}の石を離れて止める', 'tt.ablock': '相手の{o}の石に直接つけて止める', 'tt.intrude': '相手の{o}と{o2}のブリッジに割り込む', 'tt.connect': '{s}の石のとなりにつなぐ',
  'tt.center': '盤の中央に打つ', 'tt.shape': '{s}の石の近くを固める', 'tt.shape0': '形を整える',
  // tips
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.winNow': 'あと1手で自分の2辺がつながるマスがあります！ 打つ前に確かめよう。',
  'tp.mustBlock': '相手はあと1手でつながります（{n}か所）。まずそこをふさがないと負けです。',
  'tp.bridgeCut': '相手が {s} と {s2} のブリッジに割り込みました。もう片方の空きマスに打てば、つながったままです。',
  'tp.race': '連結まで：あなたはあと{a}マス、相手はあと{b}マス（いちばん近い道の空きマスの数）。',
  'tp.edgeMe': 'あなたの石は{e}にテンプレートでつながっています（相手が割り込んでも受ければ切れません）。',
  'tp.edgeOpp': '相手の石は{e}にテンプレートでつながっています。そこに割り込んでも受けられるので、止めるなら別の場所を探そう。',
  'tp.open1': 'スワップありでは、1手目は「強すぎず弱すぎない」手が理想。中央の強い手はスワップされ、ふちの弱すぎる手は不利になります。',
  'tp.open2': 'スワップなしでは、中央と短い対角線（鈍角の角どうしを結ぶ線）の上が強い1手目です。',
  'tp.open3': '序盤は相手の石のすぐとなりに打たないのが基本。少し離れた、中央寄りの場所に打つほうが働きます。',
  'tp.swapQ': '赤の1手目をスワップするかどうか決めよう。中央に近い強い手はスワップ、ふちの弱い手はスワップせずに打つのが基本です。',
  'tp.mid1': '止めるときは、相手の石のすぐとなりより、進路の少し先に打とう（離れて止める）。となりで止めるとブリッジで回りこまれます。',
  'tp.mid2': '「守りは攻め」：ブリッジは自分の石をつなぎながら、相手を止める役もします。両方の役をこなす手を探そう。',
  'tp.mid3': '自分の辺と平行に石を並べる「広い前線」は、辺へまっすぐ向かう細い前線より止めにくくなります。',
  'tp.ladder': '辺の近くで止められると、2段目を押して進むラダーになります。ラダーの先に自分の石（エスケープ）があれば、ラダーは勝ちになります。',
  'tp.end1': '終盤は、両者の「あと何マス」と手番をくらべよう。相手より先につながるか、相手の道を2つ同時に止められるかが勝負です。',
  'tp.end2': '自分の手に相手の強い返しが見つかったら、もっとよい手を探そう。',
  'tp.winning': '優勢です。相手の割り込みには確実に受け、つながりを切らせなければ勝てます。',
  'tp.losing': '劣勢です。望みのない場所はあきらめ、相手の連結がいちばん弱いところで勝負しよう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。伸ばすか止めるか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に打てるかが勝負の分かれ目。',
  // verdict
  prev: '前の手 {m}：{q}', 'q.best': '◎ 最善', 'q.good': '○ 好手', 'q.dubious': '△ 疑問手', 'q.bad': '✕ 悪手',
  prevBest: '「{c}」の手で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいよい手です。',
  prevBook: '定跡研究の手順どおりの手です。', prevFair: '1手目マップで赤の勝率{p}%の、スワップありで公平な1手目です。',
  sep: '・',
  gl: {
    bridge: { m: ['ブリッジ'], t: 'ブリッジ', d: '間に空きマスが2つある2つの石。相手が片方に打っても、もう片方に打てばつながるので、ほとんどつながっているのと同じです。' },
    template: { m: ['テンプレート'], t: 'テンプレート（辺のテンプレート）', d: '相手が先に打っても、正しく受ければ必ず辺につながる石と空きマスの形。2段目の石と下の2マス、3段目のジッグラトなどがあります。' },
    zig: { m: ['ジッグラト'], t: 'ジッグラト', d: '3段目の石1つで辺につながるテンプレート。その下の辺側の小さな範囲が空いていれば、相手が割り込んでも受けられます。' },
    ladder: { m: ['ラダー'], t: 'ラダー', d: '辺の近くで止められた列が、相手に1段目をふさがれながら2段目（や3段目）を押して進む形。' },
    escape: { m: ['エスケープ'], t: 'ラダーエスケープ', d: 'ラダーの進む先に前もって置いた自分の石。ラダーがそこに届けば辺につながります。' },
    swap: { m: ['スワップ'], t: 'スワップルール', d: '赤の1手目のあと、青は打つ代わりにその石を自分のものにできるルール。先手の有利を消すために使われます。' },
    obtuse: { m: ['鈍角の角'], t: '鈍角の角', d: '菱形の盤の4つの角のうち、角度の広い2つ（となりのマスが3つある角）。' },
    diag: { m: ['短い対角線'], t: '短い対角線', d: '鈍角の2つの角を結ぶ対角線。中央とこの線の上は、強い1手目の場所です。' },
    intrude: { m: ['割り込'], t: '割り込み', d: '相手のブリッジやテンプレートの空きマスに打つこと。相手は受ける必要があります。' },
    front: { m: ['広い前線'], t: '広い前線', d: '自分の辺と平行に広がった石の並び。どちらの方向にも伸ばせるので止めにくくなります。' },
    distblock: { m: ['離れて止める'], t: '離れて止める', d: '相手の石のすぐとなりではなく、進路の少し先に打って止めること。となりで止めるとブリッジで回りこまれやすいからです。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  oppTurn: "It's your opponent's turn. Try to guess where they will play next — the more often you guess right, the stronger your reading gets.", overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'won (forced connection)', 'f.lost': 'lost (opponent has a forced connection)', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recWin: 'The AI reads this position as won: played correctly, your connection cannot be stopped. The first choice is the "{c}" plan.',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Choosing the first move — opening ideas', opIntro: "Choose the first move by opening ideas, not by evaluation. The numbers are Red's winning chances after that first move, as measured by this page's AI (the first-move map).", 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.fairEdge.t': 'Start fair, on the border', 'op.fairEdge.x': 'With the swap rule the best first move is one that is neither too strong nor too weak: a strong move gets swapped, a very weak one leaves you behind. Border moves are on the weak side and are rarely swapped — strong players use them a lot.',
  'op.obtuse.t': 'Start near an obtuse corner', 'op.obtuse.x': 'The obtuse corners (the two wide corners of the board) are a popular place for a fair opening. The stone helps later in the fight along the short diagonal and in ladders on the edges.',
  'op.center.t': 'Play in the centre', 'op.center.x': 'A centre opening is the strongest first move — with the swap rule it will almost surely be swapped and become your opponent\'s stone.',
  'op.centerNs.t': 'Play in the centre', 'op.centerNs.x': "Without the swap rule the centre is the strongest first move: it is close to both of Red's edges and can bridge out in every direction.",
  'op.diag.t': 'Play on the short diagonal', 'op.diag.x': 'Cells on the short diagonal (the line joining the two obtuse corners) are also strong first moves — the best area after the centre.',
  'op.swap.t': 'Swap (take {m})', 'op.swap.x': "Red's first move {m} is a strong one: Red wins {p}% after it on the first-move map. Swapping makes that stone yours. Strong first moves should be swapped.",
  'op.noSwap.t': 'Do not swap — play a move', 'op.noSwap.x': "Red's first move {m} is on the weak side (Red {p}% on the first-move map). Don't swap; play a good cell near the centre instead.",
  'op.noSwapW.t': 'Play a move', 'op.noSwapW.x': "Red's first move {m} gives Red {p}%: a fair opening, swapping or not makes little difference.",
  'op.fair': 'Red {p}%',
  bkH: 'Book moves — the studied opening lines', bkIntro: "Typical lines the AI played in this page's opening studies. In the opening, understanding what the moves do matters more than small evaluation differences.", 'bk.tag': 'Book', bkWhy: 'This position is still in the studied opening lines. The next move of the line is {m}: {x}',
  typeH: 'Opening', moyo: 'heading for {n}', fixed: '{n}', 'ot.sw': '{n} → swapped',
  'ot.center': 'centre opening', 'ot.diag': 'short-diagonal opening', 'ot.obtuse': 'obtuse-corner opening', 'ot.acute': 'acute-corner opening', 'ot.edge': 'border opening', 'ot.row2': 'second-row opening', 'ot.mid': 'in-between opening',
  conH: 'Connection', who: '{k} ({w})', meC: 'you', opC: 'opponent', 'cn.st': '{e}/2 edges secured · {n} cells to go', 'cn.none': 'cannot connect any more',
  'ed.row': 'the row-{r} edge', 'ed.col': 'the {c}-file edge',
  'c.win': 'Connect', 'b.win': 'Connect', 'x.win': 'This move joins your two edges — the winning move.',
  'c.block': 'Must block', 'b.block': 'Block', 'x.block': 'Your opponent connects with one more stone. Block it first, or the game is lost.',
  'c.save': 'Save the bridge', 'b.save': 'Save', 'x.save': 'Your opponent intruded into one empty cell of your bridge. Take the other cell and the two stones stay connected.',
  'c.swap': 'Swap', 'b.swap': 'Swap', 'x.swap': "Take Red's first stone as your own. When the first move is strong, taking it is the best deal.",
  'c.dual': 'Attack and defence', 'b.dual': 'Both', 'x.dual': "Moves your own connection forward and makes the opponent's longer at the same time. In Hex defence is also attack: good moves usually do both jobs.",
  'c.edge': 'Reach the edge', 'b.edge': 'Reach the edge', 'x.edge': 'Connect your stones to the edge. A second-row stone is connected when the two cells below it are free; a third-row stone too, when its ziggurat area is free (edge templates).',
  'c.bridge': 'Bridge out', 'b.bridge': 'Extend', 'x.bridge': 'Extend from your stone to a bridge point. Whichever of the two cells in between the opponent takes, you take the other — faster than playing next to your stone, and just as safe.',
  'c.dblock': 'Block at a distance', 'b.dblock': 'Block', 'x.dblock': "Block a little ahead of the opponent's path. A block right next to the stone is easily bent around with a bridge, so blocking at a distance works better.",
  'c.ablock': 'Adjacent block', 'b.ablock': 'Block', 'x.ablock': "Block right next to the opponent's stone. It limits where it can go, but check that it can't simply bridge around you.",
  'c.intrude': 'Intrusion', 'b.intrude': 'Intrude', 'x.intrude': "Play in an empty cell of the opponent's bridge. They must answer, and after that they are still connected — so choose the intrusion whose stone faces the way that helps you.",
  'c.connect': 'Solid link', 'b.connect': 'Link', 'x.connect': 'Play next to your own stone for a solid connection. Safe, but slower than a bridge.',
  'c.center': 'Take the centre', 'b.center': 'Centre', 'x.center': "Take the centre of the board. A central stone can grow in every direction and gets in the way of the opponent's connection.",
  'c.shape': 'Improve the shape', 'b.shape': 'Improve', 'x.shape': 'Improve your stones\' shape and prepare the next threat.',
  'tt.win': 'Complete the chain from {s}', 'tt.win0': 'Join your two edges', 'tt.block': "Fill the last gap in the opponent's chain at {o}", 'tt.block0': "Fill the opponent's last gap",
  'tt.save': 'Save the bridge {s}–{s2}', 'tt.swap': "Swap: take Red's {o} as your stone",
  'tt.dual': "Extend from {s} and block the opponent's {o}", 'tt.edge': 'Connect {s} to {e}', 'tt.edge0': 'Put a stone near {e}', 'tt.bridge': 'Bridge out from {s}',
  'tt.dblock': "Block the opponent's {o} at a distance", 'tt.ablock': "Block right next to the opponent's {o}", 'tt.intrude': "Intrude into the opponent's bridge {o}–{o2}", 'tt.connect': 'Link solidly to {s}',
  'tt.center': 'Play in the centre', 'tt.shape': 'Strengthen around {s}', 'tt.shape0': 'Improve the shape',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tp.winNow': 'There is a cell that joins your two edges right now! Check before you play.',
  'tp.mustBlock': 'Your opponent connects with one more stone ({n} cell(s)). Block that first, or you lose.',
  'tp.bridgeCut': 'Your opponent intruded into your bridge {s}–{s2}. Take the other empty cell and you stay connected.',
  'tp.race': 'To connect: you need {a} more cells, your opponent {b} (empty cells on the shortest path).',
  'tp.edgeMe': 'Your stones are connected to {e} by a template (if the opponent intrudes, answer inside it and it holds).',
  'tp.edgeOpp': "The opponent's stones are connected to {e} by a template. Intruding there can be answered, so look for another place to block.",
  'tp.open1': 'With the swap rule the ideal first move is neither too strong nor too weak: strong centre moves get swapped, very weak border moves leave you behind.',
  'tp.open2': 'Without the swap rule the strongest first moves are the centre and the short diagonal (the line joining the obtuse corners).',
  'tp.open3': "In the opening, don't play right next to the opponent's stones. A move a little away, nearer the centre, does more.",
  'tp.swapQ': "Decide whether to swap Red's first move: strong moves near the centre should be swapped; weak border moves should not.",
  'tp.mid1': "When you block, play a little ahead of the opponent's path (block at a distance), not right next to the stone — adjacent blocks get bent around with a bridge.",
  'tp.mid2': 'Defence is also attack: a bridge links your stones and blocks the opponent at the same time. Look for moves that do both.',
  'tp.mid3': 'A broad front (stones spread parallel to your edge) is much harder to block than a narrow front heading straight to the edge.',
  'tp.ladder': 'Blocked near an edge, a chain turns into a ladder, pushing along the second row. If one of your stones (a ladder escape) waits further along, the ladder wins.',
  'tp.end1': 'In the endgame compare both sides\' "cells to go" and whose turn it is: connect first, or find the cell that stops both of the opponent\'s paths.',
  'tp.end2': 'If you can find a strong answer to your own move, look for a better one.',
  'tp.winning': 'You are ahead. Answer every intrusion and keep your connections — that wins.',
  'tp.losing': "You are behind. Give up hopeless areas and fight where the opponent's connection is weakest.",
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (extend or block), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  prev: 'Previous move {m}: {q}', 'q.best': '◎ Best', 'q.good': '○ Good', 'q.dubious': '△ Dubious', 'q.bad': '✕ Mistake',
  prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  prevBook: 'A move of the studied opening lines.', prevFair: 'A fair first move for the swap rule (Red {p}% on the first-move map).',
  sep: ', ',
  gl: {
    bridge: { m: ['bridge'], t: 'Bridge', d: 'Two stones with two empty cells between them. If the opponent takes one cell, you take the other, so they are as good as connected.' },
    template: { m: ['template'], t: 'Edge template', d: 'A pattern of stones and empty cells that connects to the edge even if the opponent moves first: a second-row stone with the two cells below it, the third-row ziggurat, and more.' },
    zig: { m: ['ziggurat'], t: 'Ziggurat', d: 'The edge template of a single third-row stone. When the small area between it and the edge is empty, every intrusion can be answered.' },
    ladder: { m: ['ladder'], t: 'Ladder', d: 'A chain blocked near an edge that keeps pushing along the second (or third) row while the opponent blocks on the row below.' },
    escape: { m: ['ladder escape'], t: 'Ladder escape', d: 'A stone placed in advance where a ladder is heading; when the ladder reaches it, the chain connects to the edge.' },
    swap: { m: ['swap rule', 'swapped', 'Swap', 'swap'], t: 'Swap rule', d: "After Red's first move, Blue may take that stone as its own instead of playing. It removes the first player's advantage." },
    obtuse: { m: ['obtuse corners', 'obtuse corner'], t: 'Obtuse corner', d: 'The two wide corners of the rhombus board (the corner cells with three neighbours).' },
    diag: { m: ['short diagonal'], t: 'Short diagonal', d: 'The diagonal joining the two obtuse corners. The centre and this line are the strong first moves.' },
    intrude: { m: ['intruded', 'intrusion', 'Intruding'], t: 'Intrusion', d: "Playing in an empty cell of the opponent's bridge or template. The opponent has to answer." },
    front: { m: ['broad front'], t: 'Broad front', d: 'Stones spread parallel to your own edge. They can grow either way, which makes them hard to block.' },
    distblock: { m: ['block at a distance'], t: 'Blocking at a distance', d: "Blocking a little ahead of the opponent's path instead of right next to the stone, which is easily bent around." },
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

// --------------------------------------------------------------------------------------------- board geometry
const ND = [[-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1]];          // neighbours (consecutive ones touch)
const rcOf = (i, n) => [Math.floor(i / n), i % n];
const inB = (r, c, n) => r >= 0 && r < n && c >= 0 && c < n;
const hd = (a, b, n) => { const [r1, c1] = rcOf(a, n), [r2, c2] = rcOf(b, n), dr = r2 - r1, dc = c2 - c1; return (Math.abs(dr) + Math.abs(dc) + Math.abs(dr + dc)) / 2; };
const cn = (i, n) => i === SWAP ? t('mv.swap') : E.nameOf(i, n);
// distance of cell i from edge e (0 / 1) of side p: Red joins rows 1 / n, Blue files a / last
const edist = (i, n, p, e) => { const [r, c] = rcOf(i, n); return p === P1 ? (e ? n - 1 - r : r) : (e ? n - 1 - c : c); };
const edName = (p, e, n) => p === P1 ? tx('ed.row', { r: e ? n : 1 }) : tx('ed.col', { c: E.COLS[e ? n - 1 : 0] });
// bridges: [partner offset, common cell offsets]
const BR = ND.map((d, k) => { const d2 = ND[(k + 1) % 6]; return [[d[0] + d2[0], d[1] + d2[1]], d, d2]; });
function bridgesAt(pos, i, p) {   // own stones of p forming a bridge with cell i (both common cells empty)
  const n = pos.n, [r, c] = rcOf(i, n), out = [];
  for (const [o, a, b] of BR) {
    const rr = r + o[0], cc = c + o[1]; if (!inB(rr, cc, n) || pos.at(rr * n + cc) !== p) continue;
    const ra = r + a[0], ca = c + a[1], rb = r + b[0], cb = c + b[1];
    if (inB(ra, ca, n) && inB(rb, cb, n) && !pos.at(ra * n + ca) && !pos.at(rb * n + cb)) out.push(rr * n + cc);
  }
  return out;
}
// is cell i a common cell of a bridge of p? → the two stones, else null
function bridgeOf(pos, i, p) {
  const n = pos.n, [r, c] = rcOf(i, n);
  for (let k = 0; k < 6; k++) {   // stones at directions k and k+2 of i are bridge partners; their other common cell is at k+1
    const a = ND[k], b = ND[(k + 2) % 6], m = ND[(k + 1) % 6];
    const ra = r + a[0], ca = c + a[1], rb = r + b[0], cb = c + b[1], rm = r + m[0], cm = c + m[1];
    if (!inB(ra, ca, n) || !inB(rb, cb, n) || !inB(rm, cm, n)) continue;
    if (pos.at(ra * n + ca) === p && pos.at(rb * n + cb) === p && !pos.at(rm * n + cm)) return [ra * n + ca, rb * n + cb];
  }
  return null;
}
const adjTo = (pos, i, p) => { const n = pos.n, [r, c] = rcOf(i, n); return ND.some(([dr, dc]) => inB(r + dr, c + dc, n) && pos.at((r + dr) * n + c + dc) === p); };
function nearest(pos, i, p) { let best = -1, bd = 99; for (let j = 0; j < pos.b.length; j++) if (pos.at(j) === p && j !== i) { const d = hd(i, j, pos.n); if (d < bd) { bd = d; best = j; } } return best; }

// edge templates found by search: a stone of p at distance ≤ 2 from edge e is "secure" when, whatever the opponent plays near it,
// p can answer so that the stone still reaches the edge (depth: 2 intrusions). The window is a superset of the template's carrier.
function stoneSecure(pos, p, s, e) {
  const n = pos.n, d = edist(s, n, p, e); if (d === 0) return true; if (d > 2) return false;
  const R = []; for (let i = 0; i < n * n; i++) if (!pos.at(i) && i !== s && edist(i, n, p, e) <= d && hd(i, s, n) <= d + 1) R.push(i);
  const b = pos.b.slice(), q = p === P1 ? P2 : P1;
  const conn = () => {
    const seen = new Set([s]), st = [s];
    while (st.length) { const x = st.pop(); if (edist(x, n, p, e) === 0) return true; const [r, c] = rcOf(x, n); for (const [dr, dc] of ND) { const rr = r + dr, cc = c + dc; if (!inB(rr, cc, n)) continue; const y = rr * n + cc; if (!seen.has(y) && b[y] === p) { seen.add(y); st.push(y); } } }
    return false;
  };
  const go = depth => {
    if (conn()) return true; if (!depth) return false;
    for (const x of R) {
      if (b[x]) continue; b[x] = q;
      let saved = false;
      for (const y of R) { if (b[y]) continue; b[y] = p; saved = go(depth - 1); b[y] = 0; if (saved) break; }
      b[x] = 0; if (!saved) return false;
    }
    return true;
  };
  return go(d);
}
// edges of p that are secured (a stone on it, or a template), as [bool, bool]
const edC = new Map();
function edgesOf(pos, p) {
  const ck = pos.n + ':' + p + ':' + pos.b.join(''); if (edC.has(ck)) return edC.get(ck);
  if (edC.size > 400) edC.clear();
  const n = pos.n, out = [false, false]; edC.set(ck, out);
  for (const e of [0, 1]) {
    // stones of p within 2 rows of the edge, nearest first; stop at the first secure one
    const L = []; for (let i = 0; i < n * n; i++) if (pos.at(i) === p && edist(i, n, p, e) <= 2) L.push(i);
    L.sort((a, b) => edist(a, n, p, e) - edist(b, n, p, e));
    for (const s of L.slice(0, 6)) { if (stoneSecure(pos, p, s, e)) { out[e] = true; break; } }
  }
  return out;
}

// --------------------------------------------------------------------------------------------- position facts
function oType(i, n) {   // the type of a first move
  const [r, c] = rcOf(i, n), m = (n - 1) / 2, bd = Math.min(r, c, n - 1 - r, n - 1 - c);
  if (Math.abs(r - m) <= 1 && Math.abs(c - m) <= 1 && Math.abs(r + c - 2 * m) <= 1) return 'center';
  const ob = Math.min(hd(i, n - 1, n), hd(i, (n - 1) * n, n)), ac = Math.min(hd(i, 0, n), hd(i, n * n - 1, n));
  if (ob <= 2) return 'obtuse';
  if (ac <= 2) return 'acute';
  if (Math.abs(r + c - (n - 1)) <= 1) return 'diag';
  if (bd === 0) return 'edge';
  if (bd === 1) return 'row2';
  return 'mid';
}
function facts() {
  const { pos } = posAt(cur), n = pos.n, us = pos.side, them = us === P1 ? P2 : P1, f = { n, us, them, ply: cur, pos };
  f.winMe = pos.winCells(us); f.winOpp = pos.winCells(them);
  f.needMe = pos.need(us); f.needOpp = pos.need(them);
  f.cut = -1; f.cutBy = null;
  try { const sv = typeof bridgeSave === 'function' ? bridgeSave(pos) : -1; if (sv >= 0) { f.cut = sv; f.cutBy = bridgeOf(pos, sv, us); } } catch (e) {}
  try { f.edMe = edgesOf(pos, us); f.edOpp = edgesOf(pos, them); } catch (e) { f.edMe = f.edOpp = [false, false]; }
  const stones = pos.ply;
  f.stage = Math.min(f.needMe, f.needOpp) <= 2 || stones >= n * n * .45 ? 'end' : stones < Math.max(4, n - 3) ? 'open' : 'mid';
  // opening type: the first stone (after a swap: the swapped stone, Blue's)
  f.ot = null;
  if (!startSpec && moves.length >= 1 && cur >= 1) {
    const first = moves[0], k = oType(first, n), sw = moves[1] === SWAP && cur >= 2;
    f.ot = { k, sw, settled: cur >= 2 || !gSwap };
  }
  return f;
}
// what a candidate move is about
function classify(f, m) {
  const pos = f.pos, n = pos.n, us = f.us, them = f.them;
  if (m === SWAP) { let o = -1; for (let i = 0; i < pos.b.length; i++) if (pos.at(i)) o = i; return { k: 'swap', o: o >= 0 ? cn(o, n) : '' }; }
  const r = { m };
  const after = pos.clone().play(m);
  if (f.winMe.includes(m)) return Object.assign(r, { k: 'win', s: nearest(pos, m, us) });
  if (f.winOpp.includes(m)) return Object.assign(r, { k: 'block', o: nearest(pos, m, them) });
  if (f.cut === m && f.cutBy) return Object.assign(r, { k: 'save', s: f.cutBy[0], s2: f.cutBy[1] });
  const dMe = f.needMe - after.need(us), dOpp = after.need(them) - f.needOpp;
  const br = bridgesAt(pos, m, us), ob = bridgeOf(pos, m, them), adjO = adjTo(pos, m, them), adjM = adjTo(pos, m, us);
  const own = nearest(pos, m, us), opp = nearest(pos, m, them);
  if (ob && dOpp <= 0) return Object.assign(r, { k: 'intrude', o: ob[0], o2: ob[1] });
  if (dMe > 0 && dOpp > 0) return Object.assign(r, { k: 'dual', s: br[0] !== undefined ? br[0] : own, o: opp });
  const ed = Math.min(edist(m, n, us, 0), edist(m, n, us, 1)), e = edist(m, n, us, 0) <= edist(m, n, us, 1) ? 0 : 1;
  if (dMe > 0 && ed <= 2 && own >= 0 && pos.ply >= 2) { const before = edgesOf(pos, us)[e], now = edgesOf(after, us)[e]; if (now && !before) return Object.assign(r, { k: 'edge', s: own, e }); }
  if (dOpp > 0) return Object.assign(r, { k: adjO ? 'ablock' : 'dblock', o: opp });
  if (br.length) return Object.assign(r, { k: 'bridge', s: br[0] });
  if (adjM && dMe > 0) return Object.assign(r, { k: 'connect', s: own });
  if (opp >= 0 && hd(m, opp, n) <= 2 && !adjO) return Object.assign(r, { k: 'dblock', o: opp });   // a quiet move just ahead of an enemy stone
  const [rr, cc] = rcOf(m, n), mid = (n - 1) / 2;
  if (pos.ply < n && Math.abs(rr - mid) + Math.abs(cc - mid) <= 2) return Object.assign(r, { k: 'center' });
  return Object.assign(r, { k: 'shape', s: own });
}
const CCLS = { win: 'c-mate', block: 'c-def', save: 'c-def', swap: 'c-mat', dual: 'c-atk', edge: 'c-dev', bridge: 'c-dev', dblock: 'c-def', ablock: 'c-def', intrude: 'c-atk', connect: 'c-dev', center: 'c-dev', shape: 'c-calm' };
const RCLS = { win: 'r-mate', block: 'r-def', save: 'r-def', dblock: 'r-def', ablock: 'r-def' };
function ttl(k, n) {
  const v = { s: k.s >= 0 ? cn(k.s, n) : '', s2: k.s2 >= 0 ? cn(k.s2, n) : '', o: typeof k.o === 'number' ? (k.o >= 0 ? cn(k.o, n) : '') : (k.o || ''), o2: k.o2 >= 0 ? cn(k.o2, n) : '', e: k.e != null ? edName(F.us, k.e, n) : '' };
  const key = 'tt.' + k.k;
  if ((k.k === 'win' || k.k === 'shape') && !v.s) return tx(key + '0');
  if (k.k === 'block' && !v.o) return tx('tt.block0');
  return tx(key, v);
}
let F = null;   // the facts of the shown position (for ttl)
function formOf(v) { if (v > WINT) return 'win'; if (v < -WINT) return 'lost'; const w = wrOf(v); return w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : 'bad'; }

// --------------------------------------------------------------------------------------------- state
const S = { open: false, reveal: false, key: '', f: null, cls: null, hov: null, items: null };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !rgame && !rbS && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online'));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null; S.cls = null;
  try { S.f = facts(); } catch (e) { S.f = null; }
  return S.f;
}
const listAt = i => (typeof anaCache !== 'undefined' && anaCache.get(keyOf(i))) || null;
// the AI's top candidates (well-searched ones), classified, with the drop in win chance
function candInfo(list, f) {
  if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const max = Math.max(...list.map(e => e.n || 0));
  const top = list.filter((e, k) => k < 8 && (k === 0 || e.kind === 'exact' || (e.n || 0) >= max * .05));
  if (!f.pos.swapOk) for (let k = top.length - 1; k >= 0; k--) if (top[k].m === SWAP) top.splice(k, 1);
  const bv = top[0].v, items = top.slice(0, 5).map(e => ({ u: e.m, v: e.v, k: classify(f, e.m), drop: Math.max(0, wrOf(bv) - wrOf(e.v)) }));
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  const r = { list, items, dirs, best: items[0], branch: close.length >= 2 && bv < WINT, sharp: second != null && second >= 0.12 && bv < WINT ? pctS(second) : '', only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }

// --------------------------------------------------------------------------------------------- opening guidance (theory + openings.json)
const FIRSTwr = n => (typeof OPEN !== 'undefined' && OPEN && OPEN.first && OPEN.first[n]) ? OPEN.first[n].wr : null;
function openingItems(f) {
  if (startSpec) return null;
  const n = f.n, W = FIRSTwr(n), pos = f.pos;
  const items = [];
  if (cur === 0) {
    if (!W) return null;
    const cells = W.map((v, i) => ({ i, v, k: oType(i, n), bd: Math.min(...rcOf(i, n), n - 1 - rcOf(i, n)[0], n - 1 - rcOf(i, n)[1]) }));
    const fairest = L2 => L2.slice().sort((a, b) => Math.abs(a.v - 500) - Math.abs(b.v - 500))[0];
    const mid = (n - 1) / 2, ctr = Math.round(mid) * n + Math.round(mid);
    if (gSwap) {
      const e = fairest(cells.filter(x => x.bd === 0)), o = fairest(cells.filter(x => x.k === 'obtuse'));
      if (e) items.push({ u: e.i, kind: 'main', key: 'fairEdge', p: e.v });
      if (o && (!e || o.i !== e.i)) items.push({ u: o.i, kind: 'main', key: 'obtuse', p: o.v });
      items.push({ u: ctr, kind: 'alt', key: 'center', p: W[ctr] });
    } else {
      items.push({ u: ctr, kind: 'main', key: 'centerNs', p: W[ctr] });
      const d = cells.filter(x => Math.abs(rcOf(x.i, n)[0] + rcOf(x.i, n)[1] - (n - 1)) === 0 && x.i !== ctr && x.k !== 'center').sort((a, b) => b.v - a.v)[0];
      if (d) items.push({ u: d.i, kind: 'main', key: 'diag', p: d.v });
    }
    return { mode: 'first', items };
  }
  if (cur === 1 && pos.swapOk && W) {
    const fm = moves[0], p = W[fm];
    const strong = p > 520, weak = p < 480;
    items.push({ u: SWAP, kind: strong ? 'main' : 'alt', key: 'swap', p, m: cn(fm, n) });
    const cl = candInfo(listAt(cur), f), bestCell = cl && cl.items.find(x => x.u !== SWAP);
    items.push({ u: bestCell ? bestCell.u : -1, kind: strong ? 'alt' : 'main', key: weak ? 'noSwap' : 'noSwapW', p, m: cn(fm, n) });
    return { mode: 'swap', items: items.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'main' ? -1 : 1)) };
  }
  return null;
}
// the studied lines of openings.json that this game still follows (same size / swap rule), first 6 moves
function bookItems() {
  if (startSpec || typeof OPEN === 'undefined' || !OPEN || !OPEN.sets || cur >= 6 || cur < 1) return null;
  const pre = moves.slice(0, cur).join(','), out = [], seen = new Set();
  for (const g of OPEN.sets) {
    if (g.n !== gN || (g.swap !== false) !== !!gSwap || !g.study || !g.study.line) continue;
    const line = g.study.line; if (line.length <= cur || line.slice(0, cur).join(',') !== pre) continue;
    const u = line[cur]; if (seen.has(u)) continue; seen.add(u);
    const note = g.study.notes && g.study.notes[cur]; out.push({ u, note: note ? LL(note) : '' });
  }
  return out.length ? out : null;
}
const inBook = i => { if (startSpec || typeof OPEN === 'undefined' || !OPEN || !OPEN.sets || i >= 6) return false; const pre = moves.slice(0, i + 1).join(','); return OPEN.sets.some(g => g.n === gN && (g.swap !== false) === !!gSwap && g.study && g.study.line && g.study.line.slice(0, i + 1).join(',') === pre); };

// --------------------------------------------------------------------------------------------- tips
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi }), n = f.n;
  if (f.winMe.length) add('tp.winNow', 100, null, 1);
  if (f.winOpp.length) add('tp.mustBlock', 96, { n: f.winOpp.length }, 1);
  if (f.cut >= 0 && f.cutBy) add('tp.bridgeCut', 90, { s: cn(f.cutBy[0], n), s2: cn(f.cutBy[1], n) }, 1);
  if (f.ply >= 2 && f.needMe < 999 && f.needOpp < 999) add('tp.race', f.stage === 'end' ? 70 : 40, { a: f.needMe, b: f.needOpp });
  const eM = [0, 1].filter(e => f.edMe[e]), eO = [0, 1].filter(e => f.edOpp[e]);
  if (eM.length && f.stage !== 'open') add('tp.edgeMe', 34, { e: eM.map(e => edName(f.us, e, n)).join(tx('sep')) });
  if (eO.length && f.stage !== 'open') add('tp.edgeOpp', 44, { e: eO.map(e => edName(f.them, e, n)).join(tx('sep')) });
  if (f.ply === 1 && f.pos.swapOk) add('tp.swapQ', 64);
  if (f.stage === 'open') { add(gSwap ? 'tp.open1' : 'tp.open2', f.ply === 0 ? 60 : 26); add('tp.open3', 24); }
  else if (f.stage === 'mid') { add('tp.mid1', 30); add('tp.mid2', 28); add('tp.mid3', 18); add('tp.ladder', 16); }
  else { add('tp.end1', 30); add('tp.ladder', 22); add('tp.end2', 15); }
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  return out.sort((a, b) => b.pr - a.pr);
}

// --------------------------------------------------------------------------------------------- previous move verdict
function catTxt(k) { return tx('x.' + k.k); }
function verdictHtml() {
  const N = moves.length; if (!N || cur !== N) return '';
  // the player's last move (vs the AI: the human's; two players: the last move)
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - 1 - i > 1) return ''; }
  const m = moves[i], pos = posAt(i).pos, n = pos.n, mv = '<bdi>' + esc(cn(m, n)) + '</bdi>';
  const title = q => tx('prev', { m: mv, q: tx('q.' + q) });
  // opening knowledge first: a fair first move / a book move is never a mistake
  if (i === 0 && gSwap && !startSpec && m !== SWAP) { const W = FIRSTwr(n); if (W && Math.abs(W[m] - 500) <= 30) return CoachKit.verdict(0, title('best'), gl(esc(tx('prevFair', { p: Math.round(W[m] / 10) })))); }
  if (inBook(i)) return CoachKit.verdict(0, title('best'), gl(esc(tx('prevBook'))));
  const Lb = listAt(i); if (!Lb || !Lb.length) return '';
  const best = Lb[0], own = Lb.find(e => e.m === m);
  let mine = own && (own.n >= Math.max(60, best.n * .1) || own.kind === 'exact') ? own.v : null;
  if (mine == null) { const La = listAt(i + 1); if (posAt(i + 1).pos.winner()) mine = WIN - 1; else if (La && La.length) mine = -La[0].v; }
  if (mine == null) return '';
  const loss = wrOf(best.v) - wrOf(mine);
  let q = loss < 0.03 || m === best.m ? 'best' : loss < 0.09 ? 'good' : loss < 0.2 ? 'dubious' : 'bad';
  if (best.v > WINT && mine <= WINT) q = 'bad';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  // the plan of the AI's first choice (classified in the position before the move)
  let body = '';
  try {
    const keepCur = cur; let fb;
    try { cur = i; fb = facts(); } finally { cur = keepCur; }
    const kb = classify(fb, best.m), F0 = F; F = fb; const cB = tx('c.' + kb.k); F = F0;
    if (best.m === m) body = esc(tx('prevBest', { c: cB }));
    else body = tx(q === 'best' || q === 'good' ? 'prevAltOk' : 'prevAlt', { m: '<bdi>' + esc(cn(best.m, n)) + '</bdi>', c: esc(cB) });
    if (g >= 2) {   // 💡 the reason (same kinds as the post-game review)
      let kind = 'gen';
      if (best.v > WINT) kind = 'missWin';
      else if (m !== SWAP && pos.clone().play(m).winCells(pos.side === P1 ? P2 : P1).length) kind = 'allowWin';
      else if (fb.cut >= 0 && best.m === fb.cut && m !== fb.cut) kind = 'bridge';
      else if (m === SWAP || best.m === SWAP) kind = 'swap';
      else { const [r, c] = rcOf(m, n); if (pos.ply < n && (r === 0 || r === n - 1 || c === 0 || c === n - 1)) kind = 'edge'; }
      const tip = t('cr.tip.' + kind); if (tip && tip !== 'cr.tip.' + kind) body += '<br>' + tip;
    }
  } catch (e) {}
  return CoachKit.verdict(g, title(q), gl(body));
}

// --------------------------------------------------------------------------------------------- render
function render() {
  if (!card) return;
  if (HexCoach.sw) HexCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach tab
  // shows the review card instead; before the review exists, a short note with a button that starts it (common spec)
  const rv = !!document.querySelector('#reviewCard.show');
  const over = gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv && moves.length > 0));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { S.items = null; return; }
  // no analysis for this position yet (e.g. the first position after loading): ask once
  if (on && playing && typeof analyzeCurrent === 'function' && !listAt(cur)) { const k = moves.slice(0, cur).join(','); if (S.ask !== k) { S.ask = k; setTimeout(() => { if (!listAt(cur)) analyzeCurrent(busyToken); }, 300); } }
  if (over) {
    S.items = null;
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { S.items = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f = factsNow(); F = f;
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${f && !over && moves.length ? `<small>${esc(tx('st.' + f.stage))}</small>` : ''}</h3>`;
  S.items = null;
  if (cur !== moves.length || reviewing) { h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!f) return put(h);
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const n = f.n, list = listAt(cur), cl = candInfo(list, f);
  const bv = list && list.length ? list[0].v : null, wr = bv != null ? wrOf(bv) : null;
  // summary chips
  const chips = [];
  if (bv != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(bv)) + (Math.abs(bv) > WINT ? '' : ' ' + pctS(wr))), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  if (f.ot && f.ply <= n * 2) { const nm = tx('ot.' + f.ot.k); chips.push({ k: tx('typeH'), v: esc(f.ot.settled ? (f.ot.sw ? tx('ot.sw', { n: nm }) : tx('fixed', { n: nm })) : tx('moyo', { n: nm })) }); }
  if (f.ply >= 1) {
    const st = (p, ed, nd) => nd >= 999 ? tx('cn.none') : tx('cn.st', { e: ed.filter(Boolean).length, n: nd });
    chips.push({ k: tx('who', { k: tx('conH'), w: tx('meC') }), v: esc(st(f.us, f.edMe, f.needMe)), cls: f.needMe < f.needOpp ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('conH'), w: tx('opC') }), v: esc(st(f.them, f.edOpp, f.needOpp)), cls: f.needOpp < f.needMe ? 'neg' : '' });
  }
  h += CoachKit.summary(chips);
  let done = false;
  // opening: first move / swap decision from opening theory + the first-move map
  const op = openingItems(f);
  if (op && op.items.length) {
    const its = op.items.filter(d => d.u !== -1 || d.key !== 'noSwap');
    S.items = its.filter(d => d.u >= 0).map(d => ({ u: d.u }));
    h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true,
      items: its.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t', { m: d.m || '' })), text: gl(esc(tx('op.' + d.key + '.x', { m: d.m || '', p: Math.round(d.p / 10) }))), gap: d.key === 'swap' || d.key.startsWith('noSwap') ? '' : tx('op.fair', { p: Math.round(d.p / 10) }), gcls: Math.abs(d.p - 500) <= 30 ? 'g0' : 'g2', move: d.u >= 0 ? String(d.u) : '', mvName: d.u >= 0 ? cn(d.u, n) : '' })) });
    done = true;
  }
  const bk = !done && bookItems();
  if (bk) {
    const its = bk.map(x => ({ u: x.u, note: x.note, k: classify(f, x.u) }));
    S.items = its.map(d => ({ u: d.u }));
    const b = its[0];
    h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { m: cn(b.u, n), x: b.note || tx('x.' + b.k.k) }))), RCLS[b.k.k] || '');
    h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
      items: its.map(d => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k, n)), text: gl(esc(d.note ? d.note + ' ' : '') + esc(catTxt(d.k))), gap: tx('bk.tag'), gcls: 'g0', move: String(d.u), mvName: cn(d.u, n) })) });
    done = true;
  }
  if (!done && cl && cl.best) {
    const b = cl.best;
    let why = esc(b.v > WINT ? tx('recWin', { c: tx('c.' + b.k.k) }) : tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(b.v)), p: Math.round(wrOf(b.v) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    if (S.reveal) S.items = cl.dirs.map(d => ({ u: d.u }));
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k, n)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: cn(d.u, n) }; }) });
  } else if (!done) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  S.hov = null; drawFx();
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} render(); drawFx(); },
    onHover: u => { S.hov = u; drawFx(); },
  });
}
// rings on the board: the hovered candidate, or (revealed) all the candidates with their numbers
function drawFx() { try { renderFx(); } catch (e) {} }
function fx() {
  if (!active() || !S.items || !myTurn() || typeof fxDiv !== 'function' || !G) return;
  const list = S.hov != null ? S.items.filter(d => String(d.u) === String(S.hov)) : (S.reveal ? S.items : []);
  list.forEach(d => { if (d.u < 0 || d.u === SWAP) return; const k = S.items.indexOf(d) + 1, el = fxDiv('coach-mk' + (S.hov != null ? ' hov' : ''), d.u); el.textContent = k; });
}
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc) { rc.dataset.itc = 'coach'; if (window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); } }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  HexCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hov = null; render(); drawFx();
  if (v && typeof analyzeCurrent === 'function' && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (HexCoach.sw) HexCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.HexCoach = { init, render, relabel, merge, tx, TX, active, usable, fx, inBook };
})();
