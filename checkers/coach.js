'use strict';
// チェッカーコーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in two-player games on one device): the position at a glance (形勢・駒・局面・定跡・守りの形), the recommended plan with its
// reason, the candidate directions (分かれ道: each candidate's plan explained, moves revealed on demand with arrows on the board),
// prioritized "how to think" tips read from the position (強制取り・ショット・取られそうな駒・キング・後ろの段・中央…), and the verdict
// on the previous move (◎○△✕). In the first moves the coach teaches opening theory instead of raw evaluation.
// Sources of the opening / strategy texts (checked 2026-10): R. Pask "Checkers for the Novice" and "Checkers in a Nutshell"
// (bobnewell.net), the "Checkers Openings" pages of albionalumni.org (strength of first moves and replies), Wikipedia "English
// draughts", rarepike.com strategy pages; named openings from this game's openings.json (Reinfeld's classic classification).
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (CheckersCoach.merge).
// app.js: CheckersCoach.render() at the end of renderInfo(); CheckersCoach.cands(key, list) when the analysis arrives;
// CheckersCoach.fx(svg, pos) from renderFx() (candidate arrows).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次に何をしてくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.even': '互角', 'mat.up': '{x}枚得', 'mat.down': '{x}枚損', 'mat.k': '（キング {a}対{b}）',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  recForced: '指せる手はこれだけです（取るのは義務）。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  man: 'マン', king: 'キング',
  'tt.move': '{sq}の{p}を進める', 'tt.cap': '{sq}の{p}で{n}枚取る', 'tt.crown': '{sq}のマンをキングにする', 'tt.king': '{sq}のキングを動かす',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  opH: '序盤の分かれ道 — 定跡の選び方', opIntro: '序盤は評価値の小さな差より、定跡（昔から研究されてきた手順）で指すことが大切です。まずは定番を覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種', 'op.book': '定跡',
  'op.w0': '初手は7通りあります。専門家の評価ではおおむね 11-15、9-14、11-16、10-15、10-14、12-16、9-13 の順に強いとされます（どれも最善を尽くせば引き分け）。',
  'op.w1': 'どの応手でも最善を尽くせば引き分けです。11-15 に対しては 24-20（エアシャー・ラッシー）・24-19・21-17 はやや劣るとされます。',
  'op.1115.t': '11の駒を15へ（中央）', 'op.1115.x': 'もっとも強く、もっともよく指される初手。中央の15を取ります。黒は2つの駒が並ぶダブルコーナー側ではなく、シングルコーナー側から駒を出すので、後ろの段（キング列）が手薄になりにくいのも長所です。',
  'op.914.t': '9の駒を14へ', 'op.914.x': '11-15に次ぐ強さとされる初手で、「ダブル・コーナー」と呼ばれます。中央寄りの14へ進めます。白は22-18か22-17で応じるのが良いとされます。',
  'op.1116.t': '11の駒を16へ', 'op.1116.x': 'ブリストル系の初手。中央へ向かう手ですが、白が22-18か24-19と応じると白が少し良くなるとされます。',
  'op.1015.t': '10の駒を15へ', 'op.1015.x': 'ケルソーと呼ばれる初手。中央の15を取りますが、白の21-17が最強の応手で、黒が10に残す穴をねらって白が少し良くなるとされます。',
  'op.r2319.t': '23の駒を19へ', 'op.r2319.x': 'もっとも強い応手の一つ。中央の19を取り、黒の15の駒と向かい合います。このあと黒の8-11や9-14から、オールド・フォーティーンス・スーターなど多くの名前付き定跡に分かれます。',
  'op.r2218.t': '22の駒を18へ（シングル・コーナー）', 'op.r2218.x': '「シングル・コーナー」。もっとも強い応手の一つで、専門家がよく使います。黒は15x22と取るしかなく（取るのは義務）、白は25x18と取り返して1枚ずつの交換になります。取り返しは26x17より25x18のほうがずっと強いとされます。',
  'op.r2318.t': '23の駒を18へ（クロス）', 'op.r2318.x': '「クロス」。強い応手の一つですが、白の18が黒の15と斜めに向かい合い、序盤から戦術的な鋭い戦いになります。',
  'op.r2217.t': '22の駒を17へ', 'op.r2217.x': 'まずまずとされる応手。中央から少し離れた17へ進めます。',
  'op.d2218.t': '22の駒を18へ', 'op.d2218.x': 'この応手で白はすぐに互角になるとされます。黒の14と白の18が向かい合う「ダブル・コーナー」の形です。',
  'op.d2217.t': '22の駒を17へ', 'op.d2217.x': 'もう一つの良い応手。ほかの応手はやや劣るとされます。',
  'op.b2218.t': '22の駒を18へ', 'op.b2218.x': '11-16への良い応手の一つ。この応手で白が少し良くなるとされます。',
  'op.b2419.t': '24の駒を19へ', 'op.b2419.x': '11-16へのもう一つの良い応手。こちらも白が少し良くなるとされます。',
  'op.k2117.t': '21の駒を17へ', 'op.k2117.x': '10-15への最強の応手とされます。黒が10を空けた穴をねらい、白が少し良くなります。',
  'op.next.t': '{sq}の駒を{to}へ', 'op.next.x': '定跡の手順です。この先「{n}」の定跡になります。', 'op.done.x': 'この手で「{n}」の定跡になります。',
  bkWhy: 'この局面は定跡の範囲です。名前のついた定跡の手順から選んでみよう。', prevBook: '定跡どおりの手です。', prevOff: 'この局面の定跡は {m} などです。',
  senkei: '定跡', who: '{k}（{w}）', guard: '守り', meC: 'あなた', opC: '相手', moyo: '{n}模様', fixed: '{n}', 'fam.1115': 'オールド・フェイスフル（11-15）',
  'g.pyr': 'ピラミッド型', 'g.back': '後ろの段{n}枚', 'g.none': '後ろの段なし', 'g.kings': 'キング{n}枚',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  'lp.shot': '💡コツ：手を指す前に、相手に取らせる手（取るのは義務）から始まる連続取りがないか確かめよう。', 'lp.hang': '💡コツ：動かす前に、動かしたあとで相手に取られる駒ができないか確かめよう。',
  // categories: tag / badge / explanation ({sq} square, {p} man / king, {n} pieces)
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、この手から勝ちまで読み切れています。相手の取り返しに注意して正確に進めよう。',
  'c.shot': 'ショット', 'b.shot': 'ショット', 'x.shot': '{sq}の{p}をわざと取らせ、取るのは義務という決まりを利用して、そのあと自分がより多く取り返す「ショット」。チェッカーで一番強力な戦術です。',
  'c.multi': '連続取り', 'b.multi': '連続で取る', 'x.multi': '{sq}の{p}で{n}枚を続けて取ります。着地したあとに取り返されないかも確かめよう。',
  'c.cap': '駒を取る', 'b.cap': '取る', 'x.cap': '{sq}の{p}で相手の駒を取ります。取るのは義務なので、取り方が複数あるときは取ったあとの形をくらべて選びます。',
  'c.crown': 'キング', 'b.crown': 'キングを作る', 'x.crown': '{sq}のマンを相手の一番奥の段まで進めてキングにします。キングは前後どちらにも動けて、マンよりずっと強い駒です。',
  'c.sac': '駒を渡す', 'b.sac': '駒を渡す', 'x.sac': '{sq}の{p}をわざと取らせる手。駒は減りますが、AIの読みでは相手の形を崩すなどで損が小さい手です。',
  'c.exch': '交換', 'b.exch': '交換する', 'x.exch': '{sq}の{p}を差し出し、取り合いで1枚ずつ交換します。駒が多い側にとって、形を崩さない交換は勝ちへの近道です。',
  'c.save': '逃げる', 'b.save': '駒を逃がす', 'x.save': 'ねらわれている{sq}の{p}を安全なマスへ逃がします。逃げた先でも働く場所を選べると理想的です。',
  'c.king': 'キング活用', 'b.king': 'キングを使う', 'x.king': '{sq}のキングを動かします。キングは中央に置き、ほかのキングとまとめて使うと強く働きます。',
  'c.back': '後ろの段', 'b.back': '後ろを出す', 'x.back': '後ろの段の{sq}の駒を出します。後ろの段は相手にキングを作らせない守りなので、動かすのは理由のあるときに。ただし4枚全部を残そうとする必要はありません。',
  'c.center': '中央', 'b.center': '中央を取る', 'x.center': '{sq}の駒を中央（14・15・18・19）へ。中央の駒は2方向へ動けて、盤を支配しやすくなります。',
  'c.side': '端へ', 'b.side': '端へ進める', 'x.side': '{sq}の駒を盤の端へ。端の駒は取られませんが、動ける方向が1つだけになります。',
  'c.dev': '駒組み', 'b.dev': '駒を進める', 'x.dev': '{sq}の駒を前に進めて形を整えます。仲間の駒と斜めに支え合う形で進めよう。',
  // tips
  'tp.forced': '取れる駒があります。チェッカーでは取るのは義務です。取り方が{n}通りあるので、取ったあとの形と相手の取り返しをくらべて選ぼう。',
  'tp.forced1': '取れる駒があります。チェッカーでは取るのは義務なので、この手を指すしかありません。',
  'tp.shot': 'ショットのチャンス！ 駒を取らせてから、より多く取り返せる手があります。',
  'tp.hang': '{sq}の駒が取られそうです（相手の番なら取られて損をします）。逃げる・後ろを支える・取り返せる形にする、のどれかを考えよう。',
  'tp.oppCrown': '相手は次の手でキングを作れます。止められるか、それより価値のある手があるかを考えよう。',
  'tp.crown': 'キングを作れる手があります。キングは前後に動けるので、作れるなら大きな得です。',
  'tp.oppShot': '相手のショット（取らせてから多く取り返す手）に注意。指す前に、相手に取らせる手がないか確かめよう。',
  'tp.ahead1': '駒が1枚得です。「開いた局面では1枚の得で十分に勝てる」（オールドベリー）。',
  'tp.ahead': '駒得です。形を崩さない1枚ずつの交換で駒を減らしていくと、勝ちやすい終盤になります。',
  'tp.behind': '駒損です。駒が少ない側は交換するほど差が広がります。交換は避けて、ショットなどで取り返すチャンスを探そう。',
  'tp.pyr': '30・31の駒と26の「頂点の駒」が残った、堅い守りの形です。31の駒を早く動かすと形が弱くなりやすいので注意。',
  'tp.pyrB': '2・3の駒と7の「頂点の駒」が残った、堅い守りの形です。2の駒を早く動かすと形が弱くなりやすいので注意。',
  'tp.dc': 'ダブルコーナー（{sq}）の守りが薄くなっています。ダブルコーナーは攻められやすい場所なので、ここには駒を残そう。',
  'tp.sc': 'シングルコーナー側の駒（{sq}）は早めに出してよいとされます。この側はキング列への入口が1つだけで、攻められにくいからです。',
  'tp.overdev': '駒を前に出しすぎています（あなたの「前進度」が相手より{x}多い）。序盤に出すぎると、動かせる安全な手がなくなって負けやすくなります。',
  'tp.center': '相手のほうが中央（14・15・18・19）に多く駒を置いています。中央を争おう。',
  'tp.center2': '中央（14・15・18・19）を押さえています。中央の駒は2方向へ動けて、盤全体ににらみが利きます。',
  'tp.kings': '終盤はキングが主役です。キングは中央に置き、まとめて使おう。',
  'tp.kingsDef': '守る側はキングをまとめておくのが基本です。1枚だけのキングはダブルコーナーに逃げ込むと追い出されにくくなります。',
  'tp.winning': '優勢です。無理をせず、相手のショットに気をつけながら交換で駒を減らしていこう。',
  'tp.losing': '劣勢です。交換を避け、相手が間違えやすい複雑な形にして勝負しよう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤は中央（14・15・18・19）を争い、端より中央へ向かって進めるのが基本です。',
  'tp.open2': '後ろの段の駒は、相手にキングを作らせない守り。理由のないうちは動かさないでおこう。',
  'tp.mid1': '取るのは義務。これを利用して、駒を取らせてから多く取り返す「ショット」が中盤の主役です。毎手、自分と相手のショットを探そう。',
  'tp.mid2': '1枚だけ前に出た駒は捕まりやすい。仲間と斜めに支え合いながら進めよう。',
  'tp.end1': 'キングを作ることが終盤の目標です。相手の後ろの段のすき間をねらおう。',
  sep: '・',
  gl: {
    force: { m: ['取るのは義務', '強制取り'], t: '取るのは義務（強制取り）', d: '取れる駒があるときは必ず取らなければならないルール。取り方が複数あればどれを選んでもよい。' },
    shot: { m: ['ショット'], t: 'ショット', d: '駒をわざと取らせ（取るのは義務）、そのあと自分がより多くの駒を取り返す戦術。' },
    king: { m: ['キング'], t: 'キング', d: 'マンが相手の一番奥の段（キング列）に着くと成る駒。前後どちらにも斜めに動ける。' },
    man: { m: ['マン'], t: 'マン', d: 'ふつうの駒。斜め前にしか動けない。' },
    back: { m: ['後ろの段', 'キング列'], t: '後ろの段（キング列）', d: '自分の一番手前の段。相手のマンがここに着くとキングになるので、ここの駒は守りの役目をする。' },
    dc: { m: ['ダブルコーナー'], t: 'ダブルコーナー', d: '盤の角のうち、黒マスが2つ並ぶ角（黒側は1・5、白側は28・32）。攻められやすく、劣勢側のキングの逃げ場にもなる。' },
    sc: { m: ['シングルコーナー'], t: 'シングルコーナー', d: '盤の角のうち、黒マスが1つだけの角（4と29）。' },
    center: { m: ['中央'], t: '中央', d: '14・15・18・19の4マス。ここの駒は2方向に動けて盤を支配しやすい。' },
    exch: { m: ['交換'], t: '交換', d: '1枚取らせて1枚取り返すなど、同じ数の駒を取り合うこと。' },
    multi: { m: ['連続取り'], t: '連続取り', d: '1回の手番で、跳んだ先からさらに続けて駒を取ること（途中でやめられない）。' },
    apex: { m: ['頂点の駒'], t: '頂点の駒', d: '後ろの段の2枚（白は30・31、黒は2・3）の前で三角形を作る駒（白は26、黒は7）。「ピラミッド」の守りの要。' },
    joseki: { m: ['定跡'], t: '定跡', d: '序盤の決まった手順。チェッカーでは初手と応手の組み合わせに名前がついている（シングル・コーナーなど）。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess what they will play next — the more often you guess right, the stronger your reading gets.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Pieces', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'mat.even': 'even', 'mat.up': '+{x}', 'mat.down': '−{x}', 'mat.k': ' (kings {a}:{b})',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  recForced: 'This is the only legal move (captures are compulsory).',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  man: 'man', king: 'king',
  'tt.move': 'Advance the {p} on {sq}', 'tt.cap': 'The {p} on {sq} takes {n}', 'tt.crown': 'Crown the man on {sq}', 'tt.king': 'Move the king on {sq}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  opH: 'Opening crossroads — choosing a line', opIntro: 'In the opening, playing the established lines (opening theory) matters more than small evaluation differences. Learn the standard moves first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual', 'op.book': 'Book',
  'op.w0': 'There are 7 possible first moves. Experts rank them roughly 11-15, 9-14, 11-16, 10-15, 10-14, 12-16, 9-13 from strongest to weakest (all draw with best play).',
  'op.w1': 'Every reply draws with best play. Against 11-15, the replies 24-20 (Ayrshire Lassie), 24-19 and 21-17 are considered inferior.',
  'op.1115.t': 'The man on 11 to 15 (centre)', 'op.1115.x': 'The strongest and most popular first move: it takes the central square 15. Black develops from the single corner rather than the double corner, so the back rank (king row) is less exposed.',
  'op.914.t': 'The man on 9 to 14', 'op.914.x': 'Ranked second after 11-15 and called the "Double Corner". It heads for 14 near the centre; White answers best with 22-18 or 22-17.',
  'op.1116.t': 'The man on 11 to 16', 'op.1116.x': 'The Bristol first move. It goes towards the centre, but White gets a slight edge with 22-18 or 24-19.',
  'op.1015.t': 'The man on 10 to 15', 'op.1015.x': 'The Kelso. It takes the centre, but 21-17 is considered White\'s strongest reply and gives White an edge by targeting the hole Black leaves on 10.',
  'op.r2319.t': 'The man on 23 to 19', 'op.r2319.x': 'One of the strongest replies: it takes the central square 19 and faces Black\'s man on 15. After Black\'s 8-11 or 9-14 it branches into many named openings, such as the Old Fourteenth and the Souter.',
  'op.r2218.t': 'The man on 22 to 18 (Single Corner)', 'op.r2218.x': 'The "Single Corner", one of the strongest replies and popular with experts. Black must take 15x22 (captures are compulsory) and White retakes 25x18 — one piece each. The retake 25x18 is considered much stronger than 26x17.',
  'op.r2318.t': 'The man on 23 to 18 (Cross)', 'op.r2318.x': 'The "Cross", one of the strongest replies. White\'s man on 18 meets Black\'s 15 diagonally and the game gets sharp and tactical early.',
  'op.r2217.t': 'The man on 22 to 17', 'op.r2217.x': 'Considered an adequate reply; the man goes to 17, a little away from the centre.',
  'op.d2218.t': 'The man on 22 to 18', 'op.d2218.x': 'With this reply White is considered to reach equality at once. The men on 14 and 18 face each other — the "Double Corner".',
  'op.d2217.t': 'The man on 22 to 17', 'op.d2217.x': 'Another good reply; the others are considered slightly inferior.',
  'op.b2218.t': 'The man on 22 to 18', 'op.b2218.x': 'One of the good replies to 11-16, considered to give White a slight edge.',
  'op.b2419.t': 'The man on 24 to 19', 'op.b2419.x': 'The other good reply to 11-16, also considered to give White a slight edge.',
  'op.k2117.t': 'The man on 21 to 17', 'op.k2117.x': 'Considered the strongest reply to 10-15: it targets the hole Black left on 10 and gives White an edge.',
  'op.next.t': 'The man on {sq} to {to}', 'op.next.x': 'A book move: it continues into the "{n}".', 'op.done.x': 'This move completes the "{n}".',
  bkWhy: 'This position is still in the opening book. Choose from the moves of the named openings.', prevBook: 'A book move.', prevOff: 'The book moves here are {m} and others.',
  senkei: 'Opening', who: '{k} ({w})', guard: 'Defence', meC: 'you', opC: 'opponent', moyo: 'heading for {n}', fixed: '{n}', 'fam.1115': 'Old Faithful (11-15)',
  'g.pyr': 'Pyramid', 'g.back': '{n} on back rank', 'g.none': 'back rank empty', 'g.kings': '{n} kings',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'lp.shot': '💡 Tip: before moving, check for multi-jumps that start by letting the opponent capture (captures are compulsory).', 'lp.hang': '💡 Tip: before moving, check whether the move leaves a piece the opponent can take.',
  'c.win': 'Winning line', 'b.win': 'Win it', 'x.win': 'The AI sees a forced win from this move. Keep an eye on recaptures and convert carefully.',
  'c.shot': 'Shot', 'b.shot': 'Shot', 'x.shot': 'Let the {p} on {sq} be taken on purpose: since captures are compulsory, you then take back more — a "shot", the most powerful tactic in checkers.',
  'c.multi': 'Multi-jump', 'b.multi': 'Multi-jump', 'x.multi': 'The {p} on {sq} takes {n} pieces in one go. Check that it can\'t be taken back where it lands.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'The {p} on {sq} captures. Captures are compulsory; when there are several ways to take, compare the positions after them.',
  'c.crown': 'Crown', 'b.crown': 'Crown a king', 'x.crown': 'The man on {sq} reaches the far row and becomes a king, which moves both forward and backward — far stronger than a man.',
  'c.sac': 'Give a piece', 'b.sac': 'Give a piece', 'x.sac': 'Let the {p} on {sq} be taken on purpose. You lose material, but the AI sees little loss — e.g. it breaks the opponent\'s formation.',
  'c.exch': 'Exchange', 'b.exch': 'Exchange', 'x.exch': 'Offer the {p} on {sq} for a one-for-one exchange. For the side ahead, exchanges that keep the formation sound are the road to a win.',
  'c.save': 'Escape', 'b.save': 'Save the piece', 'x.save': 'Move the threatened {p} on {sq} to a safe square, ideally one where it still works.',
  'c.king': 'King play', 'b.king': 'Use the king', 'x.king': 'Move the king on {sq}. Kings work best centralised and kept together.',
  'c.back': 'Back rank', 'b.back': 'Bring out a back man', 'x.back': 'Bring out the back-rank man on {sq}. The back rank stops the opponent from crowning, so move it out for a reason — but there is no need to keep all four.',
  'c.center': 'Centre', 'b.center': 'Take the centre', 'x.center': 'The man on {sq} goes to the centre (14, 15, 18, 19). Central men can move in two directions and control the board.',
  'c.side': 'To the side', 'b.side': 'Go to the side', 'x.side': 'The man on {sq} goes to the edge. A side man cannot be jumped, but it has only one direction to move.',
  'c.dev': 'Development', 'b.dev': 'Develop', 'x.dev': 'Advance the man on {sq} to build your formation. Advance in groups, with men supporting each other diagonally.',
  'tp.forced': 'You can capture. In checkers captures are compulsory; there are {n} ways to take, so compare the positions after each, including the recaptures.',
  'tp.forced1': 'You can capture. Captures are compulsory, so this is your only move.',
  'tp.shot': 'A shot! There is a move that lets a piece be taken and then wins more back.',
  'tp.hang': 'Your piece on {sq} could be taken (if it were the opponent\'s turn you would lose material). Move it, back it up, or make sure you can retake.',
  'tp.oppCrown': 'Your opponent can crown a king next move. Can you stop it — or do you have something more valuable?',
  'tp.crown': 'You can crown a king. Kings move both ways, so crowning is a big gain.',
  'tp.oppShot': 'Watch out for the opponent\'s shots (letting you take, then taking more). Before moving, check every capture you would be forced into.',
  'tp.ahead1': 'You are a piece up. "In a free and open position, the gain of a single piece is enough to ensure a won game" (Oldbury).',
  'tp.ahead': 'You are ahead. Exchange one for one without weakening your formation and you reach an easy winning ending.',
  'tp.behind': 'You are behind. Every equal exchange widens the gap — avoid trades and look for shots to win material back.',
  'tp.pyr': 'Your men on 30 and 31 with the "apex man" on 26 form a very sturdy defence. Moving the man on 31 early often leads to a weakness.',
  'tp.pyrB': 'Your men on 2 and 3 with the "apex man" on 7 form a very sturdy defence. Moving the man on 2 early often leads to a weakness.',
  'tp.dc': 'Your double corner ({sq}) is getting thin. The double corner is the more vulnerable area — keep strength there.',
  'tp.sc': 'Your single-corner men ({sq}) can be developed early: that side has only one entry to your king row, so it is less vulnerable.',
  'tp.overdev': 'You are overdeveloped (your "development count" is {x} ahead). Advancing too far early can leave you without safe moves.',
  'tp.center': 'Your opponent has more men in the centre (14, 15, 18, 19). Contest the centre.',
  'tp.center2': 'You hold the centre (14, 15, 18, 19). Central men can move both ways and watch the whole board.',
  'tp.kings': 'In the endgame kings do the work: centralise them and keep them together.',
  'tp.kingsDef': 'When defending, keep your kings together. A lone king is hard to dislodge from the double corner.',
  'tp.winning': 'You are ahead. No need to force things: watch for shots and trade pieces down.',
  'tp.losing': 'You are behind. Avoid exchanges and keep the position complicated, where the opponent can go wrong.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first, then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  'tp.open1': 'In the opening, contest the centre (14, 15, 18, 19) and move towards the centre rather than the edges.',
  'tp.open2': 'Your back-rank men stop the opponent from crowning. Leave them home unless you have a reason.',
  'tp.mid1': 'Captures are compulsory — that is what makes shots possible. Every move, look for your shots and your opponent\'s.',
  'tp.mid2': 'A lone man pushed forward is easily trapped. Advance in groups, supporting each other diagonally.',
  'tp.end1': 'Crowning kings is the goal of the endgame. Look for gaps in the opponent\'s back rank.',
  sep: ', ',
  gl: {
    force: { m: ['captures are compulsory', 'compulsory'], t: 'Compulsory capture', d: 'If you can capture, you must. When there are several captures you may choose any of them.' },
    shot: { m: ['shots', 'shot'], t: 'Shot', d: 'A tactic: let a piece be taken (captures are compulsory), then take back more.' },
    king: { m: ['kings', 'king'], t: 'King', d: 'A man that reached the far row. It moves diagonally both forward and backward.' },
    back: { m: ['back rank', 'king row'], t: 'Back rank (king row)', d: 'Your own first row. Enemy men that reach it are crowned, so men there defend.' },
    dc: { m: ['double corner'], t: 'Double corner', d: 'The corner with two dark squares side by side (1 and 5 for Black, 28 and 32 for White). Vulnerable to attack, and a refuge for a defending king.' },
    sc: { m: ['single corner'], t: 'Single corner', d: 'The corner with a single dark square (4 and 29).' },
    center: { m: ['centre'], t: 'Centre', d: 'The squares 14, 15, 18 and 19. Men there can move both ways and control the board.' },
    exch: { m: ['exchanges', 'exchange'], t: 'Exchange', d: 'Trading the same number of pieces, e.g. giving one and taking one back.' },
    apex: { m: ['apex man'], t: 'Apex man', d: 'The man in front of the two back men (White: 26 before 30 and 31; Black: 7 before 2 and 3) — the top of the "pyramid" defence.' },
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

// --------------------------------------------------------------------------------------------- position facts
// squares: index 0..31 = standard numbers 1..32; Black (P1, side 0) starts on 1-12 and moves down, White on 21-32.
const CENTER = [13, 14, 17, 18];
const SQ = n => n - 1;
// [Black, White]: back rank, pyramid (two back men + apex), double corner, single-corner men (R. Pask, "Checkers in a Nutshell")
const BACK = [[0, 1, 2, 3], [28, 29, 30, 31]];
const PYR = [[SQ(2), SQ(3), SQ(7)], [SQ(30), SQ(31), SQ(26)]];
const DC = [[SQ(1), SQ(5), SQ(6), SQ(9)], [SQ(24), SQ(27), SQ(28), SQ(32)]];
const SC = [[SQ(4), SQ(8), SQ(11), SQ(12)], [SQ(21), SQ(22), SQ(25), SQ(29)]];
const has = (mask, i) => !!(mask & E.bit(i));
const wr = v => (1 + sOfV(v)) / 2;
function facts(pos, n) {
  const s = pos.side, us = pos.turn, them = 3 - us, f = { s, us, n };
  const own = pos.own(s) >>> 0, opp = pos.own(s ^ 1) >>> 0, men = (own & ~pos.k) >>> 0;
  f.legal = pos.moves(); f.caps = pos.caps();
  f.cnt = [pos.count(us), pos.count(them)]; f.kg = [pos.kings(us), pos.kings(them)];
  f.mat = (f.cnt[0] - f.cnt[1]);
  const tot = f.cnt[0] + f.cnt[1];
  f.stage = (tot <= 12 || f.kg[0] + f.kg[1] >= 2) ? 'end' : (n < 14 && tot >= 22) ? 'open' : 'mid';
  // pieces of ours the opponent could win if it were its turn
  const q = pos.clone(); q.side ^= 1;
  f.oppGain = q.caps().length ? swapGain(q, 0) : 0;
  f.hang = f.oppGain >= 0.9 ? E.bitsOf(threatened(pos, us)) : [];
  f.oppCrown = q.moves().some(m => q.promotes(m));
  let shot = 0; for (const m of f.legal) { const g = matAfter(pos, m); if (g > shot) shot = g; }
  f.shot = !f.caps.length && shot >= 0.9 || (f.caps.length && shot >= 1.9);
  f.crown = f.legal.some(m => pos.promotes(m));
  // formations (both sides): [ours, theirs]
  const g = c => { const sd = c === us ? s : s ^ 1, msk = (pos.own(sd) & ~pos.k) >>> 0; return { back: BACK[sd].filter(i => has(msk, i)).length, pyr: PYR[sd].every(i => has(msk, i)), dc: DC[sd].filter(i => has(pos.own(sd), i)).length, sd }; };
  f.g = [g(us), g(them)];
  f.cen = [CENTER.filter(i => has(own, i)).length, CENTER.filter(i => has(opp, i)).length];
  // development count (Oldbury): 1 per man on the first rank, 2 on the second … (men only)
  const dev = sd => { let d = 0; const m = (pos.own(sd) & ~pos.k) >>> 0; for (const i of E.bitsOf(m)) { const r = E.RC[i][0]; d += sd === 0 ? r + 1 : 8 - r; } return d; };
  f.dev = dev(s) - dev(s ^ 1);
  f.menN = [E.popc(men), E.popc((opp & ~pos.k) >>> 0)];
  f.scLeft = SC[s].filter(i => has(men, i));
  f.dcThin = DC[s].filter(i => !has(own, i)).length >= 2;
  return f;
}
// what a candidate move is about
function classify(pos, m, f, v) {
  const fr = E.mFrom(m), cap = E.mCap(m), nC = E.popc(cap), kg = has(pos.k, fr), to = E.mTo(m);
  const r = { sq: fr + 1, to: to + 1, p: tx(kg ? 'king' : 'man'), n: nC, kg, m };
  const mk = k => Object.assign(r, { k });
  if (v != null && v > WINT) return mk('win');
  const gain = matAfter(pos, m);
  if (cap && nC >= 2) return mk(gain >= 1.9 ? 'multi' : 'cap');
  if (!cap && gain >= 0.9) return mk('shot');
  if (cap && gain >= 1.9) return mk('shot');
  if (cap) return mk('cap');
  if (pos.promotes(m)) return mk('crown');
  if (gain <= -0.9) return mk('sac');
  const after = pos.clone().play(m);
  if (gain > -0.5 && after.caps().some(c => has(E.mCap(c), to))) return mk('exch');
  if (f.hang.includes(fr) && !E.bitsOf(threatened(after, f.us)).includes(to)) return mk('save');
  if (kg) return mk('king');
  if (BACK[f.s].includes(fr)) return mk('back');
  if (CENTER.includes(to)) return mk('center');
  const c = E.RC[to][1]; if (c === 0 || c === 7) return mk('side');
  return mk('dev');
}
const CCLS = { win: 'c-mate', shot: 'c-atk', multi: 'c-mat', cap: 'c-mat', crown: 'c-mat', sac: 'c-atk', exch: 'c-dev', save: 'c-def', king: 'c-atk', back: 'c-def', center: 'c-dev', side: 'c-calm', dev: 'c-dev' };
const RCLS = { win: 'r-mate', save: 'r-def', back: 'r-def' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) {
  if (k.n) return tx('tt.cap', { sq: k.sq, p: k.p, n: k.n });
  if (k.k === 'crown') return tx('tt.crown', { sq: k.sq });
  if (k.kg) return tx('tt.king', { sq: k.sq });
  return tx('tt.move', { sq: k.sq, p: k.p });
}
const catTxt = k => tx('x.' + k.k, { sq: k.sq, p: k.p, n: k.n });

// --------------------------------------------------------------------------------------------- openings (theory + openings.json)
// hand-checked theory for the first two plies (albionalumni.org "Checkers Openings": ranking of first moves and replies)
const THEORY = {
  '': [['11-15', 'main', '1115'], ['9-14', 'main', '914'], ['11-16', 'alt', '1116'], ['10-15', 'alt', '1015']],
  '11-15': [['23-19', 'main', 'r2319'], ['22-18', 'main', 'r2218'], ['23-18', 'alt', 'r2318'], ['22-17', 'alt', 'r2217']],
  '9-14': [['22-18', 'main', 'd2218'], ['22-17', 'main', 'd2217']],
  '11-16': [['22-18', 'main', 'b2218'], ['24-19', 'main', 'b2419']],
  '10-15': [['21-17', 'main', 'k2117']],
};
const opName = s => (s.title && (s.title[LANG] || s.title.en)) || s.id;
function gameNames(i) { const p = E.Pos.from(null), out = []; for (let j = 0; j < i; j++) { out.push(E.name(p, moves[j])); p.play(moves[j]); } return out; }
const SETS = () => (typeof OPEN !== 'undefined' && OPEN && OPEN.sets) ? OPEN.sets : [];
// the opening of the game so far: { name, fixed } (fixed: a named line is complete; otherwise the lines it can still become)
function openingType(names) {
  if (startSpec || !names.length) return null;
  let done = null; const live = [];
  for (const s of SETS()) {
    const L = s.moves.split(' ');
    if (L.length <= names.length && L.every((x, j) => x === names[j])) { if (!done || L.length > done.L) done = { s, L: L.length }; }
    else if (L.length > names.length && names.every((x, j) => x === L[j])) live.push(s);
  }
  if (live.length === 1 && (!done || names.length < 4)) return { name: opName(live[0]), fixed: false };
  if (done) return { name: opName(done.s), fixed: true };
  if (!live.length) return null;
  if (names[0] === '11-15') return { name: tx('fam.1115'), fixed: false };
  const fam = live.find(s => s.moves.split(' ').length === 2 && names.length === 1) || live[0];
  return { name: opName(fam), fixed: false };
}
// book moves for the position after ply i: [{ u: '11-15', kind, key?, name?, done? }]
function bookAt(i) {
  if (startSpec || i > 8) return null;
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
const S = { open: false, reveal: false, key: '', f: null, lists: new Map(), hov: null, items: null };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online'));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || S.lists.get(k) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], caps: [], hang: [], g: [{}, {}], cen: [0, 0], cnt: [0, 0], kg: [0, 0] }; }
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
  // merge candidates with the same plan (keep the better one), at most 3 directions
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length && it.k.k !== 'cap') continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const sqs = a => a.map(i => i + 1).join(tx('sep'));
  if (f.caps.length) add(f.legal.length > 1 ? 'tp.forced' : 'tp.forced1', 100, { n: f.legal.length }, 1);
  if (f.shot) add('tp.shot', 96, null, 1);
  if (f.hang.length) add('tp.hang', 88, { sq: sqs(f.hang) }, 1);
  if (f.oppCrown) add('tp.oppCrown', 80, null, 1);
  if (f.crown && !f.caps.length) add('tp.crown', 72);
  if (f.mat === 1 && f.stage !== 'end') add('tp.ahead1', 54);
  else if (f.mat >= 1) add('tp.ahead', 54);
  else if (f.mat <= -1) add('tp.behind', 54);
  if (w != null) { if (w >= .8) add('tp.winning', 48); else if (w <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage !== 'end') {
    const me = f.g[0];
    if (me.pyr) add(f.s ? 'tp.pyr' : 'tp.pyrB', 40);
    if (f.dcThin && f.n >= 6) add('tp.dc', 42, { sq: DC[f.s].map(i => i + 1).join(tx('sep')) });
    if (f.dev >= 4 && f.menN[0] >= 10 && f.menN[1] >= 10) add('tp.overdev', 62, { x: f.dev });
    if (f.cen[1] > f.cen[0]) add('tp.center', 44); else if (f.cen[0] >= 2 && f.cen[0] > f.cen[1]) add('tp.center2', 20);
    if (f.stage === 'open' && f.scLeft.length >= 3 && f.n >= 2) add('tp.sc', 26, { sq: f.scLeft.map(i => i + 1).join(tx('sep')) });
  }
  if (f.stage === 'end') { if (f.kg[0] >= 1) add(f.mat < 0 ? 'tp.kingsDef' : 'tp.kings', 46); else add('tp.end1', 30); }
  if (!f.caps.length && f.stage !== 'open') add('tp.oppShot', 34);
  if (f.stage === 'open') { add('tp.open1', 22); add('tp.open2', 18); }
  else if (f.stage === 'mid') { add('tp.mid1', 24); add('tp.mid2', 16); }
  return out.sort((a, b) => b.pr - a.pr);
}
function guardTxt(x, kings) { return x.pyr ? tx('g.pyr') : x.back ? tx('g.back', { n: x.back }) : kings ? tx('g.kings', { n: kings }) : tx('g.none'); }
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;   // index of the graded move (played from position i)
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
        const gb = matAfter(pos, best.m), gm = matAfter(pos, m);
        if (gb >= gm + 0.9 || gm <= -0.9) body += '<br>' + esc(tx(gb >= gm + 0.9 && gb >= 0.9 ? 'lp.shot' : 'lp.hang'));
      }
    } else { const k = classify(pos.clone(), m, ff, mine.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (CheckersCoach.sw) CheckersCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
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
  // summary chips
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('mat'), v: esc((f.mat === 0 ? tx('mat.even') : tx(f.mat > 0 ? 'mat.up' : 'mat.down', { x: Math.abs(f.mat) })) + (f.kg[0] + f.kg[1] ? tx('mat.k', { a: f.kg[0], b: f.kg[1] }) : '')), cls: f.mat > 0 ? 'pos' : f.mat < 0 ? 'neg' : '' });
  const ot = openingType(gameNames(cur));
  if (ot && cur < 30) chips.push({ k: tx('senkei'), v: esc(tx(ot.fixed ? 'fixed' : 'moyo', { n: ot.name })) });
  if (f.stage !== 'end' || f.g[0].back || f.g[1].back) {
    chips.push({ k: tx('who', { k: tx('guard'), w: tx('meC') }), v: esc(guardTxt(f.g[0], f.kg[0])), cls: f.g[0].pyr ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('guard'), w: tx('opC') }), v: esc(guardTxt(f.g[1], f.kg[1])) });
  }
  h += CoachKit.summary(chips);
  // opening: theory / book instead of raw evaluation
  const bk = f.legal.length > 1 ? bookAt(cur) : null;
  let opItems = null;
  if (bk) {
    opItems = [];
    for (const b of bk) {
      const m = E.parse(pos, b.u); if (m == null) continue;
      const sq = E.mFrom(m) + 1, to = E.mTo(m) + 1;
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
    const key = gameNames(cur).join(' ');
    let intro = esc(tx('opIntro'));
    if (cur === 0 && key === '') intro += ' ' + esc(tx('op.w0'));
    else if (cur === 1 && THEORY[key]) intro += ' ' + esc(tx('op.w1'));
    if (!bk[0].key) h += CoachKit.rec(tx('op.book'), gl(esc(tx('bkWhy'))), '');
    h += CoachKit.branches({ head: tx('opH'), intro: gl(intro), reveal: true, items: opItems });
  } else if (cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
    if (cl.forced) why = esc(tx('recForced'));
    else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    S.items = S.reveal ? cl.dirs.map(d => d.u) : [];
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
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
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} S.hov = null; render(); renderFx(); },
    onHover: u => { const v = u == null ? null : +u; if (S.hov !== v) { S.hov = v; renderFx(); } },
  });
}
// candidate arrows on the board (called from renderFx): the hovered candidate, or every revealed one
function fx(svg, pos) {
  if (!active() || !myTurn() || sel) return;
  const L = S.hov != null ? [S.hov] : (S.items || []);
  const legal = pos.moves();
  for (const m of L) if (legal.includes(m)) svgArrow(svg, E.path(pos, m), 'ck');
}
// the analysis list of a position (progress lists too, so a quick move can still be graded)
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  CheckersCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (CheckersCoach.sw) CheckersCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.CheckersCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx, isBook, openingType };
})();
