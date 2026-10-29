'use strict';
// リバーシ（オセロ）コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against
// the AI (and in local two-player games): the position at a glance (形勢・石数・局面・定石の型・打てる場所・確定石・外側の石),
// the recommended plan with its reason, the candidate directions (分かれ道: the AI's top moves classified into Othello plans —
// 隅・パスさせる・X/C打ち・辺の割り込み・偶数理論・辺・静かな手・着手を減らす・多く返す), prioritized "how to think" tips read from
// the position, and the verdict on the previous move. In the first moves the coach teaches the opening theory (縦取り・斜め取り・
// 並び取り, then the named lines of openings.json) instead of the raw evaluation; a book move is never called a mistake.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (ReversiCoach.merge).
// index.html: ReversiCoach.render() after every renderInfo(); the analysis of the human's turn (schedule) stores positions[i].ana.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこに打つか、予想してみよう。予想が当たるほど読みの力がつきます。', overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', discs: '石数', stage: '局面', joseki: '定石', mob: '打てる場所', stab: '確定石', front: '外側の石', vs: '{a}（あなた）・{b}（相手）',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢', 'f.v': '{f} {x}石',
  moyo: '{n}模様', fixed: '{n}', offBook: '{n}（定石を外れた）',
  'ty.tate': '縦取り', 'ty.naname': '斜め取り', 'ty.narabi': '並び取り',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（AIの読みで{x}石）。',
  recSharp: '2番目の候補との差が大きく（{x}石）、ここは正確に打ちたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず打ちたい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で打つのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る', 'gap.d': '−{x}石',
  opH: '序盤の分かれ道 — 定石の選び方', opIntro: '序盤は評価値の小さな差より、定石どおりに打つことが大切です。まずは定番を覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種', 'op.same': 'どこでも同じ',
  'op.first.t': '中央の4か所のどこかに打つ', 'op.first.x': '最初に打てる4か所（d3・c4・f5・e6）は、盤を回転・裏返しすると全部同じ局面になります。このサイトの棋譜名や定石は、f5に打った形にそろえて表しています。',
  'op.tate.t': '{sq}で縦取り', 'op.tate.x': '黒の打った石と縦に並ぶ石を返す「縦取り」。いちばん多く打たれる定石「虎」をはじめ、兎・猫などに続きます。',
  'op.naname.t': '{sq}で斜め取り', 'op.naname.x': '斜めの石を返す「斜め取り」。牛・闘牛・猛牛（バッファロー）などに続く、縦取りと並ぶ定番です。',
  'op.narabi.t': '{sq}で並び取り', 'op.narabi.x': '黒の石と並んだ石を返す「並び取り」。白がやや苦しいとされ、強い人どうしの対局ではあまり打たれません。代表は「鼠」です。',
  'op.tora.t': '{sq}に打って虎へ', 'op.tora.x': '黒が斜めに腕を伸ばす手。白d3・黒c4と進むのが、プロ・アマを問わず最もよく打たれる定石「虎」です。',
  'op.usagi.t': '{sq}に打って兎へ', 'op.usagi.x': '中央に並んだ白の3つの石を真ん中で割る、もっとも静かな手。白f4・黒e3と進むのが「兎」で、その先に「ローズ」があります。',
  'op.neko.t': '{sq}に打って猫へ', 'op.neko.x': '白d3・黒c5と進む「猫」、白g5の「ノーキャット」から「燕」などに分かれる変わり種です。',
  'op.ushi.t': '{sq}に打って牛へ', 'op.ushi.x': '斜め取りへの応手。白f4・黒e3と進むのが「牛」で、斜め取りでいちばん多く打たれる形です。',
  'op.nezumi.t': '{sq}に打って鼠へ', 'op.nezumi.x': '並び取りへの中央の静かな応手。白f6・黒d3と進むのが「鼠」です。',
  bkH: '定石の候補 — この局面から続く定石', bkIntro: '名前のついた定石の手順です。定石の範囲では、評価値の小さな差より手順を覚えることを優先しよう。', bkTo: '{sq}に打つ → {n}', bkWhy: 'この局面は定石の範囲です。{m}に打つと「{n}」に進みます。',
  prevBook: '定石どおりの手です（{n}）。', prevBook0: '定石どおりの手です。', bkBadge: '定石の手', prevOff: 'この局面の定石は {m}（{n}）などでした。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  'pv.corner': 'この手のあと、相手が隅（{c}）を取れるようになりました。XやCに打つ前は「相手が隅を取れるようにならないか」を確かめよう。',
  'pv.loud': 'この手は外側の石を多く返しました（開放度{o}）。内側の石だけを返す静かな手のほうが、相手に打てる場所を与えません。',
  'pv.mob': 'この手のあと、相手の打てる場所が{n}か所に増えました。相手の選択肢を減らす手を探そう。',
  // edges / squares
  'a.tl': '左上', 'a.tr': '右上', 'a.bl': '左下', 'a.br': '右下', hid: '{a}で「{b}」', hidE: '{e}で「{b}」',
  'e.top': '上辺', 'e.bottom': '下辺', 'e.left': '左辺', 'e.right': '右辺',
  // categories: tag / badge / title / explanation
  'c.corner': '隅', 'b.corner': '隅を取る', 't.corner': '{sq}の隅を取る', 'x.corner': '隅に打った石は二度と返されず、そこから辺に沿って確定石が増えていきます。取れるときはまず隅を取る手を考えよう（例外もあるので、相手の応手も確かめて）。',
  'c.pass': 'パスさせる', 'b.pass': 'パスさせる', 't.pass': '{sq}に打って相手をパスさせる', 'x.pass': 'この手のあと相手は打てる場所がなくなり、パスになります。続けてもう一手打てるので、とても強い手になることが多いです。',
  'c.xc': 'X・C打ち', 'b.xc': '隅の近くに打つ', 't.xc': '{sq}（{k}）に打つ', 'x.xc': '隅の隣（C）や斜め隣（X）に打つ手。ふつうは相手に隅を渡す危険な手ですが、隅を取らせても代わりに得をする場面ではこれが正解になります。打った後に相手が隅を取れるか、取ったら何が起きるかを読もう。',
  'c.wedge': '割り込み', 'b.wedge': '辺に割り込む', 't.wedge': '{e}の{sq}に割り込む', 'x.wedge': '相手の石に挟まれた辺の空きに打つ「割り込み（くさび）」。相手の辺の形を分断し、相手の山やウイングを崩す強い手筋です。',
  'c.parity': '偶数理論', 'b.parity': '奇数の空きに入る', 't.parity': '{n}マスの空きの{sq}に打つ', 'x.parity': '終盤は空きマスがいくつかの塊に分かれます。空きが奇数の塊に自分から先に入ると、その塊の最後の一手を自分が打ちやすくなります（偶数理論）。',
  'c.edge': '辺', 'b.edge': '辺に打つ', 't.edge': '{e}の{sq}に打つ', 'x.edge': '辺に石を打つ手。辺の石は返されにくい一方、早く辺に打ちすぎると相手に付け込まれることがあります。辺の形（山・ウイングなど）が良くなるかを確かめよう。',
  'c.quiet': '静かな手', 'b.quiet': '静かに打つ', 't.quiet': '{sq}に静かに打つ（開放度{o}）', 'x.quiet': '返す石の周りの空きが少ない（開放度が小さい）手。内側の石だけを返す中割りのような手は、相手に新しい打ち場所を与えにくく、好手になりやすいです。',
  'c.mob': '着手を減らす', 'b.mob': '相手の手を減らす', 't.mob': '{sq}に打って相手の打てる場所を{n}か所に', 'x.mob': '打った後の相手の打てる場所（着手可能数）が少なくなる手。打てる場所がなくなると、相手はXやCのような打ちたくない場所に打たされます。',
  'c.loud': '多く返す', 'b.loud': '多く返す', 't.loud': '{sq}に打って{n}枚返す', 'x.loud': '多くの石を返す手。石の数は増えますが、外側の石が増えると相手の打てる場所も増えます。序盤・中盤は石の数より打てる場所の数が大切です。',
  // tips
  'tp.corner': '{sq}の隅を取れます。隅の石は二度と返されません。取ったあとに相手に何をされるかも確かめよう。',
  'tp.oppCorner': '相手は次に{sq}の隅を取れる状態です。隅を取られる前に何ができるか、取られても損が小さい手は何かを考えよう。',
  'tp.passMove': '{sq}に打つと相手はパスになります。続けて打てるのは大きな得です。',
  'tp.noSafe': '隅を渡さない安全な手がほとんど残っていません。XやCに打つなら、隅を取られたあとの損が一番小さい場所を選ぼう。',
  'tp.xc': '隅が空いているときのX（隅の斜め隣）やC（隅の隣）は、相手に隅を渡しやすい危険なマスです。',
  'tp.wall': 'あなたの外側の石（空きに接する石）が{a}個と、相手の{b}個より多く、壁になりかけています。壁ができると自分の打てる場所が減るので、内側を返す手で崩そう。',
  'tp.oppWall': '相手の外側の石が{b}個と多く、相手は壁を作っています。あなたは静かな手で待つと、相手の打てる場所が先に尽きやすくなります。',
  'tp.mobLow': 'あなたの打てる場所は{a}か所、相手は{b}か所です。打てる場所が少ないと、打ちたくない場所に打たされます。相手の打てる場所を減らす手を探そう。',
  'tp.mobHigh': 'あなたの打てる場所は{a}か所、相手は{b}か所。選択肢の多さで有利に立っています。',
  'tp.quiet': 'いちばん静かな手は {sq}（開放度{o}）です。開放度は、返す石に接する空きマスの数。小さいほど相手に打ち場所を与えません。',
  'tp.reserve': '{list}はあなただけが打てる場所（余裕手）です。急いで打たず、ほかに打つ手がなくなったときのために取っておくのがコツ。',
  'tp.parity': '空きの塊：{list}。奇数の塊に自分から先に入り、偶数の塊は相手に先に入らせると、最後の一手を取りやすくなります（偶数理論）。',
  'tp.stable': '確定石（もう返されない石）はあなた{a}個・相手{b}個。終盤は確定石が多いほど有利です。',
  'tp.winning': '有利です。無理に石を取りに行かず、隅を渡さない安全な手で勝ちに近づこう。',
  'tp.losing': '不利です。相手がXやCに打たされるよう、相手の打てる場所を減らす手を狙おう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。方針（静かに待つか、辺を取るか…）を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（{x}石）。ここを正確に打てるかが勝負の分かれ目。',
  'tp.open1': '序盤は内側に打ち、返す石を少なくするのが基本。たくさん返すほど相手の打てる場所が増えます。',
  'tp.open2': '序盤は辺に打つのを急がないようにしよう。辺の石は相手の目標になりやすく、隅の隣は隅を渡すきっかけになります。',
  'tp.mid1': '中盤は石の数より「打てる場所の数」で考えよう。強い人ほど、相手の打てる場所を減らすことを重視します。',
  'tp.mid2': '自分の外側の石が一列に並ぶ「壁」は打てる場所を失う原因です。相手に自分を囲ませる形をめざそう。',
  'tp.end1': '終盤は空きの塊の数を数えよう。奇数の空きに先に入るのが偶数理論の基本です。',
  'tp.end2': '終盤は読み切りの勝負。確定石と、最後の一手（手止まり）をどちらが打つかで石数が大きく変わります。',
  sep: '・', 'u.sq': '{n}マス',
  gl: {
    sumi: { m: ['隅'], t: '隅（すみ）', d: '盤の四隅のマス。隅に打った石は二度と返されません。' },
    xsq: { m: ['X'], t: 'X（エックス）', d: '隅の斜め隣のマス（b2・g2・b7・g7）。隅が空いているときに打つと、相手に隅を取られやすくなります。' },
    csq: { m: ['C'], t: 'C（シー）', d: '辺で隅の隣のマス（a2・b1・g1・h2・a7・b8・g8・h7）。不用意に打つと相手に隅を取られることがあります。' },
    kakutei: { m: ['確定石'], t: '確定石', d: '終局までもう返されることのない石。隅とそこから続く石などです。' },
    kaiho: { m: ['開放度'], t: '開放度', d: '打った手で返す石に接している空きマスの数。小さいほど相手に新しい打ち場所を与えにくい「静かな手」です。' },
    nakawari: { m: ['中割り'], t: '中割り', d: '周りを石に囲まれた内側の石だけを返す打ち方。開放度が小さく、好手になりやすい手です。' },
    kabe: { m: ['壁'], t: '壁', d: '空きマスに接する自分の石（外側の石）が一列に並んだ形。壁を作ると自分の打てる場所が減ります。' },
    yoyu: { m: ['余裕手'], t: '余裕手', d: '自分だけが打てて、相手は打てない場所。急いで打たず、ほかに手がなくなったときのために残しておくのが基本です。' },
    gusu: { m: ['偶数理論'], t: '偶数理論', d: '終盤、空きの塊のうち奇数の塊に自分から先に入り、偶数の塊は相手に先に入らせることで、最後の一手を取りやすくする考え方。' },
    mob: { m: ['打てる場所', '着手可能数'], t: '打てる場所（着手可能数）', d: '手番の人が打てるマスの数。少なくなるとXやCのような打ちたくない場所に打たされます。' },
    tate: { m: ['縦取り'], t: '縦取り', d: '2手目に白が、黒の打った石と縦に並ぶ石を返す取り方（f5に対するd6）。虎・兎・猫などに続きます。' },
    naname: { m: ['斜め取り'], t: '斜め取り', d: '2手目に白が斜めの石を返す取り方（f5に対するf6）。牛・闘牛などに続きます。' },
    narabi: { m: ['並び取り'], t: '並び取り', d: '2手目に白が黒の石と並んだ石を返す取り方（f5に対するf4）。白がやや苦しいとされます。' },
    joseki: { m: ['定石'], t: '定石', d: '序盤の決まった手順。長年の研究で互角に進めやすいとされる打ち方で、名前がついています（虎・兎・牛など）。' },
    pass: { m: ['パス'], t: 'パス', d: '打てる場所がないとき、手番を相手に渡すこと。相手をパスさせると続けて打てます。' },
    soto: { m: ['外側の石'], t: '外側の石', d: '空きマスに接している石。多いほど相手に打てる場所を与えます。' },
    wedge: { m: ['割り込み'], t: '割り込み（くさび）', d: '辺で相手の石2つに挟まれた空きマスに打つ手。相手の辺を分断し、返されにくい石になります。' },
    yama: { m: ['山', 'ウイング'], t: '山・ウイング', d: '辺の両方のCを空けて6マスを一色で占める形が山、5マスを占めて片側のCが空いた形がウイング。ウイングは割り込まれやすい形です。' },
    tedomari: { m: ['手止まり'], t: '手止まり', d: '最後の一手。手止まりを打った側が、最後の空きを自分の色で埋められます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  oppTurn: "It's your opponent's turn. Try to guess where they will play next — the more often you guess right, the stronger your reading gets.", overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', discs: 'Discs', stage: 'Phase', joseki: 'Opening', mob: 'Moves', stab: 'Stable', front: 'Frontier', vs: '{a} (you) · {b} (opp.)',
  'st.open': 'Opening', 'st.mid': 'Midgame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing', 'f.v': '{f} {x}',
  moyo: 'heading for {n}', fixed: '{n}', offBook: '{n} (out of book)',
  'ty.tate': 'Perpendicular', 'ty.naname': 'Diagonal', 'ty.narabi': 'Parallel',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} ({x} discs in the AI\'s reading).',
  recSharp: 'The gap to the second choice is large ({x} discs) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse', 'gap.d': '−{x}',
  opH: 'Opening crossroads — choosing an opening', opIntro: 'In the opening, following the book matters more than small evaluation differences. Learn the standard choices first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual', 'op.same': 'all the same',
  'op.first.t': 'Play any of the four central squares', 'op.first.x': 'The four first moves (d3, c4, f5, e6) all give the same position once the board is rotated or mirrored. On this site, game records and openings are shown as if the first move was f5.',
  'op.tate.t': 'Perpendicular with {sq}', 'op.tate.x': 'White flips the disc in line with Black\'s first disc ("perpendicular"). It leads to the Tiger — the most played opening — and to the Rabbit, the Cat and more.',
  'op.naname.t': 'Diagonal with {sq}', 'op.naname.x': 'White flips the diagonal disc ("diagonal"). It leads to the Cow, the Bullfight (Heath), the Buffalo and more — the other standard reply.',
  'op.narabi.t': 'Parallel with {sq}', 'op.narabi.x': 'White flips the disc next to Black\'s ("parallel"). It is considered inferior for White and rarely seen between strong players. Its main line is the Mouse.',
  'op.tora.t': 'Play {sq}, toward the Tiger', 'op.tora.x': 'Black reaches out diagonally; after White d3 and Black c4 this is the Tiger, the most played opening at every level.',
  'op.usagi.t': 'Play {sq}, toward the Rabbit', 'op.usagi.x': 'The quietest choice: it splits White\'s three central discs in the middle. White f4, Black e3 is the Rabbit, which leads on to the Rose.',
  'op.neko.t': 'Play {sq}, toward the Cat', 'op.neko.x': 'An unusual choice: White d3, Black c5 is the Cat; White g5 gives the No-Cat and then the Swallow.',
  'op.ushi.t': 'Play {sq}, toward the Cow', 'op.ushi.x': 'The reply to the diagonal opening: White f4, Black e3 is the Cow, the most played diagonal line.',
  'op.nezumi.t': 'Play {sq}, toward the Mouse', 'op.nezumi.x': 'A quiet central reply to the parallel opening: White f6, Black d3 is the Mouse.',
  bkH: 'Book moves — openings that continue from here', bkIntro: 'These are the moves of named openings. While you are in the book, learning the sequences matters more than small evaluation differences.', bkTo: 'Play {sq} → {n}', bkWhy: 'This position is still in the opening book. Playing {m} continues into the {n}.',
  prevBook: 'A book move ({n}).', prevBook0: 'A book move.', bkBadge: 'Book move', prevOff: 'The book moves here were {m} ({n}) and others.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'pv.corner': 'After this move your opponent can take the corner ({c}). Before playing on an X or C square, check whether it lets the opponent take a corner.',
  'pv.loud': 'This move flipped many outer discs (openness {o}). A quiet move that flips only inner discs gives the opponent fewer places to play.',
  'pv.mob': 'After this move your opponent had {n} moves. Look for moves that reduce the opponent\'s choices.',
  'a.tl': 'top left', 'a.tr': 'top right', 'a.bl': 'bottom left', 'a.br': 'bottom right', hid: '{b} in the {a}', hidE: '{b} — {e}',
  'e.top': 'top edge', 'e.bottom': 'bottom edge', 'e.left': 'left edge', 'e.right': 'right edge',
  'c.corner': 'Corner', 'b.corner': 'Take the corner', 't.corner': 'Take the {sq} corner', 'x.corner': 'A disc on a corner can never be flipped, and stable discs grow from it along the edges. When you can take a corner, consider it first (there are exceptions, so check the reply too).',
  'c.pass': 'Force a pass', 'b.pass': 'Force a pass', 't.pass': 'Play {sq} and make the opponent pass', 'x.pass': 'After this move your opponent has no legal move and must pass, so you play again — usually a very strong move.',
  'c.xc': 'X/C square', 'b.xc': 'Play next to a corner', 't.xc': 'Play {sq} ({k} square)', 'x.xc': 'A move next to a corner (C) or diagonal to it (X). Usually it hands the corner to the opponent, but when you gain something in return it can be right. Read whether the opponent can take the corner and what happens then.',
  'c.wedge': 'Wedge', 'b.wedge': 'Wedge into the edge', 't.wedge': 'Wedge in at {sq} on the {e}', 'x.wedge': 'Play the empty edge square between two enemy discs (a wedge). It splits the opponent\'s edge and breaks a wing or a "mountain" — a strong technique.',
  'c.parity': 'Parity', 'b.parity': 'Enter an odd region', 't.parity': 'Play {sq} in the {n}-square region', 'x.parity': 'In the endgame the empty squares split into regions. Moving first into a region with an odd number of empties helps you get the last move there (parity).',
  'c.edge': 'Edge', 'b.edge': 'Play on the edge', 't.edge': 'Play {sq} on the {e}', 'x.edge': 'A move on the edge. Edge discs are hard to flip, but playing to the edges too early can give the opponent targets. Check that the edge shape (mountain, wing…) gets better.',
  'c.quiet': 'Quiet move', 'b.quiet': 'Play quietly', 't.quiet': 'Play {sq} quietly (openness {o})', 'x.quiet': 'A move whose flipped discs touch few empty squares (low openness). Quiet moves that flip only inner discs give the opponent few new places to play and are often the best.',
  'c.mob': 'Mobility', 'b.mob': 'Limit the opponent', 't.mob': 'Play {sq}, leaving the opponent {n} moves', 'x.mob': 'A move after which the opponent has few legal moves (mobility). Without good moves they are forced onto X and C squares.',
  'c.loud': 'Flip many', 'b.loud': 'Flip many', 't.loud': 'Play {sq} and flip {n} discs', 'x.loud': 'A move that flips many discs. You get more discs, but more frontier discs also give the opponent more moves. Before the endgame, the number of moves matters more than the number of discs.',
  'tp.corner': 'You can take the {sq} corner. Corner discs are never flipped — still, check what the opponent can do afterwards.',
  'tp.oppCorner': 'Your opponent can take the {sq} corner next. Think about what you can do first, or which move costs least if they take it.',
  'tp.passMove': 'Playing {sq} makes your opponent pass. Moving twice in a row is a big gain.',
  'tp.noSafe': 'Almost no safe moves are left (every move gives up a corner). If you must play an X or C square, pick the one where losing the corner costs least.',
  'tp.xc': 'While the corner is empty, X squares (diagonal to a corner) and C squares (next to it) easily hand the corner to the opponent.',
  'tp.wall': 'You have {a} frontier discs (touching empty squares) against {b} — a wall is forming. A wall takes away your own moves; break it with moves that flip inner discs.',
  'tp.oppWall': 'Your opponent has many frontier discs ({b}) — they are building a wall. Wait with quiet moves and they will run out of moves first.',
  'tp.mobLow': 'You have {a} moves, your opponent {b}. With few moves you get forced onto bad squares. Look for moves that reduce the opponent\'s moves.',
  'tp.mobHigh': 'You have {a} moves, your opponent {b}: you are ahead in choices.',
  'tp.quiet': 'The quietest move is {sq} (openness {o}). Openness is the number of empty squares touching the discs you flip; the smaller, the fewer moves you give the opponent.',
  'tp.reserve': '{list}: only you can play there (reserve moves). Don\'t hurry — keep them for when you have nothing else.',
  'tp.parity': 'Empty regions: {list}. Enter odd regions first and let the opponent enter even ones first, so you get the last move (parity).',
  'tp.stable': 'Stable discs (can no longer be flipped): you {a}, opponent {b}. In the endgame, more stable discs is better.',
  'tp.winning': 'You are ahead. No need to grab discs: play safe moves that give no corners away.',
  'tp.losing': 'You are behind. Aim to reduce the opponent\'s moves so they are forced onto X and C squares.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (wait quietly, take an edge…), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} discs). Finding it may decide the game.',
  'tp.open1': 'In the opening, play inside and flip few discs. The more you flip, the more moves your opponent gets.',
  'tp.open2': 'Don\'t hurry to the edges in the opening: edge discs become targets, and squares next to a corner can give the corner away.',
  'tp.mid1': 'In the midgame think in moves, not discs: strong players care most about limiting the opponent\'s moves.',
  'tp.mid2': 'A "wall" of your frontier discs costs you moves. Aim to be surrounded by the opponent instead.',
  'tp.end1': 'In the endgame, count the empty regions: entering odd regions first is the basis of parity.',
  'tp.end2': 'The endgame is about exact reading: stable discs and who plays the very last move change the final count a lot.',
  sep: ', ', 'u.sq': '{n} sq.',
  gl: {
    sumi: { m: ['corners', 'corner'], t: 'Corner', d: 'The four corner squares. A disc on a corner can never be flipped.' },
    xsq: { m: ['X squares', 'X square', 'X'], t: 'X square', d: 'The squares diagonal to the corners (b2, g2, b7, g7). Playing there while the corner is empty often gives the corner away.' },
    csq: { m: ['C squares', 'C square', 'C'], t: 'C square', d: 'The edge squares next to a corner (a2, b1, g1, h2, a7, b8, g8, h7). Played carelessly, they can give the corner away.' },
    stable: { m: ['Stable discs', 'stable discs'], t: 'Stable discs', d: 'Discs that can no longer be flipped until the end — such as corners and the discs connected to them.' },
    open: { m: ['openness'], t: 'Openness', d: 'The number of empty squares touching the discs a move flips. The lower it is, the quieter the move.' },
    wall: { m: ['wall'], t: 'Wall', d: 'A line of your frontier discs. It takes away your own moves.' },
    reserve: { m: ['reserve moves'], t: 'Reserve move', d: 'A square only you can play. Keep it for when you have nothing better.' },
    parity: { m: ['parity'], t: 'Parity', d: 'In the endgame, entering regions with an odd number of empty squares first so that you get the last move in each.' },
    mobility: { m: ['mobility'], t: 'Mobility', d: 'The number of legal moves. Running out of moves forces you onto bad squares.' },
    perp: { m: ['perpendicular'], t: 'Perpendicular opening', d: 'White\'s second move f5-d6: the most common reply, leading to the Tiger, Rabbit and Cat.' },
    diag: { m: ['diagonal'], t: 'Diagonal opening', d: 'White\'s second move f5-f6, leading to the Cow, the Bullfight and others.' },
    para: { m: ['parallel'], t: 'Parallel opening', d: 'White\'s second move f5-f4. It is considered inferior for White.' },
    frontier: { m: ['frontier discs', 'frontier'], t: 'Frontier discs', d: 'Discs that touch an empty square. The more you have, the more moves you give the opponent.' },
    wedge: { m: ['wedge'], t: 'Wedge', d: 'An edge move between two enemy discs; it splits the opponent\'s edge.' },
    pass: { m: ['pass'], t: 'Pass', d: 'With no legal move, a player passes the turn. Forcing a pass lets you move again.' },
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
const nm = s => 'abcdefgh'[s & 7] + ((s >> 3) + 1);
const fd = x => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');

// --------------------------------------------------------------------------------------------- position facts
const CORNERS = [0, 7, 56, 63], XSQ = { 9: 0, 14: 7, 49: 56, 54: 63 }, CSQ = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
function play(cells, sq, col) { const f = flipsOf(cells, sq, col), n = cells.slice(); n[sq] = col; for (const q of f) n[q] = col; return { cells: n, flips: f }; }
function emptyNb(cells, q) { const r = q >> 3, c = q & 7, out = []; for (const [dr, dc] of D8) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && !cells[rr * 8 + cc]) out.push(rr * 8 + cc); } return out; }
function frontier(cells, col) { let n = 0; for (let q = 0; q < 64; q++) if (cells[q] === col && emptyNb(cells, q).length) n++; return n; }
// openness (開放度): distinct empty squares touching the flipped discs, after the move
function openness(after, flips) { const s = new Set(); for (const q of flips) for (const e of emptyNb(after, q)) s.add(e); return s.size; }
// stable discs: a disc is stable if on each of the 4 lines through it, the line is full, or one neighbour is off-board or a stable disc of its colour (sound lower bound)
function stable(cells) {
  const st = new Uint8Array(64), AX = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const full = (q, dr, dc) => { for (const s of [1, -1]) { let r = (q >> 3) + dr * s, c = (q & 7) + dc * s; while (inB(r, c)) { if (!cells[r * 8 + c]) return false; r += dr * s; c += dc * s; } } return true; };
  let ch = true;
  while (ch) {
    ch = false;
    for (let q = 0; q < 64; q++) {
      const v = cells[q]; if (!v || st[q]) continue;
      const ok = AX.every(([dr, dc]) => {
        const r = q >> 3, c = q & 7, a = [r + dr, c + dc], b = [r - dr, c - dc];
        const side = ([rr, cc]) => !inB(rr, cc) || (st[rr * 8 + cc] && cells[rr * 8 + cc] === v);
        return side(a) || side(b) || full(q, dr, dc);
      });
      if (ok) { st[q] = 1; ch = true; }
    }
  }
  let b = 0, w = 0; for (let q = 0; q < 64; q++) if (st[q]) { if (cells[q] === 1) b++; else w++; }
  return [0, b, w];
}
function regions(cells) {
  const id = new Array(64).fill(-1), size = [];
  for (let q = 0; q < 64; q++) {
    if (cells[q] || id[q] >= 0) continue;
    const k = size.length, st = [q]; id[q] = k; let n = 0;
    while (st.length) { const x = st.pop(); n++; for (const y of emptyNb(cells, x)) if (id[y] < 0) { id[y] = k; st.push(y); } }
    size.push(n);
  }
  return { id, size };
}
function edgeOf(q) { const r = q >> 3, c = q & 7; return r === 0 ? 'top' : r === 7 ? 'bottom' : c === 0 ? 'left' : c === 7 ? 'right' : null; }
function isWedge(cells, q, me) {
  const r = q >> 3, c = q & 7, op = 3 - me;
  const d = (r === 0 || r === 7) ? [0, 1] : [1, 0];
  const a = [r + d[0], c + d[1]], b = [r - d[0], c - d[1]];
  return inB(...a) && inB(...b) && cells[a[0] * 8 + a[1]] === op && cells[b[0] * 8 + b[1]] === op;
}
function facts(p) {
  const me = p.toMove, op = 3 - me, cells = p.cells;
  const [b, w] = counts(cells), empt = 64 - b - w;
  const f = { me, op, empt, legal: legalMoves(cells, me), oLegal: legalMoves(cells, op) };
  f.discs = [me === 1 ? b : w, me === 1 ? w : b];
  f.stage = empt >= 44 ? 'open' : empt <= 20 ? 'end' : 'mid';
  const sb = stable(cells); f.stab = [sb[me], sb[op]];
  f.front = [frontier(cells, me), frontier(cells, op)];
  f.rg = regions(cells);
  const oSet = new Set(f.oLegal);
  f.reserve = f.legal.filter(q => !oSet.has(q) && !XSQ[q] && !CSQ[q]);
  f.oppCorner = f.oLegal.filter(q => CORNERS.includes(q));
  f.mv = {};
  for (const q of f.legal) {
    const { cells: a, flips } = play(cells, q, me);
    const ol = legalMoves(a, op), ml = legalMoves(a, me);
    const giveC = ol.filter(x => CORNERS.includes(x) && !oSet.has(x));
    f.mv[q] = { flips: flips.length, open: openness(a, flips), oMob: ol.length, pass: !ol.length && ml.length > 0, end: !ol.length && !ml.length, giveC, reg: f.rg.size[f.rg.id[q]] };
  }
  const safe = f.legal.filter(q => !f.mv[q].giveC.length);
  f.noSafe = f.legal.length > 0 && safe.length === 0;
  let qb = -1; for (const q of f.legal) if (qb < 0 || f.mv[q].open < f.mv[qb].open) qb = q;
  f.quietest = qb;
  let mb = -1; for (const q of f.legal) if (mb < 0 || f.mv[q].oMob < f.mv[mb].oMob) mb = q;
  f.minMob = mb >= 0 ? f.mv[mb].oMob : 0;
  return f;
}
// what a move is about
function classify(f, q, cells) {
  const m = f.mv[q] || { flips: 0, open: 0, oMob: 0, giveC: [], reg: 0 };
  const r = { k: 'loud', sq: nm(q), q, o: m.open, n: m.flips, mob: m.oMob, reg: m.reg };
  const corner = XSQ[q] !== undefined ? XSQ[q] : CSQ[q];
  if (CORNERS.includes(q)) r.k = 'corner';
  else if (m.pass) r.k = 'pass';
  else if (corner !== undefined && !cells[corner]) { r.k = 'xc'; r.x = XSQ[q] !== undefined ? 'X' : 'C'; }
  else if (edgeOf(q) && isWedge(cells, q, f.me)) r.k = 'wedge';
  else if (f.stage === 'end' && f.empt <= 16 && m.reg % 2 === 1 && f.rg.size.length >= 2) r.k = 'parity';
  else if (edgeOf(q)) r.k = 'edge';
  else if (m.open <= 2 || q === f.quietest) r.k = 'quiet';
  else if (m.oMob === f.minMob && f.legal.length > 1) r.k = 'mob';
  if (edgeOf(q)) r.e = tx('e.' + edgeOf(q));
  return r;
}
// title while the moves are hidden: the area of the board (quadrant or edge) and the plan, not the square itself
function area(k) { const q = k.q, r = q >> 3, c = q & 7; return k.e ? tx('hidE', { e: k.e, b: tx('b.' + k.k) }) : tx('hid', { a: tx('a.' + (r < 4 ? 't' : 'b') + (c < 4 ? 'l' : 'r')), b: tx('b.' + k.k) }); }
function ttl(k) { return tx('t.' + k.k, { sq: k.sq, o: k.o, n: k.k === 'mob' ? k.mob : k.k === 'parity' ? k.reg : k.n, e: k.e || '', k: k.x || '' }); }
const CCLS = { corner: 'c-mat', pass: 'c-atk', xc: 'c-mate', wedge: 'c-atk', parity: 'c-dev', edge: 'c-dev', quiet: 'c-def', mob: 'c-def', loud: 'c-calm' };
const RCLS = { quiet: 'r-def', mob: 'r-def', xc: 'r-mate' };
function formOf(d) { const a = Math.abs(d); const k = a < 1 ? 'even' : a < 4 ? 'sl' : a < 10 ? 'adv' : a < 20 ? 'big' : 'win'; return d >= 0 || k === 'even' ? k : { sl: 'sld', adv: 'dis', big: 'bad', win: 'lost' }[k]; }
function formTxt(d) { return tx('f.v', { f: tx('f.' + formOf(d)), x: (d > 0 ? '+' : d < 0 ? '−' : '±') + fd(Math.abs(d)) }); }

// --------------------------------------------------------------------------------------------- opening theory
// the game's moves normalised to the f5 frame (first move f5); every symmetry used is its own inverse
const OSYM = { 37: s => s, 44: s => (s & 7) * 8 + (s >> 3), 26: s => 63 - s, 19: s => (7 - (s & 7)) * 8 + (7 - (s >> 3)) };
const SQ = n => (+n[1] - 1) * 8 + 'abcdefgh'.indexOf(n[0]);
function normStr(upto) {
  if (upto < 1) return { s: '', f: null };
  const f = OSYM[positions[1].last]; if (!f) return null;
  let s = ''; for (let i = 1; i <= upto; i++) { if (positions[i].last < 0 || positions[i].mover !== (i % 2 ? 1 : 2)) return null; s += nm(f(positions[i].last)); }
  return { s, f };
}
const OPEN = {
  'f5': [['d6', 'main', 'tate'], ['f6', 'main', 'naname'], ['f4', 'alt', 'narabi']],
  'f5d6': [['c3', 'main', 'tora'], ['c5', 'main', 'usagi'], ['c4', 'alt', 'neko']],
  'f5f6': [['e6', 'main', 'ushi']],
  'f5f4': [['e3', 'main', 'nezumi']],
};
const names = () => (typeof openData !== 'undefined' && openData && openData.names) || [];
const PTn = o => (typeof PT === 'function' ? PT(o) : (o && (o[L()] || o.en)) || '');
function lineAim(m) { try { for (const s of openData.sets || []) for (const l of s.lines || []) if (l.moves === m && l.aim) return PTn(l.aim); } catch (e) {} return ''; }
// the opening crossroads (fixed theory) for the first moves
function openingOf(ply) {
  if (ply === 0) return [{ kind: 'main', key: 'first', mv: [37, 44, 26, 19], label: 'f5' }];
  const n = normStr(ply); if (!n) return null;
  const e = OPEN[n.s]; if (!e) return null;
  return e.map(([u, kind, key]) => { const q = n.f(SQ(u)); return { kind, key, mv: [q], label: nm(q) }; });
}
// named book continuations (openings.json names) from this position
function bookOf(ply) {
  const n = normStr(ply); if (!n || !n.s) return null;
  const nx = {};
  for (const x of names()) {
    if (x.m.length <= n.s.length || !x.m.startsWith(n.s)) continue;
    const u = x.m.slice(n.s.length, n.s.length + 2);
    if (!nx[u] || x.m.length < nx[u].m.length) nx[u] = x;
  }
  const ord = Object.keys(nx).sort((a, b) => names().indexOf(nx[a]) - names().indexOf(nx[b]));   // openings.json lists the main lines first
  const out = ord.map(u => { const q = n.f(SQ(u)); return { q, label: nm(q), name: PTn(nx[u].n), aim: lineAim(nx[u].m) }; });
  return out.length ? out : null;
}
function jsekiChip(ply) {
  const n = normStr(Math.min(ply, positions.length - 1)); if (!n || n.s.length < 4) return null;
  let full = null, ext = false;
  for (const x of names()) { if (n.s.startsWith(x.m) && (!full || x.m.length > full.m.length)) full = x; if (x.m.length > n.s.length && x.m.startsWith(n.s)) ext = true; }
  const type = { d6: 'tate', f6: 'naname', f4: 'narabi' }[n.s.slice(2, 4)];
  if (full) return tx(ext || n.s.length === full.m.length ? 'fixed' : 'offBook', { n: PTn(full.n) });
  return type ? tx(ext ? 'moyo' : 'fixed', { n: tx('ty.' + type) }) : null;
}
function isBookMove(i) {   // positions[i] reached by a move that continues a named opening (or the fixed theory)
  if (i < 1) return false;
  const n = normStr(i); if (!n) return false;
  if (i <= 3) { const e = OPEN[n.s.slice(0, (i - 1) * 2)]; if (i === 1 || (e && e.some(x => x[0] === n.s.slice(-2)))) return true; }
  return names().some(x => x.m.startsWith(n.s));
}

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, reveal: false, key: '', f: null, items: null };
let card = null;
function usable() {
  return !!(positions.length && !lesson && !puzzle && !net && !rtGame() && !rbS && (settings.mode === 'ai' || settings.mode === 'pvp'));
}
function active() { return !!(settings.coach && usable()); }
const overNow = () => { const L0 = positions[positions.length - 1]; return !L0.toMove || !!resignedBy() || !!(clock && clock.lost); };
function myTurn() { return !overNow() && cur === positions.length - 1 && !reviewing && isHumanTurn(); }
function factsNow() {
  const key = cur + '|' + positions[cur].cells.join('') + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = facts(positions[cur]);
  return S.f;
}
function candInfo(p, f) {
  const list = p.ana; if (!list || !list.length) return null;
  const sorted = list.slice().sort((a, b) => b.score - a.score), best = sorted[0].score;
  const items = sorted.slice(0, 5).map(c => ({ q: c.move, score: c.score, drop: Math.max(0, best - c.score), k: classify(f, c.move, p.cells) }));
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: dirs.filter(d => d.drop <= 1.5).length >= 2, sharp: second != null && second >= 6 ? fd(second) : '', only: second != null && second >= 12 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 1.5 ? ['gap.eq', 'g1'] : d <= 5 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, p, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const cs = f.legal.filter(q => CORNERS.includes(q));
  if (cs.length) add('tp.corner', 100, { sq: cs.map(nm).join(tx('sep')) }, 1);
  if (f.oppCorner.length) add('tp.oppCorner', 92, { sq: f.oppCorner.map(nm).join(tx('sep')) }, 1);
  const ps = f.legal.filter(q => f.mv[q].pass);
  if (ps.length) add('tp.passMove', 90, { sq: ps.map(nm).join(tx('sep')) }, 1);
  if (f.noSafe) add('tp.noSafe', 84, null, 1);
  else if (f.legal.some(q => (XSQ[q] !== undefined && !p.cells[XSQ[q]]) || (CSQ[q] !== undefined && !p.cells[CSQ[q]])) && f.stage !== 'end') add('tp.xc', 40);
  if (f.stage === 'end' && f.rg.size.length >= 2 && f.empt <= 16) add('tp.parity', 80, { list: f.rg.size.map(n => tx('u.sq', { n })).join(tx('sep')) });
  if (f.stage !== 'end' && f.front[0] >= 8 && f.front[0] >= f.front[1] * 1.5) add('tp.wall', 70, { a: f.front[0], b: f.front[1] });
  else if (f.stage !== 'end' && f.front[1] >= 8 && f.front[1] >= f.front[0] * 1.5) add('tp.oppWall', 52, { b: f.front[1] });
  if (f.stage !== 'open' && f.legal.length <= 3 && f.oLegal.length > f.legal.length) add('tp.mobLow', 66, { a: f.legal.length, b: f.oLegal.length });
  else if (f.stage === 'mid' && f.legal.length >= f.oLegal.length + 4) add('tp.mobHigh', 34, { a: f.legal.length, b: f.oLegal.length });
  if (f.quietest >= 0 && f.stage !== 'end' && f.legal.length > 1) add('tp.quiet', 50, { sq: nm(f.quietest), o: f.mv[f.quietest].open });
  if (f.reserve.length && f.stage !== 'open') add('tp.reserve', 46, { list: f.reserve.map(nm).join(tx('sep')) });
  if ((f.stab[0] || f.stab[1]) && f.stage !== 'open') add('tp.stable', f.stage === 'end' ? 44 : 30, { a: f.stab[0], b: f.stab[1] });
  if (p.ana && p.ana.length && f.stage !== 'open') { const b = Math.max(...p.ana.map(x => x.score)); if (b >= 12) add('tp.winning', 48); else if (b <= -12) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage === 'open') { add('tp.open1', 22); add('tp.open2', 18); }
  else if (f.stage === 'mid') { add('tp.mid1', 16); add('tp.mid2', 14); }
  else { add('tp.end1', 26); add('tp.end2', 15); }
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  // the player's last move (pvp: the last move), graded by index.html's judgeMove (positions[i].q)
  const n = positions.length - 1; if (n < 1) return '';
  let i = n; while (i > 0 && n - i < 2 && !positions[i].q) i--;
  const P = positions[i]; if (!P || !P.q || i < 1) return '';
  const before = positions[i - 1];
  let q = P.q;
  const book = i <= 24 && isBookMove(i);
  if (book) {
    const nmL = jsekiChip(i);
    if (q === 'dubious' || q === 'bad') q = 'good';
    return CoachKit.verdict(q === 'best' ? 0 : 1, esc(tx('prev', { m: nm(P.last), q: t('q.' + q) })), gl(esc(nmL ? tx('prevBook', { n: nmL }) : tx('prevBook0'))));
  }
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const bk = i - 1 <= 24 && bookOf(i - 1);
    if (bk && bk.length) body += esc(tx('prevOff', { m: bk[0].label, n: bk[0].name })) + ' ';
    const ff = facts(before);
    if (before.ana && before.ana.length) {
      const top = before.ana.slice().sort((a, b) => b.score - a.score)[0], k = classify(ff, top.move, before.cells);
      if (top.move !== P.last) body += esc(tx(q === 'best' || q === 'good' ? 'prevAltOk' : 'prevAlt', { m: nm(top.move), c: tx('c.' + k.k) }));
      else body += esc(tx('prevBest', { c: tx('c.' + k.k) }));
    }
    if (q === 'dubious' || q === 'bad') {
      const m = ff.mv[P.last];
      if (m && m.giveC.length) body += '<br>💡 ' + esc(tx('pv.corner', { c: m.giveC.map(nm).join(tx('sep')) }));
      else if (m && ff.stage !== 'end' && m.open >= ff.mv[ff.quietest].open + 4) body += '<br>💡 ' + esc(tx('pv.loud', { o: m.open }));
      else if (m && ff.stage !== 'end' && m.oMob >= ff.minMob + 3) body += '<br>💡 ' + esc(tx('pv.mob', { n: m.oMob }));
    }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: nm(P.last), q: t('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (ReversiCoach.sw) ReversiCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach tab
  // shows the review card instead; before the review exists, a short note with a button that starts it (shared/COACH.md §5)
  const rv = !!document.querySelector('#reviewCard.show');
  const over = overNow(), playing = !over && cur === positions.length - 1 && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv && positions.length > 1));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on);
  document.body.classList.toggle('ck-tab', can || (rv && usable()));
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { marks(null); return; }
  if (over) {
    marks(null);
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { marks(null); return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!over ? `<small>${esc(tx('st.' + factsNow().stage))}</small>` : ''}</h3>`;
  S.items = null;
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const p = positions[cur], f = factsNow(), cl = candInfo(p, f);
  // summary chips
  const chips = [];
  const best = p.ana && p.ana.length ? Math.max(...p.ana.map(x => x.score)) : null;
  if (best != null && settings.eval && f.stage !== 'open') chips.push({ k: tx('form'), v: esc(formTxt(best)), cls: best >= 1 ? 'pos' : best <= -1 ? 'neg' : '' });
  chips.push({ k: tx('discs'), v: esc(tx('vs', { a: f.discs[0], b: f.discs[1] })) });
  const js = jsekiChip(cur); if (js) chips.push({ k: tx('joseki'), v: esc(js) });
  chips.push({ k: tx('mob'), v: esc(tx('vs', { a: f.legal.length, b: f.oLegal.length })), cls: f.legal.length > f.oLegal.length ? 'pos' : f.legal.length < f.oLegal.length ? 'neg' : '' });
  if (f.stage !== 'end') chips.push({ k: tx('front'), v: esc(tx('vs', { a: f.front[0], b: f.front[1] })), cls: f.front[0] < f.front[1] ? 'pos' : f.front[0] > f.front[1] ? 'neg' : '' });
  if (f.stab[0] || f.stab[1]) chips.push({ k: tx('stab'), v: esc(tx('vs', { a: f.stab[0], b: f.stab[1] })), cls: f.stab[0] > f.stab[1] ? 'pos' : f.stab[0] < f.stab[1] ? 'neg' : '' });
  h += CoachKit.summary(chips);
  const op = cur <= 3 && openingOf(cur);
  const bk = !op && cur <= 24 && bookOf(cur);
  if (op) {
    S.items = op.map(d => ({ mv: d.mv, label: d.key === 'first' ? '' : d.label }));
    h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t', { sq: d.label })), text: gl(esc(tx('op.' + d.key + '.x'))), gap: d.key === 'first' ? tx('op.same') : '', gcls: 'g0', move: d.mv.join(','), mvName: d.key === 'first' ? 'd3 · c4 · f5 · e6' : d.label })) });
  } else if (bk) {
    const items = bk.slice(0, 4);
    S.items = items.map(d => ({ mv: [d.q], label: d.label }));
    h += CoachKit.rec(tx('bkBadge'), gl(esc(tx('bkWhy', { m: items[0].label, n: items[0].name }))), '');
    h += CoachKit.branches({ head: tx('bkH'), intro: gl(esc(tx('bkIntro'))), reveal: true,
      items: items.map(d => { const k = classify(f, d.q, p.cells); return { tag: tx('c.' + k.k), cls: CCLS[k.k] || '', title: esc(tx('bkTo', { sq: d.label, n: d.name })), text: gl(esc(d.aim || tx('x.' + k.k))), gap: '', move: String(d.q), mvName: d.label }; }) });
  } else if (cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(b.score)), x: (b.score > 0 ? '+' : '') + fd(b.score) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    S.items = S.reveal ? cl.dirs.map((d, i) => ({ mv: [d.q], label: String(i + 1) })) : null;
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(S.reveal ? ttl(d.k) : area(d.k)), text: gl(esc(tx('x.' + d.k.k))), gap: tx(g[0]) + (d.drop >= 0.5 ? ' ' + tx('gap.d', { x: fd(d.drop) }) : ''), gcls: g[1], move: String(d.q), mvName: nm(d.q) }; }) });
  } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, p, op || bk ? null : cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  marks(null);
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} render(); },
    onHover: u => marks(u),
  });
}
// candidate squares on the board (hover / tap on a revealed candidate)
function marks(u) {
  document.querySelectorAll('.ck-mk').forEach(e => e.remove());
  if (!u || !myTurn()) return;
  const qs = String(u).split(',').map(Number), it = S.items && S.items.find(x => x.mv.join(',') === String(u));
  for (const q of qs) { const c = cellEls[q]; if (!c) continue; const d = document.createElement('div'); d.className = 'ck-mk'; if (it && it.label && qs.length === 1 && /^\d$/.test(it.label)) d.textContent = it.label; c.appendChild(d); }
}
const CSS = `.ck-sec-h button{white-space:nowrap;flex:none}#coachCard .ck-rvgo{font:inherit;font-size:14px;font-weight:700;padding:9px 18px;border-radius:10px;border:0;background:linear-gradient(180deg,#d8bb72,#a98a48);color:#1b150a;cursor:pointer;white-space:nowrap}.ck-mk{position:absolute;inset:7%;border-radius:50%;z-index:6;pointer-events:none;border:3px solid #3df59a;box-shadow:0 0 0 2px rgba(8,18,12,.9),inset 0 0 0 2px rgba(8,18,12,.9),0 0 12px rgba(61,245,154,.55);display:flex;align-items:center;justify-content:center;font:800 calc(var(--cell,40px)*.3) 'JetBrains Mono',monospace;color:#3df59a;text-shadow:0 0 1px #08120c,0 0 3px rgba(0,0,0,.95),0 1px 3px #000}`;
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  try { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); } catch (e) {}
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  ReversiCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  render();
  if (v && myTurn() && !positions[cur].ana) schedule(null);
}
function relabel() { if (ReversiCoach.sw) ReversiCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.ReversiCoach = { init, render, relabel, merge, tx, TX, active, isBookMove };
})();
