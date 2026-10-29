'use strict';
// 将棋コーチ (common spec: the poker-style coach, shared/coachkit.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・駒割り・局面), the recommended plan with its reason,
// the candidate directions of the position (分かれ道: each candidate's plan explained, moves revealed on demand with arrows on
// the board), prioritized "how to think" tips read from the position (王手・詰めろ・取られそうな駒・居玉・囲い・持ち駒 …),
// and the verdict on the previous move (◎○△✕ with the reason and the AI's first choice). Glossary terms are dotted.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (ShogiCoachI18n merges into TX).
// index.html: ShogiCoach.render() after every refresh; ShogiCoach.cands(idx, list) when the candidate analysis arrives.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  idle: '対局が始まると、ここに局面の考え方を表示します。', oppTurn: '相手の手番です。相手が次に何をしてくるか、予想してみよう。予想が当たるほど読みの力がつきます。', overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', over: '対局が終わりました。棋譜の［解析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒割り', stage: '局面', you: 'あなた',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.even': '互角', 'mat.up': '{x}点得', 'mat.down': '{x}点損',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'tt.move': '{sq}の{p}を動かす', 'tt.move0': '{p}を動かす', 'tt.pawn': '{f}筋の歩を突く', 'tt.clash': '{f}筋の歩をぶつける', 'tt.drop': '{p}を打つ', 'tt.cap': '{p}で{c}を取る', 'tt.promo': '{sq}の{p}を成る', 'tt.promo0': '{p}を成る',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  opH: '序盤の分かれ道 — 作戦の選び方', opIntro: '序盤の数手で戦型（作戦）が決まります。まずは定番の2つを覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.kaku.t': '角道を開ける', 'op.kaku.x': '角の通り道を開ける、もっとも多く指される手。このあと居飛車にも振り飛車にもできる柔軟さが魅力です。相手も角道を開ければ、角換わり・横歩取りなどの激しい戦いにもつながります。',
  'op.hisha.t': '飛車先の歩を突く', 'op.hisha.x': '飛車の前の歩を突いて、居飛車（飛車を元の筋で使う）をはっきりさせる手。次に飛車先の歩を交換するのがねらいで、相掛かり・矢倉・角換わりなどへ進みます。',
  'op.hashi.t': '端歩で様子を見る', 'op.hashi.x': '端の歩を突いて相手の出方を見る変わり種。作戦を決めるのを一手遅らせられます。端歩は終盤の玉の逃げ道や端攻めに関わり、藤井システムのように早い端歩を作戦に組み込む指し方もあります。',
  'op.naka.t': '中央の歩を突く', 'op.naka.x': '中央の歩を突く手。中飛車（飛車を5筋に振る）をめざすときによく指されます。',
  'op.gk.t': '角道を開け返す', 'op.gk.x': '後手も角道を開けるもっとも普通の応手。角交換の可能性が生まれ、角換わり・横歩取り・振り飛車など多くの戦型に分かれます。',
  'op.gh.t': '飛車先を伸ばす', 'op.gh.x': '飛車先を伸ばして居飛車をはっきりさせる手。角道を開けないぶん、矢倉などの落ち着いた戦いになりやすい手です。',
  'op.gn.t': '中央の歩を突く', 'op.gn.x': '中央の歩を突いて、中飛車をめざす手。',
  'op.aig.t': '飛車先を伸ばし合う', 'op.aig.x': 'お互いに飛車先を伸ばす相居飛車。相掛かり（お互いに飛車先の歩を交換し合う戦い）になりやすい手です。',
  'op.gk2.t': '角道を開ける', 'op.gk2.x': '角道を開けて柔軟に構える手。居飛車にも振り飛車にもできます。',
  'op.i2.t': '居飛車にする', 'op.i2.x': '飛車先の歩を突いて居飛車に。相手も居飛車なら角換わり・横歩取り、振り飛車なら対抗形になります。',
  'op.tome.t': '角道を止める', 'op.tome.x': '角道を止めて角交換を避ける手。四間飛車などの振り飛車や、矢倉に組むときに使います。',
  'op.kk.t': '角を交換する', 'op.kk.x': '早めに角を交換する手。お互いの持ち駒に角が入るので、角を打たれる隙に注意が必要な激しい展開になります。',
  'op.ishi.t': '石田流をめざす', 'op.ishi.x': '7筋の歩をさらに伸ばして、石田流（三間飛車の攻撃型）をめざす積極的な手。',
  'op.yag.t': '銀を上がる（矢倉）', 'op.yag.x': '銀を上がって玉の守りと攻めの両方に備える手。矢倉に組む定番の進め方です。',
  'op.kw.t': '飛車先を突く', 'op.kw.x': '飛車先を伸ばして攻めの形を作る手。角換わりや相掛かりへ進みます。',
  'op.aig2.t': '飛車先をさらに伸ばす', 'op.aig2.x': '飛車先の歩をさらに伸ばして、相掛かりへ。早く飛車先の歩を交換して主導権を取りにいきます。',
  'op.kk2.t': '角道を開ける', 'op.kk2.x': '角道を開けて、角換わりや横歩取りの可能性も残す手。',
  bkH: '定跡の候補 — 実戦でよく指される手', bkIntro: '強いソフト同士の対局（Floodgate）で、この局面で実際に指された手の割合です。序盤は評価値の小さな差より、定跡どおりに駒組みを進めることが大切です。', 'bk.share': '採用率 {x}', bkWhy: 'この局面は定跡の範囲です。実戦でいちばん多いのは {m}（{c}・採用率{x}）。', prevBook: '定跡どおりの手です（実戦での採用率{x}）。', prevOff: 'この局面の定跡は {m}（採用率{x}）などです。',
  who: '{k}（{w}）', senkei: '戦型', castleH: '囲い', meC: 'あなた', opC: '相手', 'cs.done': '{n}（完成）', 'cs.part': '{n}に組みかけ', 'cs.none': 'まだ囲っていない', moyo: '{n}模様', fixed: '{n}',
  'ck.mino': '美濃囲い', 'ck.takamino': '高美濃', 'ck.ginkan': '銀冠', 'ck.ana': '穴熊', 'ck.funa': '舟囲い', 'ck.yagura': '矢倉囲い', 'ck.gangi': '雁木', 'ck.naka': '中住まい', 'ck.kanimino': '片美濃',
  'tp.castleDone': 'あなたの{c}が完成しました。守りが整ったら、次は攻めの準備（飛車・角・銀・桂の活用）に移ろう。',
  'tp.castlePart': 'あなたは{c}に組んでいる途中です。戦いが始まる前に囲いを完成させると安心です。',
  'tp.oppCastle': '相手は{c}です。囲いにはそれぞれ弱点があります（例：美濃は端と頭、穴熊は端や上からの攻め、矢倉は上からの攻め）。',
  'sk.yagura': '矢倉模様：角道を止めてじっくり組み合う戦い。矢倉囲いを完成させ、棒銀・早繰り銀・雀刺しなどで攻めるのが定跡です。',
  'sk.aigakari': '相掛かり：お互いに飛車先の歩を伸ばし合う戦い。序盤から飛車が活躍しやすく、駒組みが短いのが特徴です。',
  'sk.kakugawari': '角換わり：角を交換した戦い。お互いに角を打ち込まれる隙を作らないよう、腰掛け銀・早繰り銀・棒銀などで組みます。',
  'sk.yokofu': '横歩取り：飛車で横歩を取った激しい戦い。序盤から一手のミスが命取りになりやすいので、定跡手順を大切に。',
  'sk.furi': '対抗形（居飛車対振り飛車）：振り飛車側は美濃囲い、居飛車側は舟囲い・穴熊・左美濃などに囲うのが一般的です。',
  'sk.aifuri': '相振り飛車：お互いに飛車を振った戦い。囲いは矢倉・美濃・金無双など。相手の玉に向けて攻めの筋を作ります。',
  'sk.ibisha': '相居飛車：お互いに飛車を元の筋で使う戦い。このあと矢倉・角換わり・相掛かりなどに分かれていきます。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  // categories: tag / badge / explanation ({p} the piece, {c} the captured piece)
  'c.mate': '詰み', 'b.mate': '詰ます', 'x.mate': '相手玉を詰ませる手があります。王手を続けて玉の逃げ道を全部ふさぐのが詰みの基本です。',
  'c.cap': '駒得', 'b.cap': '駒を取る', 'x.cap': '{c}を取って駒得をめざす方針。取った駒は持ち駒になり、次から自分の戦力として打てます。取ったあとに取り返されないか、相手の反撃も確かめよう。',
  'c.check': '王手', 'b.check': '王手で迫る', 'x.check': '{p}で王手をかけて相手玉に迫る方針。相手の応手が限られるので主導権を握れます。ただ王手は玉を逃がすこともあるので、逃げ道をふさぐ王手を選ぼう。',
  'c.escape': '早逃げ', 'b.escape': '玉を逃がす', 'x.escape': '玉を安全な場所へ移す方針（早逃げ）。危険が迫る前に一手早く逃げておくと、相手の攻めが空振りになります。',
  'c.kcastle': '囲い', 'b.kcastle': '玉を囲う', 'x.kcastle': '玉を囲いへ動かす方針。戦いが始まる前に玉を戦場から遠ざけ、金銀で囲っておくと、多少攻められても安心です。',
  'c.block': '王手の受け', 'b.block': '王手を受ける', 'x.block': '王手への対応です。①玉が逃げる ②間に駒を打つ（合駒）③王手している駒を取る、の3通りから、一番損の少ない受けを選びます。',
  'c.save': 'かわす', 'b.save': '駒をかわす', 'x.save': '狙われている{p}を安全な場所へかわす方針。タダで取られるのを防ぎつつ、移動先でも働く場所を選べると理想的です。',
  'c.promo': '成り', 'b.promo': '成る', 'x.promo': '{p}を成って強化する方針。成ると動きが大きく広がります（歩が成った「と金」は金と同じ動き）。',
  'c.adrop': '打ち込み', 'b.adrop': '打ち込む', 'x.adrop': '持ち駒の{p}を相手玉の近くに打ち込む方針。持ち駒をどこにでも打てるのが将棋の大きな特徴で、攻めの決め手になります。',
  'c.ddrop': '受けの駒打ち', 'b.ddrop': '打って受ける', 'x.ddrop': '持ち駒の{p}を自陣に打って受ける方針。守りは堅くなりますが、攻めに使える駒が減る点も考えよう。',
  'c.drop': '駒打ち', 'b.drop': '駒を打つ', 'x.drop': '持ち駒の{p}を打つ方針。相手の駒に当てる・弱点をねらう・自分の駒の利きを足すなど、打つ場所で意味が大きく変わります。',
  'c.castle': '囲いを固める', 'b.castle': '固める', 'x.castle': '{p}を玉に寄せて囲いを固める方針。「攻めは飛角銀桂、守りは金銀三枚」が基本です。',
  'c.defend': '受け', 'b.defend': '受ける', 'x.defend': '{p}で相手の攻めに備える受けの方針。安全度は上がりますが、そのぶん相手に攻める時間を与えることも考えよう。',
  'c.clash': '仕掛け', 'b.clash': '仕掛ける', 'x.clash': '歩をぶつけて戦いを起こす方針。歩は取られても損が小さいので、開戦のきっかけに最適です。ぶつけた後の駒の取り合いを読んでおこう。',
  'c.pawn': '歩を突く', 'b.pawn': '歩を突く', 'x.pawn': '歩を突いて位（くらい）を取る・駒の通り道を作る方針。歩は後ろに戻れないので、突く場所はよく考えて。',
  'c.attack': '攻め', 'b.attack': '攻める', 'x.attack': '{p}を前に出して攻める方針。主導権を握れる一方、攻めが止まると反撃を受けます。攻めが続くかどうかを読もう。',
  'c.swing': '飛車を振る', 'b.swing': '飛車を振る', 'x.swing': '飛車を横に動かして攻める筋を変える方針。飛車の位置（居飛車・振り飛車）で戦い方が大きく変わります。',
  'c.develop': '駒組み', 'b.develop': '駒組み', 'x.develop': '{p}を前に出して陣形を整える方針。序盤は全部の駒が働く形を作るのが目標です。',
  'c.wait': '整える', 'b.wait': '整える', 'x.wait': '陣形を整えて相手の出方を見る方針。急がない局面では、一手の価値が高い場所に駒を動かそう。',
  // tips
  'tp.inCheck': '王手されています。①玉が逃げる ②合駒（間に駒を打つ）③王手している駒を取る、の3通りを全部くらべよう。',
  'tp.mate1': '一手で詰む手があります！ 王手になる手を一つずつ確かめてみよう。',
  'tp.threat': '相手は次に一手で詰ます狙い（詰めろ）を持っています。受けるか、それより早く相手玉を詰ませるかの二択です。',
  'tp.hangBig': 'あなたの{p}（{sq}）が取られそうです。飛車・角は大駒、取られると大きな損です。逃げるか、守りの駒を足そう。',
  'tp.hang': '{sq}の{p}がタダで取られそうです（守りが足りません）。逃げる・守る・それ以上に価値のある手を指す、のどれかを選ぼう。',
  'tp.canWin': '相手の{p}（{sq}）が得に取れそうです。取ったあと取り返されないか、相手の反撃とくらべて判断しよう。',
  'tp.kDanger': 'あなたの玉の周りが危なくなっています（相手の利きや駒が集まっています）。受けの手か、早逃げを考えよう。',
  'tp.atkChance': '相手玉の守りが薄くなっています。攻め駒を足して、寄せをねらうチャンスです。',
  'tp.igyoku': '玉がまだ最初の位置にいます（居玉）。戦いが始まる前に玉を囲いに入れると、逆転されにくくなります。',
  'tp.kingRook': '玉と飛車が近すぎます。「玉飛接近すべからず」――飛車の周りは戦場になりやすいので、玉は飛車から離して囲おう。',
  'tp.thin': '玉の近くの金銀が{n}枚だけです。守りの基本は「金銀三枚」。攻めを急ぐ前に囲いを確かめよう。',
  'tp.hand': '持ち駒：{list}。持ち駒は盤のどこにでも打てます（歩は二歩に注意）。相手の弱点や玉の近くなど、打つ場所を探そう。',
  'tp.pawnTesuji': '持ち歩があるときは歩の手筋が使えます：叩きの歩・垂れ歩・合わせの歩・継ぎ歩など。',
  'tp.promo': '成れる手があります。成ると動きが強くなるので、成らない理由がなければ成りを考えよう。',
  'tp.winning': '優勢です。無理に攻めず、相手の反撃の芽をつむ安全な手で勝ちに近づこう。',
  'tp.losing': '劣勢です。普通の手では差が縮まりません。相手が間違えやすい複雑な手（勝負手）を選ぼう。',
  'tp.matUp': '駒割りはあなたが約{x}点得です（歩＝1点）。駒得はそのまま戦力の差になります。',
  'tp.matDown': '駒割りはあなたが約{x}点損です（歩＝1点）。駒損を取り返すか、駒より速度で勝負できる場面か考えよう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤の二大方針は「角道を開ける」と「飛車先の歩を伸ばす」。まずはこのどちらかから始めよう。',
  'tp.open2': '序盤は駒組みの時間。攻めの形（飛車・銀・桂）と守りの形（玉・金銀）を並行して整えよう。',
  'tp.mid1': '中盤は駒の損得が大事。得した駒は終盤で持ち駒として生きてきます。',
  'tp.mid2': '働いていない駒（遊び駒）はありませんか？ 全部の駒を戦いに参加させよう。',
  'tp.end1': '終盤は駒の損得より速度。どちらが先に相手玉に迫れるかで勝負が決まります。',
  'tp.end2': '「玉は下段に落とせ」「金はとどめに残せ」――寄せの格言を思い出そう。',
  'tp.end3': '王手ばかりかけると玉を逃がします。逃げ道をふさぐ手（しばる手）が寄せの基本。',
  'tp.var': 'この種目でも基本は同じ：取られる駒がないか、取れる駒がないか、王手はないかを毎手確かめよう。',
  'tp.hasami': 'はさみ将棋は、縦か横で相手の駒をはさむと取れます。動かす前に、自分の駒がはさまれないか確かめよう。',
  pieces: ['', '歩', '香', '桂', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '龍'],
  sep: '・',
  gl: {
    igyoku: { m: ['居玉'], t: '居玉（いぎょく）', d: '玉が最初の位置（5九・5一）から動いていない状態。戦いが始まると攻められやすいので、序盤のうちに囲いへ移すのが基本です。' },
    kakoi: { m: ['囲い'], t: '囲い（かこい）', d: '玉を金・銀などで守る形。美濃囲い・矢倉・穴熊などが有名です。' },
    tsumero: { m: ['詰めろ'], t: '詰めろ', d: '次に何もしなければ詰まされてしまう状態。受けるか、先に相手玉を詰ませる必要があります。' },
    tsumi: { m: ['詰み', '詰ませる', '詰ます'], t: '詰み', d: '玉がどこに逃げても取られる状態。相手玉を詰ませれば勝ちです。' },
    aigoma: { m: ['合駒'], t: '合駒（あいごま）', d: '飛車・角・香などの王手に対して、間に駒を打ったり動かしたりしてさえぎる受け方。' },
    hayanige: { m: ['早逃げ'], t: '早逃げ', d: '攻められる前に、一手早く玉を安全な場所へ移しておくこと。「玉の早逃げ八手の得」という格言があります。' },
    komadoku: { m: ['駒得', '駒損'], t: '駒得・駒損', d: '駒の取り合いで、価値の高い駒を多く手に入れること（逆が駒損）。おおよその価値は 歩1・香3・桂4・銀5・金6・角8・飛10。' },
    komawari: { m: ['駒割り'], t: '駒割り', d: '盤上と持ち駒を合わせた、双方の駒の損得のこと。' },
    mochigoma: { m: ['持ち駒'], t: '持ち駒', d: '取った相手の駒。自分の番に、盤上の空いている升へ好きに打てます（二歩・行き所のない駒・打ち歩詰めは禁止）。' },
    oogoma: { m: ['大駒'], t: '大駒', d: '飛車と角のこと。動ける範囲が広く、最も価値の高い駒です。' },
    nari: { m: ['成って', '成り', '成る'], t: '成り', d: '相手陣（奥の3段）に入る・出る・中で動くときに、駒を裏返して強くすること。金・玉は成れません。' },
    uchikomi: { m: ['打ち込む', '打ち込み'], t: '打ち込み', d: '持ち駒を相手陣や相手玉の近くに打って攻めること。' },
    nifu: { m: ['二歩'], t: '二歩（にふ）', d: '自分の歩がある筋（縦の列）に、もう一枚歩を打つ反則。打った時点で負けになります。' },
    tesuji: { m: ['手筋'], t: '手筋', d: '局面でよく現れる、効果的な駒の使い方のパターン。' },
    tataki: { m: ['叩きの歩'], t: '叩きの歩', d: '相手の駒の頭に歩を打って、取らせて形を崩したり、取らなければ成ったりをねらう手筋。' },
    tare: { m: ['垂れ歩'], t: '垂れ歩', d: '相手陣の一つ手前に歩を打ち、次に成って「と金」を作るねらいの手筋。' },
    awase: { m: ['合わせの歩'], t: '合わせの歩', d: '相手の歩の正面に歩を打って、取らせて相手の駒の位置をずらす手筋。' },
    tsugi: { m: ['継ぎ歩'], t: '継ぎ歩', d: '歩を突き捨てたあと、さらに歩を打って続けて攻める手筋。' },
    kurai: { m: ['位'], t: '位（くらい）', d: '歩を5段目（相手側から見て5段目）まで伸ばして、その周りを支配すること。' },
    yose: { m: ['寄せ'], t: '寄せ', d: '終盤で相手玉を詰みへと追い込んでいくこと。' },
    sokudo: { m: ['速度'], t: '速度', d: '相手玉を詰ませるまでの手数の差。終盤では駒の損得よりこちらが大事になります。' },
    shoubu: { m: ['勝負手'], t: '勝負手', d: '形勢が悪いときに、相手のミスを誘う難しい手。' },
    asobi: { m: ['遊び駒'], t: '遊び駒', d: '戦いに参加していない、働いていない駒。' },
    shudou: { m: ['主導権'], t: '主導権', d: '自分の都合で戦いを進められる状態。相手は受けに回ることになります。' },
    furibisha: { m: ['振り飛車', '居飛車'], t: '居飛車・振り飛車', d: '飛車を最初の位置（右側）で使う戦い方が居飛車、左側へ動かして使うのが振り飛車です。' },
    kinggin: { m: ['金銀三枚'], t: '金銀三枚', d: '玉の守りは金・銀を3枚使うと堅い、という基本の考え方。' },
    gyokuhi: { m: ['玉飛接近すべからず'], t: '玉飛接近すべからず', d: '玉と飛車を近くに置くと、飛車をねらった攻めが同時に玉への攻めになるので避けよ、という格言。' },
    shibaru: { m: ['しばる手'], t: 'しばる手', d: '王手ではないが、玉の逃げ道を先にふさいでおく手。寄せの基本です。' },
    tegawari: { m: ['手番'], t: '手番', d: '指す番のこと。終盤では手番を持っている側が有利なことが多いです。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  idle: 'Once a game starts, the coach explains how to think about the position here.', oppTurn: "It's your opponent's turn. Try to guess what they will play next — the more often you guess right, the stronger your reading gets.", overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Material', stage: 'Phase', you: 'you',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'mat.even': 'even', 'mat.up': '+{x} pts', 'mat.down': '−{x} pts',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: "None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.",
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'tt.move': 'Move the {p} on {sq}', 'tt.move0': 'Move the {p}', 'tt.pawn': 'Push the {f}-file pawn', 'tt.clash': 'Push the {f}-file pawn into the enemy pawn', 'tt.drop': 'Drop a {p}', 'tt.cap': 'The {p} takes the {c}', 'tt.promo': 'Promote the {p} on {sq}', 'tt.promo0': 'Promote the {p}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening crossroads — choosing a plan', opIntro: 'The first few moves decide the type of game. Learn the two standard choices first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.kaku.t': "Open the bishop's diagonal", 'op.kaku.x': "The most popular move: it opens the bishop's path and keeps both Static Rook and Ranging Rook open. If the opponent opens theirs too, sharp games like Bishop Exchange or Side Pawn Capture can follow.",
  'op.hisha.t': "Push the rook's pawn", 'op.hisha.x': "Pushes the pawn in front of the rook and commits to Static Rook (the rook stays on its file). The aim is to exchange that pawn soon; it leads to Double Wing, Yagura or Bishop Exchange.",
  'op.hashi.t': 'Wait with an edge pawn', 'op.hashi.x': "An unusual waiting move on the edge: you see the opponent's plan before choosing yours. Edge pawns matter later for the king's escape and edge attacks, and some plans (like the Fujii System) build an early edge pawn into the strategy.",
  'op.naka.t': 'Push the central pawn', 'op.naka.x': 'Pushes the central pawn, often heading for Central Rook (the rook goes to the 5th file).',
  'op.gk.t': "Open the bishop's diagonal too", 'op.gk.x': "The most normal reply: White opens the bishop's path as well. A bishop exchange becomes possible, and the game can branch into Bishop Exchange, Side Pawn Capture, Ranging Rook and more.",
  'op.gh.t': "Push the rook's pawn", 'op.gh.x': "Commits to Static Rook. With the bishop's path still closed, the game tends to be calmer, like Yagura.",
  'op.gn.t': 'Push the central pawn', 'op.gn.x': 'Pushes the central pawn, heading for Central Rook.',
  'op.aig.t': "Both push the rook's pawns", 'op.aig.x': "Both sides play Static Rook; this often becomes Double Wing, where both exchange their rook pawns.",
  'op.gk2.t': "Open the bishop's diagonal", 'op.gk2.x': 'A flexible reply: Static Rook and Ranging Rook are both still possible.',
  'op.i2.t': 'Go Static Rook', 'op.i2.x': "Push the rook's pawn for Static Rook. Against Static Rook this leads to Bishop Exchange or Side Pawn Capture; against Ranging Rook to an opposite-wing game.",
  'op.tome.t': "Close the bishop's diagonal", 'op.tome.x': 'Closes the diagonal to avoid a bishop exchange; used for Ranging Rook (such as Fourth File Rook) or for Yagura.',
  'op.kk.t': 'Exchange bishops', 'op.kk.x': 'An early bishop exchange. Both sides then hold a bishop in hand, so watch out for bishop drops — the game gets sharp.',
  'op.ishi.t': 'Aim for Ishida', 'op.ishi.x': 'Pushes the 7th-file pawn further, aiming for the Ishida formation (an attacking Third File Rook).',
  'op.yag.t': 'Bring up the silver (Yagura)', 'op.yag.x': 'The silver comes up to help both defence and attack — the standard way to build Yagura.',
  'op.kw.t': "Push the rook's pawn", 'op.kw.x': 'Builds the attack with the rook pawn, heading for Bishop Exchange or Double Wing.',
  'op.aig2.t': "Push the rook's pawn further", 'op.aig2.x': 'Pushes on toward Double Wing, planning an early rook-pawn exchange to take the initiative.',
  'op.kk2.t': "Open the bishop's diagonal", 'op.kk2.x': 'Opens the diagonal, keeping Bishop Exchange and Side Pawn Capture possible.',
  bkH: 'Book moves — what strong players choose here', bkIntro: 'How often each move was played in this position in games between strong engines (Floodgate). In the opening, following the standard lines matters more than small evaluation differences.', 'bk.share': 'played {x}', bkWhy: 'This position is still in the opening book. The most played move is {m} ({c}, played {x}).', prevBook: 'A book move (played {x} of the time).', prevOff: 'The book moves here are {m} (played {x}) and others.',
  who: '{k} ({w})', senkei: 'Opening', castleH: 'Castle', meC: 'you', opC: 'opponent', 'cs.done': '{n} (complete)', 'cs.part': 'building {n}', 'cs.none': 'no castle yet', moyo: 'heading for {n}', fixed: '{n}',
  'ck.mino': 'Mino', 'ck.takamino': 'High Mino', 'ck.ginkan': 'Silver Crown', 'ck.ana': 'Anaguma', 'ck.funa': 'Boat castle', 'ck.yagura': 'Yagura castle', 'ck.gangi': 'Gangi', 'ck.naka': 'Middle king', 'ck.kanimino': 'Half Mino',
  'tp.castleDone': 'Your {c} is complete. With the defence in place, start preparing the attack (rook, bishop, silver, knight).',
  'tp.castlePart': 'You are building a {c}. Finish it before the fighting starts.',
  'tp.oppCastle': 'Your opponent has a {c}. Every castle has weak spots (Mino: the edge and its head; Anaguma: the edge and attacks from above; Yagura: attacks from above).',
  'sk.yagura': 'Yagura: a slow game with the bishop diagonals closed. Complete the Yagura castle, then attack with Climbing Silver, Rapid Silver or Sparrow attack.',
  'sk.aigakari': 'Double Wing: both sides push their rook pawns. Rooks get active early and the build-up is short.',
  'sk.kakugawari': 'Bishop Exchange: the bishops are traded. Build (Reclining Silver, Rapid Silver, Climbing Silver) without leaving squares where a bishop can be dropped.',
  'sk.yokofu': 'Side Pawn Capture: a sharp game after the rook takes the side pawn. One slip in the opening can lose quickly, so follow the book lines.',
  'sk.furi': 'Static Rook vs Ranging Rook: the Ranging Rook side usually castles in Mino; the Static Rook side in Boat, Anaguma or Left Mino.',
  'sk.aifuri': 'Double Ranging Rook: both rooks swung. Castles are Yagura, Mino or Gold Fortress; build attacking files toward the enemy king.',
  'sk.ibisha': 'Double Static Rook: both rooks stay home. The game will branch into Yagura, Bishop Exchange, Double Wing and others.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'c.mate': 'Mate', 'b.mate': 'Mate', 'x.mate': 'There is a mate. Keep checking and close every escape square of the enemy king — that is the basic pattern of a mate.',
  'c.cap': 'Material', 'b.cap': 'Capture', 'x.cap': 'Capture the {c} to gain material. Captured pieces go to your hand and can be dropped as your own later. Check that it can\'t simply be taken back, and what the opponent can do in return.',
  'c.check': 'Check', 'b.check': 'Check', 'x.check': 'Close in on the enemy king with a check by the {p}. The replies are limited, so you keep the initiative — but checks can also let the king run, so prefer checks that take away its escape.',
  'c.escape': 'Early escape', 'b.escape': 'Move the king', 'x.escape': 'Move the king to safety before the attack arrives (an early escape). Getting away one move early makes the opponent\'s attack miss.',
  'c.kcastle': 'Castle', 'b.kcastle': 'Castle the king', 'x.kcastle': 'Move the king into a castle. Taking the king away from the battlefield and surrounding it with golds and silvers before fighting starts keeps you safe later.',
  'c.block': 'Answer the check', 'b.block': 'Answer the check', 'x.block': 'You must answer the check: (1) move the king, (2) block with a piece (interpose), or (3) capture the checking piece — choose the answer that costs least.',
  'c.save': 'Sidestep', 'b.save': 'Save the piece', 'x.save': 'Move the attacked {p} to safety, ideally to a square where it still works.',
  'c.promo': 'Promotion', 'b.promo': 'Promote', 'x.promo': 'Promote the {p} to make it stronger — promoted pieces move much better (a promoted pawn, "tokin", moves like a gold).',
  'c.adrop': 'Drop attack', 'b.adrop': 'Drop to attack', 'x.adrop': 'Drop the {p} from your hand near the enemy king. Being able to drop captured pieces anywhere is shogi\'s great weapon in an attack.',
  'c.ddrop': 'Defensive drop', 'b.ddrop': 'Drop to defend', 'x.ddrop': 'Drop the {p} in your own camp to defend. It makes you solid, but leaves fewer pieces for the attack.',
  'c.drop': 'Drop', 'b.drop': 'Drop a piece', 'x.drop': 'Drop the {p} from your hand. Its meaning depends on where: attack an enemy piece, hit a weak spot, or add support to your own pieces.',
  'c.castle': 'Strengthen the castle', 'b.castle': 'Strengthen', 'x.castle': 'Bring the {p} next to the king to strengthen the castle. The basic rule: attack with rook, bishop, silver and knight; defend with three golds and silvers.',
  'c.defend': 'Defence', 'b.defend': 'Defend', 'x.defend': 'Prepare for the opponent\'s attack with the {p}. You become safer, but you also give the opponent time.',
  'c.clash': 'Start a fight', 'b.clash': 'Start a fight', 'x.clash': 'Push a pawn into the opponent\'s pawn to start the fight. Losing a pawn costs little, so pawns are the best way to open the game. Read the exchanges that follow.',
  'c.pawn': 'Pawn push', 'b.pawn': 'Push a pawn', 'x.pawn': 'Push a pawn to gain space or open a path for your pieces. Pawns can\'t go back, so choose where to push carefully.',
  'c.attack': 'Attack', 'b.attack': 'Attack', 'x.attack': 'Bring the {p} forward to attack. You take the initiative, but if the attack stalls you will be counter-attacked — read whether it can keep going.',
  'c.swing': 'Rook swing', 'b.swing': 'Swing the rook', 'x.swing': 'Move the rook sideways to change where you attack. Where the rook stands (Static Rook or Ranging Rook) changes the whole game.',
  'c.develop': 'Development', 'b.develop': 'Develop', 'x.develop': 'Bring the {p} forward to build your formation. In the opening the goal is a setup where every piece works.',
  'c.wait': 'Tidy up', 'b.wait': 'Tidy up', 'x.wait': 'Improve your formation and wait for the opponent. When nothing is urgent, move a piece where it adds the most value.',
  'tp.inCheck': "You are in check. Compare all three answers: (1) move the king, (2) interpose a piece, (3) capture the checking piece.",
  'tp.mate1': 'There is a mate in one! Try every check, one by one.',
  'tp.threat': 'Your opponent threatens mate in one (tsumero). Either defend, or mate their king first.',
  'tp.hangBig': 'Your {p} ({sq}) is about to be taken. Rooks and bishops are the major pieces — losing one is costly. Move it or add a defender.',
  'tp.hang': 'Your {p} on {sq} can be taken for free (not enough defenders). Move it, defend it, or play something even more valuable.',
  'tp.canWin': "The opponent's {p} ({sq}) can be won. Check that it can't be taken back and compare with the opponent's counter-play.",
  'tp.kDanger': 'Your king is getting into danger (enemy pieces and attacks are gathering). Think about defending or an early escape.',
  'tp.atkChance': "The enemy king's defence is getting thin. Add attackers — a chance to go for the mating attack.",
  'tp.igyoku': 'Your king is still on its starting square. Put it into a castle before fighting starts — it makes you much harder to beat.',
  'tp.kingRook': 'Your king and rook are too close. "Keep the king away from the rook": fighting happens around the rook, so castle the king on the other side.',
  'tp.thin': 'Only {n} gold/silver next to your king. The basic defence uses three golds and silvers — check your castle before rushing the attack.',
  'tp.hand': 'In hand: {list}. You can drop them on any empty square (mind the two-pawns rule). Look for a good square: a weak spot or near the king.',
  'tp.pawnTesuji': 'With a pawn in hand you can use pawn techniques: the tap, the dangling pawn, the joining pawn, the follow-up pawn…',
  'tp.promo': 'You can promote. Promoted pieces are stronger, so promote unless you have a reason not to.',
  'tp.winning': 'You are ahead. No need to force things: play safe moves that leave the opponent no counter-play.',
  'tp.losing': 'You are behind. Normal moves won\'t close the gap — choose complicated moves where the opponent can go wrong.',
  'tp.matUp': 'Material: you are about {x} points up (pawn = 1). Material is fighting power.',
  'tp.matDown': 'Material: you are about {x} points down (pawn = 1). Win it back, or play for speed if the position allows.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  'tp.open1': 'The two main opening plans: open the bishop\'s diagonal, and push the rook\'s pawn. Start with one of them.',
  'tp.open2': 'The opening is for building. Develop your attacking pieces (rook, silver, knight) and your defence (king, golds, silvers) side by side.',
  'tp.mid1': 'In the middlegame material matters. Pieces you win now become drops in the endgame.',
  'tp.mid2': 'Is any piece doing nothing? Bring every piece into the fight.',
  'tp.end1': 'In the endgame speed beats material: who gets to the other king first decides the game.',
  'tp.end2': 'Classic mating advice: drive the king down to the bottom rank, and keep a gold for the final blow.',
  'tp.end3': "Endless checks just chase the king away. Moves that cut off its escape come first.",
  'tp.var': 'The basics are the same in this variant: every move, check for pieces you might lose, pieces you can take, and checks.',
  'tp.hasami': 'In Hasami Shogi you capture by sandwiching a piece vertically or horizontally. Before moving, make sure your pieces can\'t be sandwiched.',
  pieces: ['', 'pawn', 'lance', 'knight', 'silver', 'bishop', 'rook', 'gold', 'king', 'tokin', 'promoted lance', 'promoted knight', 'promoted silver', 'horse', 'dragon'],
  sep: ', ',
  gl: {
    tsumero: { m: ['tsumero'], t: 'Tsumero', d: 'A threat to mate on the next move. You must defend or mate the opponent first.' },
    kakoi: { m: ['castle'], t: 'Castle', d: 'A formation of golds and silvers that protects the king — Mino, Yagura and Anaguma are well-known ones.' },
    aigoma: { m: ['interpose'], t: 'Interposing', d: 'Answering a check from a rook, bishop or lance by putting a piece in between.' },
    hayanige: { m: ['early escape'], t: 'Early escape', d: 'Moving the king to safety one move before the attack arrives.' },
    mochigoma: { m: ['in hand', 'hand'], t: 'Pieces in hand', d: 'Pieces you captured. On your turn you may drop one on any empty square (no two pawns on a file, no pawn-drop mate, no piece that could never move).' },
    major: { m: ['major pieces'], t: 'Major pieces', d: 'The rook and the bishop: the most valuable pieces with the longest moves.' },
    promote: { m: ['promote'], t: 'Promotion', d: 'Turning a piece over when it moves into, out of or within the last three ranks; it then moves better. Golds and kings do not promote.' },
    tokin: { m: ['tokin'], t: 'Tokin', d: 'A promoted pawn; it moves like a gold.' },
    nifu: { m: ['two-pawns rule'], t: 'Two pawns (nifu)', d: 'Dropping a pawn on a file where you already have an unpromoted pawn is illegal — it loses the game.' },
    sokudo: { m: ['speed'], t: 'Speed', d: 'How many moves each side needs to mate the other. In the endgame it matters more than material.' },
    initiative: { m: ['initiative'], t: 'Initiative', d: 'Being the one who makes threats, so the opponent has to answer them.' },
    ranging: { m: ['Ranging Rook', 'Static Rook'], t: 'Static Rook / Ranging Rook', d: 'Static Rook keeps the rook on its starting file; Ranging Rook moves it to the left side to attack there.' },
    material: { m: ['Material', 'material'], t: 'Material', d: 'The balance of pieces (on the board and in hand). Rough values: pawn 1, lance 3, knight 4, silver 5, gold 6, bishop 8, rook 10.' },
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
const pn = tp => (tx('pieces') || TX.en.pieces)[tp] || '';

// --------------------------------------------------------------------------------------------- position facts (本将棋)
const PV = [0, 1, 3, 4, 5, 8, 10, 6, 0, 6, 6, 6, 6, 10, 12];   // rough piece values (pawn = 1)
const FU = 1, KY = 2, KE = 3, GI = 4, KA = 5, HI = 6, KI = 7, OU = 8, UM = 13, RY = 14;
const WIN = 30000 - 400;
const rc = s => [(s / 9) | 0, s % 9];
const dist = (a, b) => { if (a < 0 || b < 0) return 9; const [r1, c1] = rc(a), [r2, c2] = rc(b); return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)); };
const fwd = (c, r) => c === 0 ? 8 - r : r;   // rank from the player's own side (0 = own back rank)
function sqName(s) { return L() === 'ja' ? sqZen(s) : E.sqFile(s) + 'abcdefghi'[E.sqRank(s) - 1]; }
function mateIn1(p) {
  for (const m of p.legalMoves(true)) {
    p.doMove(m);
    const mate = p.inCheck() && !p.hasLegalMove();
    p.undoMove();
    if (mate && !(E.isDrop(m) && E.dropType(m) === FU)) return m;   // (a pawn-drop mate is not allowed)
  }
  return 0;
}
function danger(p, c) {
  const k = p.king[c]; if (k < 0) return 0;
  const them = c ^ 1; let d = 0;
  const [kr, kc] = rc(k);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const r = kr + dr, cc = kc + dc; if (r < 0 || r > 8 || cc < 0 || cc > 8) continue;
    const s = r * 9 + cc, q = p.board[s];
    if (q && E.colorOf(q) === them) d += 1.2;
    else if (p.attacked(s, them)) d += 1;
  }
  let def = 0;
  for (let s = 0; s < 81; s++) {
    const q = p.board[s]; if (!q) continue;
    const t = E.typeOf(q), dd = dist(s, k);
    if (E.colorOf(q) === them) { if (dd === 2) d += t === FU ? 0.3 : 0.8; }
    else if (dd <= 1 && t !== OU && (t === KI || t === GI || (t >= 9 && t <= 12))) def++;
  }
  let hv = 0; for (let t = 1; t <= 7; t++) hv += p.hand[them * 8 + t] * PV[t];
  d += Math.min(3, hv / 8);
  return Math.max(0, d - def * 0.6);
}
function material(p, c) {   // unpromoted values: 駒割り counts the pieces themselves
  let v = 0;
  for (let s = 0; s < 81; s++) { const q = p.board[s]; if (q && E.colorOf(q) === c) v += PV[E.UNPROMOTE[E.typeOf(q)]]; }
  for (let t = 1; t <= 7; t++) v += p.hand[c * 8 + t] * PV[t];
  return v;
}
// pieces of color c that the opponent wins material on (see > 0), most valuable first
function hanging(p, c) {
  const out = [], them = c ^ 1;
  for (let s = 0; s < 81; s++) {
    const q = p.board[s]; if (!q || E.colorOf(q) !== c || E.typeOf(q) === OU) continue;
    if (!p.attacked(s, them)) continue;
    const a = p.lva(s, them); if (a < 0) continue;
    if (E.typeOf(p.board[a]) === OU && p.attacked(s, c)) continue;
    const v = p.see(a | (s << 7));
    if (v >= 250) out.push({ sq: s, tp: E.typeOf(q), v });
  }
  return out.sort((x, y) => y.v - x.v);
}
// castles (from each side's own view: files / ranks as if it were sente). [name, king square, other pieces]
const CASTLES = [
  ['ana', [[1, 9]], [[GI, 2, 8], [KI, 3, 9]]], ['ana', [[9, 9]], [[GI, 8, 8], [KI, 7, 9]]],
  ['ginkan', [[2, 8]], [[GI, 2, 7], [KI, 3, 8]]],
  ['takamino', [[2, 8]], [[GI, 3, 8], [KI, 4, 7], [KI, 4, 9]]],
  ['mino', [[2, 8]], [[GI, 3, 8], [KI, 4, 9], [KI, 5, 8]]],
  ['kanimino', [[2, 8]], [[GI, 3, 8], [KI, 4, 9]]],
  ['yagura', [[8, 8]], [[GI, 7, 7], [KI, 7, 8], [KI, 6, 7], [FU, 7, 6], [FU, 6, 6]]],
  ['gangi', [[6, 9], [7, 9], [7, 8]], [[GI, 6, 7], [GI, 4, 7], [FU, 6, 6], [KI, 5, 8]]],
  ['funa', [[7, 8]], [[KI, 6, 9], [KI, 5, 8]]],
  ['naka', [[5, 8]], [[KI, 7, 8], [KI, 3, 8]]],
];
function castleOf(p, c) {
  const at = (f, r) => p.board[c ? (10 - r - 1) * 9 + (9 - (10 - f)) : (r - 1) * 9 + (9 - f)];
  const own = t => t + (c ? 16 : 0);
  let best = null;
  for (const [k, ks, pcs] of CASTLES) {
    const kOk = ks.some(([f, r]) => at(f, r) === own(OU));
    const hit = pcs.filter(([t, f, r]) => at(f, r) === own(t)).length;
    const score = (kOk ? 1 : 0) + hit, total = 1 + pcs.length;
    const done = kOk && hit === pcs.length;
    if (done) return { k, done: true };
    if (score >= Math.max(2, total - 1) && (!best || score / total > best.r)) best = { k, done: false, r: score / total };
  }
  return best;
}
function facts(p, n) {
  const us = p.side, them = us ^ 1, f = { us, them, n };
  f.check = p.inCheck();
  f.mate1 = f.check ? 0 : mateIn1(p);
  f.threat = 0; f.hang = [];
  if (!f.check) {
    try { p.doNull(); f.threat = mateIn1(p); f.hang = hanging(p, us); } finally { p.undoNull(); }
  }
  f.win = hanging(p, them);
  f.dUs = danger(p, us); f.dThem = danger(p, them);
  f.mat = Math.round((material(p, us) - material(p, them)) / 2);   // a piece lost is a piece the opponent gains: half the difference = 'one bishop down'
  let hand = 0; for (let c = 0; c < 2; c++) for (let t = 1; t <= 7; t++) hand += p.hand[c * 8 + t];
  f.handN = hand;
  f.stage = (f.dUs >= 5 || f.dThem >= 5 || n >= 110) ? 'end' : (n < 26 && hand <= 2) ? 'open' : 'mid';
  const k = p.king[us], start = us === 0 ? 76 : 4;   // 5九 / 5一
  f.igyoku = k === start;
  let gs = 0; for (let s = 0; s < 81; s++) { const q = p.board[s]; if (q && E.colorOf(q) === us && dist(s, k) <= 1 && [KI, GI, 9, 10, 11, 12].includes(E.typeOf(q))) gs++; }
  f.guards = gs;
  f.kingRook = false;
  for (let s = 0; s < 81; s++) { const q = p.board[s]; if (q && E.colorOf(q) === us && E.typeOf(q) === HI && fwd(us, rc(s)[0]) <= 2 && fwd(us, rc(k)[0]) <= 2 && Math.abs(rc(s)[1] - rc(k)[1]) <= 1) f.kingRook = true; }
  f.handList = [];
  for (const t of [HI, KA, KI, GI, KE, KY, FU]) { const c = p.hand[us * 8 + t]; if (c) f.handList.push(pn(t) + (c > 1 ? '×' + c : '')); }
  f.pawnHand = p.hand[us * 8 + FU] > 0;
  f.promo = p.legalMoves(true).some(m => !E.isDrop(m) && E.mPromo(m));
  try { f.cs = [castleOf(p, 0), castleOf(p, 1)]; } catch (e) { f.cs = [null, null]; }
  try { f.sk = window.ShogiStrategy && n >= 6 ? ShogiStrategy.classify(E, p) : null; } catch (e) { f.sk = null; }
  return f;
}
// what a candidate move is about
function classify(p, m, f) {
  const us = p.side, drop = E.isDrop(m), to = E.mTo(m), from = drop ? -1 : E.mFrom(m);
  const tp = drop ? E.dropType(m) : E.typeOf(p.board[from]);
  const cap = drop ? 0 : p.board[to];
  const ok = p.king[us], ek = p.king[us ^ 1];
  p.doMove(m); const chk = p.inCheck(), mate = chk && !p.hasLegalMove(); p.undoMove();
  const r = { p: pn(tp), c: cap ? pn(E.typeOf(cap)) : '', sq: drop ? null : from, tp };
  const mk = k => Object.assign(r, { k });
  if (mate) return mk('mate');
  if (f.check) return mk(tp === OU ? 'escape' : 'block');
  if (cap && PV[E.typeOf(cap)] >= 3) return mk('cap');
  if (chk) return mk('check');
  if (tp === OU) return mk(f.stage === 'open' || (f.dUs < 2.5 && dist(to, ok) <= 1 && fwd(us, rc(to)[0]) <= 1) ? 'kcastle' : 'escape');
  if (!drop && f.hang.some(h => h.sq === from)) return mk('save');
  if (cap) return mk('cap');
  if (!drop && E.mPromo(m)) return mk('promo');
  if (drop) return mk(dist(to, ek) <= 2 || fwd(us, rc(to)[0]) >= 6 ? 'adrop' : dist(to, ok) <= 2 ? 'ddrop' : 'drop');
  const fr = fwd(us, rc(from)[0]), tr = fwd(us, rc(to)[0]);
  if ((tp === KI || tp === GI) && dist(to, ok) <= 1 && dist(to, ok) <= dist(from, ok) && f.stage !== 'end' && tr <= 2) return mk('castle');
  if (tp === FU) {
    const ahead = us === 0 ? to - 9 : to + 9, q = ahead >= 0 && ahead < 81 ? p.board[ahead] : 0;
    return mk(q && E.colorOf(q) !== us ? 'clash' : 'pawn');
  }
  if (tp === HI && tr === fr && rc(to)[1] !== rc(from)[1] && tr <= 2) return mk('swing');
  if (dist(to, ok) <= 2 && tr <= 2 && f.dUs >= 2) return mk('defend');
  if (tr > fr && (tr >= 5 || dist(to, ek) <= 3)) return mk('attack');
  if (tr > fr) return mk('develop');
  return mk('wait');
}
const CCLS = { mate: 'c-mate', cap: 'c-mat', promo: 'c-mat', check: 'c-atk', adrop: 'c-atk', clash: 'c-atk', attack: 'c-atk', swing: 'c-atk', escape: 'c-def', kcastle: 'c-def', block: 'c-def', save: 'c-def', ddrop: 'c-def', castle: 'c-def', defend: 'c-def', develop: 'c-dev', pawn: 'c-dev', drop: 'c-dev', wait: 'c-calm' };
const RCLS = { mate: 'r-mate', escape: 'r-def', kcastle: 'r-def', block: 'r-def', save: 'r-def', ddrop: 'r-def', castle: 'r-def', defend: 'r-def' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
const pctS = x => Math.round(x * 100) + '%';

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, reveal: false, key: '', f: null, cls: null };
let card = null;
function active() { return !!(settings.coach && usable()); }
// the coach could be used here (it may still be switched off)
function usable() {
  return !!(game && !lesson && !edit && !game.lessonGame && !game.rated && (settings.mode === 'ai' || settings.mode === 'pvp') && !(typeof inStudy === 'function' && inStudy()));
}
function myTurn() { return game && !game.over && cur === game.moves.length && !reviewing && (settings.mode === 'pvp' || P.side === game.human); }
function factsNow() {
  const key = game.start + '|' + game.moves.slice(0, cur).join(' ') + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null; S.cls = null;
  if (game.variant) { S.f = { variant: game.variant, n: cur }; return S.f; }
  try { const p = new E.Position(); p.setSfen(P.sfen()); S.f = facts(p, cur); } catch (e) { S.f = { n: cur }; }
  return S.f;
}
function tipsOf(f, info, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.variant) { add(f.variant === 'hasami' ? 'tp.hasami' : 'tp.var', 10); }
  else {
    if (f.check) add('tp.inCheck', 100, null, 1);
    if (f.mate1) add('tp.mate1', 96, null, 1);
    if (f.threat) add('tp.threat', 92, null, 1);
    const hb = f.hang.find(h => h.tp === HI || h.tp === KA || h.tp === RY || h.tp === UM);
    if (hb) add('tp.hangBig', 86, { p: pn(hb.tp), sq: sqName(hb.sq) }, 1);
    const h = f.hang.find(x => x !== hb && PV[x.tp] >= 3);
    if (h) add('tp.hang', 76, { p: pn(h.tp), sq: sqName(h.sq) });
    const w = f.win.find(x => PV[x.tp] >= 3);
    if (w) add('tp.canWin', 78, { p: pn(w.tp), sq: sqName(w.sq) });
    if (f.dUs >= 4 && !f.check) add('tp.kDanger', 66);
    if (f.dThem >= 3.5 && !f.mate1) add('tp.atkChance', 60);
    if (f.igyoku && f.n >= 10 && f.stage !== 'end') add('tp.igyoku', f.stage === 'open' ? 56 : 62);
    const myC = f.cs && f.cs[f.us], opC = f.cs && f.cs[f.them];
    if (myC && f.stage !== 'end') add(myC.done ? 'tp.castleDone' : 'tp.castlePart', myC.done ? 40 : 50, { c: tx('ck.' + myC.k) });
    if (opC && opC.done && f.stage !== 'open') add('tp.oppCastle', 36, { c: tx('ck.' + opC.k) });
    if (f.sk && f.stage !== 'end' && f.n < 60) add('sk.' + (f.sk.id || 'ibisha'), f.stage === 'open' ? 54 : 30);
    if (f.kingRook && f.n >= 6 && f.stage !== 'end') add('tp.kingRook', 52);
    if (!f.igyoku && f.stage === 'mid' && f.guards <= 1) add('tp.thin', 46, { n: f.guards });
    if (f.handList.length) add('tp.hand', f.stage === 'end' ? 44 : 38, { list: f.handList.join(tx('sep')) });
    if (f.pawnHand && f.stage !== 'open') add('tp.pawnTesuji', 24);
    if (f.promo && f.stage !== 'open') add('tp.promo', 34);
    if (Math.abs(f.mat) >= 2) add(f.mat > 0 ? 'tp.matUp' : 'tp.matDown', 30, { x: Math.abs(f.mat) });
    if (f.stage === 'open') { if (f.n < 8) add('tp.open1', 22); add('tp.open2', 18); }
    else if (f.stage === 'mid') { add('tp.mid1', 16); add('tp.mid2', 14); }
    else { add('tp.end1', 26); add('tp.end2', 15); add('tp.end3', 14); }
  }
  if (info.ev != null) { const w = info.wr; if (w >= .8) add('tp.winning', 48); else if (w <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  return out.sort((a, b) => b.pr - a.pr);
}
// candidates: classified, with the gap to the best
function candInfo(list, f) {
  if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const p = newPos(); p.setSfen(P.sfen());
  const best = list[0].score, wb = winRate(best);
  const items = [];
  for (const c of list.slice(0, 4)) {
    let m; try { m = p.fromUsi(c.move); } catch (e) { continue; }
    if (!m) continue;
    let k = { k: 'wait', p: '', c: '' };
    if (!f.variant) { try { k = classify(p, m, f); } catch (e) {} }
    else { const cap = !E.isDrop(m) && p.board[E.mTo(m)]; k = { k: E.isDrop(m) ? 'drop' : cap ? 'cap' : 'develop', p: f.variant === 'hasami' ? '' : pn(E.isDrop(m) ? E.dropType(m) : E.typeOf(p.board[E.mFrom(m)])), c: cap ? pn(E.typeOf(cap)) : '' }; }
    const drop = Math.max(0, wb - winRate(c.score));
    let nm = ''; try { nm = (p.side ? '△' : '▲') + kifName(p, m, -1); } catch (e) {}
    items.push({ u: c.move, k, drop, nm, score: c.score, drop0: E.isDrop(m) });
  }
  // merge candidates with the same plan (keep the better one), at most 3 directions
  const seen = new Set(), dirs = [];
  for (const it of items) { if (!f.variant && seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05);
  const second = items[1] ? items[1].drop : null;
  const r = { list, items, dirs, best: items[0], branch: close.length >= 2 && best < WIN, sharp: second != null && second >= 0.12 && best < WIN ? pctS(second) : '', only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
// opening crossroads (平手 only): the main plans of the first moves, shown with their moves (they are knowledge, not a hint)
const HIRATE = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const OPEN = {
  '': [['7g7f', 'main', 'kaku'], ['2g2f', 'main', 'hisha'], ['1g1f', 'alt', 'hashi'], ['5g5f', 'alt', 'naka']],
  '7g7f': [['3c3d', 'main', 'gk'], ['8c8d', 'main', 'gh'], ['5c5d', 'alt', 'gn']],
  '2g2f': [['8c8d', 'main', 'aig'], ['3c3d', 'main', 'gk2']],
  '7g7f 3c3d': [['2g2f', 'main', 'i2'], ['6g6f', 'main', 'tome'], ['7f7e', 'alt', 'ishi'], ['8h2b+', 'alt', 'kk']],
  '7g7f 8c8d': [['7i6h', 'main', 'yag'], ['2g2f', 'main', 'kw']],
  '2g2f 8c8d': [['2f2e', 'main', 'aig2'], ['7g7f', 'main', 'kk2']],
  '2g2f 3c3d': [['7g7f', 'main', 'kk2'], ['2f2e', 'main', 'aig2']],
};
// the opening book (index.html BOOK: Floodgate move frequencies) for the position after `ply` moves of this game
function bookAt(ply) {
  if (typeof BOOK === 'undefined' || !BOOK || !game || game.variant || game.start !== HIRATE || ply > 24) return null;
  const p = posAt(ply), e = BOOK[p.sfen().replace(/ \d+$/, '')];
  if (!e || !e.length) return null;
  const tot = e.reduce((a, b) => a + b[1], 0); if (tot < 30) return null;
  return { p, tot, list: e.map(([u, c, w]) => ({ u, share: c / tot, win: w })) };
}
function bookShare(ply, u) { const b = bookAt(ply); if (!b) return null; const x = b.list.find(y => y.u === u); return x ? x.share : 0; }
function openingOf() {
  if (!game || game.variant || game.start !== HIRATE || cur > 3) return null;
  const e = OPEN[game.moves.slice(0, cur).join(' ')]; if (!e) return null;
  const p = newPos(); p.setSfen(P.sfen());
  const cands = (game.info[cur] && game.info[cur].cands) || [], best = cands.length ? winRate(cands[0].score) : null;
  const out = [];
  for (const [u, kind, key] of e) {
    let m; try { m = p.fromUsi(u); } catch (er) { continue; } if (!m) continue;
    let nm = ''; try { nm = (p.side ? '△' : '▲') + kifName(p, m, -1); } catch (er) {}
    const share = bookShare(cur, u);
    out.push({ u, nm, kind, key, share });
  }
  return out.sort((a, b) => (a.kind === b.kind ? (b.share || 0) - (a.share || 0) : a.kind === 'main' ? -1 : 1));
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.02 ? ['gap.eq', 'g1'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
// what the move does, in a few words (the plan's tag says why)
function ttl(d) {
  const k = d.k; if (!k.p) return tx('b.' + k.k);
  if (d.drop0) return tx('tt.drop', { p: k.p });
  if (k.c) return tx('tt.cap', { p: k.p, c: k.c });
  const v = { p: k.p, sq: k.sq != null ? sqName(k.sq) : '', f: k.sq != null ? (L() === 'ja' ? '０１２３４５６７８９'[E.sqFile(k.sq)] : E.sqFile(k.sq)) : '' };
  if (k.tp === 1 && k.sq != null) return tx(k.k === 'clash' ? 'tt.clash' : 'tt.pawn', v);
  if (k.k === 'promo') return tx(k.sq != null ? 'tt.promo' : 'tt.promo0', v);
  return tx(k.sq != null ? 'tt.move' : 'tt.move0', v);
}
function catTxt(k) { return tx('x.' + k.k, { p: k.p || '', c: k.c || '' }); }

function verdictHtml() {
  // the last move of the player (in pvp: the last move), graded when the AI's (or the analysis') answer arrived
  const n = game.moves.length; if (!n) return '';
  let i = n;   // info index after the move (only the player's moves are graded)
  while (i > 0 && n - i < 2 && !(game.info[i] && game.info[i].q)) i--;
  const inf = game.info[i]; if (!inf || !inf.q || i < 1) return '';
  const q = inf.q, g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  const before = game.info[i - 1] || {};
  const names = kifList(); const mv = names[i - 1] || '';
  let body = '';
  const bk = bookAt(i - 1);
  if (bk) {
    const sh = bk.list.find(x => x.u === game.moves[i - 1]);
    if (sh && sh.share >= 0.03) return CoachKit.verdict(sh.share >= 0.15 ? 0 : 1, esc(tx('prev', { m: mv, q: t('q.' + (sh.share >= 0.15 ? 'best' : 'good')) })), esc(tx('prevBook', { x: pctS(sh.share) })));
    try { const top = bk.list[0], m = bk.p.fromUsi(top.u); body = esc(tx('prevOff', { m: (bk.p.side ? '△' : '▲') + kifName(bk.p, m, -1), x: pctS(top.share) })) + ' '; } catch (e) {}
  }
  try {
    const p = posAt(i - 1);
    if (before.bm && before.bm !== game.moves[i - 1]) {
      const m = p.fromUsi(before.bm); let k = { k: 'wait', p: '', c: '' };
      if (!game.variant) { const ff = facts(posAt(i - 1), i - 1); k = classify(posAt(i - 1), m, ff); }
      const bn = (p.side ? '△' : '▲') + kifName(p, m, -1);
      body += esc(tx(q === 'best' || q === 'good' ? 'prevAltOk' : 'prevAlt', { m: bn, c: tx('c.' + k.k) }));
    } else if (before.bm) {
      const m = p.fromUsi(game.moves[i - 1]); let k = { k: 'wait' };
      if (!game.variant) { const ff = facts(posAt(i - 1), i - 1); k = classify(posAt(i - 1), m, ff); }
      body += esc(tx('prevBest', { c: tx('c.' + k.k) }));
    }
    if (window.ShogiTip && inf.coachB && before.bm) body += ShogiTip.html(p.sfen(), game.moves[i - 1], before.bm, { s: before.best, bm: before.bm, pv: before.bpv }, inf.coachB, q).replace(/<p class="rv-tip">/, '<br>').replace(/<\/p>$/, '');
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: t('q.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (ShogiCoach.sw) ShogiCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const playing = !!(game && !game.over && cur === game.moves.length && !reviewing);
  const on = active(), can = usable() && (playing || (game && game.over && !rv));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) return;
  if (game.over) {
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.analyze'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`);
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${game && !game.over && !game.variant ? `<small>${esc(tx('st.' + ((factsNow() || {}).stage || 'mid')))}</small>` : ''}</h3>`;
  if (game.over) { h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (cur !== game.moves.length || reviewing) { h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const f = factsNow(), info = game.info[cur] || {};
  const evMe = info.best != null ? info.best : null;   // side-to-move view
  const wr = evMe != null ? winRate(evMe) : null;
  const cl = candInfo(info.cands, f);
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + pctS(wr)), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  if (!f.variant && f.sk) {
    const nm = window.ShogiStrategy && ShogiStrategy.localName ? ShogiStrategy.localName(f.sk, LANG) : f.sk.ja;
    const settled = f.sk.id === 'furi' || f.sk.id === 'aifuri' || f.sk.id === 'kakugawari' || f.sk.id === 'yokofu' || f.n >= 30;
    chips.push({ k: tx('senkei'), v: esc(tx(settled ? 'fixed' : 'moyo', { n: nm })) });
  }
  if (!f.variant && f.cs && f.stage !== 'end') {
    const cs = c => { const x = f.cs[c]; return x ? tx(x.done ? 'cs.done' : 'cs.part', { n: tx('ck.' + x.k) }) : tx('cs.none'); };
    chips.push({ k: tx('who', { k: tx('castleH'), w: tx('meC') }), v: esc(cs(f.us)), cls: f.cs[f.us] && f.cs[f.us].done ? 'pos' : '' });
    if (f.cs[f.them]) chips.push({ k: tx('who', { k: tx('castleH'), w: tx('opC') }), v: esc(cs(f.them)) });
  }
  if (!f.variant && f.mat != null) chips.push({ k: tx('mat'), v: esc(Math.abs(f.mat) < 1 ? tx('mat.even') : tx(f.mat > 0 ? 'mat.up' : 'mat.down', { x: Math.abs(f.mat) })), cls: f.mat >= 1 ? 'pos' : f.mat <= -1 ? 'neg' : '' });
  h += CoachKit.summary(chips);
  const op = openingOf();
  if (op) {
    S.op = op;
    h += CoachKit.branches({
      head: tx('opH'), intro: esc(tx('opIntro')), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t')), text: gl(esc(tx('op.' + d.key + '.x'))), gap: d.share ? tx('bk.share', { x: pctS(d.share) }) : '', gcls: d.share >= .2 ? 'g0' : d.share ? 'g1' : '', move: d.u, mvName: d.nm })),
    });
  } else S.op = null;
  const bk = !op && bookAt(cur);
  if (bk) {
    const p = bk.p, f2 = factsNow();
    const items = bk.list.filter(x => x.share >= 0.03).slice(0, 4).map(x => {
      let m = 0, k = { k: 'wait', p: '', c: '' }, nm = '';
      try { m = p.fromUsi(x.u); k = classify(p, m, f2); nm = (p.side ? '△' : '▲') + kifName(p, m, -1); } catch (er) {}
      return { u: x.u, k, nm, share: x.share, drop0: m && E.isDrop(m) };
    });
    if (items.length) {
      S.op = items.map(d => ({ u: d.u, kind: 'main' }));
      const b = items[0];
      h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { m: b.nm, c: tx('c.' + b.k.k), x: pctS(b.share) }))), RCLS[b.k.k] || '');
      h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
        items: items.map(d => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d)), text: gl(esc(catTxt(d.k))), gap: tx('bk.share', { x: pctS(d.share) }), gcls: d.share >= .2 ? 'g0' : 'g1', move: d.u, mvName: d.nm })) });
    }
  }
  if (!op && !(bk && S.op) && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(winRate(b.score))), p: Math.round(winRate(b.score) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: d.u, mvName: d.nm }; }),
    });
  } else if (!op && !(bk && S.op)) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, { ev: evMe, wr }, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} arrows(null); render(); },
    onHover: u => arrows(u),
  });
}
// candidate arrows on the board (revealed moves only)
function arrows(u) {
  if (S.op && myTurn()) {
    const list = u ? S.op.filter(d => d.u === u) : [];
    if (!list.length) { if (hintMoves && hintMoves.coach) { hintMoves = null; drawArrows(); } return; }
    hintMoves = { ply: cur, coach: 1, list: list.map(d => ({ move: d.u, label: d.key ? tx('op.' + d.kind) : String(S.op.indexOf(d) + 1) })) }; drawArrows(); return;
  }
  const info = game && game.info[cur], cl = info && S.cls;
  if (!S.reveal || !cl || !myTurn()) { if (hintMoves && hintMoves.coach) { hintMoves = null; drawArrows(); } return; }
  const list = u ? cl.dirs.filter(d => d.u === u) : cl.dirs;
  hintMoves = { ply: cur, coach: 1, list: list.map((d, i) => ({ move: d.u, label: String(u ? cl.dirs.findIndex(x => x.u === u) + 1 : i + 1) })) };
  drawArrows();
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  ShogiCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  if (!v && hintMoves && hintMoves.coach) { hintMoves = null; drawArrows(); }
  render();
  if (v && typeof schedule === 'function' && game && !game.over && myTurn() && !(game.info[cur] && game.info[cur].cands)) schedule();
}
function relabel() { if (ShogiCoach.sw) ShogiCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.ShogiCoach = { bookShare, init, render, relabel, merge, tx, TX, active, arrows };
})();
