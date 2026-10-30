'use strict';
// Chess coach (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・駒割り・局面・オープニング・キングの安全・ポーン形),
// the recommended plan with its reason, the candidate directions (分かれ道: the engine's top moves classified into chess
// plans — mate / win material / trade / check / castle / develop / centre / passed pawn / open file / attack / defence …),
// prioritized "how to think" tips read from the position (checks, mate threats, hanging pieces, castling, development,
// passed pawns, open files, classic principles by phase) and the verdict on the previous move.
// The first moves are taught from opening theory (ECO / standard opening principles) and the game's opening data
// (openings.json: move frequencies of 2200+ Lichess games), not from raw evaluation; book moves are never called mistakes.
// After the game (or while browsing earlier moves) the coach steps aside: the phone coach tab shows the review card instead.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (ChessCoach.merge).
// app.js: ChessCoach.render() from renderInfo(); ChessCoach.drawFx(svg) from renderFx().
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  oppTurn: '相手の手番です。相手が次に何を指してくるか、予想してみよう。予想が当たるほど読みの力がつきます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒割り', opening: 'オープニング', kingH: 'キング', pawnH: 'ポーン形', devH: '展開',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.even': '互角', 'mat.up': '+{x}', 'mat.down': '−{x}',
  who: '{k}（{w}）', meC: 'あなた', opC: '相手', moyo: '{n}模様', fixed: '{n}',
  'ks.short': 'キャスリング済（キング側）', 'ks.long': 'キャスリング済（クイーン側）', 'ks.can': 'まだ中央（キャスリング可）', 'ks.center': '中央（キャスリング不可）', 'ks.moved': 'キャスリングせず移動',
  'ps.ok': '問題なし', 'ps.passed': 'パスポーン{n}', 'ps.iso': '孤立{n}', 'ps.dbl': 'ダブル{n}', dev: '{n}/4',
  'fam.open': 'オープン・ゲーム', 'fam.semi': 'セミオープン・ゲーム', 'fam.closed': 'クローズド・ゲーム', 'fam.indian': 'インディアン系', 'fam.flank': 'フランク・オープニング',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: 'AIの上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  opH: '序盤の分かれ道 — 定跡で選ぶ', opIntro: '序盤は評価値の小さな差より、定跡（よく研究された手順）と序盤の原則で手を選ぶのが大切です。まずは定番を覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種',
  bkH: '定跡の候補 — 実戦でよく指される手', bkIntro: 'レーティング2200以上のLichessの対局（40万局）で、この局面で実際に指された手の割合です。定跡の範囲では、割合の多い手から覚えよう。', 'bk.share': '採用率 {x}',
  bkWhy: 'この局面は定跡の範囲です。実戦でいちばん多いのは {m}（{c}・採用率{x}）。',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  prevBook: '定跡どおりの手です（実戦での採用率{x}）。', prevTheory: '定跡どおりの手です。',
  'q.best': '最善手', 'q.good': '好手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  // titles (what the move does; always says which piece / where)
  'tt.move': '{sq}の{p}を動かす', 'tt.pawn': '{f}筋のポーンを進める', 'tt.cap': '{sq}の{p}で{c}を取る', 'tt.pcap': '{f}筋のポーンで{c}を取る', 'tt.castleS': 'キャスリング（キング側）', 'tt.castleL': 'キャスリング（クイーン側）', 'tt.promo': '{f}筋のポーンを成る', 'tt.king': 'キングを{to}へ',
  // plans: tag / badge / explanation ({p} piece, {c} captured piece)
  'c.mate': 'チェックメイト', 'b.mate': 'メイトする', 'x.mate': 'チェックメイトにできます。相手キングがどこにも逃げられず、チェックも防げない形です。',
  'c.cap': '駒得', 'b.cap': '駒を取る', 'x.cap': '{c}を取って駒得をめざす方針。取ったあと取り返されないか、相手の反撃（チェック・駒取り・狙い）も確かめよう。',
  'c.trade': '交換', 'b.trade': '交換する', 'x.trade': '{c}を取って駒を交換する方針。駒得しているときは交換で局面を単純にすると勝ちやすく、窮屈なときは交換で駒を自由にできます。',
  'c.check': 'チェック', 'b.check': 'チェックで迫る', 'x.check': '{p}でチェックをかけて相手キングに迫る方針。相手の応手が限られるので主導権を握れますが、チェックだけではキングを逃がすことも。次の狙いがあるか考えよう。',
  'c.block': 'チェックを防ぐ', 'b.block': 'チェックを受ける', 'x.block': 'チェックへの対応です。①キングが逃げる ②間に駒を入れる ③チェックしている駒を取る、の3通りから、一番損の少ない手を選びます。',
  'c.kmove': 'キングの安全', 'b.kmove': 'キングを動かす', 'x.kmove': 'キングを安全な場所へ動かす方針。中盤までは、キングは戦いの中心から離しておくのが基本です。',
  'c.castle': 'キャスリング', 'b.castle': 'キャスリング', 'x.castle': 'キャスリングでキングを安全な場所へ移し、同時にルークを中央へ近づける方針。序盤の原則は「なるべく早くキャスリング」です。',
  'c.promo': 'プロモーション', 'b.promo': '成る', 'x.promo': 'ポーンを最後の段まで進めて成る方針。ふつうはクイーンに成ります。',
  'c.save': '駒を逃がす', 'b.save': '駒を逃がす', 'x.save': '狙われている{p}を安全な場所へ逃がす方針。タダで取られるのを防ぎつつ、移動先でも働く場所を選べると理想的です。',
  'c.passed': 'パスポーン', 'b.passed': 'パスポーンを進める', 'x.passed': 'パスポーン（前と両隣の筋に相手のポーンがないポーン）を進める方針。「パスポーンは進めよ」――成れば大きな戦力になります。',
  'c.center': '中央', 'b.center': '中央を取る', 'x.center': 'ポーンで中央（d4・e4・d5・e5）を占める・争う方針。中央を押さえると駒が動きやすくなり、相手は窮屈になります。',
  'c.pawn': 'ポーン', 'b.pawn': 'ポーンを進める', 'x.pawn': 'ポーンを進めてスペースを取る・駒の通り道を作る方針。ポーンは後ろに戻れないので、残る弱点（孤立・ダブルなど）も考えよう。',
  'c.develop': '展開', 'b.develop': '展開する', 'x.develop': '{p}を最初の位置から出して、戦いに参加させる方針。序盤はナイトとビショップを早く出すのが原則です。',
  'c.file': 'オープンファイル', 'b.file': 'ルークを活用', 'x.file': 'ルークを開いた筋（自分のポーンがない筋）へ移す方針。ルークは開いた筋で最も力を発揮します。',
  'c.attack': '攻め', 'b.attack': '攻める', 'x.attack': '{p}を相手陣やキングの近くへ進めて攻める方針。主導権を握れる一方、攻めが止まると反撃を受けます。攻めが続くか読もう。',
  'c.defend': '守り', 'b.defend': '守る', 'x.defend': '{p}を自分のキングの近くに置いて守りを固める方針。安全度は上がりますが、相手に攻める時間を与えることも考えよう。',
  'c.kingAct': 'キングの活用', 'b.kingAct': 'キングを出す', 'x.kingAct': '終盤はキングも強い駒。中央へ出してポーンを助けたり、相手のポーンを狙ったりする方針です。',
  'c.improve': '駒の改善', 'b.improve': '駒を良くする', 'x.improve': '{p}をより働く場所へ移す方針。急がない局面では、一番働いていない駒を良くするのが上達のコツです。',
  // tips
  'tp.inCheck': 'チェックされています。①キングが逃げる ②間に駒を入れる ③チェックしている駒を取る、の3通りを全部くらべよう。',
  'tp.mate1': '1手でチェックメイトにできる手があります！ チェックになる手を一つずつ確かめてみよう。',
  'tp.threat': '相手は次に1手でチェックメイトにする狙いを持っています。まずそれを防ごう。',
  'tp.hangBig': 'あなたの{p}（{sq}）が取られそうです。価値の高い駒なので、逃げるか守りを足そう。',
  'tp.hang': '{sq}の{p}が取られそうです（守りが足りないか、安い駒に狙われています）。逃げる・守る・それ以上に価値のある手を指す、のどれかを選ぼう。',
  'tp.canWin': '相手の{p}（{sq}）が得に取れそうです。取ったあと取り返されないか、相手の反撃とくらべて判断しよう。',
  'tp.castle': 'キングがまだ中央にいます。序盤の原則は「なるべく早くキャスリング」。ナイトとビショップを出して、キャスリングの道を空けよう。',
  'tp.noCastle': 'キングが中央に残り、もうキャスリングできません。中央の筋が開くと危ないので、キングの周りを守る手を意識しよう。',
  'tp.develop': 'まだ最初の位置にいるナイト・ビショップが{n}つあります。序盤は同じ駒を何度も動かすより、全部の駒を出すのが先です。',
  'tp.queen': 'クイーンを早く出しすぎると、相手の駒に追い回されて手を損しやすくなります。まずはナイトとビショップから。',
  'tp.rim': '{sq}のナイトが盤の端にいます。「端のナイトは働きが悪い」――中央寄りのほうがたくさんのマスに利きます。',
  'tp.myPassed': 'あなたには{sq}にパスポーンがあります。「パスポーンは進めよ」――ルークは後ろから支えるのが基本です（タラッシュの法則）。',
  'tp.opPassed': '相手の{sq}のポーンはパスポーンです。前に駒を置いて止める（ブロックする）か、ルークで後ろから狙おう。',
  'tp.openFile': '{f}筋は開いています（ポーンがない筋）。ルークを開いた筋に置くと力を発揮します。',
  'tp.bishops': 'あなたはビショップを2つ持っています（ビショップペア）。盤が開くほど強くなるので、ポーンを交換して盤を開くのも作戦です。',
  'tp.oppBishops': '相手はビショップペアを持っています。盤を閉じた形（ポーンが組み合った形）にすると、その強みを小さくできます。',
  'tp.iso': '{f}筋のポーンは孤立ポーンです（隣の筋に味方のポーンがない）。ポーンで守れないので、狙われやすい点に注意。',
  'tp.dbl': '{f}筋にポーンが2つ並んでいます（ダブルポーン）。動きにくく弱点になりやすい形です。',
  'tp.winning': '優勢です。無理に攻めず、相手の反撃の芽をつむ安全な手で勝ちに近づこう。駒得なら駒（特にクイーン）を交換するのが近道です。',
  'tp.losing': '劣勢です。駒の交換は避け、相手が間違えやすい複雑な手や反撃を狙おう。',
  'tp.matUp': '駒割りはあなたが{x}点得です（ポーン1・ナイト3・ビショップ3・ルーク5・クイーン9）。ポーンより駒を交換すると勝ちやすくなります。',
  'tp.matDown': '駒割りはあなたが{x}点損です。交換を避け、駒を活発にして反撃のチャンスを探そう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤の三原則：中央をポーンで押さえる、ナイトとビショップを早く出す、早めにキャスリングする。',
  'tp.open2': '「ビショップより先にナイトを出す」「序盤のポーンの手は1〜2手まで」――古くからの序盤の心得です。',
  'tp.mid1': '毎手まず確かめよう：相手のチェック・駒取り・狙い。そのあとで自分のプランを考えます。',
  'tp.mid2': '「すべてのコンビネーションは両取り（ダブルアタック）から」――フォークやピンを狙える駒の並びを探そう。',
  'tp.end1': '終盤はキングも強い駒。中央へ出して働かせよう。',
  'tp.end2': '「ルークはパスポーンの後ろに」――自分のパスポーンなら後ろから押し、相手のなら後ろから狙います。',
  'tp.end3': '1ポーン得なら、ポーンではなく駒を交換しよう。キングとポーンだけの終盤は勝ちやすくなります。',
  'sk.open': 'オープン・ゲーム（1.e4 e5）：中央が早く開きやすく、駒の展開とキャスリングの速さが大切です。白はf7、黒はf2の弱点に注意。',
  'sk.semi': 'セミオープン・ゲーム（1.e4にe5以外）：黒は非対称な形で反撃をねらいます。中央のポーンの形がその後のプランを決めます。',
  'sk.closed': 'クローズド・ゲーム（1.d4 d5）：中央が閉じやすく、ゆっくりした駒組みの戦い。c筋・e筋のポーンで中央に揺さぶりをかけるのが典型です。',
  'sk.indian': 'インディアン系（1.d4 Nf6）：黒はナイトから出して中央の占め方を後で決めます。ビショップをフィアンケット（g7・b7）にする形も多いです。',
  'sk.flank': 'フランク・オープニング：c4やNf3で脇から中央を押さえる戦い。すぐにはぶつからないので、柔軟な駒組みが大切です。',
  sep: '・',
  gl: {
    castling: { m: ['キャスリング'], t: 'キャスリング', d: 'キングを2マス横に動かし、ルークをキングの反対側へ移す特別な手。キングもルークもまだ動いていない・間に駒がない・チェックされていない・通るマスが攻撃されていない、のときだけ指せます。' },
    mate: { m: ['チェックメイト'], t: 'チェックメイト', d: 'キングがチェックされていて、どう指しても防げない状態。相手をチェックメイトにすれば勝ちです。' },
    passed: { m: ['パスポーン'], t: 'パスポーン', d: '前と両隣の筋に、止める相手のポーンがないポーン。最後の段まで進めば成れるので、終盤で大きな力になります。' },
    iso: { m: ['孤立ポーン', '孤立'], t: '孤立ポーン', d: '両隣の筋に味方のポーンがないポーン。ポーンで守れないので弱点になりやすい形です。' },
    dbl: { m: ['ダブルポーン', 'ダブル'], t: 'ダブルポーン', d: '同じ筋に味方のポーンが2つ以上並んだ形。動きにくく、弱点になりやすいとされます。' },
    develop: { m: ['展開'], t: '展開', d: 'ナイト・ビショップなどを最初の位置から出して、戦いに参加させること。' },
    center: { m: ['中央'], t: '中央', d: 'd4・e4・d5・e5の4マスとその周り。ここを押さえると駒が動きやすく、相手は窮屈になります。' },
    openfile: { m: ['開いた筋', 'オープンファイル'], t: 'オープンファイル（開いた筋）', d: 'ポーンが1つもない筋。ルークやクイーンがそこから相手陣へ入りやすくなります。' },
    pair: { m: ['ビショップペア'], t: 'ビショップペア', d: '2つのビショップがそろっていること。盤が開いた局面で特に強いとされます。' },
    fork: { m: ['フォーク', '両取り'], t: 'フォーク（両取り）', d: '1つの駒で相手の駒2つ以上を同時に狙う手。相手は一度に1つしか守れません。' },
    pin: { m: ['ピン'], t: 'ピン', d: '線上に並んだ相手の駒の前の駒が、後ろの駒（キングなど）を守るために動けなくなること。' },
    tarrasch: { m: ['タラッシュの法則'], t: 'タラッシュの法則', d: '「ルークはパスポーンの後ろに置け」という終盤の指針。自分のポーンなら押し上げ、相手のポーンなら追いかけて狙えます。例外もあります。' },
    fianchetto: { m: ['フィアンケット'], t: 'フィアンケット', d: 'ナイトの前のポーンを1つ進め、ビショップを長い斜線（g7・b7など）に置く形。' },
    initiative: { m: ['主導権'], t: '主導権', d: '自分の狙いで相手に受けさせ続けられる状態。' },
    book: { m: ['定跡'], t: '定跡（オープニング理論）', d: '序盤のよく研究された手順。強い人どうしの実戦で多く指される手が中心です。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate moves explained.',
  oppTurn: "It's your opponent's turn. Try to guess what they will play next — the more often you guess right, the stronger your calculation gets.",
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Material', opening: 'Opening', kingH: 'King', pawnH: 'Pawns', devH: 'Developed',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'mat.even': 'even', 'mat.up': '+{x}', 'mat.down': '−{x}',
  who: '{k} ({w})', meC: 'you', opC: 'opponent', moyo: 'heading for {n}', fixed: '{n}',
  'ks.short': 'castled kingside', 'ks.long': 'castled queenside', 'ks.can': 'in the centre (can castle)', 'ks.center': 'in the centre (no castling)', 'ks.moved': 'moved without castling',
  'ps.ok': 'healthy', 'ps.passed': '{n} passed', 'ps.iso': '{n} isolated', 'ps.dbl': '{n} doubled', dev: '{n}/4',
  'fam.open': 'Open Game', 'fam.semi': 'Semi-Open Game', 'fam.closed': 'Closed Game', 'fam.indian': 'Indian Defence', 'fam.flank': 'Flank Opening',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: "The AI's top candidates, explained plan by plan.",
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening crossroads — choose by theory', opIntro: 'In the opening, well-studied lines and opening principles matter more than small evaluation differences. Learn the standard moves first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  bkH: 'Book moves — what strong players choose here', bkIntro: 'How often each move was played in this position in 400,000 Lichess games between players rated 2200+. Within the book, learn the most played moves first.', 'bk.share': 'played {x}',
  bkWhy: 'This position is still in the opening book. The most played move is {m} ({c}, played {x}).',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  prevBook: 'A book move (played {x} of the time).', prevTheory: 'A book move.',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tt.move': 'Move the {p} on {sq}', 'tt.pawn': 'Push the {f}-pawn', 'tt.cap': 'The {p} on {sq} takes the {c}', 'tt.pcap': 'The {f}-pawn takes the {c}', 'tt.castleS': 'Castle kingside', 'tt.castleL': 'Castle queenside', 'tt.promo': 'Promote the {f}-pawn', 'tt.king': 'King to {to}',
  'c.mate': 'Checkmate', 'b.mate': 'Mate', 'x.mate': "There is a checkmate: the enemy king can't escape and the check can't be stopped.",
  'c.cap': 'Win material', 'b.cap': 'Capture', 'x.cap': "Take the {c} to win material. Check that it can't simply be taken back, and look at the opponent's replies (checks, captures, threats).",
  'c.trade': 'Trade', 'b.trade': 'Trade', 'x.trade': 'Take the {c} and trade pieces. When you are ahead, trades make the win simpler; when you are cramped, trades free your position.',
  'c.check': 'Check', 'b.check': 'Check', 'x.check': 'Close in on the enemy king with a check by the {p}. The replies are limited, so you keep the initiative — but a check alone can drive the king to safety. Have a follow-up in mind.',
  'c.block': 'Answer the check', 'b.block': 'Answer the check', 'x.block': 'You must answer the check: (1) move the king, (2) block with a piece, or (3) capture the checking piece — choose the answer that costs least.',
  'c.kmove': 'King safety', 'b.kmove': 'Move the king', 'x.kmove': 'Move the king to a safer square. Until the endgame the king should stay away from the fighting.',
  'c.castle': 'Castling', 'b.castle': 'Castle', 'x.castle': 'Castle: the king goes to safety and the rook comes towards the centre in one move. The opening principle is to castle early.',
  'c.promo': 'Promotion', 'b.promo': 'Promote', 'x.promo': 'Push the pawn to the last rank and promote it — usually to a queen.',
  'c.save': 'Save the piece', 'b.save': 'Save the piece', 'x.save': 'Move the attacked {p} to safety, ideally to a square where it still works.',
  'c.passed': 'Passed pawn', 'b.passed': 'Push the passed pawn', 'x.passed': 'Push the passed pawn (no enemy pawn in front of it or on the neighbouring files). "Passed pawns must be pushed" — a new queen is a huge force.',
  'c.center': 'Centre', 'b.center': 'Take the centre', 'x.center': 'Occupy or fight for the centre (d4, e4, d5, e5) with a pawn. Central control gives your pieces room and cramps the opponent.',
  'c.pawn': 'Pawn move', 'b.pawn': 'Push a pawn', 'x.pawn': "Push a pawn to gain space or open a path for your pieces. Pawns can't go back, so think about the weaknesses it may leave (isolated, doubled…).",
  'c.develop': 'Development', 'b.develop': 'Develop', 'x.develop': 'Bring the {p} off its starting square into the game. In the opening, develop the knights and bishops quickly.',
  'c.file': 'Open file', 'b.file': 'Activate the rook', 'x.file': 'Put the rook on an open file (no pawn of yours on it). Rooks are at their best on open files.',
  'c.attack': 'Attack', 'b.attack': 'Attack', 'x.attack': 'Bring the {p} forward towards the enemy camp or king. You take the initiative, but if the attack stalls you will be counter-attacked — check that it can keep going.',
  'c.defend': 'Defence', 'b.defend': 'Defend', 'x.defend': 'Bring the {p} next to your king to strengthen the defence. Safer, but it also gives the opponent time.',
  'c.kingAct': 'Active king', 'b.kingAct': 'Activate the king', 'x.kingAct': 'In the endgame the king is a strong piece: bring it towards the centre to support your pawns or attack the enemy pawns.',
  'c.improve': 'Improve a piece', 'b.improve': 'Improve', 'x.improve': 'Move the {p} to a better square. When nothing is urgent, improving your worst piece is a good habit.',
  'tp.inCheck': 'You are in check. Compare all three answers: (1) move the king, (2) block, (3) capture the checking piece.',
  'tp.mate1': 'There is a mate in one! Try every check, one by one.',
  'tp.threat': 'Your opponent threatens mate in one. Stop it first.',
  'tp.hangBig': 'Your {p} ({sq}) is about to be taken. It is a valuable piece — move it or defend it.',
  'tp.hang': 'Your {p} on {sq} can be won (not enough defenders, or attacked by a cheaper piece). Move it, defend it, or play something even more valuable.',
  'tp.canWin': "The opponent's {p} ({sq}) can be won. Check that it can't be taken back and compare with the opponent's counter-play.",
  'tp.castle': 'Your king is still in the centre. The opening principle: castle early. Develop the knight and bishop to clear the way.',
  'tp.noCastle': "Your king is stuck in the centre and can no longer castle. Central files may open — keep defenders near the king.",
  'tp.develop': 'You still have {n} knight(s)/bishop(s) on their starting squares. In the opening, bring every piece out before moving the same piece again.',
  'tp.queen': 'An early queen can be chased by the enemy pieces, losing time. Develop the knights and bishops first.',
  'tp.rim': 'Your knight on {sq} is on the edge. "A knight on the rim is dim" — from the centre it controls many more squares.',
  'tp.myPassed': 'You have a passed pawn on {sq}. "Passed pawns must be pushed" — and rooks belong behind passed pawns (the Tarrasch rule).',
  'tp.opPassed': "The opponent's pawn on {sq} is a passed pawn. Blockade it with a piece in front, or attack it from behind with a rook.",
  'tp.openFile': 'The {f}-file is open (no pawns). Rooks are strongest on open files.',
  'tp.bishops': 'You have the bishop pair. It gets stronger as the board opens up, so trading pawns to open lines is a plan.',
  'tp.oppBishops': 'The opponent has the bishop pair. Keeping the position closed (locked pawns) reduces its power.',
  'tp.iso': 'Your {f}-pawn is isolated (no friendly pawn on the neighbouring files). No pawn can defend it, so it can become a target.',
  'tp.dbl': 'You have doubled pawns on the {f}-file. They move with difficulty and can become weak.',
  'tp.winning': 'You are ahead. No need to force things: play safe moves that leave no counter-play. When up material, trading pieces (especially queens) is the fastest way.',
  'tp.losing': 'You are behind. Avoid trades and look for complications and counter-attack where the opponent can go wrong.',
  'tp.matUp': 'Material: you are {x} points up (pawn 1, knight 3, bishop 3, rook 5, queen 9). Trade pieces rather than pawns.',
  'tp.matDown': 'Material: you are {x} points down. Avoid trades, activate your pieces and look for counter-play.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  'tp.open1': 'Three opening principles: control the centre with pawns, develop the knights and bishops quickly, castle early.',
  'tp.open2': 'Classic advice: develop knights before bishops, and make only one or two pawn moves in the opening.',
  'tp.mid1': "Every move, first check the opponent's checks, captures and threats — then think about your own plan.",
  'tp.mid2': '"All combinations are based on a double attack" — look for pieces lined up for a fork or a pin.',
  'tp.end1': 'In the endgame the king is a strong piece. Bring it to the centre.',
  'tp.end2': '"Rooks belong behind passed pawns" — behind your own to push it, behind the enemy one to attack it.',
  'tp.end3': 'One pawn up? Trade pieces, not pawns: pure king-and-pawn endings are the easiest to win.',
  'sk.open': 'Open Game (1.e4 e5): the centre opens early, so fast development and castling matter. Watch the weak f7 (and f2) squares.',
  'sk.semi': 'Semi-Open Game (1.e4, not e5): Black plays an unbalanced setup aiming for counter-play. The central pawn structure decides the plans.',
  'sk.closed': 'Closed Game (1.d4 d5): the centre tends to stay closed and the build-up is slower. Pawn breaks with the c- and e-pawns are typical.',
  'sk.indian': 'Indian Defence (1.d4 Nf6): Black develops the knight first and decides on the centre later. Fianchettoed bishops (g7, b7) are common.',
  'sk.flank': 'Flank opening: White controls the centre from the side (c4, Nf3). There is no early clash, so flexible development matters.',
  sep: ', ',
  gl: {
    castling: { m: ['castling', 'Castle', 'castle'], t: 'Castling', d: "A special move: the king goes two squares sideways and the rook jumps over it. Allowed only if neither has moved, the squares between are empty, and the king is not in check and doesn't pass through an attacked square." },
    mate: { m: ['checkmate', 'Checkmate'], t: 'Checkmate', d: 'The king is in check and no move can stop it. Checkmating the opponent wins the game.' },
    passed: { m: ['passed pawn', 'Passed pawn'], t: 'Passed pawn', d: 'A pawn with no enemy pawn in front of it on its own or the neighbouring files. It can run to promotion, so it is a big asset in the endgame.' },
    iso: { m: ['isolated'], t: 'Isolated pawn', d: 'A pawn with no friendly pawn on the neighbouring files. No pawn can defend it.' },
    dbl: { m: ['doubled'], t: 'Doubled pawns', d: 'Two pawns of the same colour on one file. They are often weak.' },
    develop: { m: ['develop'], t: 'Development', d: 'Bringing the knights, bishops and other pieces off their starting squares into play.' },
    center: { m: ['centre'], t: 'Centre', d: 'The squares d4, e4, d5 and e5 and the area around them. Controlling it gives your pieces more room.' },
    openfile: { m: ['open file'], t: 'Open file', d: 'A file with no pawns on it. Rooks and queens can use it to get into the enemy camp.' },
    pair: { m: ['bishop pair'], t: 'Bishop pair', d: 'Having both bishops. It is especially strong in open positions.' },
    fork: { m: ['fork'], t: 'Fork', d: 'One piece attacking two or more enemy pieces at once.' },
    pin: { m: ['pin'], t: 'Pin', d: 'A piece that cannot move (or should not) because a more valuable piece behind it on the same line would be exposed.' },
    tarrasch: { m: ['Tarrasch rule'], t: 'Tarrasch rule', d: '"Rooks belong behind passed pawns" — your own (to support it) or the enemy one (to attack it). A guideline with exceptions.' },
    fianchetto: { m: ['Fianchettoed', 'fianchetto'], t: 'Fianchetto', d: 'Pushing the knight pawn one square and putting the bishop on the long diagonal (g7, b7…).' },
    initiative: { m: ['initiative'], t: 'Initiative', d: 'Being the one who makes threats, so the opponent has to answer them.' },
    book: { m: ['opening book', 'book'], t: 'Opening book', d: 'Well-studied opening lines — mostly the moves strong players choose most often.' },
  },
},
};
// opening theory texts (ja / en; first moves) and opening names not in openings.json
Object.assign(TX.ja, {
  'op.e4.t': 'e4 — キングの前のポーンを2つ', 'op.e4.x': '中央のe4を占め、d5にも利かせる最も人気の初手。クイーンとビショップの通り道も開きます。',
  'op.d4.t': 'd4 — クイーンの前のポーンを2つ', 'op.d4.x': 'e4に次ぐ人気の初手。d4のポーンはクイーンに守られていて、落ち着いた戦い（クローズド・ゲームなど）になりやすい手です。',
  'op.c4.t': 'c4 — イングリッシュ', 'op.c4.x': '脇のcポーンでd5を押さえるイングリッシュ・オープニング。中央をすぐには占めず、柔軟に構えます。',
  'op.nf3.t': 'Nf3 — ナイトから出す', 'op.nf3.x': 'ナイトを先に出してd4・e5に利かせる柔軟な初手（レティ／ツケルトート）。あとからd4やc4につなげられます。',
  'op.sic.t': 'c5 — シシリアン', 'op.sic.x': '1.e4への最も多い応手。黒は非対称な形で、cポーンを白のdポーンと交換して反撃をねらいます。',
  'op.e5.t': 'e5 — 中央で受けて立つ', 'op.e5.x': '白と同じく中央にポーンを置く古典的な応手。ルイ・ロペスやイタリアンなどのオープン・ゲームになります。',
  'op.fr.t': 'e6 — フレンチ', 'op.fr.x': '次にd5で白のe4に挑むフレンチ・ディフェンス。堅い形ですが、c8のビショップが出にくくなります。',
  'op.ck.t': 'c6 — カロ・カン', 'op.ck.x': '次にd5で中央に挑むカロ・カン・ディフェンス。cポーンで支えるので、c8のビショップを先に外へ出せる堅実な形です。',
  'op.ind.t': 'Nf6 — インディアン系', 'op.ind.x': '1.d4への最も多い応手。ナイトでe4を押さえ、中央の形はあとで決めます（キングズ・インディアン、ニムゾ・インディアンなど）。',
  'op.d5.t': 'd5 — 中央で受ける', 'op.d5.x': '白と同じく中央にポーンを置く手。e4を防ぎ、2.c4（クイーンズ・ギャンビット）が最も多い続きです。',
  'op.dutch.t': 'f5 — ダッチ', 'op.dutch.x': 'fポーンでe4を押さえるダッチ・ディフェンス。キング側で攻めをねらう積極的な形ですが、キングの前が少し薄くなります。',
  'op.c4e5.t': 'e5 — 逆シシリアン', 'op.c4e5.x': '中央にポーンを置く手。白から見るとシシリアンの左右を入れ替えた形（キングズ・イングリッシュ）になります。',
  'op.c4nf6.t': 'Nf6 — ナイトから', 'op.c4nf6.x': 'ナイトを出して様子を見る柔軟な応手。d4のあとはインディアン系へ移ることもあります。',
  'op.sym.t': 'c5 — シンメトリカル', 'op.sym.x': '白と同じ手を返すシンメトリカル・バリエーション。お互いにd5・d4のマスを押さえ合います。',
  'op.nf3d5.t': 'd5 — 中央を取る', 'op.nf3d5.x': '中央にポーンを置く手。白は2.c4（レティ）や2.d4などで続けます。',
  'op.nf3nf6.t': 'Nf6 — 同じ形で', 'op.nf3nf6.x': 'ナイトを出し返す柔軟な応手。中央の形はお互いにあとで決めます。',
  'op.kn.t': 'Nf3 — e5を攻める', 'op.kn.x': 'ナイトを出しながら黒のe5のポーンを攻める、最も多い手。ルイ・ロペス、イタリアン、スコッチなどのオープン・ゲームへ進みます。',
  'op.vienna.t': 'Nc3 — ウィーン', 'op.vienna.x': 'ナイトでe4を守り、のちにf4で攻める余地も残すウィーン・ゲーム。',
  'op.bishop.t': 'Bc4 — ビショップス・オープニング', 'op.bishop.x': 'すぐにビショップを出してf7をねらう古い序盤。',
  'op.kg.t': 'f4 — キングズ・ギャンビット', 'op.kg.x': 'ポーンを差し出してe5を外し、中央とf筋を開ける積極的な序盤。キングの前が開くので、正確に指す必要があります。',
  'op.qg.t': 'c4 — クイーンズ・ギャンビット', 'op.qg.x': 'cポーンでd5に挑む最も多い続き。ギャンビット（ポーンを差し出す）と呼ばれますが、黒がそのポーンを持ち続けるのは難しいとされます。',
  'op.d5nf3.t': 'Nf3 — ナイトから', 'op.d5nf3.x': 'ナイトを出してから形を決める柔軟な手。あとからc4やBf4（ロンドン）にできます。',
  'op.london.t': 'Bf4 — ロンドン・システム', 'op.london.x': 'ビショップを早くf4に出し、e3・c3・Nf3と決まった形に組むロンドン・システム。覚えやすく、相手の手に左右されにくい作戦です。',
  'op.nf6c4.t': 'c4 — 中央を広く', 'op.nf6c4.x': 'cポーンでd5を押さえる最も多い続き。キングズ・インディアン、ニムゾ・インディアン、グリュンフェルトなどに分かれます。',
  'op.nf6nf3.t': 'Nf3 — ナイトから', 'op.nf6nf3.x': 'ナイトを出して形を決めるのを遅らせる手。ロンドン・システムなどにもつながります。',
  'op.nc6.t': 'Nc6 — e5を守る', 'op.nc6.x': 'ナイトを出しながらe5のポーンを守る最も自然な応手。ルイ・ロペス・イタリアン・スコッチなどに分かれます。',
  'op.petrov.t': 'Nf6 — ペトロフ', 'op.petrov.x': 'e5を守らず、逆に白のe4を狙い返すペトロフ・ディフェンス。堅実な形として知られます。',
  'op.philidor.t': 'd6 — フィリドール', 'op.philidor.x': 'ポーンでe5を守るフィリドール・ディフェンス。堅いですが、f8のビショップが少し窮屈になります。',
  'op.qgd.t': 'e6 — 受けない（辞退）', 'op.qgd.x': 'd5を支えて中央を保つクイーンズ・ギャンビット辞退。堅実ですが、c8のビショップの出し方が課題になります。',
  'op.slav.t': 'c6 — スラブ', 'op.slav.x': 'cポーンでd5を支えるスラブ・ディフェンス。c8のビショップを外に出す道を残せます。',
  'op.qga.t': 'dxc4 — 受ける（受諾）', 'op.qga.x': 'ポーンを取るクイーンズ・ギャンビット受諾。中央をいったん渡すかわりに、駒を自由に出せます。',
  'op.e6.t': 'e6 — ニムゾ／クイーンズ・インディアンへ', 'op.e6.x': '次にBb4（ニムゾ・インディアン）やb6（クイーンズ・インディアン）、d5に進める柔軟な手。',
  'op.g6.t': 'g6 — キングズ・インディアン／グリュンフェルトへ', 'op.g6.x': 'ビショップをg7にフィアンケットする準備。白に中央を取らせてから反撃するキングズ・インディアンや、d5で挑むグリュンフェルトになります。',
  'op.benoni.t': 'c5 — ベノニ', 'op.benoni.x': 'すぐにcポーンでd4に挑むベノニ。3.d5と進まれると非対称な激しい戦いになります。',
  'op.ruy.t': 'Bb5 — ルイ・ロペス', 'op.ruy.x': 'e5を守っているc6のナイトにビショップで圧力をかけるルイ・ロペス（スペイン）。最も研究されている序盤の一つです。',
  'op.ital.t': 'Bc4 — イタリアン', 'op.ital.x': 'ビショップをc4に出して黒の弱点f7をねらうイタリアン・ゲーム。何百年も指されている、初心者にもおすすめの序盤です。',
  'op.scotch.t': 'd4 — スコッチ', 'op.scotch.x': 'すぐにd4で中央を開くスコッチ・ゲーム。駒がのびのび動ける展開になりやすい手です。',
  'op.fourkn.t': 'Nc3 — フォーナイツ', 'op.fourkn.x': 'ナイトをもう1つ出すフォーナイツ・ゲーム（黒もNf6なら成立）。展開優先の落ち着いた形です。',
  'nm.bird': 'バード・オープニング', 'nm.reti': 'レティ・オープニング', 'nm.benoni': 'ベノニ・ディフェンス', 'nm.dutch': 'ダッチ・ディフェンス', 'nm.pirc': 'ピルツ・ディフェンス', 'nm.alekhine': 'アレヒン・ディフェンス', 'nm.modern': 'モダン・ディフェンス', 'nm.alapin': 'シシリアン・アラピン', 'nm.najdorf': 'シシリアン・ナイドルフ', 'nm.dragon': 'シシリアン・ドラゴン', 'nm.centerg': 'センター・ゲーム', 'nm.bishop': 'ビショップス・オープニング', 'nm.vienna': 'ウィーン・ゲーム', 'nm.kgambit': 'キングズ・ギャンビット', 'nm.philidor': 'フィリドール・ディフェンス', 'nm.petrov': 'ペトロフ・ディフェンス', 'nm.scotch': 'スコッチ・ゲーム', 'nm.fourkn': 'フォーナイツ・ゲーム', 'nm.qg': 'クイーンズ・ギャンビット', 'nm.qga': 'クイーンズ・ギャンビット受諾', 'nm.grunfeld': 'グリュンフェルト・ディフェンス', 'nm.catalan': 'カタラン・オープニング', 'nm.qid': 'クイーンズ・インディアン・ディフェンス',
});
Object.assign(TX.en, {
  'op.e4.t': 'e4 — the king pawn two squares', 'op.e4.x': 'The most popular first move: it occupies e4, attacks d5 and opens lines for the queen and the bishop.',
  'op.d4.t': 'd4 — the queen pawn two squares', 'op.d4.x': 'The second most popular first move. The d4 pawn is protected by the queen, and the games tend to be calmer (Closed Games and others).',
  'op.c4.t': 'c4 — the English', 'op.c4.x': 'The English Opening: the c-pawn controls d5 from the side. White stays flexible instead of occupying the centre at once.',
  'op.nf3.t': 'Nf3 — knight first', 'op.nf3.x': 'A flexible first move (Réti / Zukertort): the knight controls d4 and e5, and d4 or c4 can follow later.',
  'op.sic.t': 'c5 — the Sicilian', 'op.sic.x': 'The most common reply to 1.e4. Black chooses an unbalanced setup and aims to trade the c-pawn for White\'s d-pawn.',
  'op.e5.t': 'e5 — meet it in the centre', 'op.e5.x': 'The classical reply: a pawn in the centre, like White. It leads to the Open Games such as the Ruy Lopez and the Italian.',
  'op.fr.t': 'e6 — the French', 'op.fr.x': 'The French Defence: next ...d5 challenges e4. Solid, but the c8 bishop is harder to develop.',
  'op.ck.t': 'c6 — the Caro-Kann', 'op.ck.x': 'The Caro-Kann Defence: next ...d5 challenges the centre, supported by the c-pawn, so the c8 bishop can still get out first.',
  'op.ind.t': 'Nf6 — the Indian defences', 'op.ind.x': 'The most common reply to 1.d4. The knight controls e4 and Black decides on the centre later (King\'s Indian, Nimzo-Indian…).',
  'op.d5.t': 'd5 — meet it in the centre', 'op.d5.x': 'A pawn in the centre, like White. It stops e4; 2.c4 (the Queen\'s Gambit) is the most common follow-up.',
  'op.dutch.t': 'f5 — the Dutch', 'op.dutch.x': 'The Dutch Defence: the f-pawn controls e4. An ambitious kingside setup, but it loosens the king\'s cover a little.',
  'op.c4e5.t': 'e5 — a reversed Sicilian', 'op.c4e5.x': 'A pawn in the centre. From White\'s side it is a Sicilian with colours reversed (King\'s English).',
  'op.c4nf6.t': 'Nf6 — knight first', 'op.c4nf6.x': 'A flexible reply that waits; after d4 it can turn into an Indian defence.',
  'op.sym.t': 'c5 — the Symmetrical', 'op.sym.x': 'The Symmetrical Variation: Black copies White and both sides control d4 and d5.',
  'op.nf3d5.t': 'd5 — take the centre', 'op.nf3d5.x': 'A pawn in the centre. White continues with 2.c4 (Réti), 2.d4 and others.',
  'op.nf3nf6.t': 'Nf6 — the same setup', 'op.nf3nf6.x': 'A flexible reply: both sides decide on the centre later.',
  'op.kn.t': 'Nf3 — attack e5', 'op.kn.x': "The most played move: develop the knight and attack Black's e5 pawn. Ruy Lopez, Italian, Scotch and other Open Games follow.",
  'op.vienna.t': 'Nc3 — the Vienna', 'op.vienna.x': 'The Vienna Game: the knight protects e4 and keeps an f4 push in reserve.',
  'op.bishop.t': "Bc4 — the Bishop's Opening", 'op.bishop.x': 'An old opening: the bishop comes out at once and eyes f7.',
  'op.kg.t': "f4 — the King's Gambit", 'op.kg.x': "White offers a pawn to deflect the e5 pawn and open the centre and the f-file. Sharp: the king's cover opens too, so it needs precise play.",
  'op.qg.t': "c4 — the Queen's Gambit", 'op.qg.x': 'The c-pawn challenges d5 — the most common choice. It is called a gambit, but Black cannot easily keep the pawn.',
  'op.d5nf3.t': 'Nf3 — knight first', 'op.d5nf3.x': 'Develop first and decide later: c4 or Bf4 (London) can follow.',
  'op.london.t': 'Bf4 — the London System', 'op.london.x': 'The London System: the bishop goes to f4 early, then e3, c3 and Nf3 — the same setup almost every game. Easy to learn and hard to disrupt.',
  'op.nf6c4.t': 'c4 — more space', 'op.nf6c4.x': "The most common follow-up: the c-pawn controls d5. The game branches into the King's Indian, Nimzo-Indian, Grünfeld and others.",
  'op.nf6nf3.t': 'Nf3 — knight first', 'op.nf6nf3.x': 'Keeps the setup open; it can lead to the London System and others.',
  'op.nc6.t': 'Nc6 — defend e5', 'op.nc6.x': 'The most natural reply: develop the knight and defend e5. Ruy Lopez, Italian, Scotch and others follow.',
  'op.petrov.t': 'Nf6 — the Petrov', 'op.petrov.x': 'The Petrov Defence: instead of defending e5, Black counter-attacks e4. Known as a solid choice.',
  'op.philidor.t': 'd6 — the Philidor', 'op.philidor.x': 'The Philidor Defence: the pawn defends e5. Solid, but the f8 bishop is a little passive.',
  'op.qgd.t': 'e6 — decline', 'op.qgd.x': "The Queen's Gambit Declined: support d5 and keep the centre. Solid; developing the c8 bishop is the main task.",
  'op.slav.t': 'c6 — the Slav', 'op.slav.x': 'The Slav Defence: the c-pawn supports d5 and keeps the way out for the c8 bishop.',
  'op.qga.t': 'dxc4 — accept', 'op.qga.x': "The Queen's Gambit Accepted: Black gives up the centre for a while in return for free development.",
  'op.e6.t': 'e6 — towards the Nimzo / Queen\'s Indian', 'op.e6.x': "Flexible: ...Bb4 (Nimzo-Indian), ...b6 (Queen's Indian) or ...d5 can follow.",
  'op.g6.t': "g6 — towards the King's Indian / Grünfeld", 'op.g6.x': "Prepares to fianchetto the bishop on g7: the King's Indian lets White take the centre and strikes back later; the Grünfeld challenges it with ...d5.",
  'op.benoni.t': 'c5 — the Benoni', 'op.benoni.x': 'The Benoni: the c-pawn hits d4 at once. After 3.d5 the game becomes unbalanced and sharp.',
  'op.ruy.t': 'Bb5 — the Ruy Lopez', 'op.ruy.x': 'The Ruy Lopez (Spanish): the bishop puts pressure on the c6 knight that defends e5. One of the most studied openings.',
  'op.ital.t': 'Bc4 — the Italian', 'op.ital.x': 'The Italian Game: the bishop goes to c4 and eyes the weak f7 square. Played for centuries and a great first opening to learn.',
  'op.scotch.t': 'd4 — the Scotch', 'op.scotch.x': 'The Scotch Game: d4 opens the centre at once, giving the pieces free play.',
  'op.fourkn.t': 'Nc3 — the Four Knights', 'op.fourkn.x': 'The Four Knights Game (after ...Nf6): both sides develop first in a calm setup.',
  'nm.bird': 'Bird Opening', 'nm.reti': 'Réti Opening', 'nm.benoni': 'Benoni Defence', 'nm.dutch': 'Dutch Defence', 'nm.pirc': 'Pirc Defence', 'nm.alekhine': 'Alekhine Defence', 'nm.modern': 'Modern Defence', 'nm.alapin': 'Sicilian, Alapin', 'nm.najdorf': 'Sicilian, Najdorf', 'nm.dragon': 'Sicilian, Dragon', 'nm.centerg': 'Center Game', 'nm.bishop': "Bishop's Opening", 'nm.vienna': 'Vienna Game', 'nm.kgambit': "King's Gambit", 'nm.philidor': 'Philidor Defence', 'nm.petrov': 'Petrov Defence', 'nm.scotch': 'Scotch Game', 'nm.fourkn': 'Four Knights Game', 'nm.qg': "Queen's Gambit", 'nm.qga': "Queen's Gambit Accepted", 'nm.grunfeld': 'Grünfeld Defence', 'nm.catalan': 'Catalan Opening', 'nm.qid': "Queen's Indian Defence",
});
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  const l = L(); let x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gl = h => window.CoachKit ? CoachKit.gloss(h, (TX[L()] || TX.en).gl || TX.en.gl) : h;
const ltr = s => '⁦' + s + '⁩';
const pn = tp => (typeof t === 'function' ? t('rl.' + ' PNBRQK'[tp] + '.h') : ' PNBRQK'[tp]);
const pnL = tp => { const s = pn(tp); return L() === 'en' ? s.toLowerCase() : s; };
const sqN = s => ltr(E.sqName(s));
const fileN = s => ltr('abcdefgh'[s & 7]);

