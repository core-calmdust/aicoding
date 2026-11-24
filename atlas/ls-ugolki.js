/* =====================================================================
   Ugolki — the lessons on the 3D board (atlas/lessons3d.js DATA.ugolki, 2026-11-24 担当D).
   ugolki/lessons.json (the classic 3×3 rule c33; the same file as the 2D lessons, progress the full game's
   'aicoding-ugolki-lessons' { id: { best, clear } }), told by モリフク (Millowl, the guide of atlas/rules/ugolki.js).
   Every reason is a fact of the board (fact(): squares gained or lost towards the far corner, hops, pieces home, holes left),
   checked for every legal move by tools/lesson-verify-ugolki-ls.js. No coordinates on the 3D board: the answer is the green
   move, yours the red one. Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game.
   AtlasLsUgolki.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_step', 'b_jump', 'b_enter', 'b_finish', 's_far', 's_ladder', 's_road', 's_block', 's_leave', 's_deep'];
  const SALT = { s_block: 2 };   // (the praise / miss openers of s_block came in the same order as b_enter's: a lesson's own order)
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const ENG = '../ugolki/engine.js?v=13-v3nn-b3';   // (= atlas/games/ugolki.js: one cache)
  // ---------- モリフク's words (ja) ----------
  const JA = {
    intro: {
      b_step: 'ホー、モリフクだよ！ ウゴルキは、9こを全部<b>向かいの隅（陣地）</b>へ先に運んだほうが<b>勝ち</b>のレースゲーム。白は右上をめざすんだ。<br>駒は<b>縦か横に1マス</b>。右か上なら陣地に近づき、左か下だと遠ざかる。<b>近づける1歩</b>を探してね。',
      b_jump: 'となりの駒（自分のでも相手のでも）を<b>跳び越える</b>と、一気に2マス進めるんだ。<br>跳んだ先でまた跳べれば、同じ手で<b>何回でも続けて</b>跳べる。向きを変えてもいい。最初の2問は1回のジャンプ、残りは連続ジャンプ。<b>いちばん遠くまで行く道</b>を探そう！',
      b_enter: '点線で囲まれた右上の9マスが<b>白の陣地</b>。駒を全部ここに入れたら勝ちなんだ。<br>前へ進む手はたくさんあっても、陣地の中まで届く手は少ない。<b>外の駒を陣地へ入れる手</b>を探そう。1歩で入ることも、跳んで入ることもあるよ。',
      s_far: 'ホー、ここからは<b>作戦</b>のレッスンだよ。強い人は指す前に、<b>全部の駒</b>について「どこまで行けるか」を数えるんだ。<br>前にいる駒はつい動かしたくなるけど、<b>後ろの駒</b>の連続ジャンプのほうがずっと遠くまで行けることがある。陣地にいちばん近づく手を探そう！',
      s_ladder: '跳び台になるのは自分の駒だけじゃない。<b>黒の駒</b>も跳び越せるんだ。<br>黒の駒が1マスおきに並んでいたら、それは白のための<b>はしご</b>。黒に動かされる前に使っちゃおう。いちばん遠くまで行く手を探してね。',
      s_road: '前へ跳べる手がないときは、<b>1歩で道を作る</b>んだ。<br>駒が1マスおきに並ぶと、次の手でそこを続けて跳べる。どの1歩なら<b>次の手</b>でいちばん遠くまで進めるか考えよう（黒は動かないと考えてね）。',
      s_block: 'ホー、今度は<b>相手のじゃま</b>をする作戦だよ。黒も白の駒を跳び台にして、連続ジャンプで一気に進んでくるんだ。<br>黒が着地したい<b>マスに先に入る</b>か、跳び台になっている<b>白の駒をどかす</b>と、長い跳びは止まる。黒の次の手がいちばん短くなる手を探そう！',
      s_deep: 'ホー、終盤は<b>手数の計算</b>が勝負だよ。黒は動かないと考えて、白があと何手で陣地の9マスを埋められるか数えてみよう。<br>陣地に入れる手があっても、それが<b>いちばん速いとは限らない</b>。入っても、そのあと完成までの手数が増えることがあるんだ。完成までの手数がいちばん少なくなる手を探そう！',
      s_leave: 'ホー、ウゴルキには<b>40手ルール</b>があるんだ。自分の<b>40手目が終わったとき、スタートの隅に駒が1こでも残っていたら負け</b>（黒の隅は空だから黒の勝ち）。<br>期限が近いのに隅の駒が残っていたら、ほかの手より先にその駒を動かそう。黒に出口をふさがれないかも考えてね。',
      b_finish: '陣地に8こ入って、あと<b>1マスだけ空いている</b>。最後の1こを入れれば完成だ！<br>完成したら黒に<b>最後の1手</b>があって、黒もそこで完成すれば引き分け。この問題の黒は次の1手では完成できないから、完成させれば勝ちだよ。',
    },
    ask: {
      b_step: ['白の番！ 陣地に近づく1歩はどれかな？', 'ホー、前がふさがった駒が多いね。近づける1歩を探して！', '右か上へ1マス、空いている所に動ける駒はどれ？', '白の番だよ。陣地に1マス近づく手を見つけよう！', '跳べる駒はあるけど、近づくジャンプはない。近づく1歩はどれ？'],
      b_jump: ['白の番！ いちばん遠くまで進む手はどれ？', 'ホー、跳び越せる駒がいるね。いちばん前へ行ける跳び方は？', '跳んだ先でまた跳べないかも見て、いちばん遠い道を選ぼう！', '白の番だよ。1手でいちばん陣地に近づくのはどの跳び方？', 'ジャンプの道すじ、全部くらべてみよう。いちばん遠いのは？'],
      b_enter: ['白の番！ 駒を陣地に入れる手はどれかな？', 'ホー、陣地の中まで届く駒はどれ？', '点線の中へ入れる手を探して！ 前へ進むだけじゃだめだよ。', '白の番だよ。外の駒を1こ、陣地に入れよう！', '陣地の空きマスに届くのは、どの駒のどの道？'],
      s_far: ['白の番！ 陣地にいちばん近づく手はどれ？', 'ホー、前の駒だけ見ていないかな？ いちばん遠くまで行く手を探そう！', '全部の駒の跳び方を数えて、いちばん進む手を選ぼう。', '白の番だよ。後ろの駒まで見て、いちばん前へ行ける手は？', 'どの駒がいちばん長く跳べる？ 1こずつ数えてみよう！'],
      s_ladder: ['白の番！ 黒の駒も使って、いちばん遠くへ行こう！', 'ホー、黒の駒の並びをよく見て。いちばん前へ行ける跳び方は？', '黒の駒も跳び台になるよ。いちばん進む手はどれ？', '白の番だよ。黒のはしごを借りて、いちばん遠くまで進もう！', '自分の駒だけで跳ぶより遠い道はないかな？'],
      s_road: ['白の番！ 次の手でいちばん遠くまで進めるのは、どの1歩？', 'ホー、今は前へ跳べない。次に長く跳べる道を1歩で作ろう！', '1マスおきに駒を並べるには、どの駒を動かす？', '白の番だよ。次の手のジャンプがいちばん長くなる1歩はどれ？', '跳び台を1こ置けば道がつながるかも。どこに置く？'],
      s_block: ['白の番！ 黒の長い跳びを止める手はどれ？', 'ホー、黒が遠くまで跳べる形だね。黒の次の手がいちばん短くなる手を探して！', '黒の連続ジャンプの道すじをたどってみよう。どこをふさげば止まる？', '白の番だよ。自分が進むより、黒を止めるほうが大きい場面なんだ。止める手はどれ？', '黒の着地マスと跳び台、両方を見くらべて！ いちばん効く手は？'],
      s_deep: ['白の番！ 黒は動かないと考えて、陣地を最短の手数で完成させる手はどれ？', 'ホー、黒は動かないとしよう。9マスを埋めるのに、いちばん手数がかからない手は？', '黒が動かないとすると、白はあと何手で完成するかな？ その最短の手数を守る手を探して！', '白の番だよ。黒は動かないものとして、完成までの手数がいちばん少なくなる手を選ぼう！', '陣地に入れる手に飛びつく前に数えてみて。黒は動かないとして、最短で完成する手はどれ？'],
      s_leave: ['白の{t}手目！ 40手目が終わるまでに、スタートの隅を空にできる手は？', 'ホー、40手目まで、今の手を入れて残り{k}手。隅に残った駒を間に合わせよう！', '白の{t}手目だよ。40手ルールで負けない手を探して！', 'スタートの隅にまだ駒がいるね。白の{t}手目、出し切れる手はどれ？', '期限の40手目まで、今の手を入れてあと{k}手。どう動けば間に合う？'],
      b_finish: ['白の番！ 陣地を完成させる手はどれ？', 'ホー、空きはあと1マス。最後の1こを入れよう！', '外に残った1こ、どの道なら空きマスに届く？', '白の番だよ。1手で陣地を完成させて！', '最後の1こを入れて勝ち切ろう。どう動く？'],
    },
    askLast: ['ホー、これで最後の問題！ じっくり見て決めよう。', 'ラストだよ。ここまでのコツを全部使ってね！'],
    hint: {
      b_step: ['光っているのが、右か上が空いている駒。そのどれかを1マス動かそう。', 'ホー、金の輪の駒をよく見て。右か上のマスが空いているかな？', '左や下へ動くと遠ざかっちゃう。光る駒の右か上を確かめよう。', '金の輪がついた駒なら、陣地に近づく1歩が指せるんだ。', 'ふさがっていない向きを探そう。光る駒がヒントだよ！', 'ホー、輪のついた駒のとなり、右側と上側に注目！'],
      b_jump: ['光っている駒から跳ぶ道を数えてみて。跳んだ先でまた跳べないかな？', 'ホー、金の輪の駒がスタート。着地したマスのとなりにも駒はいる？', '1回で止めずに、続けて跳べる道を全部たどろう。', '輪のついた駒の跳び方をくらべて、いちばん右上まで行くのを選ぼう。', 'となりの駒の向こうが空いていれば跳べる。光る駒から試してみて！', 'ホー、着地点ごとに、次に跳べる駒を数えていこう。'],
      b_enter: ['光っているのが陣地の空きマス。そこへ届く駒を探そう。', 'ホー、金色のマスに1歩で届く駒、跳んで届く駒はいる？', '金色の空きマスのとなりと、2マス先を見てみて。', '陣地の空きマス（金色）に着地できる道を探そう！', '点線のすぐ外にいる駒から、光るマスまでの道を数えてみて。', 'ホー、跳び越せば一気に中まで届くこともあるよ。'],
      s_far: ['光っているのは、前へ跳べる駒。それぞれ何マス進めるか数えてくらべよう。', 'ホー、金の輪の駒はどれも前へ跳べる。後ろの駒の連続ジャンプも忘れずに！', '輪のついた駒ごとに、着地点からまた跳べないかたどってみて。', '前の駒の跳びは短いかも。光る駒を全部数えよう！', 'ホー、光っている駒の中で、いちばん右上まで届くのはどれ？', '跳んだ先のとなりにも駒がいれば、まだ続けて跳べるよ。'],
      s_ladder: ['光っている黒の駒は、白が跳び越せる駒。その並びをたどってみて。', 'ホー、金の輪の黒い駒が跳び台になるよ。続けて跳べる道はある？', '輪のついた黒の駒を跳び越すと、どこまで行けるかな？', '黒の駒が1マスおきに並んでいる所を探そう。光る駒がヒント！', '自分の駒と光る黒の駒、両方を跳び台にして数えてみて。', 'ホー、光っている黒の駒の向こうが空いていれば跳べるよ。'],
      s_road: ['光っている駒が、次の手で跳びたい駒。その前に跳び台を並べよう。', 'ホー、金の輪の駒の前に、1マスおきの並びを作れないかな？', '輪のついた駒の跳ぶ道に、すき間がないか見てみて。そこを1歩でうめよう。', '光る駒から見て、跳び台が1つ足りない所はどこ？', '動かすのは光っている駒じゃなくて、跳び台になる駒だよ。', 'ホー、跳び台は1マスおき。光る駒の進む向きに、すき間を探そう。'],
      s_block: ['光っている黒の駒が、次に長く跳ぼうとしている駒。着地するマスをたどってみて。', 'ホー、金の輪の黒い駒の跳ぶ道に、白の駒が跳び台として入っていないかな？', '輪のついた黒の駒が跳び越す駒と、着地するマスを順に数えよう。', '光る黒の駒の通り道のどこかに、白が先に入れるマスはある？', '光っている黒の駒の道をふさげば、黒の手は短くなるよ。'],
      s_deep: ['光っているのが陣地の空きマス。黒が動かなければ、最短{N}手で全部埋まるよ。どの順番なら{N}手で足りる？', 'ホー、外の駒と光る空きマスを結んでみよう。最短は{N}手。どの駒をどこへ入れるか、1手ずつ数えてね。', '光る空きマスへの道を、駒ごとに数えよう。最短の{N}手で足りる手順の1手目はどれ？', 'すぐ陣地に入る手も、そのあと何手かかるか数えてみて。最短は{N}手だよ。'],
      s_leave: ['光っているのが、まだスタートの隅にいる駒。どこから外へ出られるかな？', 'ホー、金の輪の駒の出口になるマスを見て。黒にふさがれそうなマスはない？', '輪のついた駒を、40手目までに外へ出す順番を考えよう。', '光る駒が1こでも隅に残ったまま40手目が終わると負け。出口を数えよう！', 'ホー、光る駒が跳び越せる駒はいる？ 跳べば一気に隅の外まで行けるかも。', '光っている駒のとなりの空きマスを数えよう。黒の駒がそこへ来られるかも見てね。'],
      b_finish: ['光っているのが最後の空きマス。外の1こはそこへ届くかな？', 'ホー、金色のマスへの道を探そう。跳んで届くこともあるよ。', '外の駒から金色の空きマスまで、1歩か跳び越しで行ける道はどれ？', '金色のマスのとなりや、跳び越した先を見てみて。', '陣地の中の駒は動かさなくていい。外の1こに注目！', 'ホー、空きマスの手前に跳び台になる駒はいる？'],
    },
    cheer: ['ホー、お見事！', 'ばっちり！', 'さすが！', 'いいね、その手！', 'すごい！ 正解！', 'やったね！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'ホー、目が慣れてきたね。次へ！', 'いい流れ。もう1問いこう！', 'その見方、次でも使えるはず！', 'どんどんうまくなってる！'],
    soft: ['大丈夫、次は見つかる！', 'ドンマイ！', 'ホー、今度は見つけよう！', '平気平気、ここで覚えよう！', 'よくある見落としだね！', 'もう一度、盤をよく見てみよう！'],
    w: {
      step: ['緑の1歩で陣地に1マス近づいた。この形で寄れる1歩は{n}通りしかないんだ。', '右か上へ1マス、ちゃんと詰めたね。ほかの駒は前がふさがっていて、正解は{n}つだけ。', '前のマスが空いた駒を見つけたね！ 陣地までの道のりが1つ縮む手は、ここでは{n}通り。', 'ホー、ふさがった駒にまどわされなかった。距離が縮む1歩は全部で{n}通りあったよ。', '空いている向きを見のがさなかったね。この局面で正しい1歩は{n}通りなんだ。'],
      jump1: ['駒を1こ跳び越えて、一気に{G}マス前進！ 1歩の2倍進めたね。', 'となりの駒の向こうが空いていたから跳べた。{G}マス近づいたよ。', 'ホー、跳び越しで{G}マス！ 1歩ずつより速いのがジャンプなんだ。', '向こう側の空きマスを見つけたね。これで{G}マスの前進だ。'],
      chain: ['{h}回続けて跳んで、{G}マスも前進！ 着地のたびに次の跳び先を見つけたね。', 'ホー、{h}連続ジャンプで{G}マス！ 途中で止まらなかったのが大きいんだ。', '跳んで、また跳んで、全部で{h}回。陣地に{G}マス近づいたよ。', '着地点の先にも跳び台があったから、{h}回つなげて{G}マス。最長の道だね。'],
      in: ['駒が陣地に入って、陣地の駒は{a}こになった！', '点線の中に入れたね。これで陣地に{a}こだ。', '陣地の空きマスにちゃんと届いた。中の駒は{a}こになったよ。', 'ホー、ゴールの隅に1こ追加！ 陣地は{a}こになったね。'],
      inJ: ['跳び越して陣地に入った！ 陣地の駒は{a}こになったよ。', 'ジャンプで点線の中へ。これで陣地に{a}こだ。', '跳んで届く空きマスを見つけたね。陣地の駒は{a}こになった。', 'ホー、ひと跳びで中まで！ 陣地に{a}こそろったね。'],
      done: ['陣地の9マスが全部うまった！ 黒は次の1手で完成できないから、白の勝ちだよ。', 'ホー、9マス完成！ 黒の最後の1手でも追いつけないから、これで勝ちだ。', '最後の1こが入って9マス完成！ 黒はまだ完成できないから、白の勝ちだね。'],
      far: ['{h}回続けて跳んで{G}マス前進！ 後ろの駒まで数えたから見つかったんだ。', 'ホー、後ろの駒が{h}回跳んで{G}マス！ 前の駒の跳びよりずっと遠い。', '全部の駒を見くらべたね。{h}連続ジャンプで陣地に{G}マス近づいたよ。', '着地のたびに跳び台があって、{h}回で{G}マス。これがいちばん遠い道なんだ。', '後ろに残った駒こそ大きく進める。{h}回跳んで{G}マス、見事な見つけ方！', 'ホー、{h}回のジャンプで一気に{G}マス。前の駒だけ見ていたら気づけない手だ。'],
      ladder: ['黒の駒を{o}こ跳び台にして、{h}回のジャンプで{G}マス前進！', 'ホー、黒のはしごを借りたね。黒を{o}こ跳び越して、{h}回で{G}マス近づいたよ。', '黒の駒も{o}こ使って{h}連続ジャンプ、{G}マス！ 白の駒だけではここまで届かないんだ。', '相手の並びを見のがさなかった。黒を{o}こ跳び越す{h}回のジャンプで、{G}マス進んだね。', '黒が{o}こ並んでいたおかげで、{h}回跳んで{G}マス。相手の駒も立派な跳び台だ。', 'ホー、黒の駒{o}こを足場に{h}回、陣地へ{G}マス近づいた！ 動かされる前に使えたぞ。'],
      road: ['この1歩で道ができた！ 次の手は{nh}回続けて跳んで{N}マス進めるよ。', 'ホー、跳び台が並んだね。次は{nh}連続ジャンプで{N}マスいける！', 'すき間がうまって、次の手で{N}マス（{nh}回のジャンプ）跳べる道になった。', 'いい道づくり！ 黒が動かなければ、次は{nh}回跳んで{N}マスだ。', '1マスおきの並びが完成。次の手は{nh}回のジャンプで{N}マス進めるんだ。', 'ホー、跳び台を1こ置いただけで、次は{nh}回跳んで{N}マスの近道になったぞ。'],
      roadB: ['いったん1マス下がっても、それが跳び台になる！ 次の手は{nh}回跳んで{N}マス進めるよ。', 'ホー、下がる1歩で道ができたね。次は{nh}連続ジャンプで{N}マスだ。', '後ろへの1歩が、次の{nh}回のジャンプ（{N}マス）の跳び台になった。', '1マス下がって{N}マスを取り返す。次は{nh}回跳べる道ができたんだ。'],
      blockL: ['黒が着地したいマスに先回り！ これで黒のいちばん遠い手は{b0}マスから{B}マスに縮んだんだ。', 'ホー、着地マスをふさいだから、黒の連続ジャンプが切れた。黒は{B}マスまでしか進めない（止める前は{b0}マス）。', '緑で黒の着地点に白が入った。黒の次の手は{b0}マスから{B}マスどまりになったんだ。'],
      blockS: ['跳び台になっていた白の駒をどかした！ 黒のいちばん遠い手は{b0}マスから{B}マスに縮んだよ。', 'ホー、跳び台がなくなって黒の連続ジャンプが切れた。黒は{B}マスまでしか進めない（止める前は{b0}マス）。', '緑で白の駒が黒の道からどいた。黒の次の手は{b0}マスから{B}マスどまりになったんだ。'],
      leave0: ['{t}手目でスタートの隅が空っぽになった！ これで40手ルールの負けはないよ。', 'ホー、最後の駒が隅から出た。{t}手目が終わっても隅は空っぽだから、負けにならないんだ。', '隅の駒を外へ出せたね。40手目の時点でスタートの隅は空っぽだよ。'],
      leaveOut: ['緑で隅の駒が外へ出て、残りは{c}こ。黒がどう動いても、40手目でその駒も外へ出せる形なんだ。', 'まず1こ外へ出した！ 隅の残り{c}こは、黒がどこへ動いても次の40手目に出られるよ。', '先に出したのが大正解。黒がどう動いても、隅の残り{c}こは40手目に外へ出せるんだ。'],
      leaveIn: ['まだ隅の中だけど、ここからなら黒がどう動いても40手目に外へ出られるんだ。', '隅の中で動かしただけに見えるけど、ここからなら黒がどこをふさいでも40手目に外へ出せるんだ。'],
      leaveAll: ['緑でスタートの隅が空っぽになった。40手目のあとも負けにならないよ。', 'ホー、隅の駒が全部外へ出た。これで40手ルールは心配いらないんだ。'],
      deepIn: ['緑で1こ陣地に入って、この手を入れて最短の{N}手で9マス完成！ ほかの手だと{S}手以上かかるんだ。', 'ホー、陣地に入れる順番がぴったり。黒が動かなければ、この手から{N}手で完成だよ（ほかの手は{S}手以上）。', '陣地に入れて、しかも最短の{N}手のまま！ ほかの手では{S}手以上かかるんだ。'],
      deepInJ: ['跳んで陣地に入って、この手を入れて最短の{N}手で9マス完成！ ほかの手だと{S}手以上かかるんだ。', 'ホー、ジャンプで陣地に入ったね。黒が動かなければ、この手から{N}手で完成だよ（ほかの手は{S}手以上）。', '跳び越して陣地に入る道が最短の{N}手につながっていたね。ほかの手では{S}手以上かかるんだ。'],
      deepOut: ['すぐには入れないけど、これが最短の順番！ この手を入れて{N}手で9マス完成。ほかの手だと{S}手以上かかるんだ。', 'ホー、あわてて入れなかったのが大正解。黒が動かなければ、この手から{N}手で完成だよ（ほかの手は{S}手以上）。', '先に道を整える1手だね。この手を入れて最短の{N}手、ほかの手では{S}手以上かかるんだ。'],
      deepOutJ: ['跳ぶ手で順番を整えたね。すぐには入れないけど、この手を入れて最短の{N}手で9マス完成！ ほかの手だと{S}手以上かかるんだ。', 'ホー、ジャンプで一気に寄せたね。黒が動かなければ、この手から{N}手で完成だよ（ほかの手は{S}手以上）。', '跳ぶ道が最短の{N}手につながっていたね。ほかの手では{S}手以上かかるんだ。'],
      doneJ: ['跳び越して最後の空きマスへ！ 9マス完成で、黒は次の1手で追いつけないから白の勝ちだよ。', 'ホー、ジャンプで9マス完成！ 黒の最後の1手では完成できないから、これで勝ちだ。', '跳んで届く道を見つけたね。9マス全部うまって、黒はまだそろわないから白の勝ち！'],
    },
    n: {
      back: ['赤い手は左か下へ動くから、陣地から{k}マス遠ざかっちゃう。緑の1歩なら1マス近づくよ。', '赤だと陣地から{k}マス離れてしまうんだ。緑は右か上へ寄る手だね。', '赤い手のあと、陣地までの道のりが{k}マス長くなる。緑なら距離が1つ縮むんだ。', '赤は下がる向きだから{k}マス遠回り。緑の手で右上へ寄ろう。', '左か下へ動くと、陣地から{k}マス遠のくんだ。緑のように右か上へ1マス進もう！'],
      backJ: ['赤いジャンプは左か下へ跳ぶから、陣地から{k}マス遠ざかっちゃう。緑の1歩なら1マス近づくよ。', '赤は跳べるけど後ろ向きだから、陣地から{k}マス離れるんだ。緑なら前へ1マス。', '跳んでも向きが逆だと、陣地まで{k}マス遠くなる。緑の1歩が正解だね。'],
      jump0: ['赤いジャンプは行って戻っただけだから、陣地までの道のりは変わらないんだ。緑の1歩なら1マス近づく。', '赤い道は回り道で、陣地への距離は同じまま。緑なら1つ縮められるよ。', '跳んでも前へ進まないと、陣地までの距離はそのまま。緑の1歩で寄ろう。'],
      stepS: ['赤い手は1歩だけだから1マスしか近づかない。緑のジャンプなら{G}マス進めるよ。', '赤の1歩では1マス。駒を跳び越せば、緑のように{G}マス進めるんだ。', '1歩ずつだと1マスどまり。跳び越せる駒がいるなら、緑のように{G}マスいける！'],
      stepB: ['赤い1歩は左か下へ動くから、陣地から1マス遠ざかる。緑のジャンプなら{G}マス前進だよ。', '赤だと1マス後ろへ下がってしまう。緑の跳び方なら{G}マス進めるんだ。', '後ろ向きの1歩だと、陣地が1マス遠くなる。緑なら跳んで{G}マス！', '赤い手は下がる向きなので、陣地から1マス離れる。緑のジャンプで{G}マス進もう。', '左か下への1歩だと遠ざかるだけ。緑の道なら{G}マス近づけるよ。'],
      stop: ['赤は途中で止まったから{g}マス。そこからまだ跳べたんだ。緑の道なら{G}マス進めるよ。', '赤い手は着地したマスで止まるので{g}マスどまり。続けて跳べば、緑のように{G}マス。', '途中で止めたから{g}マスだけ。着地点からもう一度跳べて、緑なら{G}マスなんだ。'],
      short: ['赤いジャンプは{g}マスで終わるから届かない。緑の跳び方なら{G}マス進めるよ。', '赤の道は{g}マスで行き止まりなんだ。緑は着地のたびにまた跳べて{G}マス。', '赤い手でも{g}マス進むけど、緑なら{G}マス。もっと遠い道があったね。', '赤だと{g}マスどまり。緑の道なら跳び台が続いて{G}マスいける！'],
      shortN: ['赤いジャンプは陣地に近づかない向きだから、距離が縮まらないんだ。緑の跳び方なら{G}マス進めるよ。', '赤は跳んでも横向きなので、陣地への距離が同じ。緑の道で{G}マス進もう。', '向きがちがうと、跳んでも陣地に寄れない。緑なら{G}マス前進だね。'],
      shortB: ['赤いジャンプは後ろ向きだから、陣地から{k}マス遠ざかる。緑なら{G}マス前進だよ。', '赤だと{k}マス下がってしまうんだ。緑の跳び方で{G}マス進もう。', '後ろへ跳ぶと陣地が{k}マス遠くなる。緑の道なら{G}マス近づけるね。', '赤い手は左か下へ跳ぶので{k}マス離れる。緑なら{G}マス前へ！', '跳ぶ向きが逆だと{k}マス遠回り。緑のジャンプで{G}マス進もう。'],
      near: ['赤い手は{g}マス近づくけど、陣地の手前で止まっちゃう。緑の手なら陣地の中まで届くよ。', '赤だと{g}マス進んでも点線の外だから、入った駒は増えない。緑は陣地の空きマスに入れるんだ。', '前へ{g}マス進んでも、点線の外で止まると陣地の駒は増えない。緑なら中まで入れる。', '赤い手は{g}マス進んでも点線の外なので、陣地はそのまま。緑の手なら1こ入るね。', '{g}マス寄るだけだと陣地には届かないんだ。緑は空きマスまで行ける手だよ。'],
      none: ['赤い手は陣地の外のままで、近づきもしないんだ。緑なら陣地に入れるよ。', '赤だと駒は点線の外から出られず、陣地にも近づかない。緑の手を見て。', '外で横や後ろへ動くと、陣地は1マスも近くならない。緑なら中まで届くね。'],
      inside: ['赤い手は陣地の中で動いただけだから、入っている駒は{a}このまま増えないんだ。緑なら外の駒を入れられるよ。', '赤は陣地の中の駒を動かすだけなので、陣地の駒は{a}このまま。緑の手で1こ増やそう。', '中の駒を動かしても、陣地は{a}こから増えない。緑なら外の1こが入るね。', '陣地の中で場所を変えるだけだと、駒は{a}このまま。緑のように外から入れよう！', '赤い手では外の駒が残ったままだから、陣地は{a}こ。緑なら1こ増えるよ。'],
      leave: ['赤い手だと駒が陣地から出るから、陣地の駒が{a}こに減っちゃう。緑なら1こ入るよ。', '赤は陣地の駒を外へ出す手なので、中は{a}こに減るんだ。緑の手を見て。', '陣地から出てしまうと、中の駒は{a}こに減る。緑なら逆に1こ増やせるね。', '赤だと陣地の駒が外へ出て{a}こになる。緑の手で入れる側に回ろう！', '入った駒を出してしまうと{a}こに減っちゃう。緑なら外から1こ入るよ。'],
      fStep: ['赤い1歩では1マスしか近づかない。緑は{h}回跳んで{G}マス進めるよ。', '赤だと1歩だけで1マス。緑の連続ジャンプなら{G}マスいけるんだ。', '1歩ずつでは1マスどまり。緑の道は{h}回跳んで{G}マスだ。', '赤は1歩前へ出ただけ。緑の駒なら{h}回跳んで{G}マス近づけたね。', 'ホー、1歩だと1マス。緑の{h}回のジャンプなら{G}マスで、ずっと速いんだ。', '赤の1歩は1マスぶん。跳べる駒を探すと、緑の{G}マスが見つかるぞ。'],
      fBack: ['赤い1歩は左か下へ動くから、陣地から1マス遠ざかる。緑なら{G}マス前進だよ。', '赤の1歩だと1マス後ろへ下がってしまう。緑の跳び方なら{G}マス進めるんだ。', '後ろ向きの1歩で陣地から1マス遠ざかっちゃう。緑なら{G}マス近づける。', 'ホー、その1歩は下がる向きだから、陣地が1マス遠ざかる。緑なら{G}マス近づけたんだ。', '左か下への1歩だから、1マス遠ざかるだけ。緑の連続ジャンプで{G}マス進もう！', '赤の1歩で陣地から1マス遠ざかった。緑なら逆に{G}マス近づけたんだ。'],
      fBackJ: ['赤いジャンプは左か下へ跳ぶから、陣地から{k}マス遠ざかる。緑なら{G}マス前進だよ。', '赤は跳んでも後ろ向きで、{k}マス下がってしまう。緑の跳び方なら{G}マス進めるんだ。', '後ろへ跳ぶと陣地から{k}マス遠ざかっちゃう。緑なら{G}マス近づけるよ。'],
      fStopB: ['赤は途中で止まったから、陣地から{k}マス遠ざかったまま。そこからまだ跳べて、緑なら{G}マス進めるよ。', '赤い手は回り道の途中で止まるので、{k}マス下がったところで終わり。続けて跳べば緑の{G}マス。'],
      fStop0: ['赤は途中で止まったから、陣地への距離は変わらないまま。そこからまだ跳べて、緑なら{G}マス進めるよ。', '赤い手は回り道の途中で止まるので、陣地に近づいていない。続けて跳べば緑の{G}マス。'],
      fSide: ['赤いジャンプは跳んでも陣地への距離が変わらない向き。緑なら{G}マス進めるよ。', '赤は行って戻るような道で、陣地には近づかないんだ。緑なら{G}マス！', '向きがちがうと、跳んでも陣地に寄れない。緑の道なら{G}マス前進だね。'],
      fFront: ['前の駒の赤いジャンプは{g}マスどまり。後ろの緑の駒なら{G}マスいけるんだ。', '赤は前にいる駒の手で{g}マス。後ろの駒まで数えると、緑の{G}マスが見つかるよ。', '前の駒につられたね。赤だと{g}マス、後ろの緑の駒なら{G}マス進めるんだ。', 'ホー、前の駒の跳びは{g}マス。後ろから跳ぶ緑の道なら{G}マスだ。', '赤は前の駒で{g}マス。全部の駒を数えれば、緑の{G}マスに気づけたはず！'],
      fJump: ['赤いジャンプは{g}マスで終わり。緑の道なら{G}マス進めるよ。', '赤の道は{g}マスで行き止まりだから届かない。緑は着地のたびにまた跳べて{G}マス。', '赤でも{g}マス進むけど、緑なら{G}マス。もっと遠い道があったね。', 'ホー、赤のジャンプだと{g}マスぶん。緑の連続ジャンプなら{G}マスだ。', '赤の跳び方だと{g}マス。緑なら跳び台が続いて{G}マス進めるんだ。'],
      fStop: ['赤は途中で止まったから{g}マス。そこからまだ跳べて、緑なら{G}マス進めるよ。', '赤い手は途中の着地マスで止まるので{g}マスどまり。続けて跳べば緑の{G}マス。', '途中で止めたから{g}マスだけ。もう一度跳べて、緑なら{G}マスなんだ。', 'ホー、途中でやめると{g}マス。着地点からまだ続けられて、緑なら{G}マスだ。', '赤は道の途中で止まって{g}マス。最後まで跳び続ける緑なら{G}マス！'],
      fOwn: ['赤は自分の駒だけを跳ぶ道で{g}マス。黒の駒も跳び台にする緑なら{G}マス！', '自分の駒だけだと{g}マスどまり。黒のはしごを使う緑の道は{G}マスだよ。', '赤い道は白の駒しか跳ばないから{g}マス。緑は黒も跳び越して{G}マス進めるんだ。', 'ホー、白の駒だけを跳ぶと{g}マス。黒の並びも使う緑なら{G}マスだ。', '自分の駒だけを見ると{g}マスの赤が一番に見える。黒も数えれば緑の{G}マス！'],
      rStep: ['赤い1歩のあと、次の手でいちばん進めても{nx}マス。緑の1歩なら次は{N}マス跳べるよ。', '赤だと道がつながらず、次の手は{nx}マスまで。緑なら次に{N}マス進めるんだ。', '赤い1歩では跳び台が足りなくて、次は{nx}マスどまり。緑の1歩で{N}マスの道ができる。', 'ホー、赤の1歩のあとの盤だと、次の手は最高で{nx}マス。緑なら{N}マスの連続ジャンプだ。', '赤を指しても、次に長く跳べる道はできない（{nx}マスまで）。緑の1歩なら次は{N}マス！', '跳び台にならない1歩だと、次の手は{nx}マスどまり。緑のように並べれば{N}マスいけるぞ。'],
      rStep0: ['赤い1歩のあとは、次の手で前へ進める手がないんだ。緑の1歩なら次は{N}マス跳べるよ。', '赤だと次の手で陣地に近づけない。緑なら次に{N}マス進めるんだ。'],
      rJump: ['赤いジャンプは前へ進まないうえ、次の手でも{nx}マスまで。緑の1歩なら次は{N}マス跳べるよ。', '赤いジャンプでは陣地に近づかず、次も{nx}マスどまり。緑の1歩で{N}マスの道ができるんだ。', '前へ進まないジャンプだと、次の手も{nx}マスまで。緑の1歩なら次に{N}マスだよ。'],
      rJump0: ['赤いジャンプは前へ進まないうえ、次の手でも陣地に近づけないんだ。緑の1歩なら次は{N}マス跳べるよ。', '赤いジャンプでは近づかず、次も前へ進める手がない。緑なら次に{N}マスいけるよ。'],
      bStill: ['赤の手のあとも、黒の長い跳びはそのまま。黒は{b}マス跳べちゃうんだ。緑なら{B}マスまでに止められる。', '赤だと黒の道はふさがらず、次に{b}マス跳ばれる。緑で道を切れば、黒は{B}マスしか進めないんだ。', '黒の跳ぶ道は赤の手では変わらないから、{b}マス進まれちゃう。緑で止めれば{B}マスまでで済むよ。'],
      bLure: ['赤で白は{g}マス進むけど、黒はそのまま{b}マス跳べる。緑でふさげば黒は{B}マスまでになるね。', '赤の手は白が{g}マス進む手。でも黒の連続ジャンプが残って{b}マス進まれる。緑なら黒は{B}マスまで。'],
      bPart: ['赤でも黒の跳びは{b}マスに縮むけど、まだ長い。緑なら{B}マスまで止められるんだ。', '赤でも黒の跳びは少し縮むけど、まだ{b}マス跳べる。緑の手なら黒の手は{B}マスどまり！'],
      bMore: ['赤だと黒の道が伸びて、{b}マスも跳べちゃう。緑なら{B}マスまでだよ。', '赤の手で白の駒が新しい跳び台になって、黒は{b}マス跳べるんだ。緑の手なら黒は{B}マスまでしか進めない。'],
      lFew0: ['赤の手で40手目が終わるけど、スタートの隅に{c}こ残ったまま。40手ルールで負けになっちゃうんだ。緑なら隅が空になるよ。', '赤だとスタートの隅に{c}こ残って40手目が終わる。それで負け。緑の手なら間に合ったよ。'],
      lFew: ['赤だとスタートの隅に{c}こ残ったまま。1手で外へ出せるのは1こだけだから、40手目のあとも隅に残って負けちゃう。緑なら間に合うよ。', '赤の手のあと、隅の駒は{c}こ。残りの40手目だけでは全部は出せないんだ。緑の手を見て。'],
      lBlock: ['赤のあと、黒に出口のマスをふさがれると、隅の{c}こは40手目に外へ出られない。緑なら黒がどう動いても間に合うよ。', '赤だと隅に{c}こ残って、黒が出口をふさげば40手目に出られず負け。緑ならふさがれても出られるんだ。'],
      lInside: ['赤は隅の中で動いただけ。黒に出口をふさがれると、40手目に外へ出られなくなるんだ。緑なら黒がどう動いても間に合うよ。', '赤は隅の中で動いただけで、外へは出ていない。黒が出口をふさげば40手目に出られず負け。緑の手を見て。'],
      dIn: ['赤で1こ陣地に入るけど、そのあと完成まで全部で{x}手かかる。緑なら{N}手だから、{d}手遅れちゃうんだ。', '赤だと陣地に1こ入っても、9マスそろうまで{x}手。緑の{N}手より{d}手遅いんだ。', 'ホー、陣地に入る手に飛びついたね。赤だと完成まで{x}手、緑なら{N}手で、{d}手の差なんだ。'],
      dInside: ['赤は陣地の中で動いただけで、完成まで{x}手。緑なら{N}手、{d}手の遅れだよ。', '赤だと駒が陣地の中で動いただけだから、完成まで{x}手かかる。緑の{N}手より{d}手遅いんだ。'],
      dLeave: ['赤だと駒が陣地から出てしまって、完成まで{x}手。緑なら{N}手だから{d}手遅れるんだ。', '赤は陣地から出る手だから、9マスそろうまで{x}手。緑の{N}手より{d}手遅いよ。'],
      dBack: ['赤は陣地から{k}マス遠ざかる手。完成まで{x}手かかって、緑の{N}手より{d}手遅いんだ。', '赤だと{k}マス遠ざかって、完成まで{x}手。緑なら{N}手、{d}手の差だよ。'],
      dFwd: ['赤で{g}マス進むけど、完成までは{x}手。緑なら{N}手で、{d}手速いんだ。', '赤も{g}マス寄る手だけど、9マスそろうまで{x}手かかる。緑の{N}手より{d}手遅いよ。', 'ホー、{g}マス進んでも順番が悪いと遅くなる。赤だと完成まで{x}手、緑なら{N}手、{d}手の差なんだ。'],
      dSide: ['赤は陣地に近づかない手で、完成まで{x}手。緑なら{N}手、{d}手の差だよ。', '赤だと距離が縮まらず、完成まで{x}手かかる。緑の{N}手より{d}手遅いんだ。'],
      fNear: ['赤い手は{g}マス近づくけど、空きマスには届かない。陣地の空きは1マスのままなんだ。緑なら完成！', '赤だと外の1こは{g}マス進むだけなので、陣地はまだ1マス空いている。緑の道なら届くよ。', '{g}マス寄っても空きマスに入らなければ未完成。緑なら最後の1マスまで届くね。'],
      fNone: ['赤い手のあとも外の1こは陣地に届かず、近づきもしない。空きは1マスのままだから未完成。緑なら完成！', '赤だと外の駒が空きマスへ近づかないんだ。陣地は1マス空いたまま。緑の道を見て。', '外の駒が横や後ろへ動くと、空きマスは埋まらない。緑なら完成だね。'],
      fInside: ['赤い手は陣地の中の駒を動かしただけだから、空きは1マスのままで完成しないんだ。緑なら外の1こが入るよ。', '赤は中の駒の手なので、陣地はまだ1マス空いている。外の1こを入れる緑の手で完成だ。', '中の駒を動かしても、外の1こが入らなければ完成しない。緑の手を見て！', '陣地の中で場所を変えるだけだと、空きは1マス残る。緑なら外の1こで埋まるね。', '赤い手では外の駒がそのままだから未完成。緑なら9マスそろうよ。'],
      fLeave: ['赤い手だと陣地から駒が出るから、空きが{holes}マスに増えちゃう。緑なら外の1こが入って完成！', '赤は陣地の駒を外へ出す手なので、空きが{holes}マスになるんだ。緑の道で完成させよう。', '陣地から出ると空きは{holes}マス。完成から遠のくから、緑の手で埋めよう！', '入った駒を外へ出すと、空きが{holes}マスに増える。緑なら1手で完成だね。', '赤だと陣地の空きが{holes}マスになってしまう。緑のように外の1こを入れよう。'],
    },
  };
  // other languages: the 2D words (ls.<id>.why / ng), the moves named by their marks
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  // ---------- the board facts of one move (White = 1 to move; DIST = steps to the far corner) ----------
  function fact(E, id, spec, m, P) {
    E.setRule('c33');
    const p = E.Pos.from(spec), me = p.turn, T = E.target(me), D = E.DIST()[me], f = E.mFrom(m), t = E.mTo(m);
    if (!p.moves().includes(m)) return null;
    const g = D[f] - D[t], h = E.isJump(p, m) ? E.path(p, m).length - 1 : 0, q = p.clone().play(m);
    const o = { g, h, inF: !!T[f], inT: !!T[t], home: q.inTarget(me), holes: 9 - q.inTarget(me), home0: p.inTarget(me) };
    if (id === 'b_step') o.k = g > 0 ? 'step' : g < 0 ? 'back' : h ? 'jump0' : 'side';
    else if (id === 'b_jump') o.k = !h ? 'step' : 'jump';
    else if (id === 'b_enter') o.k = !o.inF && o.inT ? 'in' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
    else if (id === 'b_finish') o.k = q.done(me) ? 'done' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
    else if (id === 's_far' || id === 's_ladder') { o.opp = overOpp(E, p, m); o.k = !h ? (g > 0 ? 'step' : g < 0 ? 'back' : 'side') : g > 0 ? 'jump' : g < 0 ? 'jback' : 'jside'; }
    else if (id === 's_road') { const n = nextBest(E, q, D); o.nx = n.g; o.nh = n.h; o.k = h ? 'jump' : 'step'; }
    else if (id === 's_block') { const b = blackBest(E, q), b0 = blackBest(E, p); o.b = b.g; o.b0 = b0.g; o.k = b.g >= b0.g ? (b.g > b0.g ? 'more' : 'still') : 'part'; o.land = b0.all.some(x => x.path.slice(1).includes(t)); o.spring = b0.all.some(x => x.mid.includes(f)); }
    else if (id === 's_deep') { const dn = new Map((P && P.dn) || []); o.n = dn.get(m); o.k = !o.inF && o.inT ? 'in' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'fwd' : g < 0 ? 'back' : 'side'; }
    else if (id === 's_leave') { const H = E.HOME()[me]; o.c = q.inHome(me); o.left = E.R.limit - p.movesOf(me) - 1; o.t = p.movesOf(me) + 1; o.safe = o.left <= 1 ? leaveSafe(E, q, o.left) : null; o.homeF = !!H[f]; o.homeT = !!H[t]; o.k = o.safe ? 'out' : o.homeF && o.homeT ? 'inside' : o.c > o.left ? 'few' : 'block'; }
    return o;
  }
  // s_block: Black's farthest move (as if White passed when White is to move): { g, all: [{ m, path, mid (the pieces hopped) }] }
  function blackBest(E, q0) {
    const q = q0.clone(); q.side = 1; const D = E.DIST()[2]; let g = -99; const L = q.moves().filter(m => m !== E.PASS).map(m => ({ m, g: D[E.mFrom(m)] - D[E.mTo(m)] }));
    for (const x of L) g = Math.max(g, x.g);
    const all = L.filter(x => x.g === g).map(x => { const J = E.isJump(q, x.m), P = J ? E.path(q, x.m) : [E.mFrom(x.m), E.mTo(x.m)], mid = []; if (J) for (let i = 1; i < P.length; i++) mid.push((P[i - 1] + P[i]) / 2); return { m: x.m, path: P, mid }; });
    return { g, all };
  }
  // s_leave: whatever Black replies, White can still empty its starting corner by its 40th move (left: White's moves after this one)
  function leaveSafe(E, q, left) {
    if (!q.inHome(1)) return true;
    if (left <= 0 || q.inHome(1) > left) return false;
    for (const b of q.moves()) { const r = q.clone().play(b), j = E.judge(r); if (j.over) { if (j.winner === 1) continue; return false; } if (!r.moves().some(w => w !== E.PASS && leaveSafe(E, r.clone().play(w), left - 1))) return false; }
    return true;
  }
  // the question (s_leave says which move it is: the 3D board shows no move count)
  function askOf(E, id, P, V, last) {
    if (id === 's_deep') return (last ? 'ホー、これで最後の問題！ ' : '') + V.v(JA.ask[id]);
    if (id !== 's_leave') return V.v(last ? JA.askLast : JA.ask[id]);
    E.setRule('c33'); const p = E.Pos.from(P.s), t = p.movesOf(1) + 1;
    return (last ? 'ホー、これで最後の問題！ ' : '') + fill(V.v(JA.ask[id]), { t, k: E.R.limit - t + 1 });
  }
  // the black pieces a jump chain hops over
  function overOpp(E, p, m) { if (!E.isJump(p, m)) return 0; const P = E.path(p, m); let n = 0; for (let i = 1; i < P.length; i++) if (p.sq[(P[i - 1] + P[i]) / 2] === 2) n++; return n; }
  // s_road: White's farthest next move, Black standing still { g, h, m, pos }
  function nextBest(E, q, D) { const r = q.clone(); r.side = 0; let b = { g: -99, h: 0, m: -1 }; for (const m of r.moves()) { if (m === E.PASS) continue; const g = D[E.mFrom(m)] - D[E.mTo(m)], h = E.isJump(r, m) ? E.path(r, m).length - 1 : 0; if (g > b.g || (g === b.g && h > b.h)) b = { g, h, m }; } b.pos = r; return b; }
  // the words for a move u of a problem P: { k, html }
  function say(E, id, P, u, lang, V, last, tx) {
    const f = fact(E, id, P.s, u, P), fb = fact(E, id, P.s, P.best, P), right = P.ok.includes(u);
    if (lang !== 'ja') return { f, html: tx(right ? 'why' : 'ng', { m: SPOT('ok'), x: SPOT('ng') }) };
    const v = { n: P.ok.length, G: fb.g, g: f.g, k: -f.g, h: f.h, a: id === 'b_enter' && (f.k === 'inside') ? f.home0 : f.home, holes: f.holes, o: f.opp, N: fb.nx, nx: f.nx, nh: f.nh };
    if (right) {
      const k = id === 'b_step' ? 'step' : id === 'b_jump' ? (f.h > 1 ? 'chain' : 'jump1') : id === 'b_enter' ? (f.h ? 'inJ' : 'in') : id === 's_far' ? 'far' : id === 's_ladder' ? 'ladder' : id === 's_road' ? (f.g < 0 ? 'roadB' : 'road')
        : id === 's_deep' ? (f.k === 'in' ? (f.h ? 'deepInJ' : 'deepIn') : (f.h ? 'deepOutJ' : 'deepOut'))
        : id === 's_block' ? (f.land ? 'blockL' : 'blockS') : id === 's_leave' ? (f.left === 0 ? 'leave0' : !f.c ? 'leaveAll' : f.homeF && f.homeT ? 'leaveIn' : 'leaveOut') : (f.h ? 'doneJ' : 'done');
      if (id === 's_block') { v.B = f.b; v.b0 = f.b0; }
      if (id === 's_leave') { v.t = f.t; v.c = f.c; }
      if (id === 's_deep') { v.N = f.n; v.S = Math.min(...(P.dn || []).map(x => x[1]).filter(n => n > f.n)); }
      if (id === 's_block' && f.g < 0) return { f, k, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[k]), v)} 白は1マス下がるけど、黒は${f.b0 - f.b}マスも遅れるんだ。${last ? '' : ' ' + V.v(JA.push)}` };
      if (id === 'b_jump' || id === 's_far' || id === 's_ladder') v.G = f.g;
      if (id === 's_road') v.N = f.nx;
      return { f, k, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[k]), v)}${last ? '' : ' ' + V.v(JA.push)}` };
    }
    let k;
    if (id === 'b_step') k = f.k === 'back' ? (f.h ? 'backJ' : 'back') : 'jump0';
    else if (id === 'b_jump') {
      if (!f.h) k = f.g > 0 ? 'stepS' : 'stepB';
      else { E.setRule('c33'); const p = E.Pos.from(P.s), path = E.path(p, P.best); k = E.mFrom(u) === E.mFrom(P.best) && path.slice(1, -1).includes(E.mTo(u)) ? 'stop' : f.g > 0 ? 'short' : f.g < 0 ? 'shortB' : 'shortN'; }
    } else if (id === 's_far' || id === 's_ladder') {
      E.setRule('c33'); const p = E.Pos.from(P.s), D = E.DIST()[p.turn], path = E.path(p, P.best);
      v.h = fb.h;
      if (E.mFrom(u) === E.mFrom(P.best) && path.slice(1, -1).includes(E.mTo(u))) k = f.g > 0 ? 'fStop' : f.g < 0 ? 'fStopB' : 'fStop0';
      else if (f.k === 'step') k = 'fStep'; else if (f.k === 'back') k = 'fBack'; else if (f.k === 'jback') k = 'fBackJ'; else if (f.k === 'side' || f.k === 'jside') k = 'fSide';
      else if (id === 's_ladder' && !f.opp) k = 'fOwn';
      else if (id === 's_far' && D[E.mFrom(u)] < D[E.mFrom(P.best)]) k = 'fFront';
      else k = 'fJump';
    } else if (id === 's_road') k = f.h ? (f.nx > 0 ? 'rJump' : 'rJump0') : (f.nx > 0 ? 'rStep' : 'rStep0');
    else if (id === 's_block') { v.B = fb.b; v.b = f.b; k = f.k === 'more' ? 'bMore' : f.k === 'part' ? 'bPart' : f.g >= 2 ? 'bLure' : 'bStill'; }
    else if (id === 's_deep') { v.x = f.n; v.N = fb.n; v.d = f.n - fb.n; k = { in: 'dIn', inside: 'dInside', leave: 'dLeave', back: 'dBack', fwd: 'dFwd', side: 'dSide' }[f.k]; }
    else if (id === 's_leave') { v.c = f.c; k = f.left === 0 ? 'lFew0' : f.c > f.left ? 'lFew' : f.k === 'inside' ? 'lInside' : 'lBlock'; }
    else if (id === 'b_enter') k = f.k;
    else k = { near: 'fNear', none: 'fNone', inside: 'fInside', leave: 'fLeave' }[f.k];
    return { f, k, html: `${V.v(JA.soft)} ${fill(V.v(JA.n[k]), v)}` };
  }
  // the hint's marks: b_step the pieces with a free square right / above, b_jump the answer's piece, b_enter / b_finish the empty squares of the corner
  function hintPts(E, id, P) {
    E.setRule('c33'); const p = E.Pos.from(P.s), T = E.target(p.turn);
    if (id === 'b_step') return [...new Set(P.ok.map(E.mFrom))];
    if (id === 'b_jump') return [E.mFrom(P.best)];
    const D = E.DIST()[p.turn], fw = p.moves().filter(m => m !== E.PASS && E.isJump(p, m) && D[E.mFrom(m)] - D[E.mTo(m)] >= 2);
    if (id === 's_far') return [...new Set(fw.map(E.mFrom))];
    if (id === 's_ladder') { const o = new Set(); for (const m of fw) { const Q = E.path(p, m); for (let i = 1; i < Q.length; i++) { const x = (Q[i - 1] + Q[i]) / 2; if (p.sq[x] === 2) o.add(x); } } return [...o]; }
    if (id === 's_road') return [...new Set(P.ok.map(m => E.mFrom(nextBest(E, p.clone().play(m), D).m)))];
    if (id === 's_block') return [...new Set(blackBest(E, p).all.map(x => x.path[0]))];
    if (id === 's_leave') { const H = E.HOME()[p.turn], o = []; for (let i = 0; i < 64; i++) if (H[i] && p.sq[i] === p.turn) o.push(i); return o; }
    const o = []; for (let i = 0; i < 64; i++) if (T[i] && p.sq[i] === 0) o.push(i); return o;
  }
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  function make(H) {
    const { getJ, J, put } = H;
    const D = {
      LKEY: 'aicoding-ugolki-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../ugolki/lessons.json?v=7'), ld('../ugolki/i18n-ug.js?v=4lv7'), ld('../ugolki/i18n-ug-more.js?v=4lv7'), ld('../ugolki/i18n-ug-eu.js?v=4lvn7'), ld('../ugolki/i18n-ug-hiar.js?v=4lv-l14-7'),
          loadJs(ENG, () => !!window.UgolkiEngine)])
          .then(([d, ...src]) => { const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const tx of src.slice(0, 4)) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) { console.warn('[lessons3d] ugolki texts', e); } }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.ugolki ? AtlasMini.ugolki(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const E = window.UgolkiEngine, ja = lang === 'ja', id = s.id, V = voice([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 100003 + (SALT[id] || 0)), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: 1 }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: E ? hintPts(E, id, P) : [],
            ask: ja ? askOf(E, id, P, V, last) : T('goal'), hintTx: ja ? fill(V.v(JA.hint[id]), { N: id === 's_deep' ? Math.min(...P.dn.map(x => x[1])) : '' }) : T('hint') };
          const sayU = u => say(E, id, P, u, lang, V, last, (k, v) => T(k, v)).html;
          o.good = u => sayU(u == null ? P.best : u);
          o.ng = u => { if (u == null || P.ok.includes(u)) { E.setRule('c33'); u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); } return sayU(u); };
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= ugolki/app.js okAnswer: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: 1, lock: true } } : null; },
    };
    return D;
  }
  const API = { make, JA, READY, fact, say, hintPts, voice, nextBest, askOf, blackBest, leaveSafe };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsUgolki = API;
})();
