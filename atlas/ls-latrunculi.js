/* =====================================================================
   Ludus latrunculorum — the lessons on the 3D table (atlas/lessons3d.js DATA.latrunculi, 2026-11-27 担当C).
   latrunculi/lessons.json (Seneca rules; the same file as the 2D lessons, progress the full game's 'aicoding-latrunculi-lessons'
   { id: { best, clear } }), told by ポンメェ (Pawnlamb, the guide of atlas/rules/latrunculi.js and the 3D puzzles
   atlas/games/latrunculi-pz.js). Every reason is a fact of the board, counted by latrunculi/ls-facts.js (the 2D and
   tools/lesson-verify-latrunculi-ls.js read the same): goal() the moves that reach the lesson's goal, wrong() what a wrong move does
   (encloses nothing / one counter only / leaves your face-down counter to be taken / leaves a reply enclosing one of yours / an
   enclosure the opponent rescues by enclosing a holder), marks() the counters the hint rings.
   No coordinates on the 3D board: the answer is the green move, yours the red one, the opponent's reply after it gold.
   Other languages: the 2D words (latrunculi/i18n-lt*.js) with the moves named by their marks; the 2D words that name squares
   ({y} {t} {h}) have their own 3D lines here (NG3), without the squares.
   AtlasLsLatrunculi.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_block', 'b_edge', 'b_corner', 'b_rescue', 's_safe', 's_double', 's_two'];
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const ENG = '../latrunculi/engine.js?v=12';   // (= atlas/games/latrunculi.js and latrunculi/index.html: one cache)
  // ---------- ポンメェ's words (ja) ----------
  const JA = {
    intro: {
      b_block: 'アヴェ！ ポンメェだよ。ラトルンクリは古代ローマの兵士のゲーム。相手の駒を<b>たてかよこの両側から挟む</b>と、裏返って動けなくなるんだ。<br>裏返った駒は<b>次の自分の番のはじめ</b>に取れる。相手を1個まで減らせば勝ちだメェ。まずは<b>挟む1手</b>を探そう！',
      b_edge: '盤のはし（辺）にいる駒は、外側から押さえられない。そのかわり、<b>辺に沿った両どなり</b>をそろえれば挟めるんだメェ。<br>辺にいる相手の駒を挟む手を探そう！',
      b_corner: '隅にいる駒には、反対側のマスがないんだ。でも<b>隅のとなりの2マス</b>を両方押さえれば、挟んだことになるメェ。<br>隅の相手の駒をねらう手を探そう！',
      b_rescue: '味方が挟まれて裏返っちゃった！ このままだと、相手の番のはじめに取られるメェ。<br>助ける方法は、<b>挟んでいる2個のどちらか</b>をこっちから挟み返すこと。そうすれば味方は表に戻るんだ。',
      s_safe: 'ここからは<b>作戦</b>のレッスン。片側を相手に押さえられ、反対側が空いている駒は<b>次に挟まれる</b>んだメェ。<br>逃げるか、空いたマスを味方でふさぐか。どの駒も挟まれない手を探そう！',
      s_double: '1つのマスに入ると、<b>2つの方向で同時に</b>挟めることがあるんだ。取れるのは1手に1個でも、相手は両方を助けるのが大変だメェ。<br>1手で2個挟む手を探そう！',
      s_two: '挟んでも、相手に<b>挟み返されたら</b>助けられちゃう。だから強い人は、挟む前に相手の返しを数えるんだメェ。<br>相手が助けられない挟み方で、<b>次の番に必ず取れる</b>手を探そう！',
    },
    ask: {
      b_block: ['相手の駒を両側から挟める手はどれかな？', 'となりに味方がいる相手の駒を探して！ 挟む1手はどれ？', 'メェ、挟めそうな駒は見えるかな？ 反対側へ動く手を探そう！', '動かした駒で両側がそろう手はどこ？', '挟める手は1つだけ。じっくり探してみて！'],
      b_edge: ['辺にいる相手の駒を挟む手はどれ？', 'メェ、辺に沿って両どなりをそろえる手を探そう！', '辺の駒は外から押さえられない。どこへ動けば挟めるかな？', '辺に沿った反対側のマスへ届く駒はどれ？', '辺の相手の駒、挟む1手を見つけて！'],
      b_corner: ['隅にいる相手の駒を挟む手はどれ？', '隅のとなりの2マス、空いているのはどっちかな？', 'メェ、隅の駒をねらおう！ どの駒をどこへ動かす？', '隅のとなりをもう1つ押さえる手を探して！', '隅の相手の駒、挟む1手はどこ？'],
      b_rescue: ['裏返った味方を助ける手はどれ？', 'メェ、挟まれた味方がいるね。助ける1手を探そう！', '挟んでいる相手の駒を、挟み返せないかな？', '取られる前に助けよう！ どの手なら味方が自由になる？', '味方を挟んでいる2個のうち、ねらえるのはどっち？'],
      s_safe: ['次に自分の駒が挟まれない手はどれ？', 'メェ、ねらわれている駒がいるよ。守る手を探そう！', '相手の次の手まで考えて、どの駒も挟まれない手は？', '逃げるか、ふさぐか。安全になる手はどれかな？', 'ねらわれた駒を守って！ どう動けばいい？'],
      s_double: ['1手で相手の駒を2個挟める手はどれ？', 'メェ、2つの方向で同時に挟めるマスを探そう！', '1個だけじゃもったいない。2個まとめて挟む手は？', 'どのマスに入れば、2つの方向がそろうかな？', '2個いっぺんに挟む1手を見つけて！'],
      s_two: ['次の番に必ず駒が取れる手はどれ？', 'メェ、挟んだあと相手に助けられない手を探そう！', '相手の返しまで数えて、確実に取れる挟み方は？', '挟み返されない挟み方はどれかな？', '助けられない形で挟む1手を見つけて！'],
    },
    askLast: {
      b_block: ['メェ、これで最後！ 相手の駒を挟む手はどれ？', 'ラストの問題だよ。挟める1手をじっくり探して！'],
      b_edge: ['メェ、これで最後！ 辺の駒を挟む手はどれ？', 'ラストの問題だよ。辺に沿って挟む1手を探して！'],
      b_corner: ['メェ、これで最後！ 隅の駒を挟む手はどれ？', 'ラストの問題だよ。隅のとなりをそろえる手を探して！'],
      b_rescue: ['メェ、これで最後！ 味方を助ける手はどれ？', 'ラストの問題だよ。挟み返して味方を助けよう！'],
      s_safe: ['メェ、これで最後！ どの駒も挟まれない手はどれ？', 'ラストの問題だよ。相手の次の手まで読んで守ろう！'],
      s_double: ['メェ、これで最後！ 2個同時に挟む手はどれ？', 'ラストの問題だよ。2つの方向がそろうマスを探して！'],
      s_two: ['メェ、これで最後！ 次の番に必ず取れる手はどれ？', 'ラストの問題だよ。助けられない挟み方を探して！'],
    },
    hint: {
      b_block: ['金の輪の駒は、となりに味方がいる相手の駒。反対側のマスへ動ける駒はいるかな？', 'メェ、光っている相手の駒の、味方と反対側を見てみて！', '金の輪の駒を挟むには、向こう側のマスに駒が要るんだ。届く駒を探そう。', '光る駒のうち、反対側のマスへ1歩か跳び越えで入れるのはどれ？', '輪のついた相手の駒の両どなりを見よう。空いている側に入れば挟めるね！'],
      b_edge: ['金の輪の駒は、辺にいて、辺に沿ったとなりに味方がいる相手の駒。反対側は空いているかな？', 'メェ、光っている辺の駒の、辺に沿った反対側を見てみて！', '辺の駒は辺に沿って挟むんだ。金の輪の駒の、もう片方のとなりへ届く駒は？', '光る駒の外側はもう盤の外。辺に沿った両どなりを数えよう！', '輪のついた辺の駒、味方と反対側のマスに入れる駒を探そう！'],
      b_corner: ['金の輪の駒が、隅にいる相手の駒。隅のとなりの2マスのうち、空いているのはどっち？', 'メェ、光っている隅の駒のとなりを見て。1つはもう味方が押さえている。あと1マス！', '隅のとなりの空きマスへ届く駒はどれかな？ 1歩でも跳び越えでもいいよ。', '金の輪の隅の駒は、となり2マスがそろえば挟めるんだ。', '輪のついた隅の駒、残りのとなりマスに入れる駒を探そう！'],
      b_rescue: ['金の輪の2個が、味方を挟んでいる相手の駒。どちらかを挟み返せないかな？', 'メェ、光っている相手の駒の、それぞれの両どなりを見てみて！', '挟んでいる駒が裏返れば、味方への挟みは消えるんだ。金の輪の駒をねらおう。', '光る2個のうち、反対側のマスに味方が入れるのはどっち？', '輪のついた相手の駒の向こう側、空いているマスはあるかな？'],
      s_safe: ['金の輪の駒が、次にねらわれている味方。片側に相手、反対側が空いている。', 'メェ、光っている味方の空いた側に、相手が入ってきたら挟まれちゃう。', '金の輪の駒を逃がすか、空いたマスを味方でふさぐか。どっちにする？', '光る駒を動かすなら、動いた先でまた挟まれないかも確かめよう！', '輪のついた味方を守る手は、相手の次の手を全部見てから決めよう！'],
      s_double: ['金の輪の駒は、となりに味方がいる相手の駒。2個の向こう側が同じマスにならない？', 'メェ、光っている相手の駒が2個並ぶあたりを見てみて！', '1つのマスから、2つの方向の挟みがそろう場所を探そう。', '光る駒のうち、どの2個を同時にねらえる？', '輪のついた相手の駒、それぞれの反対側のマスを数えてみて！'],
      s_two: ['金の輪の駒は、いま挟める相手の駒。挟んだあと、相手が挟み返せるか数えよう。', 'メェ、光っている駒を挟んだら、挟んでいる味方の両どなりはどうなる？', '挟み返されるのは、挟んでいる味方の反対側が空いているとき。金の輪のまわりを見てみて。', '光る駒のうち、挟んだあと相手が助けに来られないのはどれ？', '輪のついた駒を挟む手ごとに、相手の返しを1つずつ確かめよう！'],
    },
    cheer: ['メェ、正解！', 'お見事！', 'さすが！', 'いいね、その手！', 'すごい！ 正解！', 'やったね！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってる！', '目が慣れてきたメェ。次へ！', 'その見方、次でも使えるはず！', 'いい流れ。もう1問いこう！'],
    soft: ['ドンマイ！', 'だいじょうぶ、ここで覚えよう！', 'これはよくある見落とし！', 'いっしょに確かめよう！', '次はきっと見つかる！', 'もう一度、盤を見てみよう！'],   /* 追66・追68: said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 */
    w: {
      b_block: ['相手の駒を両側から挟んだね。次の番のはじめに取れるメェ。', '両側がそろって、相手の駒は裏返ったよ。もう動けないんだ。', '挟めたね！ 裏返った駒は、次のきみの番のはじめに取り除けるよ。', 'その1手で、となりの味方と相手の駒を挟めたんだメェ。', '両どなりを押さえたね。これで相手の駒は動けない！'],
      b_edge: ['辺に沿って両どなりがそろったね。辺の駒も挟めるんだメェ。', '外側がなくても、辺に沿えば挟める。相手の駒は裏返ったよ。', '辺の相手の駒を、辺の上で両側から押さえた！', 'その手で辺の駒は動けなくなった。次の番のはじめに取れるメェ。', '辺の上の両どなり、きっちり押さえられたメェ。'],
      b_corner: ['隅のとなりの2マスがそろった！ 隅の駒は裏返ったメェ。', '隅には反対側がない。だから、となり2マスで挟めるんだ。', 'これで隅の相手の駒は動けない。次の番のはじめに取れちゃう！', '隅のとなりをもう1つ押さえて、挟みが完成したよ。', '隅の駒、きっちり閉じこめたメェ。'],
      b_rescue: ['挟んでいた駒を挟み返したね。味方は表に戻って自由だメェ。', '相手の駒が裏返ったから、味方への挟みは消えたんだ。', 'これで味方は取られない。今度は相手の駒が裏返ったよ！', '挟んでいる側を挟む。これが助け方なんだメェ。', '味方は助かって、相手の駒が裏返った。立場が入れかわった！'],
      s_safe: ['これで相手は次の手で、どの駒も挟めないメェ。', 'ねらわれた駒が安全になった！ 相手の挟む手は0だメェ。', '相手の次の手を全部見ても、挟まれる駒はないんだ。', '危ない形を消せた！ これでどの駒も挟まれないメェ。', '守りの1手、決まった！ 相手は挟む手がなくなったよ。'],
      s_double: ['2つの方向で同時に挟んだね。相手は2個とも助けるのは大変だメェ。', '1手で2個が裏返ったよ。次の番に1個は取れるね！', '2つの方向がそろうマスに入ったんだ。2個いっぺんに挟めたメェ。', '相手の駒が2個とも動けなくなった。両方は助けにくいメェ。', 'そのマスから2つの方向で挟みがそろったんだ。2個同時だよ！'],
      s_two: ['相手はどう動いても助けられない。次の番に必ず取れるメェ。', '挟み返す手がない挟み方！ これで1個は確実だメェ。', '相手の返しを全部見ても、裏返った駒は残るんだ。', '助けに来られる駒がいない形で挟んだ。読みがさえてる！', 'これで次の番のはじめに、きっちり取れるメェ。'],
    },
    n: {
      none_b_block: ['赤い手では、相手の駒をどれも挟めないんだ。緑の手なら両側がそろって挟めたメェ。', '赤の手だと、両どなりがそろう相手の駒がないんだ。緑の手を見てみて、挟めるよ！', 'メェ、赤では何も裏返らないんだ。緑の手なら、味方と反対側に入って挟めたよ。', '赤の行き先では、相手の駒の向こう側に味方がいないの。緑の手が挟む手だったんだ。', '赤い手では挟みがそろわないから、相手の駒はみんな表のまま。緑の手で挟めたよ。'],
      none_b_edge: ['赤い手では、辺の駒も、ほかの駒も挟めないんだ。緑の手なら辺に沿って挟めたメェ。', '赤の手だと、辺に沿った両どなりがそろわないの。緑の手を見てみて！', 'メェ、赤では何も裏返らないの。緑の手は、辺の駒の反対側に入る手だったよ。', '辺の駒は外から押さえられないから、赤ではそろわないんだ。緑の手なら辺に沿ってそろったよ。', '赤い手では辺に沿ってそろわないから、辺の駒は表のまま。緑の手なら挟めた！'],
      none_b_corner: ['赤い手では、隅の駒も、ほかの駒も挟めないんだ。緑の手なら隅のとなり2マスがそろったメェ。', '赤の手だと、隅のとなりの空きマスが埋まらないんだ。緑の手を見てみて！', 'メェ、赤では何も裏返らないの。緑の手は、隅のとなりの残り1マスに入る手だよ。', '隅の駒はとなり2マスで挟むんだ。赤ではそろわない。緑の手でそろったよ。', '赤い手ではとなり2マスがそろわないから、隅の駒は表のまま。緑の手なら挟めた！'],
      none_s_double: ['赤い手では、相手の駒を1個も挟めないんだ。緑の手なら2個同時に挟めたメェ。', '赤の手だと、何も裏返らないね。緑の手を見てみて、2つの方向がそろうよ！', 'メェ、赤では挟みが1つもできないの。緑の手は2個まとめて挟む手だったんだ。', '赤の行き先では、相手の駒の向こうに味方がいないんだ。緑の手なら2個いっぺんだよ。', '赤い手ではどの方向もそろわないから、相手の駒はみんな表のまま。緑の手で2個挟めたよ。'],
      tail: ['しかも相手は金の手で、きみの駒を挟めちゃう。', 'そのうえ金の手で、相手にきみの駒を挟まれる。', 'おまけに金の手で、相手はきみの駒をねらえるね。', 'さらに金の手で、きみの駒が裏返されちゃう。', 'それに相手は、金の手できみの駒を挟めるの。'],
      rescue: ['赤の手では、挟まれた味方は裏返ったまま。相手の番のはじめに取られちゃうメェ。緑の手なら、挟んでいる駒を挟み返せたよ。', '赤だと、味方を挟んでいる2個はそのまま。だから味方は取られちゃうんだ。緑の手が挟み返す手だよ。', 'メェ、赤の手のあとも味方は裏返ったままなの。緑の手なら、挟んでいる相手の駒が裏返って味方が助かったよ。', '赤では挟んでいる側に手が届かないね。相手の番のはじめに味方が取られるよ。緑の手を見てみて！', '赤の手だと、味方への挟みが消えないんだ。緑の手なら挟み返して自由にできたメェ。'],
      safe: ['赤の手のあと、相手は金の手できみの駒を挟めるんだ。緑の手なら、どの駒も挟まれなかったメェ。', '赤だと、金の手で味方が挟まれちゃう。緑の手を見てみて、相手の挟む手がなくなるよ！', 'メェ、赤の手では危ない形が残ったの。金の手で挟まれるんだ。緑の手なら安全だったよ。', '赤のあとに金の手を指されると、きみの駒が裏返っちゃう。緑の手が守りの手だったんだ。', '赤の手だと、片側が空いた駒が残って金の手で挟まれるよ。緑の手なら0だったメェ。'],
      double1: ['赤で挟めるのは1個だけなんだ。緑の手なら、2つの方向で2個同時に挟めたメェ。', '赤の手だと裏返るのは1個。緑の手を見てみて、2個いっぺんに挟めるよ！', 'メェ、赤は1つの方向だけそろったの。緑の手は2つの方向がそろうマスだったんだ。', '赤でも1個は挟めたけど、1個なら相手は助けやすいね。緑の手なら2個同時だよ。', '赤の手で挟めるのは1個。緑の手なら2個とも裏返ったメェ。'],
      two: ['赤で挟んでも、相手は金の手で、挟んでいるきみの駒を挟み返して助けちゃう。緑の挟み方なら助けられないメェ。', '赤の挟みは、金の手で挟み返されて消えちゃうんだ。緑の手を見てみて、挟み返す手がないよ！', 'メェ、赤だと挟んでいる味方の反対側が空いているの。金の手で挟み返されるんだ。緑の手なら確実だったよ。', '赤のあと金の手を指されると、相手の駒は表に戻るね。緑の手が助けられない挟み方だったんだ。', '赤で1個挟めても、金の手で味方が挟み返されて助けられるよ。緑の手なら次の番に取れたメェ。'],
      two0: ['赤の手では何も挟めないから、次の番に取れる駒がないんだ。緑の手なら助けられない形で挟めたメェ。', '赤だと、相手の駒は1個も裏返らない。緑の手を見てみて、挟み返されない挟み方だよ！', 'メェ、赤の手は挟む手じゃないの。緑の手なら、次の番に必ず1個取れたんだ。', '赤では挟みができないから、取れる駒もないよ。緑の手が確実に取れる手だったんだ。', '赤の手では挟めないから、相手の駒はみんな表のまま。緑の手なら助けられない挟みができたメェ。'],
    },
  };
  // the 2D words that name squares ({y} {t} {h}), without them for the 3D board (the move {x} red, the reply {r} gold)
  const NG3 = {
    en: { 'ls.ng.reply': 'And the opponent can then enclose one of your counters with {r}.', 'ls.b_rescue.ng': 'After {x} your counter stays enclosed and is taken at the start of the opponent’s turn.', 'ls.s_safe.ng': 'After {x} the opponent can enclose one of your counters with {r}.', 'ls.s_double.ng1': '{x} encloses only one counter.', 'ls.s_two.ng': '{x} encloses a counter, but the opponent rescues it with {r}, enclosing one of your counters that holds it.' },
    zh: { 'ls.ng.reply': '而且对方接着可以走{r}，夹住你的一枚棋子。', 'ls.b_rescue.ng': '走{x}后，你的棋子仍被夹着，对方回合一开始就会被取走。', 'ls.s_safe.ng': '走{x}后，对方可以走{r}，夹住你的一枚棋子。', 'ls.s_double.ng1': '走{x}只能夹住一枚棋子。', 'ls.s_two.ng': '走{x}虽然夹住了一枚棋子，但对方可以走{r}反夹你夹着它的棋子，把它救出来。' },
    'zh-TW': { 'ls.ng.reply': '而且對方接著可以走{r}，夾住你的一枚棋子。', 'ls.b_rescue.ng': '走{x}後，你的棋子仍被夾著，對方回合一開始就會被取走。', 'ls.s_safe.ng': '走{x}後，對方可以走{r}，夾住你的一枚棋子。', 'ls.s_double.ng1': '走{x}只能夾住一枚棋子。', 'ls.s_two.ng': '走{x}雖然夾住了一枚棋子，但對方可以走{r}反夾你夾著它的棋子，把它救出來。' },
    ko: { 'ls.ng.reply': '게다가 상대는 {r}(으)로 내 말 하나를 끼울 수 있습니다.', 'ls.b_rescue.ng': '{x} 뒤에도 아군은 끼인 채로 남아, 상대 차례가 시작될 때 잡힙니다.', 'ls.s_safe.ng': '{x} 뒤에 상대는 {r}(으)로 내 말 하나를 끼울 수 있습니다.', 'ls.s_double.ng1': '{x}(으)로 끼우는 말은 한 개뿐입니다.', 'ls.s_two.ng': '{x}(으)로 말 하나를 끼워도, 상대가 {r}(으)로 그 말을 끼우고 있던 내 말을 되끼워 구해 냅니다.' },
    es: { 'ls.ng.reply': 'Además, el rival puede encerrar una de tus fichas con {r}.', 'ls.b_rescue.ng': 'Tras {x}, tu ficha sigue encerrada y se retira al empezar el turno del rival.', 'ls.s_safe.ng': 'Tras {x}, el rival puede encerrar una de tus fichas con {r}.', 'ls.s_double.ng1': '{x} solo encierra una ficha.', 'ls.s_two.ng': '{x} encierra una ficha, pero el rival la rescata con {r}, encerrando una de tus fichas que la sujetan.' },
    fr: { 'ls.ng.reply': 'Et l’adversaire peut ensuite encadrer un de vos pions avec {r}.', 'ls.b_rescue.ng': 'Après {x}, votre pion reste encadré et sera pris au début du tour adverse.', 'ls.s_safe.ng': 'Après {x}, l’adversaire peut encadrer un de vos pions avec {r}.', 'ls.s_double.ng1': '{x} n’encadre qu’un seul pion.', 'ls.s_two.ng': '{x} encadre un pion, mais l’adversaire le libère avec {r} en encadrant un de vos pions qui le tiennent.' },
    pt: { 'ls.ng.reply': 'E o adversário pode então cercar uma das suas peças com {r}.', 'ls.b_rescue.ng': 'Depois de {x}, a sua peça continua cercada e é retirada no início da vez do adversário.', 'ls.s_safe.ng': 'Depois de {x}, o adversário pode cercar uma das suas peças com {r}.', 'ls.s_double.ng1': '{x} cerca só uma peça.', 'ls.s_two.ng': '{x} cerca uma peça, mas o adversário a liberta com {r}, cercando uma das suas peças que a prendem.' },
    de: { 'ls.ng.reply': 'Und der Gegner kann danach mit {r} einen deiner Steine einschließen.', 'ls.b_rescue.ng': 'Nach {x} bleibt dein Stein eingeschlossen und wird zu Beginn des gegnerischen Zugs genommen.', 'ls.s_safe.ng': 'Nach {x} kann der Gegner mit {r} einen deiner Steine einschließen.', 'ls.s_double.ng1': '{x} schließt nur einen Stein ein.', 'ls.s_two.ng': '{x} schließt einen Stein ein, aber der Gegner befreit ihn mit {r} und schließt dabei einen deiner Steine ein, die ihn halten.' },
    ru: { 'ls.ng.reply': 'А соперник затем может ходом {r} зажать одну из ваших фишек.', 'ls.b_rescue.ng': 'После {x} ваша фишка остаётся зажатой и снимается в начале хода соперника.', 'ls.s_safe.ng': 'После {x} соперник может ходом {r} зажать одну из ваших фишек.', 'ls.s_double.ng1': 'Ход {x} зажимает только одну фишку.', 'ls.s_two.ng': 'Ход {x} зажимает фишку, но соперник освобождает её ходом {r}, зажимая одну из ваших фишек, что её держат.' },
    tr: { 'ls.ng.reply': 'Üstelik rakip ardından {r} ile taşlarından birini kıstırabilir.', 'ls.b_rescue.ng': '{x} sonrasında taşın kıstırılmış kalır ve rakibin sırasının başında alınır.', 'ls.s_safe.ng': '{x} sonrasında rakip {r} ile taşlarından birini kıstırabilir.', 'ls.s_double.ng1': '{x} yalnızca tek bir taşı kıstırır.', 'ls.s_two.ng': '{x} bir taşı kıstırır ama rakip {r} ile onu tutan taşlarından birini kıstırarak onu kurtarır.' },
    id: { 'ls.ng.reply': 'Lagi pula, lawan lalu bisa menjepit salah satu bidakmu dengan {r}.', 'ls.b_rescue.ng': 'Setelah {x}, bidakmu tetap terjepit dan diambil di awal giliran lawan.', 'ls.s_safe.ng': 'Setelah {x}, lawan bisa menjepit salah satu bidakmu dengan {r}.', 'ls.s_double.ng1': '{x} hanya menjepit satu bidak.', 'ls.s_two.ng': '{x} menjepit satu bidak, tetapi lawan menyelamatkannya dengan {r}, menjepit bidakmu yang menahannya.' },
    hi: { 'ls.ng.reply': 'ऊपर से विरोधी फिर {r} से तुम्हारी एक गोटी घेर सकता है।', 'ls.b_rescue.ng': '{x} के बाद भी तुम्हारी गोटी घिरी रहती है और विरोधी की बारी की शुरुआत में उठा ली जाती है।', 'ls.s_safe.ng': '{x} के बाद विरोधी {r} से तुम्हारी एक गोटी घेर सकता है।', 'ls.s_double.ng1': '{x} से सिर्फ़ एक गोटी घिरती है।', 'ls.s_two.ng': '{x} से एक गोटी घिरती है, पर विरोधी {r} से उसे घेरने वाली तुम्हारी गोटी घेरकर उसे छुड़ा लेता है।' },
    ar: { 'ls.ng.reply': 'ثم يستطيع الخصم أن يحاصر أحد أحجارك بالنقلة {r}.', 'ls.b_rescue.ng': 'بعد {x} يبقى حجرك محاصَرًا ويُرفع في بداية دور الخصم.', 'ls.s_safe.ng': 'بعد {x} يستطيع الخصم أن يحاصر أحد أحجارك بالنقلة {r}.', 'ls.s_double.ng1': '{x} تحاصر حجرًا واحدًا فقط.', 'ls.s_two.ng': '{x} تحاصر حجرًا، لكن الخصم يحرره بالنقلة {r} بمحاصرة أحد أحجارك التي تحاصره.' },
  };
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (the permutation numbered by the seed), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; const n = list.length; let F = 1; for (let i = 2; i <= n; i++) F *= i;
      let r = (seed * 37 + n * 11) % F; const rest = list.slice(); o = [];
      for (let i = n; i > 0; i--) { F /= i; const j = Math.floor(r / F); r %= F; o.push(rest.splice(j, 1)[0]); }
      perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const fill0 = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m);
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  const engine = () => (typeof window !== 'undefined' && window.LatrEngine) || (typeof require === 'function' ? require('../latrunculi/engine.js') : null);
  let FX = null;
  const facts = () => { if (typeof window !== 'undefined' && window.LatrLsFacts) return window.LatrLsFacts; if (!FX && typeof require === 'function') FX = require('../latrunculi/ls-facts.js').make(engine()); return FX; };
  // the ja list a wrong move's words come from (the kind of ls-facts.js wrong())
  const kindOf = (id, w) => w.k === 'ls.b_rescue.ng' ? 'rescue' : w.k === 'ls.s_safe.ng' ? 'safe' : w.k === 'ls.s_double.ng1' ? 'double1' : w.k === 'ls.s_two.ng' ? 'two' : w.k === 'ls.s_two.ng0' ? 'two0' : 'none_' + id;
  // the opponent's reply the words name (gold): s_safe's enclosing reply, s_two's rescue, the tail's enclosure
  function replyOf(E, P, u, w) {
    if (w.hr) return w.hr.r;
    if (w.rr != null) return w.rr;
    if (w.tail) { const q = E.Pos.from(P.s).play(u); const r = q.moves().find(z => E.name(q, z) === w.tail.v.r); return r === undefined ? null : r; }
    return null;
  }
  // the words for move u: { right, w, rp, html } (lang ja: ポンメェ's; else the 2D words, the moves named by their marks). tx: the 2D text getter, V: the voice
  function words(id, P, u, lang, tx, V, last) {
    const E = engine(), F = facts(); E.setRule('seneca');
    const pos = E.Pos.from(P.s), right = P.ok.includes(u);
    if (right) {
      if (lang === 'ja') return { right, w: null, rp: null, html: `${V.v(JA.cheer)} ${V.v(JA.w[id])}${last ? '' : ' ' + V.v(JA.push)}` };
      return { right, w: null, rp: null, html: tx('ls.' + id + '.why', lang, { m: SPOT('ok') }) };
    }
    const w = F.wrong(id, pos, u), rp = replyOf(E, P, u, w);
    if (lang === 'ja') {
      const k = kindOf(id, w), tail = w.tail && rp != null ? ' ' + V.v(JA.n.tail) : '';
      let line = V.v(JA.n[k] || JA.n.none_b_block);
      if (tail) { const g = line.search(/緑/), b = Math.max(line.lastIndexOf('。', g), line.lastIndexOf('！', g)) + 1; line = b > 0 ? line.slice(0, b) + tail.trim() + line.slice(b) : line + tail; }   // (the reply before the green answer: what red lets happen, then what green does)
      return { right, w, rp, html: `${V.v(JA.soft)} ${line}` };
    }
    const sp = { x: SPOT('ng'), r: SPOT('hl'), m: SPOT('ok') };
    const say = (k, v) => { const t = (NG3[lang] || NG3.en)[k]; return t ? fill0(t, sp) : tx(k, lang, Object.assign({}, v, sp)); };
    return { right, w, rp, html: say(w.k, w.v) + (w.tail && rp != null ? ' ' + say(w.tail.k, w.tail.v) : '') };
  }
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-latrunculi-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../latrunculi/lessons.json?v=4'), ld('../latrunculi/i18n-lt.js?v=7'), ld('../latrunculi/i18n-lt-more.js?v=8'), ld('../latrunculi/i18n-lt-ls.js?v=1'),
          loadJs(ENG, () => !!window.LatrEngine).then(() => loadJs('../latrunculi/ls-facts.js?v=1', () => !!window.LatrLsFacts))])
          .then(([d, a, b, c]) => { const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const src of [a, b, c]) try { new Function('window', 'I18N', src)(w, w.I18N); } catch (e) { console.warn('[lessons3d] latrunculi texts', e); }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.latrunculi ? AtlasMini.latrunculi(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's counters: ls-facts.js marks (the chances / the holders / the counter in danger — never the answer's own counter, 追52)
      hintPts(id, P) { const E = window.LatrEngine, F = window.LatrLsFacts; if (!E || !F) return []; E.setRule('seneca'); return F.marks(id, E.Pos.from(P.s)); },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 5), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v), tx = (k, l, v) => this.tx(k, l, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast[id] : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => { o._rp = null; return words(id, P, u == null ? P.best : u, lang, tx, V, last).html; };
          o.ng = u => { const E = window.LatrEngine; E.setRule('seneca'); if (u == null || P.ok.includes(u)) u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x));   // (asked for the answer itself: the words for a wrong move)
            const r = words(id, P, u, lang, tx, V, last); o._rp = r.rp; return r.html; };   // (gold: the opponent's reply the words name)
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= latrunculi/app.js problemPoints for a lesson with ok: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1, lock: true } } : null; },
    };
    return D;
  }
  // (tools/lesson-verify-latrunculi-ls.js) the words for every move in every language, as the 3D says them (line k of each list)
  let I18N = null;
  function sayText(id, P, u, lang, k) {
    if (!I18N && typeof require === 'function') { const fs = require('fs'), path = require('path'), w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const f of ['i18n-lt.js', 'i18n-lt-more.js', 'i18n-lt-ls.js']) new Function('window', 'I18N', fs.readFileSync(path.join(__dirname, '../latrunculi', f), 'utf8'))(w, w.I18N); I18N = w.I18N; }
    const tx = (k2, l, v) => { let x = I18N[l] && I18N[l][k2]; if (x === undefined) x = I18N.en[k2]; return fill0(x || '', v || {}); };
    const V = { v: list => list[(k || 0) % list.length] };
    return words(id, P, u, lang, tx, V, false);
  }
  const API = { make, JA, NG3, READY, sayText, words, kindOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsLatrunculi = API;
})();