// --------------------------------------------------------------------------------------------- position facts
const P_ = 1, N_ = 2, B_ = 3, R_ = 4, Q_ = 5, K_ = 6, V = [0, 1, 3, 3, 5, 9, 0];
const each = fn => { for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } fn(s); } };
const col = p => (p >> 3) & 1, typ = p => p & 7;
const rel = (c, s) => c ? 7 - (s >> 4) : (s >> 4);   // rank from the side's own view (0 = back rank)
const dist = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 4) - (b >> 4)));
function mateIn1(pos) {
  for (const m of pos.legal()) { pos.make(m); const mt = pos.inCheck() && !pos.hasLegal(); pos.unmake(m); if (mt) return m; }
  return 0;
}
function pawnInfo(pos, c) {
  const files = [[], []];   // [color][file] -> ranks
  for (let i = 0; i < 2; i++) for (let f = 0; f < 8; f++) files[i][f] = [];
  each(s => { const p = pos.b[s]; if (p && typ(p) === P_) files[col(p)][s & 7].push(s >> 4); });
  const mine = files[c], th = files[c ^ 1], out = { passed: [], iso: [], dbl: [] };
  for (let f = 0; f < 8; f++) {
    if (mine[f].length >= 2) out.dbl.push(f);
    if (mine[f].length && !(mine[f - 1] || []).length && !(mine[f + 1] || []).length) out.iso.push(f);
    for (const r of mine[f]) {
      const ahead = x => c ? x < r : x > r;
      if (![f - 1, f, f + 1].some(g => (th[g] || []).some(ahead))) out.passed.push(r * 16 + f);
    }
  }
  out.open = []; for (let f = 0; f < 8; f++) if (!files[0][f].length && !files[1][f].length) out.open.push(f);
  out.halfOpen = f => !mine[f].length;
  return out;
}
function kingState(pos, c) {
  const k = pos.ksq[c], home = c ? 7 : 0, rights = pos.castle & (c ? 12 : 3);
  if ((k >> 4) === home && (k & 7) >= 6 && !rights) return 'short';
  if ((k >> 4) === home && (k & 7) <= 2 && !rights) return 'long';
  if (k === home * 16 + 4) return rights ? 'can' : 'center';
  return 'moved';
}
function undeveloped(pos, c) {
  const r = c ? 7 : 0; let n = 0;
  for (const [f, tp] of [[1, N_], [6, N_], [2, B_], [5, B_]]) if (pos.b[r * 16 + f] === (tp | (c ? 8 : 0))) n++;
  return n;
}
function material(pos, c) { let m = 0; each(s => { const p = pos.b[s]; if (p && col(p) === c) m += V[typ(p)]; }); return m; }
function facts(pos, n) {
  const us = pos.side, them = us ^ 1, f = { us, them, n };
  f.check = pos.inCheck();
  f.mate1 = f.check ? 0 : mateIn1(pos);
  f.threat = 0;
  if (!f.check) { pos.makeNull(); try { f.threat = mateIn1(pos); } finally { pos.unmakeNull(); } }
  const hg = c => (typeof hanging === 'function' ? hanging(pos, c) : []).map(s => ({ sq: s, tp: typ(pos.b[s]) })).sort((a, b) => V[b.tp] - V[a.tp]);
  f.hang = hg(us); f.win = hg(them);
  f.mat = material(pos, us) - material(pos, them);
  let np = 0, queens = 0; each(s => { const p = pos.b[s]; if (!p) return; const tp = typ(p); if (tp === Q_) queens++; if (tp !== P_ && tp !== K_) np += V[tp]; });
  f.dev = [4 - undeveloped(pos, 0), 4 - undeveloped(pos, 1)];
  f.stage = (np <= 26 || (!queens && np <= 32)) ? 'end' : (n < 20 && (undeveloped(pos, us) >= 1 || (pos.castle & (us ? 12 : 3)))) ? 'open' : 'mid';
  f.ks = [kingState(pos, 0), kingState(pos, 1)];
  f.pw = [pawnInfo(pos, 0), pawnInfo(pos, 1)];
  let bish = [0, 0]; each(s => { const p = pos.b[s]; if (p && typ(p) === B_) bish[col(p)]++; });
  f.bish = bish;
  f.rim = []; each(s => { const p = pos.b[s]; if (p === (N_ | (us ? 8 : 0)) && ((s & 7) === 0 || (s & 7) === 7)) f.rim.push(s); });
  f.queenOut = false; { const qh = us ? 0x73 : 0x03; let q = -1; each(s => { if (pos.b[s] === (Q_ | (us ? 8 : 0))) q = s; }); f.queenOut = q >= 0 && q !== qh; }
  f.myRooks = []; each(s => { if (pos.b[s] === (R_ | (us ? 8 : 0))) f.myRooks.push(s); });
  return f;
}
// what a candidate move is about
function classify(pos, m, f) {
  const fr = E.mFrom(m), to = E.mTo(m), pr = E.mPromo(m), fl = E.mFlag(m), us = pos.side, them = us ^ 1;
  const tp = typ(pos.b[fr]), capP = pos.b[to] || (fl & 2 ? (P_ | (them ? 8 : 0)) : 0), capT = capP ? typ(capP) : 0;
  pos.make(m); const chk = pos.inCheck(), mate = chk && !pos.hasLegal(), defended = pos.attacked(to, them); pos.unmake(m);
  const r = { p: pnL(tp), c: capT ? pnL(capT) : '', sq: fr, to, tp, castle: fl & 4 ? (to > fr ? 'S' : 'L') : '' };
  const mk = k => Object.assign(r, { k });
  if (mate) return mk('mate');
  if (f.check) return mk(capT ? 'cap' : tp === K_ ? 'kmove' : 'block');
  if (fl & 4) return mk('castle');
  if (pr) return mk('promo');
  if (capT) return mk(V[capT] > V[tp] || !defended ? 'cap' : 'trade');
  if (chk) return mk('check');
  if (f.hang.some(h => h.sq === fr && V[h.tp] >= 3)) return mk('save');
  const ek = pos.ksq[them], ok = pos.ksq[us];
  if (tp === P_) {
    if (f.pw[us].passed.includes(fr)) return mk('passed');
    if ([0x33, 0x34, 0x43, 0x44].includes(to) || (f.stage === 'open' && [0x32, 0x42].includes(to))) return mk('center');
    return mk('pawn');
  }
  if (tp === K_) return mk(f.stage === 'end' ? 'kingAct' : 'kmove');
  if ((tp === N_ || tp === B_) && rel(us, fr) === 0) return mk('develop');
  if (tp === R_ && f.pw[us].halfOpen(to & 7) && !f.pw[us].halfOpen(fr & 7)) return mk('file');
  if (tp === R_ && f.pw[us].halfOpen(to & 7) && (to & 7) !== (fr & 7) && rel(us, to) === rel(us, fr)) return mk('file');
  if (rel(us, to) > rel(us, fr) && (dist(to, ek) <= 2 || rel(us, to) >= 5)) return mk('attack');
  if (f.stage !== 'end' && dist(to, ok) <= 2 && dist(fr, ok) > 2) return mk('defend');
  if ((tp === Q_) && f.stage === 'open' && rel(us, fr) === 0) return mk('develop');
  return mk('improve');
}
const CCLS = { mate: 'c-mate', cap: 'c-mat', trade: 'c-mat', promo: 'c-mat', check: 'c-atk', attack: 'c-atk', passed: 'c-atk', block: 'c-def', kmove: 'c-def', castle: 'c-def', save: 'c-def', defend: 'c-def', develop: 'c-dev', center: 'c-dev', pawn: 'c-dev', file: 'c-dev', kingAct: 'c-dev', improve: 'c-calm' };
const RCLS = { mate: 'r-mate', block: 'r-def', kmove: 'r-def', castle: 'r-def', save: 'r-def', defend: 'r-def' };
const wrOf = v => (1 + sOfV(v)) / 2;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
const pctS = x => Math.round(x * 100) + '%';
function ttl(k) {
  const v = { p: k.p, c: k.c, sq: sqN(k.sq), f: fileN(k.sq), to: sqN(k.to) };
  if (k.castle) return tx(k.castle === 'S' ? 'tt.castleS' : 'tt.castleL');
  if (k.k === 'promo') return tx('tt.promo', v);
  if (k.c) return tx(k.tp === P_ ? 'tt.pcap' : 'tt.cap', v);
  if (k.tp === P_) return tx('tt.pawn', v);
  if (k.tp === K_) return tx('tt.king', v);
  return tx('tt.move', v);
}
const catTxt = k => tx('x.' + k.k, { p: k.p || '', c: k.c || '' });
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }

