/* =====================================================================
   Agon — the lessons on the 3D table (atlas/lessons3d.js DATA.agon, 2026-11-27 担当F).
   agon/lessons.json (the same file as the 2D lessons, progress the full game's 'aicoding-agon-lessons' { id: { best, clear } }),
   told by キンダイスン (Goldpup, the guide of atlas/rules/agon.js and the 3D puzzles atlas/games/agon-pz.js).
   Every reason is a fact of the board, read by agon/ls-facts.js (the 2D and tools/lesson-verify-agon-ls.js read the same):
   b_step  — a step along the same ring (not inwards) / a step inwards that the enemy's next move sandwiches (the gold move) /
             the one step inwards after which nothing of yours can be sandwiched;
   b_throne — a guard's move (only the queen may go onto the throne) / a step of the queen along her ring / a step of the queen
             inwards that the enemy's next move sandwiches (the gold move) / the one safe step of the queen inwards (onto the throne,
             or next to it);
   b_capture — the move that sandwiches an enemy piece / a move next to an enemy piece with nothing of yours beyond it (an
             empty cell, the board's edge, another enemy piece) / a move next to no enemy piece;
   b_reloc — (a relocation turn) the edge cell where the relocated guard is sandwiched by the enemy's next move (the gold move) /
             a safe cell that leaves the enemy's capture of another guard of yours open (the gold move) / the one cell that blocks
             it (the cell the enemy would step into), after which the enemy's next move captures nothing;
   b_safe — (a guard of yours the enemy's next move would sandwich) a move whose piece the enemy's next move sandwiches (the gold
             move) / a move that leaves the guard in danger to the gold move / the one move after which nothing can be captured
             (the guard moved away, or the cell the enemy would step into filled);
   s_double (2026-11-27 担当D) — a move that captures nothing / a move that captures one piece only (one relocation for the
             enemy) / the one move that sandwiches two enemy pieces at once, in two directions (two relocation turns);
   s_block — (the enemy queen on the throne, five enemy guards round her) a move that captures nothing, next to an enemy piece or
             not, after which the enemy brings in its sixth guard (the gold move) / the one move that sandwiches the incoming
             guard, so the enemy's next turn is the relocation;
   b_finish — (the queen on the throne, five guards round her) a guard next to the throne slid into the empty cell, so the cell
             it left is empty now / any other move, the empty cell left as it is (still five guards) / the one move that brings
             the sixth guard in from outside, the game won.
   No coordinates on the 3D board: the answer is the green move, yours the red one, the enemy's capturing move gold.
   Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game until they are.
   AtlasLsAgon.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_step', 'b_throne', 'b_capture', 'b_reloc', 'b_safe', 'b_finish', 's_block', 's_double'];
  // ---------- キンダイスン's words (ja) ----------
  const JA = {
    intro: {
      b_step: 'ワンワン、キンダイスンだよ！ アゴンは<b>女王を王座に座らせて、まわりの6マスを自分のガードでうめたら勝ち</b>のゲーム。駒は<b>同じ輪の上か、1つ内側の輪へ1歩</b>ずつ動いて、外へは戻れないんだ。<br>内側へ進むときは、<b>相手の次の手で一直線にはさまれないマス</b>を選ぼう！',
      b_throne: 'ワン！ 中央の王座に入れるのは<b>女王（六角形の駒）だけ</b>。女王を<b>1つ内側の輪へ1歩</b>ずつ進めて、王座をめざすんだ。<br>でも、進んだ先で<b>相手の次の手に一直線にはさまれる</b>と女王が捕まって、次の手番を置き直しに使うことになっちゃう。安全な1歩を選んでね！',
      b_reloc: 'ワン！ 自分のガードが捕まったら、次の手番は<b>そのガードを外周（5の輪）の空きマスへ置き直す</b>番。ほかの駒は動かせないんだ。<br>置き直す場所は、<b>相手の次の手ではさまれないマス</b>。それに、相手がきみの<b>別のガードをはさみに入ってくるマス</b>があったら、そこへ置いてふさいじゃおう！',
      b_safe: 'ワン！ 相手の次の1手で<b>一直線にはさまれるガード</b>がいるよ。捕まると外周へ置き直しになって、1手損しちゃうんだ。<br>守り方は2つ。<b>そのガードを動かす</b>か、<b>相手が入ってくるマスを先にふさぐ</b>か。動かした駒が<b>またはさまれないか</b>も確かめよう！',
      s_block: 'ワン！ 相手の女王が王座にいて、まわりの5マスは相手のガード。<b>次の1手で6枚目が入ると、相手の勝ち</b>だよ。<br>最後の空きマスにきみの駒は入れないから、<b>そこへ来るガードを一直線にはさむ</b>んだ。捕まった駒の持ち主は、次の手番を置き直しに使うんだワン！',
      b_finish: 'ワン！ 女王が王座に座って、まわりの6マスのうち5マスはもうきみのガード。<b>残りの空きマスへ外から6枚目のガードを入れたら勝ち</b>だよ。<br>でも、王座のとなりにいるガードを横へずらすと、<b>もといたマスが空くだけ</b>。外の輪から入れるガードを探そう！',
      s_double: 'ワン！ 1つのマスへ動いた駒が、<b>2つの方向で同時に</b>相手の駒をはさむと、1手で<b>2枚</b>捕まるんだ。置き直しは1手に1枚ずつだから、相手は<b>置き直しに2手</b>使うことになる。大きな得だワン！<br>捕獲できる手がいくつかあったら、<b>はさめる相手の駒が何枚か</b>数えて選ぼう！',
      b_capture: '動かした駒と自分のもう1枚で、相手の駒を<b>一直線にはさむと捕獲</b>だワン。捕まった駒は盤に残るけど、持ち主は<b>次の手番を置き直しに使う</b>から、1手の得になるんだ。<br>相手の駒のとなりへ行くだけじゃ捕まらない。<b>その向こうに自分の駒がいる一直線</b>を探そう！',
    },
    ask: {
      b_step: ['内側へ進めて、しかも次にはさまれない1歩はどれかな？', '1つ内側の輪へ、安全に進める駒はどれ？', '内側への1歩のうち、相手にはさまれないのはどれだろう？', 'ワン、内側へ進む手を指してね。相手の次の手もちゃんと見て！', '進んだ先のとなりをよく見て。安全に内側へ入れる1歩は？'],
      b_throne: ['女王を1つ内側へ、安全に進める1歩はどれかな？', '王座をめざす女王の1歩、どこへ進めばいい？', '女王が相手にはさまれずに内側へ入れる手は？', 'ワン、女王を王座に近づけよう。どの1歩が安全？', '女王の内側の行き先を見て。はさまれないのはどれ？'],
      b_reloc: ['捕まったガード、外周のどこへ置き直す？', '相手の次の手で何も捕まらないように置き直せるマスはどこ？', 'ワン、置き直しの番だよ。相手のはさみ取りをふさげるマスは？', '置き直したガードも、ほかのガードも守れるマスを探してね！', '相手が次に入りたいマスはどこかな？ そこへ置き直そう。'],
      b_safe: ['危ないガードを守る1手はどれかな？ 指したあと、相手が何も捕まえられないように！', '相手の次のはさみ取りを止める手を探してね！', 'ワン、ガードがねらわれてるよ。どう守る？', '動かして逃げる？ 入り口をふさぐ？ 何も捕まらなくなる1手はどれ？', '相手が入りたいマスはどこかな？ それを見てから守りの1手を選ぼう。'],
      s_block: ['相手の完成を止める1手はどれかな？', 'ワン、相手はあと1枚で勝ち。どう止める？', '最後の空きマスへ向かう相手のガード、一直線にはさめる手は？', '相手がすぐに勝てなくなる1手はどれだろう？', '王座のとなりの空きマスをねらう駒、どうやって止める？'],
      b_finish: ['6枚目のガードを入れて勝つ1手はどれかな？', '王座のまわりの空きマス、どのガードで埋める？', 'ワン、女王のまわりはもう5枚。勝ちを決める手はどれ？', '空きマスへ入れても、ほかのマスが空かないガードはどれ？', '女王のまわりを6枚そろえる手を探してね！'],
      s_double: ['1手で相手の駒を2枚捕まえられる手はどれかな？', 'ワン、相手の駒を2枚いっぺんにはさめるマスを探してね！', '捕獲できる手はいくつかあるよ。2枚捕まるのはどれ？', '相手に置き直しを2手使わせる1手はどれだろう？', '行き先ごとに、はさめる相手の駒を数えてみて。2枚になるのは？'],
      b_capture: ['一直線のはさみ取りで、相手の駒を捕まえられる手はどれ？', 'ワン、捕獲できる1手を探してね！', '自分の駒と駒のあいだに相手の駒をはさめる手は？', 'どの駒をどこへ動かすと、相手の駒を捕まえられるかな？', 'はさみ取りのチャンスがあるよ。どの手かな？'],
    },
    askLast: {
      b_step: ['これで最後の問題だワン！ 安全に内側へ進む1歩はどれ？', 'ラストの問題。相手の次の手まで読んで、内側への1歩を選ぼう！'],
      b_throne: ['これで最後の問題だワン！ 女王を安全に内側へ進める1歩は？', 'ラストの問題。相手の次の手まで読んだら、女王の安全な1歩はどれ？'],
      b_reloc: ['これで最後の問題だワン！ どこへ置き直せば、相手の次の手で何も捕まらない？', 'ラストの問題。相手の入りたいマスを見つけて、置き直そう！'],
      b_safe: ['これで最後の問題だワン！ 相手の次の手で何も捕まらない1手はどれ？', 'ラストの問題。危ないガードを、安全に守り切ろう！'],
      s_block: ['これで最後の問題だワン！ 相手の完成を止める手はどれ？', 'ラストの問題。相手の6枚目を、はさみ取りで食い止めて！'],
      b_finish: ['これで最後の問題だワン！ 6枚目を入れて勝つ手はどれ？', 'ラストの問題。外から入れるガードを見つけて、勝ち切ろう！'],
      s_double: ['これで最後の問題だワン！ 1手で2枚捕まえられる手はどれ？', 'ラストの問題。行き先から2本の一直線ではさみが決まる1手を見つけよう！'],
      b_capture: ['これで最後だワン！ 相手の駒を捕まえる手はどれ？', 'ラストの問題。一直線をよく見て、はさみ取ろう！'],
    },
    hint: {
      b_step: ['光っているのが内側へ進める駒。進んだ先のとなりに相手の駒がいたら、反対側のマスへ相手が来られるか見てみて！', '光る駒ごとに、内側の行き先を見てみよう。反対側のマスへ相手が1歩で来られたら危ないワン。', 'となりに相手の駒がない行き先は安心。いるときは、反対側のマスが空いていて相手が来られるか確かめてね。', '光っている駒の内側への1歩を、1つずつ相手の気持ちで見てみよう！', '内側へ入ったあと、相手の駒と駒のあいだにならないか考えてみて。'],
      b_throne: ['光っているのは女王と、女王の内側の行き先のとなりにいる相手の駒。反対側のマスへ相手が1歩で来られるか見てみて！', '女王の内側の行き先ごとに、となりの相手の駒の反対側をのぞいてみて。そこへ相手が来られたら危ないワン。', '光る相手の駒の反対側が空いていて、相手が1歩で入ってこられるかがカギだワン。', '女王の行き先を1つずつ、相手の気持ちで見るのがコツだワン！', '進んだ先で、女王が相手の駒と駒のあいだにならないか確かめて。'],
      b_reloc: ['光っているのは置き直すガードと、相手にはさまれそうなきみのガード。そのガードのとなりで、相手が1歩で入ってこられる外周のマスを探して！', '危ないガードをはさむには、相手はどのマスへ入ればいいかな？ そこが置き直しの場所だワン。', 'はさまれそうなガードの片側には、もう相手の駒がいるよ。反対側の外周のマスが、相手の入り口なんだ。', 'まず相手の気持ちになって、次にはさみに来る手を探してみよう！', '置き直した先が、相手の駒と駒のあいだにならないかも確かめてね。'],
      b_safe: ['光っているのは危ないガードと、それをはさみに来る相手の駒、相手の入るマスへ動けるきみの駒。相手はどのマスへ入りたいかな？', '相手の駒が1歩で入ってくるマスを見つけよう。そのマスをふさぐか、ガードを逃がすかだワン。', 'ガードを動かすなら、行き先のとなりも見てね。そこでまた相手の駒と駒のあいだにならないかな？', 'まず相手の気持ちになって、はさみに来る手を探してみよう！', '入り口をふさぐ駒が、そこで逆にはさまれないかも確かめてね。'],
      s_block: ['光っているのは、最後の空きマスへ来られる相手のガードと、そのとなりへ動けるきみの駒。向こう側にきみの駒がいる一直線を探して！', 'そのガードの向こう側を見てみて。そこにきみの駒がいれば、反対側へ動くだけではさめるワン。', '相手のとなりへ行くだけじゃ捕まらないよ。一直線に「行き先・相手のガード・きみの駒」と並ぶ手を探してね。', 'まず、王座のとなりの空きマスへ1歩で入れる相手の駒はどれかな？', '光る駒の行き先を1つずつ、相手のガードの向こう側まで見通してみて！'],
      b_finish: ['光っているのは、王座のとなりの空きマスへ1歩で入れる駒。入ったあと、ほかのマスが空かないのはどれかな？', '王座のとなりのガードが横へずれると、もといたマスが空いちゃう。外の輪から入れる駒を探してね。', '光る駒のうち、まわりの5枚の仲間じゃない駒はどれ？ それが6枚目のガードだワン。', '空きマスへ入ったあと、女王のまわりが6枚そろうか数えてみよう！', '外の輪から内側へ1歩で入れる駒を見てみて！'],
      s_double: ['光っているのは、相手の駒を捕まえられる駒。行き先ごとに、はさめる相手の駒が何枚あるか数えてみて！', '1枚だけ捕まる手もまじっているよ。行き先の6方向を見て、はさめる相手の駒が2枚になるマスを探そう。', '光る駒の行き先を1つずつ見て、「行き先・相手の駒・きみの駒」の一直線がいくつできるか数えるんだワン。', '2枚捕まえるには、行き先から2つの方向に、それぞれ相手の駒とその向こうのきみの駒が要るんだ。', '捕獲できる手を全部くらべてみよう。いちばん多く捕まるのはどれかな？'],
      b_capture: ['光っているのは、相手の駒のとなりへ動ける駒。その相手の駒の向こうに、きみの駒がいるかな？', '相手の駒をはさむには、向こう側に自分の駒が必要だワン。光る駒の行き先ごとに確かめよう。', '一直線に「行き先・相手の駒・きみの駒」と並ぶ形を探してみて！', '相手の駒のとなりへ行くだけじゃ捕まらないよ。その先のマスを見てね。', '光る駒の行き先を1つずつ、向こう側まで見通してみよう！'],
    },
    cheer: ['正解だワン！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすが！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってるね！', '目が慣れてきたね。次へ！', 'その見方、次でも使えるはず！', 'いい流れ。もう一問いこう！'],
    soft: ['ドンマイ！', 'だいじょうぶ！', 'よくある見落としだよ。', 'いっしょに見てみよう！', '次はきっと見つかる！'],   /* 追66・追68: said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 */
    w: {
      b_step: ['内側の輪へ1歩、しかも相手の次の手でもはさまれないマスだね！', 'ワン、王座に1歩近づいたよ。そこなら相手がどう動いてもはさめないんだ。', '安全な内側の1歩を見つけたね。ほかの内側への手は、相手にはさまれちゃうんだ。', '内側へ進んで、となりの形もばっちり。相手は1手ではさめないワン。', '相手の次の手まで見て選べたね。内側へ入っても捕まらない1歩だよ。'],
      b_throne: ['女王が王座に座ったね！ 相手の次の手でもはさまれないから、あとはガードで周りの6マスをうめていくんだワン。', 'ワン、女王が王座に座ったよ。王座は女王だけの場所、いちばん大事な1歩が決まった！', '王座に座れたね。となりに相手の駒がいても、次の手で反対側から押さえることはできないんだ。', '女王が真ん中に入ったよ。ここからはガードを1の輪へ集めよう！', '王座に一番乗り！ 相手の次の手では、女王ははさまれないワン。'],
      b_throne1: ['女王が王座のとなりの輪へ入ったね！ そこなら相手の次の手でもはさまれないワン。', 'ワン、王座まであと1歩。ほかの内側の行き先は、相手にはさまれちゃうんだ。', '女王を安全に内側へ進められた！ 王座はもう目の前だよ。', '相手の次の手まで見て選べたね。女王ははさまれずに1の輪へ入ったワン。', '女王が王座のとなりへ。相手がどう動いても、次の手でははさめないんだ。'],
      b_reloc: ['ふさいだね！ そのマスは、相手がはさみに入りたかった入り口。相手の次の手では何も捕まらないワン。', 'ワン、置き直しで守りまで決まった！ 置いたガードもほかのガードも、次の手ではさまれないよ。', '相手のはさみ取りの入り口に置き直せたね。きみのガードは、もうはさまれないワン。', '置き直しの1手で、相手の次のはさみ取りを止めたよ。お見事だワン！', '相手が入りたいマスを先に取ったね。置いたガードもはさまれない、ばっちりの場所だワン。'],
      b_safe: ['ガードを安全なマスへ逃がせたね！ 相手がどう動いても、次の手では何も捕まらないワン。', 'ワン、危ないガードが逃げ切ったよ。行き先でもはさまれない、ばっちりの1歩だ。', 'ガードを動かして守れたね。ほかの手だと、相手に何かをはさまれちゃうんだ。', 'ねらわれたガードを、はさまれない場所へ動かせた！ 相手の次の手は空振りだワン。', '逃げた先のとなりまで見て選べたね。相手は次の手で何も捕まえられないよ。'],
      b_safe_b: ['入り口をふさいだね！ 相手がはさみに入りたかったマスを先に取ったから、次の手では何も捕まらないワン。', 'ワン、ふさぐ守りが決まった！ ふさいだ駒もはさまれない、ばっちりの場所だよ。', '相手の入り口に先回りできたね。危ないガードも、ふさいだ駒も無事だワン。', 'ガードを動かさずに守れたね。相手の入るマスをふさげば、はさみ取りは起きないんだ。', '相手が入りたいマスを先にふさいだよ。相手の次の手は空振りだワン！'],
      s_block: ['入ってくるガードを捕まえたね！ 相手は次の手番を置き直しに使うから、すぐには完成できないワン。', 'ワン、空きマスをねらうガードを捕まえて、6枚目を止めたぞ。捕まったガードの置き直しで、相手は1手使うんだ。', '一直線のはさみ取りで捕獲成功！ 相手は次の番、置き直しをしなきゃいけないから、まだ勝てないよ！', '最後のマスへ向かう駒を捕まえた！ 相手は置き直しの番になって、勝ちはおあずけだワン。', '入り口のガードを捕獲！ 置き直しに1手かかるから、相手の完成は止まったんだ。'],
      b_finish: ['6枚目のガードが入って、女王のまわりがぜんぶきみのガードになった！ きみの勝ちだワン！', 'ワン、王座のまわりが6枚そろったよ。これがアゴンの勝ちの形！', '外からのガードで最後のマスを埋めたね。女王を6枚のガードが囲んで、勝ちだワン。', 'ほかのマスを空けずに空きマスを埋められた！ 6枚そろって勝ちだよ。', '女王のまわりの6マスがぜんぶきみのガード。勝ちを決める仕上げだワン！'],
      s_double: ['2枚同時の捕獲！ 相手は1手に1枚ずつしか置き直せないから、置き直しに2手かかるんだワン。', 'ワン、2つの方向で一度にはさめたね！ 捕まった2枚は、相手が2手かけて置き直すんだ。', '1手で2枚だよ。ほかの捕獲は1枚だけだったから、これがいちばんの得なんだ。', '行き先から2つの方向に、相手の駒ときみの駒が並んでいたね。お見事な2枚取りだワン！', 'はさめる枚数を数えて選べたね。2枚捕まって、相手は置き直しで2手使うよ。'],
      b_capture: ['捕獲成功！ 相手は次の番を置き直しに使うから、1手の得なんだ。', 'ワン、はさみ取りが決まった！ 捕まったガードは外の輪へ置き直しになるよ。', 'きみの駒と駒のあいだに相手の駒が入ったね。お見事な捕獲だワン。', '向こう側の自分の駒まで見えていたね。きれいに決まった！', '一直線の形を見つけて捕獲。相手は置き直しに1手使うんだ。'],
    },
    n: {
      side: ['赤い手は同じ輪の上を横へ動く1歩で、内側へは進んでいないんだ。緑の手なら1つ内側の輪へ入れたよ。', 'ワン、赤は輪が変わらない横への1歩だから、王座に近づかないんだ。緑の手が内側への安全な1歩だったよ。', '赤の手は同じ輪の上だから、王座からの近さは変わらないの。緑の手なら内側へ進めて、はさまれもしないんだ。', '同じ輪の上を横へ動くだけだと、王座に近づかないよね。緑の手は1つ内側の輪へ進む1歩だワン。', '赤は同じ輪の上での1歩だから、内側へは進めていないの。緑の手を見てみて！'],
      trap: ['赤い手で内側へは進めたけど、相手が金色の手で動くと、一直線にはさまれて捕まっちゃう。緑の手なら安全だったワン。', '赤の行き先は、となりに相手の駒がいて、反対側へも相手が来られるマス。金色の手ではさまれるんだ。緑の1歩なら大丈夫！', '内側へ進んだのはいいね。でも金色の手で相手が入ってくると、赤の駒がはさまれちゃう。緑の手を見てみて！', 'ワン、赤は相手の金色の1手で捕まる場所なんだ。緑の手なら内側へ入っても、はさまれないよ。', '赤の駒は、金色の手のあと相手の駒2枚のあいだになるから、捕獲されちゃうの。緑が安全な内側の1歩だったんだ。'],
      guard: ['赤はガードの手。ガードは王座に入れないから、動かしても女王は王座に近づかないんだ。緑の手が女王の1歩だよ。', 'ワン、赤で動いたのはガード。王座をめざすのは女王だから、緑の女王の手を見てみて！', '赤の手は女王じゃなくてガードの1歩。女王の位置は変わらないから、王座に近づかないの。緑の手なら女王が内側へ進めたよ。', '王座に座れるのは女王だけ。赤のガードの手では女王は動かないんだ。緑の手を見てね。', '赤はガードを動かす手だから、女王は同じ場所のまま。緑の手が女王を内側へ進める1歩だったワン。'],
      qside: ['赤い手は女王が同じ輪の上を横へ動く1歩で、王座に近づいていないんだ。緑の手なら1つ内側へ入れたよ。', 'ワン、赤は女王の輪が変わらない横への1歩。緑の手が内側への安全な1歩だったよ。', '赤の手だと女王は同じ輪の上のまま。王座からの近さは変わらないの。緑の手を見てみて！', '女王が横へ動くだけだと、王座に近づかないよね。緑の手は1つ内側へ進む1歩だワン。', '赤は同じ輪の上での女王の1歩だから、内側へは進めていないの。緑の手を見てね。'],
      qtrap: ['赤い手で女王は内側へ進めたけど、相手が金色の手で動くと、一直線にはさまれて女王が捕まっちゃう。緑の手なら安全だったワン。', '赤の行き先は、となりに相手の駒がいて、反対側へも相手が来られるマス。金色の手で女王がはさまれるんだ。緑の1歩なら大丈夫！', '内側へ進んだのはいいね。でも金色の手で相手が入ってくると、女王がはさまれて、次の手番を置き直しに使うことになっちゃう。緑の手を見てみて！', 'ワン、赤は相手の金色の1手で女王が捕まる場所なんだ。緑の手なら内側へ入っても、はさまれないよ。', '赤の女王は、金色の手のあと相手の駒2枚のあいだになるから、捕獲されちゃうの。緑が安全な内側の1歩だったんだ。'],
      rtrap: ['赤のマスに置き直すと、相手の金色の手で一直線にはさまれて、また捕まっちゃう。緑のマスなら安全で、相手のはさみ取りもふさげたワン。', 'ワン、赤のマスは相手の駒のとなり。金色の手で反対側から押さえられて、また捕まるんだ。緑のマスを見てみて！', '赤に置いたガードは、金色の手のあと相手の駒2枚のあいだになっちゃう。緑なら捕まらないし、ほかのガードも守れたよ。', '置き直してすぐ、金色の手でまた捕まる場所なんだ。緑のマスが、相手のはさみ取りの入り口だったワン。', '赤のマスだと金色の1手でまたはさまれちゃう。緑のマスなら何も捕まらなかったんだ。'],
      ropen: ['赤に置いたガードは無事だね。でも相手が金色の手で入ってくると、きみのほかのガードが捕まっちゃう。緑のマスは、その入り口をふさぐ場所だったワン。', 'ワン、置き直したガードは捕まらないけど、そこだと入り口が空いたままだから、金色の手で別のガードが一直線にはさまれるんだ。緑に置けば、相手はそこへ入れなかったんだ。', '赤の場所だと、相手のはさみ取りの入り口が空いたまま。金色の手で別のガードが捕まっちゃう。緑のマスを見てみて！', '置いたガードは安全。でも金色の手を見て。相手がそこへ入ると、きみのもう1枚のガードが一直線に押さえられるの。緑がその入り口だったんだ。', '赤のマスは、相手の金色の手を止められないんだ。きみのガードがもう1枚捕まっちゃう。緑に置き直せば、何も捕まらなかったワン。'],
      strap: ['赤で動かした駒は、相手の金色の手で一直線にはさまれて捕まっちゃう。緑の手なら何も捕まらなかったワン。', 'ワン、赤の行き先は相手の駒のとなりで、反対側へも相手が来られるマス。金色の手ではさまれるんだ。緑の手を見てみて！', '赤の駒は、金色の手のあと相手の駒2枚のあいだになるから、捕獲されちゃうの。緑が安全な守りの1手だったよ。', '動かした先で、金色の1手にまたはさまれる場所なんだ。緑の手なら、相手は何も捕まえられないワン。', '赤の手だと、金色の手で動かした駒が捕まっちゃう。緑の手を見てね。'],
      sleft: ['赤の手のあとも、危ないガードはそのまま。相手の金色の手で一直線にはさまれちゃう。緑の手なら守れたワン。', 'ワン、赤で動かした駒は無事だけど、ねらわれたガードは動いていないから、金色の手で捕まっちゃうんだ。緑の手を見てみて！', '赤の手では、危ないガードを守れていないの。金色の手ではさまれちゃう。緑が守りの1手だったよ。', '金色の手を見て。相手がそこへ入ると、危ないガードが一直線に押さえられるの。赤の手ではそれを止められないんだ。緑の手なら止められたワン。', '赤の手だと、ねらわれたガードが金色の1手で捕まっちゃう。緑の手を見てね。'],
      bnone: ['赤の手では何も捕まらないから、相手は金色の手で6枚目のガードを入れて勝っちゃう。緑の手なら空きマスへ向かうガードを捕まえられたワン。', 'ワン、赤だと捕獲は0枚。相手は次の番に金色の手で最後のマスを埋めて完成だよ。緑の手を見てみて！', '赤の行き先のとなりには相手の駒がいないから、何もはさめないの。金色の手で相手が完成させちゃう。緑の手がはさみ取りだったんだ。', '赤の手では何も捕まえていないから、相手は置き直しもなしに金色の手で6枚目を入れられるんだ。緑の手なら止められたワン。', '何も捕まえないと、相手は金色の1手で勝ち。赤の手ではそれを止められないの。緑の手を見てね。'],
      btouch: ['赤の手は相手の駒のとなりへ行くけど、一直線にはさめていないから何も捕まらない。相手は金色の手で6枚目を入れて勝っちゃうワン。緑の手を見てみて！', 'ワン、赤は相手の駒にくっついただけ。向こう側にきみの駒がいないから捕まらなくて、金色の手で完成されちゃう。緑の手ならはさめたよ。', '赤のとなりの相手の駒は、一直線の先にきみの駒がいないの。何も捕まらないから、相手は金色の手で勝ち。緑がはさみ取りの手だったんだ。', '相手の駒のとなりへ行くだけじゃ止められないの。赤の手のあと、金色の手で最後のマスが埋まっちゃう。緑の手を見てね。', '赤の手では、となりの相手の駒をはさめていないんだ。何も捕まらず、金色の手で相手の完成。緑の手なら止められたワン。'],
      fshift: ['赤の手で王座のとなりのガードが横へずれたから、もといたマスが空いちゃった。女王のまわりはまだ5枚だワン。緑の手なら外から6枚目が入って勝ちだったよ。', 'ワン、赤で動いたガードはもとから女王のそばにいたから、もといたマスに穴があくんだ。まわりはまだ5枚。緑の手が外からのガードだよ。', '赤で動いたのは、もう内側の輪にいたガード。穴がとなりへ移っただけだから、まわりのガードは5枚のままなんだ。緑の手を見てみて！', '内側の輪のガード同士で場所を動いても、空きマスは1つ残るの。赤の手でもといたマスが空いたから、まわりは5枚。緑の手なら6枚そろったワン。', '赤の手のあとも、女王のまわりは5枚。ずれたガードのもといたマスが空いたからなんだ。緑は外の輪から入る手だったよ。'],
      faway: ['赤の手は外の輪のガードを横へ動かしただけだから、空きマスは空いたまま。まわりはまだ5枚だワン。緑の手なら空きマスへ入って勝ちだったよ。', 'ワン、赤だと空きマスに誰も入っていないから、女王のまわりは5枚のまま。緑の手が空きマスへ入る1歩だよ。', '赤で動いたガードは外の輪の上を横へ進んだだけで、空きマスには届いていないの。だから空きマスはそのまま、まわりは5枚。緑の手を見てみて！', '空きマスは空いたまま。赤の手は空きマスへ入る手じゃないから、女王のまわりのガードは5枚から増えないんだ。緑の手なら6枚目が入ったワン。', '赤の手のあとも、女王のそばに1つ穴があいたまま。誰もそこへ入っていないから、まわりは5枚だよ。緑は、そのガードを内側へ1歩入れる手だったんだ。'],
      done: ['赤い手で捕まえられるのは1枚だけ。相手は1手で置き直せちゃうんだ。緑の手なら2方向のはさみが決まって、2枚捕まえられたワン。', 'ワン、赤の手は1枚取り。緑の手なら2枚取れて、相手は置き直しに2手かかったんだ。', '赤の行き先からはさめる相手の駒は1枚だけなの。緑の行き先なら、2つの方向に相手の駒ときみの駒が並んでいたよ。', '赤だと捕獲は1枚で、相手の置き直しも1手ですむんだ。緑の手を見てみて、2枚いっぺんに捕まるよ！', '赤の手だと捕まるのは1枚だけ。緑の手なら2枚で、相手に置き直しを2手使わせられたんだワン。'],
      dnone: ['赤い手では、相手の駒を一直線にはさめないから、何も捕まらないんだ。緑の手なら相手の駒を2枚まとめて捕まえられたワン。', 'ワン、赤の手だと捕獲は0枚。緑の手なら、相手の駒を2枚いっぺんに捕まえられたよ。', '赤の行き先からは、向こう側にきみの駒がいる一直線ができないから、何も捕まらないの。緑の手を見てみて、2枚捕まるんだ！', '赤では何もはさめないね。緑の手は2つの方向に「相手の駒・きみの駒」が並ぶマスへ行く手だワン。', '赤だと相手の駒は捕まらないんだ。緑の手なら2枚捕まって、相手は置き直しに2手かかったよ。'],
      none: ['赤い手の行き先のとなりには相手の駒がいないから、何もはさめないんだ。緑の手なら捕獲できたワン。', '赤の手は相手の駒にくっついていないから、はさめないの。はさむには、まず相手の駒のとなりへ行かなきゃ。緑の手を見てみて！', 'ワン、赤の行き先のまわりに相手の駒はいないから、何も捕まらないよ。緑の手が一直線にはさむ手だったんだ。', '赤だと相手の駒に届かないね。緑の手なら、きみの駒と駒で相手をはさめたよ。', '赤の行き先のとなりに相手の駒は1枚もいないから、はさめないんだ。緑の手で捕獲できたよ。'],
      empty: ['赤の手は相手の駒のとなりへ行くけど、その向こうは空きマス。はさむ相棒がいないんだ。緑の手なら捕獲できたワン。', '赤は相手の駒にくっついたね。でも向こう側が空いているから、はさめないの。緑の手を見てみて！', 'ワン、赤のとなりの相手の駒は、向こう側が空きマス。一直線に自分の駒がいないと捕まらないんだ。緑なら捕獲できたよ。', '相手の駒の向こうが空いていると、はさみ取りにならないんだ。緑の手は向こう側にきみの駒がいる形だよ。', '赤の手だと、相手の駒の先は空きマスのまま。緑の手なら一直線にはさめたんだ。'],
      edge: ['赤の手は相手の駒のとなりへ行くけど、その向こうは盤のはし。はさむことはできないんだ。緑の手なら捕獲できたワン。', '赤のとなりの相手の駒は盤のはしにいて、向こう側にマスがないから、はさめないの。緑の手を見てみて！', 'ワン、盤のはしの駒は、向こう側から押さえられないんだ。緑の手なら一直線にはさめたよ。', '相手の駒の先が盤のはしだと、はさみ取りにならないの。緑の手は向こう側にきみの駒がいる形だよ。', '赤の手だと、相手の駒の向こうは盤の外。緑の手で捕獲できたんだ。'],
      enemy: ['赤の手は相手の駒のとなりへ行くけど、その向こうにも相手の駒。一直線にきみの駒がいないから、はさめないワン。緑の手を見てみて！', '赤のとなりは相手の駒が2枚並んだ列。はさめるのは1枚のときだけなんだ。緑の手なら捕獲できたよ。', 'ワン、相手の駒の向こうも相手の駒。向こう側にきみの駒がいないから、捕まらないんだ。緑の手を見てね。', '相手の駒が続いていると、はさみ取りにならないの。緑の手は向こう側にきみの駒がいる形だよ。', '赤の先は相手の駒が2枚。緑の手なら1枚を一直線にはさめたんだ。'],
      mixed: ['赤の手は相手の駒のとなりへ行くけど、どの駒も向こう側にきみの駒がいないから、はさめないんだ。緑の手なら捕獲できたワン。', '赤がくっついた相手の駒は、どれも向こう側にきみの駒がいないから、はさめないの。緑の手を見てみて！', 'ワン、赤のとなりの相手の駒は、どれも一直線の先に自分の駒がいないんだ。緑なら捕獲できたよ。', 'となりの相手の駒は、どの1枚も向こう側にきみの駒がいないから、はさめないね。緑の手は捕獲できる形だよ。', '赤の手だと、どの相手の駒もはさめないの。緑の手で一直線にはさめたんだ。'],
    },
  };
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    // (2026-11-27 担当F) the permutation numbered (seed × 37 + length × 11) mod n! — a different order for every lesson (the shuffle
    // before gave b_throne and b_safe the same order of openers)
    const order = list => { let o = perm.get(list); if (o) return o; const n = list.length; let F = 1; for (let i = 2; i <= n; i++) F *= i;
      let r = (seed * 37 + n * 11) % F; const rest = list.slice(); o = [];
      for (let i = n; i > 0; i--) { F /= i; const j = Math.floor(r / F); r %= F; o.push(rest.splice(j, 1)[0]); }
      perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const fill0 = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m);
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  const engine = () => (typeof window !== 'undefined' && window.AgonEngine) || (typeof require === 'function' ? require('../agon/engine.js') : null);
  const facts = () => (typeof window !== 'undefined' && window.AgonLsFacts) || (typeof require === 'function' ? require('../agon/ls-facts.js') : null);
  // the words for move u (lang ja: キンダイスン's; else the 2D words, the moves named by their marks). tx: the 2D text getter, V: the voice
  function words(id, P, u, lang, tx, V, last, fill) {
    const E = engine(), F = facts(); E.setRule('std');
    const f = F.fact(E, id, P.s, u), right = f.k === 'ok';
    if (lang === 'ja') {
      if (right) return { f, html: `${V.v(JA.cheer)} ${V.v(JA.w[id === 'b_throne' && !f.throne ? 'b_throne1' : id === 'b_safe' && f.block ? 'b_safe_b' : id])}${last ? '' : ' ' + V.v(JA.push)}` };
      const n = id === 'b_finish' ? JA.n[f.k === 'shift' ? 'fshift' : 'faway'] : id === 's_block' ? JA.n[f.k === 'touch' ? 'btouch' : 'bnone'] : id === 's_double' ? JA.n[f.k === 'one' ? 'done' : 'dnone'] : id === 'b_safe' ? JA.n[f.k === 'trap' ? 'strap' : 'sleft'] : id === 'b_reloc' ? JA.n[f.k === 'trap' ? 'rtrap' : 'ropen'] : id === 'b_step' ? JA.n[f.k === 'side' ? 'side' : 'trap'] : id === 'b_throne' ? JA.n[f.k === 'guard' ? 'guard' : f.k === 'side' ? 'qside' : 'qtrap'] : f.k === 'touch' ? JA.n[f.end] : JA.n.none;
      return { f, html: `${V.v(JA.soft)} ${V.v(n)}` };
    }
    const key = right ? '.why' : '.' + F.key(E, id, P.s, u);
    return { f, html: tx('ls.' + id + key, lang, { m: SPOT('ok'), x: SPOT('ng'), r: SPOT('hl') }) };
  }
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-agon-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../agon/lessons.json?v=10'), ld('../agon/i18n-ag.js?v=2lv-ls6-f2'), ld('../agon/i18n-ag-more.js?v=2lv-l14n-ls6-f2'),
          loadJs('../agon/engine.js?v=12-nn2-bk1', () => !!window.AgonEngine).then(() => loadJs('../agon/ls-facts.js?v=7', () => !!window.AgonLsFacts))])
          .then(([d, a, b]) => { const w = { I18N: { ja: {}, en: {} } }; for (const src of [a, b]) try { new Function('window', 'I18N', src)(w, w.I18N); } catch (e) { console.warn('[lessons3d] agon texts', e); }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.agon ? AtlasMini.agon(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's pieces: every piece to look at (never the answer's piece alone, 追52)
      hintPts(id, P) { const E = window.AgonEngine, F = window.AgonLsFacts; if (!E || !F) return []; E.setRule('std'); return F.hint(E, id, P.s); },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 7), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v), tx = (k, l, v) => this.tx(k, l, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: P.s.side }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast[id] : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => { o._rp = null; return words(id, P, u == null ? P.best : u, lang, tx, V, last, fill).html; };
          o.ng = u => { const E = window.AgonEngine; E.setRule('std'); if (u == null || P.ok.includes(u)) u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x));   // (asked for the answer itself: the words for a wrong move)
            const w = words(id, P, u, lang, tx, V, last, fill); o._rp = w.f.rp != null ? w.f.rp : null; return w.html; };   // (b_step: the enemy's capturing move, gold)
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= agon/app.js problemPoints: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side, lock: true } } : null; },
    };
    return D;
  }
  // (tools/lesson-verify-agon-ls.js) the words for every move in every language, as the 3D says them (line k of each list)
  let I18N = null;
  function sayText(id, P, u, lang, k) {   // k: every list says its line k (mod its length)
    if (!I18N && typeof require === 'function') { const fs = require('fs'), path = require('path'), w = { I18N: { ja: {}, en: {} } }; for (const f of ['i18n-ag.js', 'i18n-ag-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(__dirname, '../agon', f), 'utf8'))(w, w.I18N); I18N = w.I18N; }
    const tx = (k, l, v) => { let x = I18N[l] && I18N[l][k]; if (x === undefined) x = I18N.en[k]; return fill0(x || '', v || {}); };
    const V = { v: list => list[(k || 0) % list.length] };
    return words(id, P, u, lang, tx, V, false, fill0).html;
  }
  const API = { make, JA, READY, sayText, words };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsAgon = API;
})();
