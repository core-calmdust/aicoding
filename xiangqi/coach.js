'use strict';
// シャンチー（中国象棋）コーチ (common spec: shared/COACH.md, shared/coachkit.js; model: shogi/coach.js) — shown while the player
// is to move against the AI (and in local two-player games): the position at a glance (形勢・布局・陣形・駒割り), the
// recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan explained, moves revealed on
// demand with arrows on the board), prioritized "how to think" tips read from the position (王手・詰み・狙われている駒・
// 空頭炮・窩心馬・車の出遅れ・格言 …), and the verdict on the previous move (◎○△✕). The first moves are taught from opening
// theory (中炮・仙人指路・飛相局・起馬局 and Black's standard answers) and from the site's opening data (openings.json, the
// named first moves of each opening), not from the evaluation. Glossary terms are dotted.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (XqCoach.merge).
// app.js: XqCoach.render() from renderInfo(); candidates = the analysis worker's full list (anaCache, per position);
// XqCoach.fx(svg) from renderFx() draws the revealed candidates' arrows.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次に何をしてくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒割り', you: 'あなた',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mat.even': '互角', 'mat.up': '{x}点得', 'mat.down': '{x}点損',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率の目安{p}%）。',
  recSharp: '2番目の候補との差が大きく、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'tt.move': '{f}の{p}を{d}', 'd.0': '前へ', 'd.1': '後ろへ', 'd.2': '横へ', 'd.3': '動かす', 'tt.pawn': '{f}の{p}を進める', 'tt.cross': '{f}の{p}で川を渡る', 'tt.cap': '{f}の{p}で{c}を取る', 'tt.king': '{p}を動かす',
  file: '{n}筋', front: '前の', rear: '後ろの',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  opH: '序盤の分かれ道 — 布局の選び方', opIntro: '最初の数手で布局（作戦）が決まります。まずは定番の2つを覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.zp.t': '炮を中央へ（中炮）', 'op.zp.x': '炮を真ん中の筋に回して、相手の中央の卒と九宮をねらう布局。大会で指される対局の半分以上が中炮といわれる、もっとも代表的な初手です。',
  'op.xr.t': '兵を1つ突く（仙人指路）', 'op.xr.x': '馬の前の兵を1つ突いて、馬の通り道を開けながら相手の出方を見る手。あとから中炮・飛相・起馬などに切り替えられ、相手に作戦を読まれにくいのが魅力です。',
  'op.fx.t': '相を上げる（飛相局）', 'op.fx.x': '相を中央に上げて守りを固める落ち着いた初手。作戦をすぐには明かさず、じっくり戦いたいときに向きます。',
  'op.qm.t': '馬を跳ねる（起馬局）', 'op.qm.x': 'まず馬を跳ねる柔らかな初手。あとから中炮や屏風馬のような形にも組めます。',
  'op.ping.t': '馬を跳ねて中卒を守る', 'op.ping.x': '中炮でねらわれる中央の卒を馬で守る、もっとも普通の応手。もう一方の馬も跳ねれば、現代でいちばん多い「屏風馬」の形になります。',
  'op.shun.t': '同じ側の炮を中央へ（順炮）', 'op.shun.x': '赤と同じ側の炮を中央に回して、中炮に中炮で応じる真っ向勝負。古くからある激しい布局で、車の出し方で変化が分かれます。',
  'op.lie.t': '反対側の炮を中央へ（列炮）', 'op.lie.x': '赤とは反対側の炮で中炮を返す布局。そのまま組むと形に無理があるとされ、2つ目の炮を遅らせる指し方もよく使われます。',
  'op.fgm.t': '反対の馬から跳ねる（反宮馬へ）', 'op.fgm.x': '先に反対側の馬を跳ね、あとで炮を士の角に置く「反宮馬」をめざす手。中炮に対する有力な守りの一つです。',
  'op.zdp.t': '炮を兵の筋へ（卒底炮）', 'op.zdp.x': '突かれた兵と同じ筋に炮を回して、その兵に圧力をかける反撃の手。',
  'op.dbj.t': '卒を突き返す（対兵局）', 'op.dbj.x': '同じように卒を突き返して、お互いに馬の通り道を開ける手。',
  'op.fxzp.t': '炮を中央へ（中炮で応じる）', 'op.fxzp.x': '相を上げた相手に、炮を中央へ回して攻めの形を作る手。飛相局に対する代表的な応手の一つです。',
  'op.fxgg.t': '炮を九宮の反対側へ（過宮炮）', 'op.fxgg.x': '炮を九宮の向こう側の筋へ回す手。飛相局に対するもう一つの代表的な応手です。',
  'op.qm7.t': '卒を突く', 'op.qm7.x': '卒を1つ突いて、自分の馬の通り道を開けつつ相手の馬の動きを止める手。',
  bkH: '定跡の手順 — 布局の続き', bkIntro: 'このサイトの定跡集（レッスン［定跡］）にある布局の手順です。序盤は評価値の小さな差より、定跡どおりに駒を展開することが大切です。',
  bkWhy: 'この局面はまだ定跡の範囲です。{o}では {m} と進みます。', prevBook: '定跡どおりの手です（{o}）。',
  bkTag: '定跡',
  open: '布局', moyo: '{n}模様', fixed: '{n}', who: '{k}（{w}）', formH: '陣形', meC: 'あなた', opC: '相手',
  'fm.full': '士象全', 'fm.link': '士象全・連相', 'fm.part': '士{a}・象{e}',
  'on.zp': '中炮', 'on.zpp': '中炮対屏風馬', 'on.fgm': '中炮対反宮馬', 'on.dtm': '中炮対単提馬', 'on.sp': '順炮', 'on.lp': '列炮',
  'on.xr': '仙人指路', 'on.dbj': '仙人指路（対兵局）', 'on.zdp': '仙人指路対卒底炮', 'on.fx': '飛相局', 'on.fxg': '飛相対過宮炮', 'on.qm': '起馬局', 'on.ggp': '過宮炮', 'on.sjp': '士角炮',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', 'q0': '◎ 最善', 'q1': '○ 良い手', 'q2': '△ 疑問手', 'q3': '✕ 悪手',
  prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  'pt.cap': '💡 相手の駒を取れる手がありました。毎手、取れる駒・取られる駒を確かめよう。', 'pt.mate': '💡 王手をかけて相手の將を追いつめる手がありました。指す前に、王手になる手を全部見てみよう。', 'pt.save': '💡 狙われている駒がありました。相手が次に何を取りたいか（相手のねらい）を先に確かめよう。', 'pt.def': '💡 守りが必要な局面でした。攻めと守りのバランスを考えよう。', 'pt.gen': '💡 自分の作戦だけでなく、相手のねらいも確かめてから指そう。',
  // plans: tag / badge / explanation ({p} the piece, {c} the captured piece)
  'c.mate': '詰み', 'b.mate': '詰ます', 'x.mate': '相手が指せる手がなくなる手です。シャンチーでは詰みだけでなく、指せる手がない側も負けになります。',
  'c.cap': '駒得', 'b.cap': '駒を取る', 'x.cap': '{c}を取って駒得をめざす方針。取ったあとに取り返されないか、相手の反撃も確かめよう。',
  'c.check': '王手', 'b.check': '王手で迫る', 'x.check': '{p}で王手をかけて相手の將に迫る方針。相手の応手が限られるので主導権を握れます。',
  'c.escape': '逃げる', 'b.escape': '帥を逃がす', 'x.escape': '王手を帥（將）を動かしてかわす方針。九宮の中の、相手の駒の利きがない点へ逃げます。',
  'c.block': '王手の受け', 'b.block': '王手を受ける', 'x.block': '王手への対応です。①帥が逃げる ②間に駒を入れる ③王手している駒を取る、から一番損の少ない受けを選びます（炮の王手は、間の駒を動かして台をなくす受けもあります）。',
  'c.save': 'かわす', 'b.save': '駒をかわす', 'x.save': '狙われている{p}を安全な点へ逃がす方針。タダで取られるのを防ぎつつ、移動先でも働く場所を選べると理想的です。',
  'c.rook': '出車', 'b.rook': '車を出す', 'x.rook': '最強の駒・車を戦いに参加させる方針。「一車十子寒」――車が出遅れると全体が働かなくなる、という格言があります。',
  'c.center': '中央', 'b.center': '中央をねらう', 'x.center': '{p}を中央の筋に置いて相手の九宮をねらう方針。中央は帥・將のいる筋なので、攻めの効果が大きい場所です。',
  'c.cross': '兵の前進', 'b.cross': '川を渡る', 'x.cross': '{p}を川の向こうへ進める方針。川を渡った兵は横にも動けるようになり、価値がほぼ倍になります。',
  'c.pawn': '兵を突く', 'b.pawn': '兵を突く', 'x.pawn': '{p}を進めて、馬の通り道を開けたり相手の馬を止めたりする方針。兵は後ろに戻れないので、突く場所はよく考えて。',
  'c.solid': '守りを固める', 'b.solid': '固める', 'x.solid': '{p}を動かして九宮の守りを整える方針。士・象（仕・相）は帥を守る大切な駒です。',
  'c.king': '帥を動かす', 'b.king': '帥を動かす', 'x.king': '帥（將）を動かす方針。相手の將と同じ筋に立てば、その筋をふさぐ攻めにもなります（將帥の対面は禁止）。',
  'c.attack': '攻め', 'b.attack': '攻める', 'x.attack': '{p}を相手の陣地へ進めて攻める方針。主導権を握れる一方、孤立すると取られやすいので、ほかの駒の支えがあるか確かめよう。',
  'c.defend': '受け', 'b.defend': '受ける', 'x.defend': '{p}を自陣に戻して守りに使う方針。安全になりますが、相手に攻める時間を与えることも考えよう。',
  'c.develop': '展開', 'b.develop': '駒を出す', 'x.develop': '{p}を前に出して陣形を整える方針。序盤は車・馬・炮を早く働く場所へ出すのが目標です。',
  'c.wait': '整える', 'b.wait': '整える', 'x.wait': '陣形を整えて相手の出方を見る方針。急がない局面では、一手の価値が高い場所に駒を動かそう。',
  // tips
  'tp.inCheck': '王手されています。①帥が逃げる ②間に駒を入れる ③王手している駒を取る、の全部をくらべよう。',
  'tp.mate1': '相手が指せる手をなくす手（詰み）があります！ 王手になる手を一つずつ確かめてみよう。',
  'tp.threat': '相手は次に一手で詰ませるねらいを持っています。受けるか、それより早く相手の將を詰ませるかの二択です。',
  'tp.hangR': 'あなたの{sq}の車がねらわれています。車は最強の駒、取られると大きな損です。逃げるか、守りの駒を足そう。',
  'tp.hang': 'あなたの{sq}の{p}がねらわれています（守りが足りないか、もっと安い駒で取られます）。逃げる・守る・それ以上に価値のある手を指す、のどれかを選ぼう。',
  'tp.canWin': '相手の{sq}の{p}が取れそうです。取ったあと取り返されないか、相手の反撃とくらべて判断しよう。',
  'tp.emptyMe': 'あなたの炮が中央の筋で相手の將に向いていて、間に駒がありません（空頭炮）。「炮頭空，惡又凶」――とても強い攻めの形です。',
  'tp.emptyOp': '相手の炮が中央の筋であなたの帥に向いていて、間に駒がありません（空頭炮）。中央の守りを最優先で考えよう。',
  'tp.rookLate': '車がまだ最初の位置にあります。「輸棋只因出車遲」――負けるのは車を出すのが遅いから、という格言どおり、早めに車を出そう。',
  'tp.wxm': '馬が九宮の真ん中（帥の前）にいます（窩心馬）。「馬退窩心，不死也昏」――帥や士の動きをふさぐので、長く置かないようにしよう。',
  'tp.cxh': '序盤に炮と馬を交換すると損になりやすいです（「開局時，炮不換馬」）。駒が多い序盤は、台を使える炮のほうが働きます。',
  'tp.king': '「無事不動將」――用がないのに帥を動かすのは避けよう。最初の位置が、士・象に守られたいちばん安全な場所です。',
  'tp.noAdv': '士が欠けているところに相手の車が2枚あります（「缺士怕雙車」）。車2枚の攻めに注意して、車を交換するのも一つの手です。',
  'tp.link': '相（象）が2枚とも残っています。互いに守り合う「連相」の形にしておくと、九宮の守りが安定します。',
  'tp.mp': '馬と炮がそろっています。炮で相手の守り駒を動けなくし、馬でとどめを刺す「馬後炮」は代表的な詰みの形です。',
  'tp.pawnEnd': '終盤は川を渡った兵が勝負を決めることが多いです。支えながら九宮へ近づけよう。ただし一番奥まで行った兵は働きが小さくなります（「老卒無功」）。',
  'tp.cannonHome': '「殘棋炮歸家」――終盤は台になる駒が減って炮の攻めは弱くなります。炮を自陣へ戻して守りに使う手も考えよう。',
  'tp.horseEnd': '「殘棋馬勝炮」――駒が減った終盤では、台がいらない馬のほうが働きやすくなります。',
  'tp.kingEnd': '終盤は帥（將）も戦力です（「老將出馬，一個頂倆」）。相手の將と同じ筋に立てば、その筋をふさぐことができます。',
  'tp.winning': '優勢です。無理に攻めず、相手の反撃の芽をつむ安全な手で勝ちに近づこう（「積小勝為大勝」）。',
  'tp.losing': '劣勢です。守りに回って引き分けをめざすか、相手が間違えやすい複雑な手を選ぼう。',
  'tp.matUp': '駒割りはあなたが約{x}点得です（車9・炮4.5・馬4・士象2・兵1、川を渡った兵2）。駒得はそのまま戦力の差になります。',
  'tp.matDown': '駒割りはあなたが約{x}点損です。駒を取り返すか、駒より位置や攻めの速さで勝負できる場面か考えよう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤は車・馬・炮（主力の駒）をできるだけ早く働く場所へ。同じ駒を何度も動かして手損をしないようにしよう。',
  'tp.open2': '中央を大切に。少なくとも1枚の馬は中央寄り（三・七の筋）に跳ねて、中央の兵を守るのが基本です。',
  'tp.open3': '馬は足（すぐ隣の点）をふさがれると動けません。自分の馬の通り道を開け、相手の馬の通り道はふさごう。',
  'tp.mid1': '中盤は「寧失子，不失先」――駒を1枚失っても、先手（主導権）を失わないことが大切です。',
  'tp.mid2': '攻める前に、相手のねらいを確かめよう。駒をタダで差し出すような手は、ワナのこともあります。',
  'tp.mid3': '相手の弱点（動けない士、守りの薄い筋）を探して、そこに駒を集めよう。',
  var: 'この局面では定跡は使えません。取られる駒・取れる駒・王手を毎手確かめよう。',
  pieces: [['', '帥', '仕', '相', '馬', '車', '炮', '兵'], ['', '将', '士', '象', '馬', '車', '砲', '卒']],
  gl: {
    zp: { m: ['中炮'], t: '中炮（ちゅうほう）', d: '炮を中央の筋（五の筋）に置く布局。相手の中央の卒と九宮をねらいます。もっとも多く指される布局です。' },
    ping: { m: ['屏風馬'], t: '屏風馬（へいふうば）', d: '中炮に対し、両方の馬を中央寄りに跳ねて中央の卒を守る形。屏風のように馬が並ぶことからこう呼ばれ、現代でいちばん多い応じ方です。' },
    fgm: { m: ['反宮馬'], t: '反宮馬（はんきゅうば）', d: '両方の馬のあいだ（士の角）に炮を置く形。中炮に対する有力な守り方です。' },
    shun: { m: ['順炮'], t: '順炮（じゅんぽう）', d: '赤と同じ側の炮を中央に回して、中炮に中炮で応じる布局。' },
    lie: { m: ['列炮'], t: '列炮（れっぽう）', d: '赤と反対側の炮を中央に回して、中炮に中炮で応じる布局。' },
    xr: { m: ['仙人指路'], t: '仙人指路（せんにんしろ）', d: '初手に馬の前の兵（三または七の兵）を突く布局。作戦を相手に読まれにくい柔軟な初手です。' },
    fx: { m: ['飛相局', '飛相'], t: '飛相局（ひしょうきょく）', d: '初手に相を中央へ上げる、守りの固い落ち着いた布局。' },
    qm: { m: ['起馬局'], t: '起馬局（きばきょく）', d: '初手に馬を跳ねる布局。あとから多くの形に組めます。' },
    ggp: { m: ['過宮炮'], t: '過宮炮（かきゅうほう）', d: '炮を九宮の向こう側の筋（六の筋）へ回す布局。' },
    sjp: { m: ['士角炮'], t: '士角炮（しかくほう）', d: '炮を士の角（四の筋）に置く布局。' },
    zdp: { m: ['卒底炮'], t: '卒底炮', d: '仙人指路で突かれた兵と同じ筋に炮を回して圧力をかける応じ方。' },
    dtm: { m: ['単提馬'], t: '単提馬', d: '片方の馬を中央寄りに、もう片方を端に跳ねる守り方。中央の卒を守る馬が1枚になります。' },
    ktp: { m: ['空頭炮'], t: '空頭炮（くうとうほう）', d: '中央の筋の炮と相手の將のあいだに駒が1枚もない形。相手は將を動かしにくく、とても強い攻めの形です。' },
    wxm: { m: ['窩心馬'], t: '窩心馬（かしんば）', d: '九宮の真ん中（帥・將のすぐ前）に入った馬。帥や士の動きをふさぎ、ねらわれやすい形です。' },
    lx: { m: ['連相'], t: '連相（れんしょう）', d: '2枚の相（象）がお互いを守り合っている形。九宮の守りが安定します。' },
    sxq: { m: ['士象全'], t: '士象全（しぞうぜん）', d: '士（仕）2枚と象（相）2枚がすべて残っている状態。守りが堅く、車1枚では崩しにくいとされます。' },
    jg: { m: ['九宮'], t: '九宮（きゅうきゅう）', d: '帥・將と仕・士が動ける、×印のついた3×3の区域。' },
    he: { m: ['川を渡', '川の向こう', '川'], t: '川（河界）', d: '盤の真ん中の境目。兵は川を渡ると横にも動けるようになり、相・象は川を渡れません。' },
    mhp: { m: ['馬後炮'], t: '馬後炮（ばこうほう）', d: '馬が將を押さえ、その後ろの炮で王手する詰みの形。' },
    xs: { m: ['先手（主導権）', '主導権'], t: '主導権', d: '自分の都合で戦いを進められる状態。相手は受けに回ることになります。' },
    zd: { m: ['駒割り', '駒得'], t: '駒割り・駒得', d: '双方の駒の損得。おおよその価値は 車9・炮4.5・馬4・士2・象2・兵1（川を渡った兵は2）。' },
    dm: { m: ['將帥の対面', '対面'], t: '將帥の対面（飛将）', d: '帥と將が同じ筋で、間に駒がないまま向かい合う形は禁止。だから帥のいる筋には、相手の將は入れません。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess what they will play next — the more often you guess right, the stronger your reading gets.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Material', you: 'you',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'mat.even': 'even', 'mat.up': '+{x} pts', 'mat.down': '−{x} pts',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance about {p}%).',
  recSharp: 'The gap to the second choice is large — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'tt.move': 'The {f} {p} {d}', 'd.0': 'goes forward', 'd.1': 'goes back', 'd.2': 'goes sideways', 'd.3': 'moves', 'tt.pawn': 'Push the {f} {p}', 'tt.cross': 'The {f} {p} crosses the river', 'tt.cap': 'The {f} {p} takes the {c}', 'tt.king': 'Move the {p}',
  file: 'file-{n}', front: 'front ', rear: 'rear ',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening crossroads — choosing a system', opIntro: 'The first few moves decide the opening system. Learn the two standard choices first, then try the others.', 'op.main': 'Standard', 'op.alt': 'Other',
  'op.zp.t': 'Cannon to the centre (Central Cannon)', 'op.zp.x': "The cannon goes to the central file, aiming at the central pawn and the palace. It is the classic first move — said to be played in over half of all tournament games.",
  'op.xr.t': 'Push one pawn (Pawn Opening)', 'op.xr.x': "Push the pawn in front of a horse: it opens the horse's path and waits to see the opponent's plan. You can still switch to a Central Cannon, Elephant or Horse setup later, so it is hard to predict.",
  'op.fx.t': 'Raise the elephant (Elephant Opening)', 'op.fx.x': 'A calm first move that strengthens the defence and keeps your plan hidden — for a slow, steady game.',
  'op.qm.t': 'Develop a horse (Horse Opening)', 'op.qm.x': 'A flexible first move: the horse comes out first, and many setups (even a Central Cannon) remain possible.',
  'op.ping.t': 'Develop a horse to guard the centre', 'op.ping.x': "The most normal answer: the horse guards the central pawn the cannon is aiming at. With the other horse out too you get the Screen Horses, the most common modern defence.",
  'op.shun.t': 'Same-side cannon to the centre (Same Direction Cannons)', 'op.shun.x': "Black meets the central cannon with a central cannon from the same side — an old, sharp head-on fight; how the rooks come out decides the variation.",
  'op.lie.t': 'Other-side cannon to the centre (Opposite Direction Cannons)', 'op.lie.x': "Black answers with the cannon from the other side. The direct version is considered flawed, so Black often delays the second cannon.",
  'op.fgm.t': 'The other horse first (toward Sandwiched Horses)', 'op.fgm.x': "Develops the other horse first, planning a cannon on the advisor's corner between the two horses — one of the strong defences against the Central Cannon.",
  'op.zdp.t': "Cannon to the pawn's file (Cannon under the Pawn)", 'op.zdp.x': 'Black puts a cannon on the file of the advanced pawn and puts pressure on it.',
  'op.dbj.t': 'Push the pawn back (pawns face each other)', 'op.dbj.x': "Black answers the same way: both sides open a path for a horse.",
  'op.fxzp.t': 'Cannon to the centre', 'op.fxzp.x': 'Against the raised elephant, Black builds an attack with a central cannon — one of the usual replies to the Elephant Opening.',
  'op.fxgg.t': 'Cannon across the palace (Cross-Palace Cannon)', 'op.fxgg.x': 'The cannon swings to the file on the other side of the palace — the other usual reply to the Elephant Opening.',
  'op.qm7.t': 'Push a pawn', 'op.qm7.x': "Push a pawn: it opens your horse's path and blocks the opponent's horse.",
  bkH: 'Book line — how the opening goes on', bkIntro: "The opening lines of this site's opening collection (Lessons → Openings). In the opening, developing your pieces along the standard lines matters more than small evaluation differences.",
  bkWhy: 'This position is still in the opening book. In {o} the line goes on with {m}.', prevBook: 'A book move ({o}).',
  bkTag: 'Book',
  open: 'System', moyo: 'heading for {n}', fixed: '{n}', who: '{k} ({w})', formH: 'Guards', meC: 'you', opC: 'opponent',
  'fm.full': 'all guards', 'fm.link': 'all guards, linked', 'fm.part': 'advisors {a}, elephants {e}',
  'on.zp': 'Central Cannon', 'on.zpp': 'Central Cannon vs Screen Horses', 'on.fgm': 'Central Cannon vs Sandwiched Horses', 'on.dtm': 'Central Cannon vs Single Horse', 'on.sp': 'Same Direction Cannons', 'on.lp': 'Opposite Direction Cannons',
  'on.xr': 'Pawn Opening', 'on.dbj': 'Pawn Opening (pawns face each other)', 'on.zdp': 'Pawn Opening vs Cannon under the Pawn', 'on.fx': 'Elephant Opening', 'on.fxg': 'Elephant vs Cross-Palace Cannon', 'on.qm': 'Horse Opening', 'on.ggp': 'Cross-Palace Cannon', 'on.sjp': 'Palcorner Cannon',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', 'q0': '◎ Best', 'q1': '○ Good', 'q2': '△ Dubious', 'q3': '✕ Mistake',
  prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'pt.cap': '💡 There was a piece to capture. Every move, check what you can take and what can be taken.', 'pt.mate': "💡 There was a check that pressed the enemy general. Before moving, look at every check you can give.", 'pt.save': '💡 One of your pieces was under attack. First check what the opponent wants to take next.', 'pt.def': '💡 The position needed defence. Balance attack and defence.', 'pt.gen': "💡 Don't look only at your own plan — check the opponent's intention before you move.",
  'c.mate': 'Mate', 'b.mate': 'Mate', 'x.mate': 'This move leaves the opponent without a legal move. In xiangqi a side with no legal move loses — even when it is not in check.',
  'c.cap': 'Material', 'b.cap': 'Capture', 'x.cap': "Capture the {c} to win material. Check that it can't simply be taken back, and what the opponent can do in return.",
  'c.check': 'Check', 'b.check': 'Check', 'x.check': 'Close in on the enemy general with a check by the {p}. The replies are limited, so you keep the initiative.',
  'c.escape': 'Escape', 'b.escape': 'Move the general', 'x.escape': 'Answer the check by moving the general to a point of the palace that no enemy piece attacks.',
  'c.block': 'Answer the check', 'b.block': 'Answer the check', 'x.block': 'You must answer the check: (1) move the general, (2) block, or (3) capture the checking piece — choose the answer that costs least. (Against a cannon check you can also move the screen away.)',
  'c.save': 'Sidestep', 'b.save': 'Save the piece', 'x.save': 'Move the attacked {p} to safety, ideally to a point where it still works.',
  'c.rook': 'Rook out', 'b.rook': 'Develop the rook', 'x.rook': 'Bring the rook — the strongest piece — into the game. A Chinese proverb says that when the rook comes out late, all the other pieces go cold.',
  'c.center': 'Centre', 'b.center': 'Aim at the centre', 'x.center': "Put the {p} on the central file to aim at the enemy palace. The generals stand on that file, so attacks there hit hardest.",
  'c.cross': 'Pawn advance', 'b.cross': 'Cross the river', 'x.cross': 'Take the {p} across the river: there it can also move sideways and is worth about twice as much.',
  'c.pawn': 'Pawn push', 'b.pawn': 'Push a pawn', 'x.pawn': "Push the {p} to open a path for your horse or block the opponent's horse. Pawns can't go back, so choose carefully.",
  'c.solid': 'Strengthen', 'b.solid': 'Strengthen', 'x.solid': 'Move the {p} to tidy up the defence of the palace. Advisors and elephants are the general\'s guards.',
  'c.king': 'General', 'b.king': 'Move the general', 'x.king': "Move the general. Standing on the same file as the enemy general also takes that file away from it (the generals may never face each other).",
  'c.attack': 'Attack', 'b.attack': 'Attack', 'x.attack': "Take the {p} into the opponent's half to attack. You take the initiative, but a lone piece is easily trapped — check that it is supported.",
  'c.defend': 'Defence', 'b.defend': 'Defend', 'x.defend': 'Bring the {p} back to help the defence. You become safer, but you also give the opponent time.',
  'c.develop': 'Development', 'b.develop': 'Develop', 'x.develop': 'Bring the {p} out to build your formation. In the opening the goal is to get rooks, horses and cannons to active posts quickly.',
  'c.wait': 'Tidy up', 'b.wait': 'Tidy up', 'x.wait': 'Improve your formation and wait for the opponent. When nothing is urgent, move a piece where it adds the most value.',
  'tp.inCheck': 'You are in check. Compare all answers: (1) move the general, (2) block, (3) capture the checking piece.',
  'tp.mate1': 'There is a move that leaves the opponent with no legal move (mate)! Try every check, one by one.',
  'tp.threat': 'Your opponent threatens mate on the next move. Either defend, or mate their general first.',
  'tp.hangR': 'Your {sq} rook is under attack. The rook is the strongest piece — losing it is costly. Move it or add a defender.',
  'tp.hang': 'Your {sq} {p} is under attack (not enough defenders, or a cheaper piece can take it). Move it, defend it, or play something even more valuable.',
  'tp.canWin': "The opponent's {sq} {p} can be won. Check that it can't be taken back and compare with the opponent's counter-play.",
  'tp.emptyMe': 'Your cannon on the central file faces the enemy general with nothing in between (an empty-head cannon). The proverb calls it fierce — a very strong attacking setup.',
  'tp.emptyOp': "The opponent's cannon on the central file faces your general with nothing in between (an empty-head cannon). Guard the centre first.",
  'tp.rookLate': 'A rook is still on its starting point. The proverb says games are lost because the rook came out too late — develop it soon.',
  'tp.wxm': "A horse sits in the middle of your palace (a centroid horse). It blocks your general and advisors and is an easy target — don't leave it there long.",
  'tp.cxh': "In the opening, trading a cannon for a horse is usually a bad deal: with many pieces on the board the cannon has screens to jump over and is worth more.",
  'tp.king': "Don't move the general without a reason. Its starting point, guarded by advisors and elephants, is the safest place.",
  'tp.noAdv': 'You are missing an advisor and the opponent still has two rooks — the proverb warns that this is dangerous. Watch out for a double-rook attack; trading a rook can help.',
  'tp.link': 'Both of your elephants are still there. Keep them linked (protecting each other) for a stable palace defence.',
  'tp.mp': 'You have a horse and a cannon. The horse holding the general while the cannon checks from behind it ("horse-behind-cannon") is a classic mating pattern.',
  'tp.pawnEnd': "In the endgame, pawns across the river often decide the game: escort them toward the palace. A pawn that reaches the last rank, though, does little.",
  'tp.cannonHome': 'With fewer pieces left, the cannon has fewer screens and its attack weakens. Bringing it home to defend is a classic endgame idea.',
  'tp.horseEnd': 'In the endgame, a horse is usually better than a cannon: it needs no screen to work on an open board.',
  'tp.kingEnd': 'In the endgame the general is a fighter too: standing on the same file as the enemy general takes that file away from it.',
  'tp.winning': 'You are ahead. No need to force things: play safe moves that leave the opponent no counter-play, and let small gains add up.',
  'tp.losing': 'You are behind. Defend and aim for a draw, or choose complicated moves where the opponent can go wrong.',
  'tp.matUp': 'Material: you are about {x} points up (rook 9, cannon 4.5, horse 4, advisor / elephant 2, pawn 1 — 2 across the river).',
  'tp.matDown': 'Material: you are about {x} points down. Win it back, or play for position and speed if the position allows.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move is much better than the second. Finding it may decide the game.',
  'tp.open1': "In the opening, bring the rooks, horses and cannons to active posts early. Don't move the same piece again and again.",
  'tp.open2': 'Control the centre: develop at least one horse toward the middle to guard the central pawn.',
  'tp.open3': "A horse can't move when the point next to it is occupied. Keep your horses' paths open and block your opponent's.",
  'tp.mid1': 'In the middlegame, keeping the initiative matters more than a single piece: better to lose a piece than to lose the initiative, as the proverb says.',
  'tp.mid2': "Before attacking, check what the opponent is planning — a piece offered for free may be bait.",
  'tp.mid3': "Look for weak spots in the opponent's camp (a pinned advisor, a thinly guarded file) and bring pieces there.",
  var: 'No opening theory applies here. Every move, check for pieces you might lose, pieces you can take, and checks.',
  pieces: [['', 'general', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'pawn'], ['', 'general', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'pawn']],
  gl: {
    zp: { m: ['Central Cannon'], t: 'Central Cannon', d: 'An opening that puts a cannon on the central file, aiming at the central pawn and the palace. The most played opening.' },
    ping: { m: ['Screen Horses'], t: 'Screen Horses', d: 'Against the Central Cannon, both horses come out toward the centre to guard the central pawn — the most common modern defence.' },
    fgm: { m: ['Sandwiched Horses'], t: 'Sandwiched Horses', d: "A cannon on the advisor's corner between the two developed horses — a strong defence against the Central Cannon." },
    shun: { m: ['Same Direction Cannons'], t: 'Same Direction Cannons', d: 'Black answers the Central Cannon with a central cannon from the same side.' },
    lie: { m: ['Opposite Direction Cannons'], t: 'Opposite Direction Cannons', d: 'Black answers the Central Cannon with a central cannon from the other side.' },
    xr: { m: ['Pawn Opening'], t: 'Pawn Opening', d: 'Red opens by pushing the pawn in front of a horse — a flexible, hard-to-predict start.' },
    fx: { m: ['Elephant Opening'], t: 'Elephant Opening', d: 'Red opens by raising an elephant to the centre: a solid, calm start.' },
    ktp: { m: ['empty-head cannon'], t: 'Empty-head cannon', d: 'A cannon on the central file with nothing between it and the enemy general — a very strong attacking setup.' },
    wxm: { m: ['centroid horse'], t: 'Centroid horse', d: 'A horse in the centre of its own palace, right in front of the general. It blocks the general and advisors and is easily attacked.' },
    palace: { m: ['palace'], t: 'Palace', d: 'The 3 × 3 area marked with an ×, where the general and advisors move.' },
    river: { m: ['river'], t: 'River', d: 'The middle line of the board. Pawns that cross it can also move sideways; elephants can never cross it.' },
    init: { m: ['initiative'], t: 'Initiative', d: 'Being the one who makes threats, so the opponent has to answer them.' },
    mat: { m: ['Material', 'material'], t: 'Material', d: 'The balance of pieces. Rough values: rook 9, cannon 4.5, horse 4, advisor 2, elephant 2, pawn 1 (2 across the river).' },
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
const pn = (col, tp) => ((tx('pieces') || TX.en.pieces)[col] || [])[tp] || '';

// --------------------------------------------------------------------------------------------- position facts
const KING = 1, ADVISOR = 2, ELEPHANT = 3, HORSE = 4, ROOK = 5, CANNON = 6, PAWN = 7;
const VAL = [0, 0, 2, 2, 4, 9, 4.5, 1];
const crossed = (col, s) => col ? s >= 45 : s < 45;
const pval = (p, s) => { const tp = E.typeOf(p); return tp === PAWN && crossed(E.colorOf(p), s) ? 2 : VAL[tp]; };
const fwd = (col, s) => col ? Math.floor(s / 9) : 9 - Math.floor(s / 9);   // rank from the side's own back rank (0)
const fileNo = (col, s) => col ? s % 9 + 1 : 9 - s % 9;                     // each side counts files from its own right
const CN = ' 一二三四五六七八九';
function fileName(pos, s) {
  const p = pos.at(s), col = E.colorOf(p), n = fileNo(col, s), l = L();
  const num = (l === 'ja' || l === 'zh') && !col ? CN[n] : String(n);
  let pre = '';
  if (E.typeOf(p) !== KING && E.typeOf(p) !== ADVISOR && E.typeOf(p) !== ELEPHANT) {
    const same = []; for (let r = 0; r < 10; r++) { const q = r * 9 + s % 9; if (pos.at(q) === p) same.push(q); }
    if (same.length === 2) { const front = col ? Math.max(...same) : Math.min(...same); pre = tx(s === front ? 'front' : 'rear'); }
  }
  return pre + tx('file', { n: num });
}
const sqName = s => E.sqName(s);
function mateIn1(pos) {
  for (const m of pos.moves()) { if (!pos.clone().play(m).moves().length) return m; }
  return 0;
}
// a cannon of colour c on the central file facing the enemy general with nothing in between
function emptyHead(pos, c) {
  const k = pos.k[c ^ 1]; if (k < 0 || k % 9 !== 4) return false;
  for (let r = 0; r < 10; r++) {
    const s = r * 9 + 4, p = pos.at(s); if (!p || E.colorOf(p) !== c || E.typeOf(p) !== CANNON) continue;
    const a = Math.min(s, k), b = Math.max(s, k); let n = 0;
    for (let x = a + 9; x < b; x += 9) if (pos.at(x)) n++;
    if (!n) return true;
  }
  return false;
}
function counts(pos, c) {
  const n = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let s = 0; s < 90; s++) { const p = pos.at(s); if (p && E.colorOf(p) === c) n[E.typeOf(p)]++; }
  return n;
}
function material(pos, c) { let v = 0; for (let s = 0; s < 90; s++) { const p = pos.at(s); if (p && E.colorOf(p) === c) v += pval(p, s); } return v; }
// both elephants of colour c protect each other
function linked(pos, c) {
  const el = []; for (let s = 0; s < 90; s++) { const p = pos.at(s); if (p && E.colorOf(p) === c && E.typeOf(p) === ELEPHANT) el.push(s); }
  if (el.length !== 2) return false;
  const [a, b] = el, [ra, ca] = [Math.floor(a / 9), a % 9], [rb, cb] = [Math.floor(b / 9), b % 9];
  if (Math.abs(ra - rb) !== 2 || Math.abs(ca - cb) !== 2) return false;
  return !pos.at(((ra + rb) / 2) * 9 + (ca + cb) / 2);   // the elephant's eye is free
}
function facts(pos, n) {
  const us = pos.side, them = us ^ 1, f = { us, them, n };
  f.check = pos.inCheck();
  f.nm = s => fileName(pos, s);   // where a piece stands, as its owner counts the files
  f.mate1 = mateIn1(pos);
  f.threat = 0;
  if (!f.check) { const q = pos.clone(); q.side ^= 1; if (!q.inCheck()) f.threat = mateIn1(q); }
  const hv = s => pval(pos.at(s), s);
  f.hang = [...E.threats(pos, them)].map(s => ({ sq: s, tp: E.typeOf(pos.at(s)), v: hv(s) })).sort((a, b) => b.v - a.v);
  f.win = [...E.threats(pos, us)].map(s => ({ sq: s, tp: E.typeOf(pos.at(s)), v: hv(s) })).sort((a, b) => b.v - a.v);
  f.cnt = [counts(pos, 0), counts(pos, 1)];
  f.mat = Math.round((material(pos, us) - material(pos, them)) * 2) / 2;
  const majors = f.cnt[0][ROOK] * 2 + f.cnt[0][HORSE] + f.cnt[0][CANNON] + f.cnt[1][ROOK] * 2 + f.cnt[1][HORSE] + f.cnt[1][CANNON];
  f.stage = majors <= 6 ? 'end' : (n < 16 && majors >= 14) ? 'open' : 'mid';
  f.empty = [emptyHead(pos, 0), emptyHead(pos, 1)];
  f.link = [linked(pos, 0), linked(pos, 1)];
  const home = us ? [0, 8] : [81, 89];
  f.rookHome = home.filter(s => pos.at(s) === (ROOK | (us << 3))).length;
  f.wxm = pos.at(us ? 13 : 76) === (HORSE | (us << 3));
  f.kingMoved = pos.k[us] !== (us ? 4 : 85);
  return f;
}
// what a candidate move is about
function classify(pos, m, f) {
  const us = pos.side, from = E.mFrom(m), to = E.mTo(m), p = pos.at(from), tp = E.typeOf(p), cap = pos.at(to);
  const after = pos.clone().play(m);
  const dr = fwd(us, to) - fwd(us, from), r = { p: pn(us, tp), c: cap ? pn(us ^ 1, E.typeOf(cap)) : '', sq: from, tp, f: fileName(pos, from), cross: false, dir: dr > 0 ? 0 : dr < 0 ? 1 : 2 };
  const mk = k => Object.assign(r, { k });
  if (!after.moves().length) return mk('mate');
  if (f.check) return mk(tp === KING ? 'escape' : 'block');
  if (cap && pval(cap, to) >= 2) return mk('cap');
  if (after.inCheck()) return mk('check');
  if (f.hang.some(h => h.sq === from)) return mk('save');
  if (cap) return mk('cap');
  if (tp === PAWN) { r.cross = !crossed(us, from) && crossed(us, to); return mk(r.cross ? 'cross' : 'pawn'); }
  if (tp === KING) return mk('king');
  if (tp === ROOK && fwd(us, from) === 0 && (from % 9 === 0 || from % 9 === 8)) return mk('rook');
  if (tp === CANNON && to % 9 === 4 && from % 9 !== 4) return mk('center');
  if (tp === ADVISOR || tp === ELEPHANT) return mk('solid');
  const fr = fwd(us, from), tr = fwd(us, to);
  if (tr >= 5 && tr >= fr) return mk('attack');
  if (tr < fr && tr <= 2) return mk('defend');
  if (tr > fr || (tp === ROOK && fr === 0)) return mk(tp === ROOK && fr === 0 ? 'rook' : 'develop');
  return mk('wait');
}
const CCLS = { mate: 'c-mate', cap: 'c-mat', check: 'c-atk', attack: 'c-atk', center: 'c-atk', cross: 'c-atk', escape: 'c-def', block: 'c-def', save: 'c-def', solid: 'c-def', defend: 'c-def', king: 'c-def', rook: 'c-dev', develop: 'c-dev', pawn: 'c-dev', wait: 'c-calm' };
const RCLS = { mate: 'r-mate', escape: 'r-def', block: 'r-def', save: 'r-def', solid: 'r-def', defend: 'r-def', king: 'r-def' };
const winRate = v => (1 + sOfV(v)) / 2;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }

// --------------------------------------------------------------------------------------------- openings
const iccs = m => E.sqName(E.mFrom(m)) + E.sqName(E.mTo(m));
// the first moves (from opening theory): [move (ICCS), main | alt, text key]
const OPEN = {
  '': [['h2e2', 'main', 'zp'], ['c3c4', 'main', 'xr'], ['g0e2', 'alt', 'fx'], ['h0g2', 'alt', 'qm']],
  'h2e2': [['h9g7', 'main', 'ping'], ['h7e7', 'main', 'shun'], ['b7e7', 'alt', 'lie'], ['b9c7', 'alt', 'fgm']],
  'c3c4': [['b7c7', 'main', 'zdp'], ['g6g5', 'main', 'dbj']],
  'g0e2': [['h7e7', 'main', 'fxzp'], ['h7d7', 'main', 'fxgg']],
  'h0g2': [['g6g5', 'main', 'qm7']],
};
const fresh = () => !startSpec;
const histKey = n => moves.slice(0, n).map(iccs).join(' ');
function openingOf() {
  if (!fresh() || cur > 1) return null;
  const e = OPEN[histKey(cur)]; if (!e) return null;
  const pos = posAt(cur).pos, legal = pos.moves(), out = [];
  for (const [u, kind, key] of e) {
    const m = E.parse(pos, u); if (m == null || !legal.includes(m)) continue;
    out.push({ m, kind, key, nm: mvIn(pos, m) });
  }
  return out.length ? out : null;
}
// openings.json (the site's opening collection): the named first moves of each opening; the next book moves after `ply`
function bookAt(ply) {
  const O = typeof OPEN_DATA === 'function' ? OPEN_DATA() : null;
  if (!O || !fresh() || ply > 12) return null;
  const hist = moves.slice(0, ply), out = new Map();
  for (const g of O.sets) {
    const line = g.study.line.slice(0, g.named || g.show || 3);
    if (line.length <= ply || hist.some((m, i) => line[i] !== m)) continue;
    const m = line[ply], o = out.get(m) || { m, sets: [] };
    if (!o.sets.includes(g)) o.sets.push(g);
    out.set(m, o);
  }
  return out.size ? [...out.values()].sort((a, b) => b.sets.length - a.sets.length) : null;
}
const setName = g => { const o = g.title; return o ? (o[LANG] !== undefined ? o[LANG] : o.en || o.ja) : g.id; };
// the opening system at the current position: { id, settled }
function systemOf() {
  if (!fresh() || !moves.length) return null;
  const h = moves.slice(0, Math.min(cur, 16)).map(iccs), r0 = h[0];
  const fam = { h2e2: 'zp', b2e2: 'zp', c3c4: 'xr', g3g4: 'xr', c0e2: 'fx', g0e2: 'fx', b0c2: 'qm', h0g2: 'qm', h2d2: 'ggp', b2f2: 'ggp', h2f2: 'sjp', b2d2: 'sjp' }[r0];
  if (!fam) return null;
  const pos = posAt(cur).pos, B = s => pos.at(sqOf(s));
  const bm = h.filter((_, i) => i % 2 === 1);
  if (fam === 'zp') {
    const cc = bm.find(u => /^[bh]7e7$/.test(u));
    if (cc) return { id: cc[0] === r0[0] ? 'sp' : 'lp', settled: true };
    const hz = s => B(s) === (HORSE | 8);
    const pr = (hz('c7') ? 1 : 0) + (hz('g7') ? 1 : 0), edge = hz('a7') || hz('i7');
    if (pr === 2) return { id: (B('d7') === (CANNON | 8) || B('f7') === (CANNON | 8)) ? 'fgm' : 'zpp', settled: true };
    if (pr === 1 && edge) return { id: 'dtm', settled: true };
    if (pr === 1) return { id: 'zpp', settled: cur >= 10 };
    return { id: 'zp', settled: cur >= 10 || bm.length >= 2 };
  }
  if (fam === 'xr' && bm.length) { if (/^[cg]6[cg]5$/.test(bm[0])) return { id: 'dbj', settled: true }; if (/^[bh]7[cg]7$/.test(bm[0])) return { id: 'zdp', settled: true }; }
  if (fam === 'fx' && bm.length && /^[bh]7[df]7$/.test(bm[0])) return { id: 'fxg', settled: true };
  return { id: fam, settled: cur >= 3 };
}
const sqOf = n => (9 - +n[1]) * 9 + 'abcdefghi'.indexOf(n[0]);

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, reveal: false, key: '', f: null, cls: null, hover: null, arrows: null };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !rgame && !(typeof inStudy === 'function' && inStudy()) && (settings.mode === 'ai' || settings.mode === 'pvp') && !(window.olLive && olLive()));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null; S.cls = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, hang: [], win: [], cnt: [[], []] }; }
  return S.f;
}
const listAt = i => (typeof anaCache !== 'undefined' && anaCache.get(keyOf(i))) || null;
function candInfo(list, f) {
  if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const pos = posAt(cur).pos.clone(), sorted = list.slice().sort((a, b) => b.v - a.v);
  const wb = winRate(sorted[0].v), items = [];
  for (const c of sorted.slice(0, 5)) {
    let k = { k: 'wait', p: '', c: '' }; try { k = classify(pos, c.m, f); } catch (e) {}
    items.push({ m: c.m, k, drop: Math.max(0, wb - winRate(c.v)), nm: mvIn(pos, c.m), v: c.v });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null, won = Math.abs(sorted[0].v) > WINT;
  const r = { list, items, dirs, best: items[0], branch: close.length >= 2 && !won, sharp: second != null && second >= 0.12 && !won, only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function ttl(d) {
  const k = d.k; if (!k.p) return tx('b.' + k.k);
  if (k.tp === KING) return tx('tt.king', { p: k.p });
  if (k.c) return tx('tt.cap', { p: k.p, c: k.c, f: k.f });
  if (k.tp === PAWN) return tx(k.cross ? 'tt.cross' : 'tt.pawn', { p: k.p, f: k.f });
  return tx('tt.move', { p: k.p, f: k.f, d: tx('d.' + (k.dir != null ? k.dir : 3)) });
}
const catTxt = k => tx('x.' + k.k, { p: k.p || '', c: k.c || '' });
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const us = f.us, them = f.them, me = f.cnt[us] || [], op = f.cnt[them] || [];
  if (f.check) add('tp.inCheck', 100, null, 1);
  if (f.mate1) add('tp.mate1', 96, null, 1);
  if (f.threat) add('tp.threat', 92, null, 1);
  if (f.empty && f.empty[them]) add('tp.emptyOp', 88, null, 1);
  const hr = f.hang.find(h => h.tp === ROOK);
  if (hr) add('tp.hangR', 86, { sq: f.nm(hr.sq) }, 1);
  const h = f.hang.find(x => x !== hr && x.v >= 2);
  if (h) add('tp.hang', 76, { p: pn(us, h.tp), sq: f.nm(h.sq) });
  const w = f.win.find(x => x.v >= 2);
  if (w) add('tp.canWin', 78, { p: pn(them, w.tp), sq: f.nm(w.sq) });
  if (f.empty && f.empty[us]) add('tp.emptyMe', 64);
  if (f.wxm) add('tp.wxm', 62);
  if (f.rookHome && f.n >= 8 && f.stage !== 'end') add('tp.rookLate', f.stage === 'open' ? 60 : 50);
  if (me[ADVISOR] < 2 && op[ROOK] >= 2) add('tp.noAdv', 54);
  if (f.stage === 'open' && me[CANNON] < 2 && op[HORSE] < 2) add('tp.cxh', 44);
  if (f.kingMoved && !f.check && f.stage !== 'end') add('tp.king', 40);
  if (me[ELEPHANT] === 2 && !f.link[us] && f.stage === 'mid') add('tp.link', 30);
  if (me[HORSE] && me[CANNON] && f.stage !== 'open') add('tp.mp', 28);
  if (Math.abs(f.mat) >= 2) add(f.mat > 0 ? 'tp.matUp' : 'tp.matDown', 34, { x: Math.abs(f.mat) });
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56);
  if (f.stage === 'open') { add('tp.open1', 26); add('tp.open2', 22); add('tp.open3', 18); }
  else if (f.stage === 'mid') { add('tp.mid1', 20); add('tp.mid2', 16); add('tp.mid3', 14); }
  else {
    if (me[PAWN]) add('tp.pawnEnd', 32);
    if (me[CANNON]) add('tp.cannonHome', 24);
    if (me[HORSE] || op[HORSE]) add('tp.horseEnd', 18);
    add('tp.kingEnd', 22);
  }
  return out.sort((a, b) => b.pr - a.pr);
}
// the verdict on the player's previous move (graded against the analysis of the position before it)
function verdictHtml() {
  let i = moves.length - 1;
  if (settings.mode === 'ai') { while (i >= 0 && toMoveAt(i) !== humanColor) i--; if (i < moves.length - 2) return ''; }
  if (i < 0) return '';
  const pos = posAt(i).pos, m = moves[i], nm = mvIn(pos, m);
  const bk = bookAt(i), inBook = bk && bk.find(x => x.m === m);
  if (inBook) return CoachKit.verdict(1, esc(tx('prev', { m: nm, q: tx('q1') })), gl(esc(tx('prevBook', { o: inBook.sets.map(setName).join(' / ') }))));
  const L = listAt(i); if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = winRate(best.v) - winRate(mine.v);
  let g = mine.m === best.m || mine.v >= best.v - 15 ? 0 : loss < 0.05 ? 1 : loss < 0.13 ? 2 : 3;
  if (bk && g > 1) g = 1;   // (in the book range a move is not called a mistake)
  let body = '';
  try {
    const f0 = facts(pos.clone(), i), kb = classify(pos.clone(), best.m, f0);
    if (best.m === m) body = esc(tx('prevBest', { c: tx('c.' + kb.k) }));
    else {
      body = esc(tx(g <= 1 ? 'prevAltOk' : 'prevAlt', { m: mvIn(pos, best.m), c: tx('c.' + kb.k) }));
      if (g >= 2) body += '<br>' + esc(tx({ cap: 'pt.cap', mate: 'pt.mate', check: 'pt.mate', save: 'pt.save', block: 'pt.def', escape: 'pt.def', defend: 'pt.def', solid: 'pt.def' }[kb.k] || 'pt.gen'));
    }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: nm, q: tx('q' + g) })), gl(body));
}
function chipsOf(f, wr) {
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + Math.round(wr * 100) + '%'), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  const sys = systemOf();
  if (sys) chips.push({ k: tx('open'), v: esc(tx(sys.settled ? 'fixed' : 'moyo', { n: tx('on.' + sys.id) })) });
  if (f.cnt && f.stage !== 'end') {
    const fm = c => { const n = f.cnt[c]; return n[ADVISOR] === 2 && n[ELEPHANT] === 2 ? tx(f.link[c] ? 'fm.link' : 'fm.full') : tx('fm.part', { a: n[ADVISOR], e: n[ELEPHANT] }); };
    chips.push({ k: tx('who', { k: tx('formH'), w: tx('meC') }), v: esc(fm(f.us)), cls: f.cnt[f.us][ADVISOR] + f.cnt[f.us][ELEPHANT] === 4 ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('formH'), w: tx('opC') }), v: esc(fm(f.them)) });
  }
  if (f.mat != null) chips.push({ k: tx('mat'), v: esc(Math.abs(f.mat) < 1 ? tx('mat.even') : tx(f.mat > 0 ? 'mat.up' : 'mat.down', { x: Math.abs(f.mat) })), cls: f.mat >= 1 ? 'pos' : f.mat <= -1 ? 'neg' : '' });
  return chips;
}
function render() {
  if (!card) return;
  if (XqCoach.sw) XqCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach tab
  // shows the review instead; before the review exists, a short note with a button to start it
  const rv = !!document.querySelector('#reviewCard.show'), over = gameOver(moves.length);
  const playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv && moves.length > 0));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none') b.click(); }
  S.rvWas = rv;
  S.arrows = null;
  if (!can) return;
  if (over) {
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`);
  const f = factsNow();
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span><small>${esc(tx('st.' + (f.stage || 'mid')))}</small></h3>`;
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const list = listAt(cur), cl = candInfo(list, f);
  const wr = cl ? winRate(cl.best.v) : null;
  h += CoachKit.summary(chipsOf(f, wr));
  const op = openingOf();
  let shown = false;
  if (op) {
    S.arrows = op.map(d => d.m); shown = true;
    h += CoachKit.branches({ head: tx('opH'), intro: esc(tx('opIntro')), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t')), text: gl(esc(tx('op.' + d.key + '.x'))), move: String(d.m), mvName: d.nm })) });
  } else {
    const bk = bookAt(cur);
    if (bk) {
      const pos = posAt(cur).pos.clone(), legal = pos.moves();
      const items = bk.filter(x => legal.includes(x.m)).slice(0, 4).map(x => { let k = { k: 'wait', p: '', c: '' }; try { k = classify(pos, x.m, f); } catch (e) {} return { m: x.m, k, nm: mvIn(pos, x.m), o: x.sets.map(setName).join(' / ') }; });
      if (items.length) {
        shown = true; S.arrows = items.map(d => d.m);
        const b = items[0];
        h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { o: b.o, m: b.nm }))), RCLS[b.k.k] || '');
        h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
          items: items.map(d => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d)), text: gl(esc(d.o + ' — ' + catTxt(d.k))), gap: tx('bkTag'), gcls: 'g0', move: String(d.m), mvName: d.nm })) });
      }
    }
  }
  if (!shown && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(winRate(b.v))), p: Math.round(winRate(b.v) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp')); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    if (S.reveal) S.arrows = cl.dirs.map(d => d.m);
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]), gcls: g[1], move: String(d.m), mvName: d.nm }; }) });
  } else if (!shown) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} S.hover = null; render(); renderFx(); },
    onHover: u => { S.hover = u == null ? null : +u; renderFx(); },
  });
}
// arrows on the board for the hovered candidate (opening / book moves: only the hovered one)
function fx(svg) {
  if (!active() || !S.arrows || !myTurn()) return;
  const list = S.hover != null ? S.arrows.filter(m => m === S.hover) : [];
  for (const m of list) svgArrow(svg, mPath(m), 'ok ck');
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  if (settings.coach === undefined) settings.coach = true;
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  XqCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hover = null; render(); renderFx();
  if (v && !gameOver(cur) && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (XqCoach.sw) XqCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.XqCoach = { init, render, relabel, merge, tx, TX, active, fx, systemOf, bookAt };
})();