// --------------------------------------------------------------------------------------------- opening theory + book
// The first moves (standard and unusual choices; sources: ECO / Lichess chess-openings, Wikipedia "Chess opening",
// "King's Pawn Game", "Queen's Pawn Game"). Keys: the UCI moves so far.
const THEORY = {
  '': [['e2e4', 'main', 'e4'], ['d2d4', 'main', 'd4'], ['c2c4', 'alt', 'c4'], ['g1f3', 'alt', 'nf3']],
  'e2e4': [['c7c5', 'main', 'sic'], ['e7e5', 'main', 'e5'], ['e7e6', 'alt', 'fr'], ['c7c6', 'alt', 'ck']],
  'd2d4': [['g8f6', 'main', 'ind'], ['d7d5', 'main', 'd5'], ['f7f5', 'alt', 'dutch']],
  'c2c4': [['e7e5', 'main', 'c4e5'], ['g8f6', 'main', 'c4nf6'], ['c7c5', 'alt', 'sym']],
  'g1f3': [['d7d5', 'main', 'nf3d5'], ['g8f6', 'main', 'nf3nf6']],
  'e2e4 e7e5': [['g1f3', 'main', 'kn'], ['b1c3', 'alt', 'vienna'], ['f1c4', 'alt', 'bishop'], ['f2f4', 'alt', 'kg']],
  'd2d4 d7d5': [['c2c4', 'main', 'qg'], ['g1f3', 'main', 'd5nf3'], ['c1f4', 'alt', 'london']],
  'd2d4 g8f6': [['c2c4', 'main', 'nf6c4'], ['g1f3', 'main', 'nf6nf3'], ['c1f4', 'alt', 'london']],
  'e2e4 e7e5 g1f3': [['b8c6', 'main', 'nc6'], ['g8f6', 'alt', 'petrov'], ['d7d6', 'alt', 'philidor']],
  'd2d4 d7d5 c2c4': [['e7e6', 'main', 'qgd'], ['c7c6', 'main', 'slav'], ['d5c4', 'alt', 'qga']],
  'd2d4 g8f6 c2c4': [['e7e6', 'main', 'e6'], ['g7g6', 'main', 'g6'], ['c7c5', 'alt', 'benoni']],
  'e2e4 e7e5 g1f3 b8c6': [['f1b5', 'main', 'ruy'], ['f1c4', 'main', 'ital'], ['d2d4', 'alt', 'scotch'], ['b1c3', 'alt', 'fourkn']],
};
// named lines beyond openings.json (ECO names, UCI prefixes from the Lichess chess-openings tables)
const NAMES = { bird: 'f2f4', reti: 'g1f3 d7d5 c2c4', benoni: 'd2d4 g8f6 c2c4 c7c5', dutch: 'd2d4 f7f5', pirc: 'e2e4 d7d6', alekhine: 'e2e4 g8f6', modern: 'e2e4 g7g6', alapin: 'e2e4 c7c5 c2c3', najdorf: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', dragon: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6', centerg: 'e2e4 e7e5 d2d4', bishop: 'e2e4 e7e5 f1c4', vienna: 'e2e4 e7e5 b1c3', kgambit: 'e2e4 e7e5 f2f4', philidor: 'e2e4 e7e5 g1f3 d7d6', petrov: 'e2e4 e7e5 g1f3 g8f6', scotch: 'e2e4 e7e5 g1f3 b8c6 d2d4', fourkn: 'e2e4 e7e5 g1f3 b8c6 b1c3 g8f6', qg: 'd2d4 d7d5 c2c4', qga: 'd2d4 d7d5 c2c4 d5c4', grunfeld: 'd2d4 g8f6 c2c4 g7g6 b1c3 d7d5', catalan: 'd2d4 g8f6 c2c4 e7e6 g2g3', qid: 'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6' };
let BOOKMAP = null;
function book() {
  if (BOOKMAP) return BOOKMAP;
  if (typeof OPEN === 'undefined' || !OPEN || !OPEN.sets) return null;
  BOOKMAP = new Map();
  for (const g of OPEN.sets) for (const p of g.problems || []) {
    const k = p.fen.split(' ').slice(0, 4).join(' '), o = BOOKMAP.get(k);
    if (!o || o.n < p.n) BOOKMAP.set(k, { n: p.n, cand: p.cand });
  }
  return BOOKMAP;
}
const fenKey = pos => pos.fen().split(' ').slice(0, 4).join(' ');
function bookAt(i) {
  if (startFen || i > 30) return null;
  const B = book(); if (!B) return null;
  const pos = posAt(i).pos, e = B.get(fenKey(pos)); if (!e) return null;
  const tot = e.cand.reduce((a, b) => a + b[1], 0); if (tot < 100) return null;
  return { pos, list: e.cand.map(([u, c]) => ({ u, share: c / tot })) };
}
const ucis = i => (typeof ucisOf === 'function' ? ucisOf(moves.slice(0, i)) : []).join(' ');
function theoryAt(i) { if (startFen) return null; return THEORY[ucis(i)] || null; }
function isBook(i, m) {
  const u = posAt(i).pos.uci(m), th = theoryAt(i);
  if (th && th.some(x => x[0] === u)) return { share: null };
  const b = bookAt(i); const x = b && b.list.find(y => y.u === u);
  return x && x.share >= 0.03 ? { share: x.share } : null;
}
// opening name of the current line ("◯◯模様" until it settles)
function openingName() {
  if (startFen || !cur) return null;
  const u = ucis(cur) + ' ';
  let best = null, bl = 0;
  if (typeof OPEN !== 'undefined' && OPEN && OPEN.sets) for (const g of OPEN.sets) if (u.startsWith(g.prefix + ' ') && g.prefix.length > bl) { best = LL(g.title); bl = g.prefix.length; }
  for (const k in NAMES) if (u.startsWith(NAMES[k] + ' ') && NAMES[k].length > bl) { best = tx('nm.' + k); bl = NAMES[k].length; }
  const a = u.split(' ');
  const fam = a[0] === 'e2e4' ? (a[1] === 'e7e5' ? 'open' : a[1] ? 'semi' : null) : a[0] === 'd2d4' ? (a[1] === 'd7d5' ? 'closed' : a[1] === 'g8f6' ? 'indian' : null) : a[0] ? 'flank' : null;
  if (!best && fam) best = tx('fam.' + fam);
  if (!best) return null;
  return { name: best, fam, settled: cur >= 12 || bl >= 30 };
}

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, key: '', f: null, cls: null, op: null, hov: null, rvWas: false, rec: null };
let card = null;
function usable() {
  if (typeof settings === 'undefined') return false;
  if (lesson || puzzle || net || rgame || (typeof inStudy === 'function' && inStudy())) return false;
  return settings.mode === 'ai' || settings.mode === 'pvp';
}
function active() { return !!(settings.coach && usable()); }
const overNow = () => gameOver(moves.length);
function myTurn() { return !overNow() && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null; S.cls = null;
  try { const p = E.Pos.fromFEN(posAt(cur).pos.fen()); S.f = facts(p, cur); } catch (e) { S.f = null; }
  return S.f;
}
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || (anaLast && anaLast.key === k ? anaLast.list : null); }
function candInfo(f) {
  const list = listAt(cur); if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const pos = E.Pos.fromFEN(posAt(cur).pos.fen());
  const sorted = list.slice().sort((a, b) => b.v - a.v), best = sorted[0], wb = wrOf(best.v);
  const items = [];
  for (const c of sorted.slice(0, 5)) {
    let k; try { k = classify(pos, c.m, f); } catch (e) { continue; }
    let nm = ''; try { nm = pos.san(c.m); } catch (e) {}
    items.push({ m: c.m, u: pos.uci(c.m), k, drop: Math.max(0, wb - wrOf(c.v)), v: c.v, nm });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  const r = { list, items, dirs, best: items[0], branch: close.length >= 2 && best.v < MATET, sharp: second != null && second >= 0.12 && best.v < MATET ? pctS(second) : '', only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi }), us = f.us, them = f.them;
  if (f.check) add('tp.inCheck', 100, null, 1);
  if (f.mate1) add('tp.mate1', 96, null, 1);
  if (f.threat) add('tp.threat', 92, null, 1);
  const hb = f.hang.find(h => h.tp === Q_ || h.tp === R_);
  if (hb) add('tp.hangBig', 86, { p: pn(hb.tp), sq: sqN(hb.sq) }, 1);
  const h = f.hang.find(x => x !== hb && V[x.tp] >= 3); if (h) add('tp.hang', 76, { p: pn(h.tp), sq: sqN(h.sq) });
  const w = f.win.find(x => V[x.tp] >= 3); if (w) add('tp.canWin', 78, { p: pn(w.tp), sq: sqN(w.sq) });
  if (f.stage !== 'end') {
    if (f.ks[us] === 'can' && f.n >= 8) add('tp.castle', f.n >= 14 ? 64 : 55);
    if (f.ks[us] === 'center' && f.n >= 8) add('tp.noCastle', 60);
    const und = 4 - f.dev[us]; if (und >= 2 && f.n >= 10) add('tp.develop', 57, { n: und });
    if (f.stage === 'open' && f.queenOut && und >= 2) add('tp.queen', 53);
    if (f.rim.length && f.n >= 6) add('tp.rim', 30, { sq: sqN(f.rim[0]) });
  }
  const myP = f.pw[us].passed.slice().sort((a, b) => rel(us, b) - rel(us, a)), opP = f.pw[them].passed.slice().sort((a, b) => rel(them, b) - rel(them, a));
  if (myP.length) add('tp.myPassed', f.stage === 'end' ? 62 : 40, { sq: sqN(myP[0]) });
  if (opP.length) add('tp.opPassed', f.stage === 'end' ? 63 : 42, { sq: sqN(opP[0]) });
  if (f.stage !== 'open' && f.pw[us].open.length && f.myRooks.length && !f.myRooks.some(s => f.pw[us].open.includes(s & 7))) add('tp.openFile', 33, { f: ltr('abcdefgh'[f.pw[us].open[0]]) });
  if (f.bish[us] === 2 && f.bish[them] < 2) add('tp.bishops', 26);
  if (f.bish[them] === 2 && f.bish[us] < 2) add('tp.oppBishops', 25);
  if (f.stage !== 'open') { if (f.pw[us].iso.length) add('tp.iso', 29, { f: ltr('abcdefgh'[f.pw[us].iso[0]]) }); if (f.pw[us].dbl.length) add('tp.dbl', 27, { f: ltr('abcdefgh'[f.pw[us].dbl[0]]) }); }
  if (Math.abs(f.mat) >= 2) add(f.mat > 0 ? 'tp.matUp' : 'tp.matDown', 35, { x: Math.abs(f.mat) });
  const op = openingName(); if (op && op.fam && f.stage === 'open') add('sk.' + op.fam, f.n < 6 ? 50 : 32);
  if (f.stage === 'open') { add('tp.open1', f.n < 6 ? 49 : 22); add('tp.open2', 18); }
  else if (f.stage === 'mid') { add('tp.mid1', 20); add('tp.mid2', 16); }
  else { add('tp.end1', 38); add('tp.end2', 24); if (f.mat >= 1 && f.mat <= 2) add('tp.end3', 31); }
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  // the player's last move (pvp: the last move)
  const n = moves.length; if (!n) return '';
  let i = n - 1;
  if (settings.mode === 'ai') { while (i >= 0 && toMoveAt(i) !== humanColor) i--; if (i < 0) return ''; }
  const m = moves[i], pos = posAt(i).pos, mv = ltr(sanOf(i));
  const bk = isBook(i, m);
  if (bk) return CoachKit.verdict(bk.share == null || bk.share >= 0.15 ? 0 : 1, esc(tx('prev', { m: mv, q: tx('q.' + (bk.share == null || bk.share >= 0.15 ? 'best' : 'good')) })), gl(esc(bk.share == null ? tx('prevTheory') : tx('prevBook', { x: pctS(bk.share) }))));
  const list = listAt(i); if (!list || !list.length || typeof gradeMove !== 'function') return '';
  const q = gradeMove(list, m); if (!q) return '';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const p2 = E.Pos.fromFEN(pos.fen()), ff = facts(E.Pos.fromFEN(pos.fen()), i);
    let best = list[0]; for (const e of list) if (e.v > best.v) best = e;
    if (best.m !== m && q !== 'best') { const k = classify(p2, best.m, ff); body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: ltr(p2.san(best.m)), c: tx('c.' + k.k) })); }
    else { const k = classify(p2, m, ff); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
    if (window.ChessTip && (q === 'dubious' || q === 'bad')) body += ChessTip.html(E.Pos.fromFEN(pos.fen()), m, list, listAt(i + 1), q).replace(/<p class="rv-tip">/, '<br>').replace(/<\/p>$/, '');
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function opItems(i) {
  const th = theoryAt(i), bk = bookAt(i), pos = posAt(i).pos;
  if (th) return th.map(([u, kind, key]) => { const m = pos.fromUci(u); const x = bk && bk.list.find(y => y.u === u); return m ? { u, m, kind, key, nm: pos.san(m), share: x ? x.share : 0 } : null; }).filter(Boolean)
    .sort((a, b) => a.kind === b.kind ? b.share - a.share : a.kind === 'main' ? -1 : 1);
  return null;
}
function head(stage) { return `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${stage ? `<small>${esc(tx('st.' + stage))}</small>` : ''}</h3>`; }
function render() {
  if (!card) return;
  if (ChessCoach.sw) ChessCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const over = overNow(), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv && moves.length > 0));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can || !on || !myTurn()) setArrows(null);
  if (!can) return;
  if (over) {
    put(head() + `<p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) return put(head() + `<p class="ck-muted">${esc(tx('offNote'))}</p>`);
  const f = factsNow(); if (!f) return put(head());
  let h = head(f.stage);
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const list = listAt(cur), best = list && list.length ? list.reduce((a, b) => b.v > a.v ? b : a) : null;
  const wr = best ? wrOf(best.v) : null;
  const cl = candInfo(f);
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + pctS(wr)), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  chips.push({ k: tx('mat'), v: esc(f.mat === 0 ? tx('mat.even') : tx(f.mat > 0 ? 'mat.up' : 'mat.down', { x: Math.abs(f.mat) })), cls: f.mat > 0 ? 'pos' : f.mat < 0 ? 'neg' : '' });
  const op = openingName(); if (op) chips.push({ k: tx('opening'), v: esc(tx(op.settled ? 'fixed' : 'moyo', { n: op.name })) });
  if (f.stage !== 'end') {
    chips.push({ k: tx('who', { k: tx('kingH'), w: tx('meC') }), v: esc(tx('ks.' + f.ks[f.us])), cls: f.ks[f.us] === 'short' || f.ks[f.us] === 'long' ? 'pos' : f.ks[f.us] === 'center' ? 'neg' : '' });
    chips.push({ k: tx('who', { k: tx('kingH'), w: tx('opC') }), v: esc(tx('ks.' + f.ks[f.them])) });
    if (f.stage === 'open') chips.push({ k: tx('who', { k: tx('devH'), w: tx('meC') }), v: esc(tx('dev', { n: f.dev[f.us] })) + ' · ' + esc(tx('opC')) + ' ' + esc(tx('dev', { n: f.dev[f.them] })) });
  }
  if (f.stage !== 'open') {
    const ps = c => { const p = f.pw[c], a = []; if (p.passed.length) a.push(tx('ps.passed', { n: p.passed.length })); if (p.iso.length) a.push(tx('ps.iso', { n: p.iso.length })); if (p.dbl.length) a.push(tx('ps.dbl', { n: p.dbl.length })); return a.length ? a.join(tx('sep')) : tx('ps.ok'); };
    chips.push({ k: tx('who', { k: tx('pawnH'), w: tx('meC') }), v: esc(ps(f.us)), cls: f.pw[f.us].passed.length ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('pawnH'), w: tx('opC') }), v: esc(ps(f.them)) });
  }
  h += CoachKit.summary(chips);
  S.op = null;
  const th = opItems(cur);
  if (th && th.length) {
    S.op = th.map(d => ({ u: d.u, m: d.m }));
    h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true,
      items: th.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t')), text: gl(esc(tx('op.' + d.key + '.x'))), gap: d.share ? tx('bk.share', { x: pctS(d.share) }) : '', gcls: d.share >= .2 ? 'g0' : d.share ? 'g1' : '', move: d.u, mvName: ltr(d.nm) })) });
  }
  const bk = !th && bookAt(cur);
  if (bk) {
    const pos = E.Pos.fromFEN(bk.pos.fen());
    const items = bk.list.filter(x => x.share >= 0.03).slice(0, 4).map(x => { const m = pos.fromUci(x.u); if (!m) return null; let k = { k: 'improve', p: '' }; try { k = classify(pos, m, f); } catch (e) {} return { u: x.u, m, k, nm: pos.san(m), share: x.share }; }).filter(Boolean);
    if (items.length) {
      S.op = items.map(d => ({ u: d.u, m: d.m }));
      const b = items[0];
      h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { m: ltr(b.nm), c: tx('c.' + b.k.k), x: pctS(b.share) }))), RCLS[b.k.k] || '');
      h += CoachKit.branches({ head: tx('bkH'), intro: gl(esc(tx('bkIntro'))), reveal: true,
        items: items.map(d => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx('bk.share', { x: pctS(d.share) }), gcls: d.share >= .2 ? 'g0' : 'g1', move: d.u, mvName: ltr(d.nm) })) });
    }
  }
  if (!S.op && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wrOf(b.v))), p: Math.round(wrOf(b.v) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: d.u, mvName: ltr(d.nm) }; }),
    });
  } else if (!S.op) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, S.op ? null : cl);   // (book / theory positions: no engine branching tips)
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
  if (!S.hov) setArrows(null);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => hover(u),
  });
}
// arrows on the board: the hovered / tapped row's move only
let ARW = null;
function setArrows(list) { const k = list ? list.join(',') : ''; if ((ARW ? ARW.join(',') : '') === k) return; ARW = list && list.length ? list : null; try { renderFx(); } catch (e) {} }
function hover(u) {
  S.hov = u;
  if (!u || !myTurn()) { setArrows(null); return; }
  const m = posAt(cur).pos.fromUci(u); setArrows(m ? [m] : null);
}
function drawFx(svg) {
  if (!ARW || !active() || !myTurn()) return;
  ARW.forEach((m, i) => arrow(svg, E.mFrom(m), E.mTo(m), 'ck' + (ARW.length > 1 && i ? (i === 1 ? ' ck2' : ' ck3') : '')));
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  ChessCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  CoachKit.flash(tx(v ? 'on' : 'off'));
  render();
  if (v && myTurn() && !listAt(cur) && typeof analyzeCurrent === 'function') analyzeCurrent(busyToken);
}
function relabel() { if (ChessCoach.sw) ChessCoach.sw.sync(); S.key = ''; S.cls = null; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, (more[l] || {}).gl || {}) }); }
window.ChessCoach = { init, render, relabel, merge, tx, TX, active, usable, drawFx, isBook };
})();
