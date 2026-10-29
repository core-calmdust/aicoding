'use strict';
// ネファタフル コーチ (common spec: shared/coachkit.js, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・取った駒・局面・序盤の型・隅の封鎖／王の状態), the recommended
// plan with its reason, the candidate directions of the position (分かれ道: the engine's analysis list, classified into plans,
// moves revealed on demand with an arrow on the board), prioritized "how to think" tips read from the position (脱出路・王の危険・
// 取られそうな駒・角の隣 …) and the verdict on the previous move. In the first moves of Copenhagen the coach teaches the opening
// lines of openings.json (the site's opening book) instead of raw evaluations; a book move is never called a mistake.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (TaflCoach.merge).
// app.js: TaflCoach.list(key, list) whenever the analysis (all moves, mover's view) arrives; TaflCoach.render() from renderInfo();
// TaflCoach.fx(svg) from renderFx() (the hovered candidate's arrow).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次に何をしてくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', mat: '取った駒', stage: '局面', who: '{k}（{w}）', meC: 'あなた', opC: '相手',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.v': '{a}枚取り／{b}枚取られ', 'mat.0': 'まだなし',
  senkei: '序盤の型', moyo: '{n}模様', fixed: '{n}', sep2: '・',
  cornH: '隅の封鎖', 'co.v': '{s}/4 封鎖', 'co.p': '・{p}か所 固め中', kingH: '王',
  'ks.throne': '玉座', 'ks.out': '玉座の外', 'ks.edge': '盤の端', 'ks.lines': '・逃げ道{n}本', 'ks.danger': '・危険',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: 'AIの上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'tt.move': '{sq}の{p}を動かす', 'tt.cap': '{sq}の{p}で{n}枚取る', 'tt.king': '王（{sq}）を動かす', 'tt.kingCap': '王（{sq}）で{n}枚取る',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  opH: '序盤の分かれ道 — 作戦の選び方', opIntro: '最初の数手で序盤の型が決まります。まずは定番の2つを試し、慣れたら変わり種も。手順はこのサイトの定跡（レッスンの「定跡」）からです。', 'op.main': '定番', 'op.alt': '変わり種',
  opIntroA: '攻め手の基本は「隅をふさぎながら、四方から少しずつ輪を縮める」こと。最初の数手で、どの隅から固めるかを決めます。',
  opIntroD: '守り手の基本は「駒を外へ広げて攻め手を分断し、王の逃げる方向を次々に変える」こと。攻め手の初手に合わせて応じ方を選びます。',
  bkH: '定跡の続き', bkIntro: 'この局面はまだサイトの定跡（レッスンの「定跡」）の範囲です。序盤は評価値の小さな差より、定跡どおりに形を作ることが大切です。', bkWhy: 'この局面は定跡の範囲です。定跡の手は {m}（{c}）。', 'bk.tag': '定跡',
  prevBook: '定跡どおりの手です。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  'q.best': '最善', 'q.good': '好手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tip.dub': '💡 コツ：動かす前に「相手の次の手で取られる駒はないか」「王の逃げ道（またはふさぐ手）を見落としていないか」を確かめよう。',
  pieces: ['', '攻め手', '守り手', '王'],
  // categories: tag / badge / explanation
  'c.win': '勝ち', 'b.win': '決める', 'x.win': 'この手で勝負が決まります。攻め手なら王を捕らえる・包囲する、守り手なら王を隅へ逃がす（または破られない砦を作る）手です。',
  'c.block': '逃げ道をふさぐ', 'b.block': 'ふさぐ', 'x.block': '王から隅への道（ライチ）をふさぐ手です。ふさがないと次の手で王に脱出されます。ふさぐ駒が次に取られないかも確かめよう。',
  'c.ksafe': '王を守る', 'b.ksafe': '王を守る', 'x.ksafe': '次の手で王が捕らえられるのを防ぐ手です。王のまわりの空いたマスに攻め手を入れさせない、王を動かす、などで受けます。',
  'c.tuichi': 'トゥイチ', 'b.tuichi': '2本の逃げ道', 'x.tuichi': '王を動かして、隅への逃げ道を同時に2本作る手（トゥイチ）。相手は1手で1本しかふさげないので、ほぼ勝ちが決まります。',
  'c.raichi': 'ライチ', 'b.raichi': '逃げ道を作る', 'x.raichi': '王を動かして、隅への逃げ道を1本作る手（ライチ）。相手はふさぐ手を指すしかなくなり、そのあいだに次の形を作れます。',
  'c.cap': '駒を取る', 'b.cap': '駒を取る', 'x.cap': '相手の駒をはさんで取る方針。駒が減るほど、攻め手は輪が薄くなり、守り手は王の守りが減ります。取ったあと自分の駒が取り返されないかも確かめよう。',
  'c.save': '駒を逃がす', 'b.save': '駒を逃がす', 'x.save': '次にはさまれて取られそうな駒を、安全なマスへ動かす方針。移った先でも役に立つマスを選べると理想的です。',
  'c.katk': '王に迫る', 'b.katk': '王に迫る', 'x.katk': '攻め手を王のとなりに置いて、王を囲む方針。コペンハーゲンでは王は4方向（玉座のとなりなら3方向）を囲まないと捕らえられず、盤の端では捕らえられません。',
  'c.press': 'はさむ狙い', 'b.press': '狙いを作る', 'x.press': '相手の駒に接して、次にはさんで取る狙いを作る方針。相手はその駒を守るか逃がすかに手を使うことになります。',
  'c.corner': '隅を固める', 'b.corner': '隅を固める', 'x.corner': '隅のまわりに攻め手を置いて、王の行き先をふさぐ方針。隅を先にふさいでおくのが攻め手の基本です。隅のすぐ隣のマスは、隅が敵の代わりになって1枚ではさまれるので注意。',
  'c.ring': '輪を縮める', 'b.ring': '輪を縮める', 'x.ring': '攻め手どうしをつなげて輪を少しずつ縮める方針。すき間を作らないように、駒どうしが支え合う形で進めよう。',
  'c.krun': '王を動かす', 'b.krun': '王を動かす', 'x.krun': '王を動かして逃げ道を探す方針。2つの方向（2つの隅）へ走れるマスに王を置けると、相手は両方をふさげません。',
  'c.spread': '外へ展開', 'b.spread': '外へ展開', 'x.spread': '守り手を外へ出して盤を広く使い、攻め手を分断する方針。王の通り道も広がります。',
  'c.guard': '王のそばを固める', 'b.guard': '固める', 'x.guard': '守り手を王の近くへ寄せて、王が囲まれにくくする方針。守りを固めすぎると逃げ道が減る点も考えよう。',
  'c.calm': '整える', 'b.calm': '整える', 'x.calm': '形を整えて相手の出方を見る方針。急がない局面では、一手の価値が高いマスに駒を動かそう。',
  // tips
  'tp.capNow': '王を捕らえる（または全部の守り手を包囲する）手があります！ 王のとなりの空いたマスを確かめよう。',
  'tp.escNow': '王が一手で隅へ行けます！ 盤の端に沿った道を確かめよう。',
  'tp.winNow': 'この一手で勝てる手があります。候補を見る前に、自分で探してみよう。',
  'tp.raichiOpp': '相手の王に隅への逃げ道があります（ライチ）。この手でふさがないと、次に脱出されてしまいます。',
  'tp.tuichiOpp': '相手の王に逃げ道が2本あります（トゥイチ）。1手でふさげるのは1本だけ。王を捕らえる手がなければ、とても苦しい局面です。',
  'tp.kDanger': 'あなたの王が、次の相手の手で捕らえられそうです。王のまわりの空いたマスを守るか、王を動かそう。',
  'tp.hang': '{list} の駒が、次の相手の手ではさまれて取られそうです。逃げる・守る・それ以上に大事な手を指す、のどれかを選ぼう。',
  'tp.canCap': '{list} の相手の駒をはさんで取れます。取ったあとに取り返されないか確かめてから。',
  'tp.tuichiChance': '王を動かして逃げ道を2本同時に作れます（トゥイチ）。王の動かし方を探してみよう。',
  'tp.raichiChance': '王を動かして隅への逃げ道を作れます（ライチ）。相手にふさぐ手を強いて、そのあいだに次の手を準備できます。',
  'tp.cornerAdj': '{sq} の駒は隅のすぐ隣にいます。隅は敵の駒と同じ役をするので、反対側に相手の駒が1枚来るだけで取られます。',
  'tp.corners': '封鎖できている隅は {n}/4 か所です。「先に隅をふさぎ、四方から少しずつ輪を縮める」が攻め手の基本です。',
  'tp.kingEdge': '王は盤の端にいます。コペンハーゲンでは端の王は捕らえられません。守り手で囲って崩されない砦（エッジフォート）ができれば勝ちです。',
  'tp.aOpen1': '攻め手の序盤：まず隅のまわりを固め、そのあと四方から少しずつ前進しよう。',
  'tp.aOpen2': '序盤の攻め手は駒を取られすぎないこと。できたすき間から王が抜け出します。',
  'tp.aMid1': '中央へ一気に攻め込んでも、たいてい守り手に跳ね返されます。輪を保ったまま、外から締めつけよう。',
  'tp.aMid2': '守り手を攻め手の駒どうしではさめる位置へ追い込もう。守りの駒が減るほど王は弱くなります。',
  'tp.aEnd1': '攻め手はもともと守り手の約2倍の駒を持っています。局面が進めば、駒の交換は攻め手に有利になります。',
  'tp.aEnd2': '王を捕らえきれないときは、守り手全体を囲む（包囲）勝ち方もあります。王を盤の端へ逃がさないように。',
  'tp.dOpen1': '守り手の序盤：駒を外へ広げて攻め手を分断し、王の通り道を作ろう。',
  'tp.dOpen2': '王のまわりの守りを早くから崩しすぎないこと。守りの駒を失うと王が囲まれやすくなります。',
  'tp.dMid1': '王の逃げる方向を次々に変えて、攻め手の形を崩そう。一方向だけねらうと簡単にふさがれます。',
  'tp.dMid2': '2つの端（2つの隅）へ走れるマスに王を置けると、相手は両方を同時にふさげません。',
  'tp.dEnd1': '逃げ道を2本同時に作る（トゥイチ）のが決め手です。1本ずつでは毎回ふさがれます。',
  'tp.dEnd2': '同じ局面が3回現れると守り手の負けです。同じ手の往復で時間をかせぐことはできません。',
  'tp.safe': '相手の駒2枚の間へ自分から入っても取られません。取られるのは、はさむ側が動いたときだけです。',
  'tp.winning': '優勢です。無理をせず、相手の逆転の筋（逃げ道・すき間）を先に消そう。',
  'tp.losing': '劣勢です。普通の手では差が縮まりません。相手がまちがえやすい複雑な手をねらおう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に指せるかが勝負の分かれ目。',
  sep: '・',
  gl: {
    raichi: { m: ['ライチ'], t: 'ライチ（raichi）', d: '王に隅（タブルットでは盤の端）への逃げ道ができた状態。リンネが記録したラップランドの遊びの言葉で、チェスの「チェック」にあたります。' },
    tuichi: { m: ['トゥイチ'], t: 'トゥイチ（tuichu / tuichi）', d: '王に逃げ道が2本同時にできた状態。相手は1手で1本しかふさげないので、守り手の勝ちがほぼ決まります。' },
    throne: { m: ['玉座'], t: '玉座', d: '盤の中央のマス。王だけが止まれます。空いた玉座は敵の駒と同じ役をし、玉座のとなりの王は3方向＋玉座で捕らえられます。' },
    corner: { m: ['隅'], t: '隅（角のマス）', d: '盤の四隅。王だけが入れ、王が着けば守り手の勝ち。隅はどちらの駒にとっても敵の駒と同じ役をするので、隣の駒は1枚ではさまれて取られます。' },
    fort: { m: ['エッジフォート', '砦'], t: 'エッジフォート', d: '盤の端にいる王が、守り手の駒で囲まれた壊せない砦の中で動ける形。できれば守り手の勝ち（コペンハーゲン）。' },
    encircle: { m: ['包囲'], t: '包囲', d: '攻め手が守り手全部（王を含む）を輪で囲み、どれも盤の端へ出られない状態。攻め手の勝ちです（コペンハーゲン）。' },
    sandwich: { m: ['はさんで', 'はさむ'], t: 'はさんで取る', d: '相手の駒を縦か横の両側から自分の駒（または隅・空いた玉座）ではさむと取れます。はさむ側が動いたときだけ取れます。' },
    ring: { m: ['輪'], t: '攻め手の輪', d: '攻め手どうしがつながって守り手を囲む形。すき間があると、そこから王が抜け出します。' },
    rep: { m: ['同じ局面が3回'], t: '同一局面3回', d: 'このサイトのルールでは、同じ局面が3回現れると守り手の負けです（守り手は同じ手の繰り返しで逃げ切れない）。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess what they will play next — the more often you guess right, the stronger your reading gets.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Captures', stage: 'Phase', who: '{k} ({w})', meC: 'you', opC: 'opponent',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'mat.v': 'took {a} / lost {b}', 'mat.0': 'none yet',
  senkei: 'Opening', moyo: 'heading for {n}', fixed: '{n}', sep2: ' · ',
  cornH: 'Corners sealed', 'co.v': '{s}/4 sealed', 'co.p': ', {p} in progress', kingH: 'King',
  'ks.throne': 'on the throne', 'ks.out': 'off the throne', 'ks.edge': 'on the edge', 'ks.lines': ', {n} escape line(s)', 'ks.danger': ', in danger',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: "The AI's top candidates, explained plan by plan.",
  show: 'Show moves', hide: 'Hide moves',
  'tt.move': 'Move the {p} on {sq}', 'tt.cap': 'The {p} on {sq} captures {n}', 'tt.king': 'Move the king ({sq})', 'tt.kingCap': 'The king ({sq}) captures {n}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening crossroads — choosing a plan', opIntro: "The first few moves decide the type of opening. Try the two standard choices first, then the unusual ones. The lines come from this site's opening book (Lessons → Openings).", 'op.main': 'Standard', 'op.alt': 'Unusual',
  opIntroA: 'The attackers\' basic plan: seal the corners, then tighten the ring slowly from all four sides. The first moves decide which corner you start with.',
  opIntroD: 'The defenders\' basic plan: spread out to split the attackers and keep switching the direction the king runs to. Choose your reply to the attackers\' first move.',
  bkH: 'Book continuation', bkIntro: "This position is still in the site's opening book (Lessons → Openings). In the opening, building the right shape matters more than small evaluation differences.", bkWhy: 'This position is still in the book. The book move is {m} ({c}).', 'bk.tag': 'Book',
  prevBook: 'A book move.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tip.dub': '💡 Tip: before moving, check whether any of your pieces can be taken next move, and whether you have missed an escape line of the king (or a move that blocks one).',
  pieces: ['', 'attacker', 'defender', 'king'],
  'c.win': 'Win', 'b.win': 'Finish it', 'x.win': 'This move decides the game: for the attackers it captures the king or completes the encirclement; for the defenders the king reaches a corner (or builds an unbreakable fort).',
  'c.block': 'Block the escape', 'b.block': 'Block', 'x.block': 'Blocks the king\'s open line to a corner (raichi). If you don\'t, the king escapes next move. Check that the blocking piece cannot simply be captured.',
  'c.ksafe': 'Save the king', 'b.ksafe': 'Save the king', 'x.ksafe': 'Stops the king from being captured next move: keep attackers out of the empty squares next to the king, or move the king.',
  'c.tuichi': 'Tuichi', 'b.tuichi': 'Two escape lines', 'x.tuichi': 'Moves the king so that it has two open lines to corners at once (tuichi). The opponent can block only one per move, so this almost decides the game.',
  'c.raichi': 'Raichi', 'b.raichi': 'Open a line', 'x.raichi': 'Moves the king so that it has an open line to a corner (raichi). The opponent must spend the move blocking it, which gives you time for your next idea.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'Capture by sandwiching. Fewer pieces means gaps in the attackers\' ring, or less protection around the king. Check that your capturing piece cannot be taken back.',
  'c.save': 'Rescue a piece', 'b.save': 'Rescue', 'x.save': 'Moves a piece that could be sandwiched next move to a safe square — ideally one where it is still useful.',
  'c.katk': 'Close in on the king', 'b.katk': 'Close in', 'x.katk': 'Puts an attacker next to the king to surround it. In Copenhagen the king is captured only on all four sides (three plus the throne next to the throne), and never on the board edge.',
  'c.press': 'Set up a capture', 'b.press': 'Threaten', 'x.press': 'Moves next to an enemy piece to threaten a sandwich next move. The opponent has to spend a move protecting or moving it.',
  'c.corner': 'Guard a corner', 'b.corner': 'Guard a corner', 'x.corner': 'Places an attacker around a corner to shut the king out of it. Sealing the corners first is the attackers\' basic plan. Beware of the squares right next to a corner: the corner acts as an enemy, so one piece is enough to capture there.',
  'c.ring': 'Tighten the ring', 'b.ring': 'Tighten', 'x.ring': 'Links attackers together and tightens the ring step by step. Advance so that your pieces support each other and leave no gaps.',
  'c.krun': 'King move', 'b.krun': 'Move the king', 'x.krun': 'Moves the king to look for escape routes. A square from which the king can run to two edges (two corners) cannot be covered by the opponent in one move.',
  'c.spread': 'Spread out', 'b.spread': 'Spread out', 'x.spread': 'Brings a defender outwards to use the whole board and split the attackers. It also opens lanes for the king.',
  'c.guard': 'Guard the king', 'b.guard': 'Guard', 'x.guard': 'Brings a defender near the king so it is harder to surround. Too many guards can also block the king\'s own lanes.',
  'c.calm': 'Improve', 'b.calm': 'Improve', 'x.calm': 'Improves the formation and waits. When nothing is urgent, move a piece where it adds the most value.',
  'tp.capNow': 'There is a move that captures the king (or encircles all defenders)! Look at the empty squares next to the king.',
  'tp.escNow': 'The king can reach a corner in one move! Check the lines along the edges.',
  'tp.winNow': 'There is a winning move here. Try to find it yourself before looking at the candidates.',
  'tp.raichiOpp': "The enemy king has an open line to a corner (raichi). If you don't block it now, it escapes next move.",
  'tp.tuichiOpp': 'The enemy king has two open lines (tuichi). You can block only one per move — unless you can capture the king, this is very hard.',
  'tp.kDanger': "Your king can be captured on the opponent's next move. Cover the empty squares next to it, or move the king.",
  'tp.hang': 'Your piece(s) on {list} can be sandwiched on the next move. Move, protect, or play something more important.',
  'tp.canCap': 'You can capture the enemy piece(s) on {list}. First check that you won\'t be taken back.',
  'tp.tuichiChance': 'A king move can open two escape lines at once (tuichi). Look for it!',
  'tp.raichiChance': 'A king move can open a line to a corner (raichi). It forces the opponent to block, which gives you time.',
  'tp.cornerAdj': 'Your piece on {sq} stands right next to a corner. The corner acts as an enemy piece, so a single enemy on the other side captures it.',
  'tp.corners': 'Corners sealed: {n}/4. "Seal the corners first, then tighten the ring from all sides" is the attackers\' basic plan.',
  'tp.kingEdge': 'Your king is on the edge. In Copenhagen a king on the edge cannot be captured — an unbreakable fort of defenders around it (edge fort) wins the game.',
  'tp.aOpen1': 'Attackers\' opening: cover the corners first, then advance slowly from all four sides.',
  'tp.aOpen2': 'Early on, don\'t lose too many attackers: the king slips out through the gaps.',
  'tp.aMid1': 'Storming the centre is usually beaten back by the defenders. Keep the ring and squeeze from outside.',
  'tp.aMid2': 'Drive defenders onto squares where two attackers can sandwich them. Every defender lost weakens the king.',
  'tp.aEnd1': 'The attackers start with about twice as many pieces. Later in the game, exchanges favour the attackers.',
  'tp.aEnd2': 'If the king can\'t be captured, encircling all defenders also wins. Don\'t let the king reach the edge.',
  'tp.dOpen1': 'Defenders\' opening: spread out to split the attackers and open lanes for the king.',
  'tp.dOpen2': 'Don\'t strip the king\'s guard too early — without defenders around it, the king is easy to surround.',
  'tp.dMid1': 'Keep switching the direction the king tries to escape to. Aiming at one side only is easy to block.',
  'tp.dMid2': 'A square from which the king can run to two edges (two corners) can\'t be covered in one move.',
  'tp.dEnd1': 'Two escape lines at once (tuichi) is the winning blow — single lines get blocked one by one.',
  'tp.dEnd2': 'The third repetition of a position loses for the defenders: you can\'t win time by shuffling back and forth.',
  'tp.safe': 'Moving into the gap between two enemy pieces is safe: only the side that closes the sandwich captures.',
  'tp.winning': 'You are ahead. No need to force things: first remove the opponent\'s chances (open lines, gaps).',
  'tp.losing': 'You are behind. Normal moves won\'t close the gap — choose complicated moves where the opponent can go wrong.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  sep: ', ',
  gl: {
    raichi: { m: ['raichi'], t: 'Raichi', d: 'The king has an open line to a corner (to the edge in Tablut). A word from the Sámi game recorded by Linnaeus — like "check" in chess.' },
    tuichi: { m: ['tuichi'], t: 'Tuichi (tuichu)', d: 'The king has two open lines at once. The opponent can block only one per move, so the defenders almost always win.' },
    throne: { m: ['throne'], t: 'Throne', d: 'The central square; only the king may stop on it. The empty throne acts as an enemy piece, and a king next to it is captured on three sides plus the throne.' },
    corner: { m: ['corners', 'corner'], t: 'Corner squares', d: 'The four corners: only the king may enter, and the defenders win when it does. A corner acts as an enemy piece for both sides, so a piece next to it is captured by a single enemy.' },
    fort: { m: ['edge fort', 'fort'], t: 'Edge fort', d: 'The king on the edge, able to move inside a ring of defenders that cannot be broken. It wins for the defenders (Copenhagen).' },
    encircle: { m: ['encirclement', 'encircling', 'encircles'], t: 'Encirclement', d: 'The attackers enclose all defenders (king included) so none can reach the edge. It wins for the attackers (Copenhagen).' },
    sandwich: { m: ['sandwiched', 'sandwiching', 'sandwich'], t: 'Capturing by sandwich', d: 'A piece is captured when the enemy closes it in between two pieces (or a piece and a corner / the empty throne) in a row or column — only by the move that closes it.' },
    ring: { m: ['ring'], t: "The attackers' ring", d: 'Attackers linked together around the defenders. Any gap is a way out for the king.' },
    rep: { m: ['third repetition'], t: 'Threefold repetition', d: 'On this site the third occurrence of the same position loses for the defenders (they cannot run out the game by repeating moves).' },
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
const pn = x => (tx('pieces') || TX.en.pieces)[x] || '';
const sqN = i => E.sqName(i, N);
const winRate = v => (sOfV(v) + 1) / 2;
const pctS = x => Math.round(x * 100) + '%';

// --------------------------------------------------------------------------------------------- the analysis lists (mover's view)
const LISTS = new Map();
function list(key, l) {
  if (!l || !l.length) return;
  LISTS.set(key, l); if (LISTS.size > 600) LISTS.delete(LISTS.keys().next().value);
  if (key === keyOf(cur)) render();
}
const listAt = i => LISTS.get(keyOf(i)) || (typeof anaCache !== 'undefined' && anaCache.get(keyOf(i))) || null;
const sorted = l => l.slice().sort((a, b) => b.v - a.v);

// --------------------------------------------------------------------------------------------- the opening book (openings.json, Copenhagen)
// the board's 8 symmetries: a book line also matches its rotations / mirror images
const SYM = [(r, c, n) => [r, c], (r, c, n) => [c, n - 1 - r], (r, c, n) => [n - 1 - r, n - 1 - c], (r, c, n) => [n - 1 - c, r], (r, c, n) => [r, n - 1 - c], (r, c, n) => [n - 1 - r, c], (r, c, n) => [c, r], (r, c, n) => [n - 1 - c, n - 1 - r]];
const symSq = (k, i) => { const [r, c] = SYM[k](Math.floor(i / N), i % N, N); return r * N + c; };
const symMv = (k, m) => symSq(k, mFrom(m)) + 256 * symSq(k, mTo(m));
function bookOK() { return typeof OPEN !== 'undefined' && OPEN && OPEN.sets && gv === 'copenhagen' && !startSpec; }
// the book lines the game follows up to ply `ply`: [{ g, k (symmetry) }]
function bookAt(ply) {
  if (!bookOK() || ply > 13) return [];
  const out = [];
  for (const g of OPEN.sets) {
    const line = g.study.line; if (line.length <= ply) continue;
    for (let k = 0; k < 8; k++) {
      let ok = true; for (let i = 0; i < ply; i++) if (symMv(k, line[i]) !== moves[i]) { ok = false; break; }
      if (ok) { out.push({ g, k }); break; }
    }
  }
  return out;
}
// the book moves of the position after `ply` moves (each once): [{ m, g, k, sets }]
function bookMoves(ply) {
  const out = [];
  for (const b of bookAt(ply)) {
    const m = symMv(b.k, b.g.study.line[ply]), o = out.find(x => x.m === m);
    if (o) o.sets.push(b.g); else out.push({ m, g: b.g, k: b.k, sets: [b.g] });
  }
  return out;
}
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
// the type of opening the game follows ("角固め・外への展開"), and whether it is settled
function openingType() {
  if (!bookOK() || !moves.length || cur > 30) return null;
  let att = null, def = null, depth = 0;
  for (const g of OPEN.sets) {
    const line = g.study.line;
    for (let k = 0; k < 8; k++) {
      let d = 0; while (d < line.length && d < cur && symMv(k, line[d]) === moves[d]) d++;
      if (!d) continue;
      if (g.grp === 'att' && (!att || d > att.d)) att = { g, d };
      if (g.grp === 'def' && d >= 2 && (!def || d > def.d)) def = { g, d };
      depth = Math.max(depth, d);
    }
  }
  if (!att && !def) return null;
  const nm = [att && LL(att.g.title), def && LL(def.g.title)].filter(Boolean).join(tx('sep2'));
  return { nm, settled: depth >= 6 };
}

// --------------------------------------------------------------------------------------------- position facts
const F_ = () => E.geo(gv).F;
const cheb = (a, b) => Math.max(Math.abs(Math.floor(a / N) - Math.floor(b / N)), Math.abs(a % N - b % N));
const man = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N);
// corners (corner-escape rules only): sealed = attackers shut the corner off locally (no path of non-attacker squares from the
// corner out of its zone); part = attackers already stand near it
function corners(pos) {
  const G = E.geo(gv); if (G.R.escEdge) return null;
  const R = N >= 11 ? 3 : 2, out = { sealed: 0, part: 0 };
  for (const c0 of G.corners) {
    const seen = new Set([c0]), st = [c0]; let open = false;
    while (st.length && !open) { const s = st.pop(); for (const q of pos.nb(s)) { if (seen.has(q) || pos.at(q) === 1) continue; const d = cheb(q, c0); if (d > R) continue; if (d === R) { open = true; break; } seen.add(q); st.push(q); } }
    if (!open) out.sealed++;
    else { let near = 0; for (let i = 0; i < N * N; i++) if (pos.at(i) === 1 && cheb(i, c0) <= 2) near++; if (near) out.part++; }
  }
  return out;
}
// squares of corners' orthogonal neighbours
const cornerAdj = i => E.geo(gv).corners.some(c => man(i, c) === 1);
function facts(pos, n) {
  const me = pos.turn, opp = me === P1 ? P2 : P1, f = { me, opp, n };
  const all = pos.moves();
  f.winMoves = all.filter(m => pos.clone().play(m).res === me);
  // the opponent's threats (as if it moved now)
  const q = pos.clone(); q.turn = opp; q.res = 0;
  f.oppWin = q.moves().some(m => q.clone().play(m).res === opp);
  f.lines = pos.kingLines().length;
  f.kDanger = kingInDanger(pos);
  f.hang = [...threatened(pos, me)];
  const caps = new Set(); for (const m of all) for (const i of pos.capsOf(m)) caps.add(i);
  f.canCap = [...caps];
  f.kingMoves = { two: false, one: false };
  if (me === P2 && pos.king >= 0) for (const m of all) { if (mFrom(m) !== pos.king) continue; const r = pos.clone().play(m); if (r.res) continue; const k = r.kingLines().length; if (k >= 2) f.kingMoves.two = true; else if (k === 1) f.kingMoves.one = true; }
  const s0 = E.Pos.from(startSpec, gv);
  f.lostA = s0.count(P1) - pos.count(P1); f.lostD = s0.count(P2) - pos.count(P2);
  const G = E.geo(gv), k = pos.king;
  f.onThrone = k === G.th; f.onEdge = k >= 0 && !!(G.F[k] & 1);
  f.co = corners(pos);
  f.adjCorner = []; if (!G.R.escEdge) for (let i = 0; i < N * N; i++) { const x = pos.at(i); if (x && x !== 3 && (x === 1 ? P1 : P2) === me && cornerAdj(i)) f.adjCorner.push(i); }
  const tot0 = s0.count(P1) + s0.count(P2), lost = f.lostA + f.lostD;
  f.stage = (lost >= tot0 * 0.35 || f.lines || f.kDanger || n >= 70 || (G.R.king4 && f.onEdge)) ? 'end' : (n < 14 && lost <= 2) ? 'open' : 'mid';
  return f;
}
// what a candidate move is about
function classify(pos, m, f) {
  const me = pos.turn, from = mFrom(m), to = mTo(m), x = pos.at(from), king = x === 3;
  const q = pos.clone().play(m), n = q.lastCaps.length;
  const r = { k: 'calm', from, to, king, p: pn(x), n };
  const mk = k => Object.assign(r, { k });
  if (q.res === me) return mk('win');
  if (me === P1 && f.lines) { if (!q.kingLines().length) return mk('block'); }
  if (me === P2 && f.kDanger && !kingInDanger(q)) return mk('ksafe');
  if (king) { const l = q.kingLines().length; if (l >= 2) return mk('tuichi'); if (l === 1) return mk('raichi'); }
  if (n) return mk('cap');
  if (f.hang.includes(from) && !threatened(q, me).has(to)) return mk('save');
  if (king) return mk('krun');
  const before = threatened(pos, f.opp), after = threatened(q, f.opp);
  const press = [...after].some(i => !before.has(i));
  if (me === P1) {
    if (pos.king >= 0 && man(to, pos.king) === 1) return mk('katk');
    if (press) return mk('press');
    const G = E.geo(gv);
    if (!G.R.escEdge && G.corners.some(c => cheb(to, c) <= 2 && man(to, c) > 1) && !G.corners.some(c => cheb(from, c) <= 2)) return mk('corner');
    return mk(pos.king >= 0 && man(to, pos.king) < man(from, pos.king) ? 'ring' : 'calm');
  }
  if (press) return mk('press');
  const th = E.geo(gv).th;
  if (man(to, th) > man(from, th) && man(to, pos.king) > 1) return mk('spread');
  if (pos.king >= 0 && man(to, pos.king) <= 2) return mk('guard');
  return mk('calm');
}
const CCLS = { win: 'c-mate', block: 'c-def', ksafe: 'c-def', tuichi: 'c-atk', raichi: 'c-atk', cap: 'c-mat', save: 'c-def', katk: 'c-atk', press: 'c-atk', corner: 'c-def', ring: 'c-dev', krun: 'c-atk', spread: 'c-dev', guard: 'c-def', calm: 'c-calm' };
const RCLS = { win: 'r-mate', block: 'r-def', ksafe: 'r-def', save: 'r-def', corner: 'r-def', guard: 'r-def' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) {
  const v = { sq: sqN(k.from), p: k.p, n: k.n };
  return k.king ? tx(k.n ? 'tt.kingCap' : 'tt.king', v) : tx(k.n ? 'tt.cap' : 'tt.move', v);
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, reveal: false, key: '', f: null, cls: null, hov: null, items: null };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !rgame && (settings.mode === 'ai' || settings.mode === 'pvp') && !(typeof kenOk === 'function' && kenOk()));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(moves.length) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.cls = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, stage: 'mid', hang: [], canCap: [], winMoves: [], adjCorner: [], kingMoves: {} }; }
  return S.f;
}
function candInfo(l, f) {
  if (!l || !l.length) return null;
  if (S.cls && S.cls.list === l) return S.cls;
  const pos = posAt(cur).pos, L2 = sorted(l), best = L2[0].v, wb = winRate(best);
  const items = [];
  for (const c of L2.slice(0, 8)) {
    let k; try { k = classify(pos, c.m, f); } catch (e) { continue; }
    items.push({ m: c.m, k, drop: Math.max(0, wb - winRate(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); if (it !== items[0] && it.drop > 0.3) continue; dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  const r = { list: l, items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const G = E.geo(gv), atk = f.me === P1;
  if (f.winMoves && f.winMoves.length) add(atk ? 'tp.capNow' : (f.lines ? 'tp.escNow' : 'tp.winNow'), 100, null, 1);
  if (f.oppWin) { if (atk && f.lines >= 2) add('tp.tuichiOpp', 96, null, 1); else if (atk && f.lines) add('tp.raichiOpp', 96, null, 1); else if (!atk && f.kDanger) add('tp.kDanger', 96, null, 1); }
  if (!atk && f.kingMoves && f.kingMoves.two && !(f.winMoves && f.winMoves.length)) add('tp.tuichiChance', 90, null, 1);
  if (f.hang && f.hang.length) add('tp.hang', 80, { list: f.hang.slice(0, 4).map(sqN).join(tx('sep')) });
  if (f.canCap && f.canCap.length) add('tp.canCap', 74, { list: f.canCap.slice(0, 4).map(sqN).join(tx('sep')) });
  if (f.adjCorner && f.adjCorner.length) add('tp.cornerAdj', 62, { sq: sqN(f.adjCorner[0]) });
  if (!atk && f.kingMoves && f.kingMoves.one && !f.kingMoves.two && !(f.winMoves && f.winMoves.length)) add('tp.raichiChance', 56);
  if (atk && f.co && f.co.sealed < 4 && f.stage !== 'end') add('tp.corners', 50, { n: f.co.sealed });
  if (!atk && G.R.king4 && f.onEdge) add('tp.kingEdge', 52);
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  const st = f.stage, p = atk ? 'tp.a' : 'tp.d';
  if (st === 'open') { add(p + 'Open1', 30); add(p + 'Open2', 22); }
  else if (st === 'mid') { add(p + 'Mid1', 28); add(p + 'Mid2', 20); }
  else { add(p + 'End1', 28); if (atk ? G.R.encircle : true) add(p + 'End2', 18); }
  add('tp.safe', 10);
  return out.sort((a, b) => b.pr - a.pr);
}
// opening crossroads (Copenhagen start, first two plies): the book's plans for this side, standard ones first
const OPMAIN = { a1: 'main', a3: 'main', a2: 'alt', a4: 'alt', d3: 'main', d2: 'main', d1: 'alt', d4: 'alt' };
function opening() {
  if (!bookOK() || cur > 1) return null;
  const pos = posAt(cur).pos, out = [];
  for (const b of bookMoves(cur)) {
    const g = b.sets.find(x => (cur === 0 ? x.grp === 'att' : x.grp === 'def'));
    if (!pos.moves().includes(b.m)) continue;
    if (g) out.push({ m: b.m, nm: E.name(pos, b.m), kind: OPMAIN[g.id] || 'alt', title: LL(g.title), text: (LL(g.intro) || [])[0] || '' });
    else {   // a reply that only an attackers' line of the book shows: named by the move itself, explained by the book's note
      let k = null; try { k = classify(pos, b.m, factsNow()); } catch (e) {}
      const note = b.g.study.notes && b.g.study.notes[cur];
      out.push({ m: b.m, nm: E.name(pos, b.m), kind: 'main', title: k ? ttl(k) : E.name(pos, b.m), text: note ? LL(note) : '' });
    }
  }
  if (!out.length) return null;
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'main' ? -1 : 1));
}
const VC = { k: '', h: '' };
function verdictHtml() {
  const k = keyOf(moves.length) + '|' + LANG + '|' + settings.mode + '|' + humanColor + '|' + (listAt(Math.max(0, moves.length - 1)) ? 1 : 0) + (listAt(Math.max(0, moves.length - 2)) ? 1 : 0);
  if (VC.k !== k) { VC.k = k; VC.h = verdictRaw(); }
  return VC.h;
}
function verdictRaw() {
  const n = moves.length; if (!n) return '';
  // the last move of the player (pvp: the last move)
  let i = n;
  if (settings.mode === 'ai') { while (i > 0 && toMoveAt(i - 1) !== humanColor) i--; }
  if (i < 1 || n - i > 1) return '';
  const mv = moves[i - 1], pos = posAt(i - 1).pos, mvName = E.name(pos, mv);
  if (bookMoves(i - 1).some(b => b.m === mv)) return CoachKit.verdict(0, esc(tx('prev', { m: mvName, q: tx('q.best') })), esc(tx('prevBook')));
  const l = listAt(i - 1); if (!l) return '';
  const L2 = sorted(l), best = L2[0], mine = L2.find(e => e.m === mv); if (!mine) return '';
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (mine.m === best.m || mine.v >= best.v - 20) q = 'best';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const f = facts(pos.clone(), i - 1);
    if (best.m !== mv) { const k = classify(pos, best.m, f); body = tx(q === 'best' || q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }); }
    else { const k = classify(pos, mv, f); body = tx('prevBest', { c: tx('c.' + k.k) }); }
  } catch (e) {}
  body = esc(body);
  if (g >= 2) body += '<br>' + esc(tx('tip.dub'));
  return CoachKit.verdict(g, esc(tx('prev', { m: mvName, q: tx('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (TaflCoach.sw) TaflCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const over = gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
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
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!over ? `<small>${esc(tx('st.' + (factsNow().stage || 'mid')))}</small>` : ''}</h3>`;
  S.items = null;
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const f = factsNow(), l = listAt(cur), cl = candInfo(l, f);
  const wr = l && l.length ? winRate(sorted(l)[0].v) : null;
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + pctS(wr)), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  const ot = openingType();
  if (ot) chips.push({ k: tx('senkei'), v: esc(tx(ot.settled ? 'fixed' : 'moyo', { n: ot.nm })) });
  const myA = f.me === P1, tk = myA ? f.lostD : f.lostA, lk = myA ? f.lostA : f.lostD;
  chips.push({ k: tx('mat'), v: esc(tk || lk ? tx('mat.v', { a: tk, b: lk }) : tx('mat.0')), cls: tk > lk ? 'pos' : tk < lk ? 'neg' : '' });
  if (f.co) chips.push({ k: tx('who', { k: tx('cornH'), w: tx(myA ? 'meC' : 'opC') }), v: esc(tx('co.v', { s: f.co.sealed }) + (f.co.part ? tx('co.p', { p: f.co.part }) : '')), cls: myA && f.co.sealed >= 2 ? 'pos' : '' });
  { const pos = posAt(cur).pos; if (pos.king >= 0) chips.push({ k: tx('who', { k: tx('kingH'), w: tx(myA ? 'opC' : 'meC') }), v: esc(tx(f.onThrone ? 'ks.throne' : f.onEdge ? 'ks.edge' : 'ks.out') + (f.lines ? tx('ks.lines', { n: f.lines }) : '') + (f.kDanger ? tx('ks.danger') : '')), cls: (!myA && (f.lines || f.kDanger)) ? (f.kDanger ? 'neg' : 'pos') : (myA && f.lines ? 'neg' : '') }); }
  h += CoachKit.summary(chips);
  const op = opening();
  let shown = false;
  if (op) {
    S.items = op.map(d => ({ m: d.m }));
    h += CoachKit.branches({ head: tx('opH'), intro: esc(tx(f.me === P1 ? 'opIntroA' : 'opIntroD') + ' ' + tx('opIntro')), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(d.title), text: gl(esc(d.text)), move: String(d.m), mvName: d.nm })) });
    shown = true;
  } else {
    const bk = bookMoves(cur), pos = posAt(cur).pos;
    const items = bk.filter(b => pos.moves().includes(b.m)).slice(0, 3).map(b => { let k = { k: 'calm', from: mFrom(b.m), p: pn(pos.at(mFrom(b.m))), n: 0 }; try { k = classify(pos, b.m, f); } catch (e) {} const note = b.g.study.notes && b.g.study.notes[cur]; return { m: b.m, k, nm: E.name(pos, b.m), note: note ? LL(note) : '' }; });
    if (items.length) {
      S.items = items.map(d => ({ m: d.m }));
      const b = items[0];
      h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { m: b.nm, c: tx('c.' + b.k.k) }))), RCLS[b.k.k] || '');
      h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
        items: items.map(d => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc((d.note ? d.note + ' ' : '') + tx('x.' + d.k.k))), gap: tx('bk.tag'), gcls: 'g0', move: String(d.m), mvName: d.nm })) });
      shown = true;
    }
  }
  if (!shown && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(winRate(b.v))), p: Math.round(winRate(b.v) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    S.items = cl.dirs.map(d => ({ m: d.m }));
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(tx('x.' + d.k.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.m), mvName: d.nm }; }) });
  } else if (!shown) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  if (S.hov != null) { S.hov = null; renderFx(); }
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} S.hov = null; renderFx(); render(); },
    onHover: u => { const v = u == null ? null : +u; if (S.hov !== v) { S.hov = v; renderFx(); } },
  });
}
// the hovered / tapped candidate's arrow on the board (revealed moves only)
function fx(svg) {
  if (S.hov == null || !active() || !myTurn() || !S.items || !S.items.some(d => d.m === S.hov)) return;
  try { svgArrow(svg, [mFrom(S.hov), mTo(S.hov)], 'ok'); } catch (e) {}
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  if (settings.coach === undefined) settings.coach = true;
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  TaflCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hov = null; renderFx();
  render();
  if (v && !listAt(cur) && typeof analyzeCurrent === 'function') analyzeCurrent(busyToken);
}
function relabel() { if (TaflCoach.sw) TaflCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.TaflCoach = { init, render, relabel, merge, list, fx, active, usable, tx, TX };
})();
