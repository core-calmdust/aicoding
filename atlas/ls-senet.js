/* =====================================================================
   Senet — the lessons on the 3D board (atlas/lessons3d.js DATA.senet, 2026-11-24 担当C).
   senet/lessons.json (rebuilt with the exact win chances of every reachable position: senet/tools/gen_lessons_exact.js,
   checked by tools/lesson-verify.js senet) on Tutankhamun's game box, told by セティ (the rules tour's camel, atlas/rules/senet.js).
   Progress = the full game's aicoding-senet-lessons { id: { best, pass } }.
   Japanese: セティ's own words — every reason is a fact of the board (a swap, a pair, the House of Beauty, the water, the exact
   throw off, how many of the rival's 16 next throws can swap you); never a win chance. Other languages: the 2D texts.
   AtlasLsSenet.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  function make(H) {
    const { getJ, J, put, L, fill } = H;
    const tx = (o, lang) => L(o, lang);
    const plain = h => String(h || '').replace(/<[^>]+>/g, '');
    // ---------- セティ's words (ja) ----------
    // each list: one is picked per use, never twice in a lesson (V.v)
    const JA = {
      intro: {
        prob: 'やっほー、ぼくは<b>セティ</b>！ セネトは古代エジプトのゲームで、<b>駒を全部先に上げたら勝ち</b>。<br>サイコロのかわりに<b>棒を4本</b>投げて、白い面の数だけ進むんだ。まずは出やすさから！',
        swap: 'ペアになっていない相手の駒にぴったり止まると<b>入れ替え</b>！<br>きみの駒は前へ、相手の駒はきみがいたマスへ下がる。コブがはずむくらい気持ちいい手さ。',
        pair: '同じ色が<b>2枚並ぶ</b>と、手をつないで守り合うんだ。<br>並んだ駒は入れ替えられない。<b>3枚並べば壁</b>で、相手は越えられないよ。',
        escape: '相手の駒の<b>1〜5マス先</b>にひとりでいる駒は、ねらわれているんだ。<br>赤い印の数字は、相手の次の投げ16通りのうち、入れ替えられる通り数だよ。',
        safe: '同じ進むなら、<b>動かしたあとに入れ替えられにくい手</b>を選ぼう！<br>相手の駒の2マス先は6通り、1マス先や3マス先は4通り。ペアなら0通りさ。',
        beauty: '道の<b>26</b>は「美の家」。ぼくの顔くらい美しいマスだよ。<br>どの駒も<b>ちょうどの目で26に止まらないと</b>先へ進めないし、26の駒は入れ替えられないんだ。',
        water: '気をつけて！ 26から<b>1</b>で進むと、27の<b>水の家</b>にドボン。<br><b>15</b>まで流されちゃう（15がふさがっていれば、その手前）。泳げないぼくには悪夢のマスさ…。',
        exit: '終盤は上がりのお話。<b>26は5、28は3、29は2、30は1</b>で上がれる。<br>上がった駒はもう入れ替えられない。ちょうどの目を見のがさないでね！',
        race: '入れ替えの起きない<b>レース</b>になったら、どっちが上がりに近いか数えよう。<br>駒ごとの<b>上がりまでのマス＝31−位置</b>。足して少ないほうがリードだよ。',
      },
      ramp: {
        prob: { et: '危ない距離を見てみよう！', eb: '赤い印の駒は、相手の駒の<b>2マス先</b>。相手が2を出すと入れ替えられるから、16通り中6通りなんだ。', tt: 'いちばん出やすい目は？', g: '4本の棒で、いちばん出やすい目を選んでみて！', h: '白い面の数ごとに、4・6・4・1・1通りだよ（5は4本とも黒）。', y: 'そのとおり！ 2は6通りでトップさ。' },
        swap: { et: '入れ替えてみよう！', eb: 'この目でちょうど、1枚だけでいる相手の駒に届くんだ。入れ替えれば、相手はきみのいたマスまで下がるよ。', tt: '入れ替えられる駒は？', g: '相手の駒にぴったり止まれる駒を動かしてみて！', h: '目の数だけ先に、ひとりでいる相手の駒はいるかな？', y: '入れ替え成功！ 相手はがっくり後ろへ。' },
        pair: { et: '並べて守ろう！', eb: '動かした駒が味方の隣に並ぶから、もう入れ替えられないんだ。', tt: 'ペアを作れる手は？', g: '動かした先で、味方の駒と隣り合わせになる手を選んでね。', h: '目の数だけ進めると、味方の隣になる駒はどれかな？', y: 'ペア完成！ 手をつないだ駒には手が出せないね。' },
        escape: { et: '逃がしてみよう！', eb: '赤い印の駒がねらわれているんだ。この目で、相手の目が届きにくいマスへ動かすよ。', tt: 'ねらわれた駒を逃がそう！', g: '赤い印の駒を、入れ替えられにくいマスへ動かしてみて。', h: 'ペアになるマスや、相手の駒から6マス以上先は安全だよ。', y: 'ナイス逃げ足！ ラクダより速かったね。' },
        safe: { et: 'いちばん安全な手！', eb: '動かしたあと、相手の次の投げで入れ替えられる通り数がいちばん少ない手を選んだんだ。', tt: 'いちばん安全な手は？', g: '動かしたあと、相手の目がいちばん届きにくい手を選んでみて！', h: '動かした先は、相手の駒の何マス先になる？', y: 'うまい！ 相手の目が届きにくくなったよ。' },
        beauty: { et: '美の家に入ろう！', eb: 'この目でちょうど26に止まれる駒がいるんだ。入れば入れ替えられないし、出口はすぐそこさ。', tt: '美の家に入れる駒は？', g: 'ちょうど26に止まれる駒を動かしてね。', h: '26から目の数だけ戻ったマスにいる駒を探そう！', y: 'ようこそ美の家へ！ きらきらだね。' },
        water: { et: '水に落ちたらどこへ？', eb: '26の駒を<b>1</b>で動かすと、27の水の家にドボン。<b>15</b>へ流されるんだけど、この盤は15に相手の駒がいるから、その手前の<b>14</b>まで流されちゃう。', tt: '26の駒が水に落ちたら、どこへ戻る？', g: '15から手前へ、最初の空きマスを選んでみて！', h: '15のマスを見てごらん。空いているかな？', y: 'そのとおり！ 15が空いているから、15に戻るんだ。' },
        exit: { et: '上がってみよう！', eb: 'ちょうどの目が出たから、その駒を上げたんだ。上がった駒はもう安全さ。', tt: '上げられる駒は？', g: 'ちょうどの目で上がれる駒を動かしてみて！', h: '26は5、28は3、29は2、30は1。この目に合う駒は？', y: '上がり成功！ ちょうどの目を使えたよ。' },
        race: { et: '数えてみよう！', eb: 'きみの駒の上の数字が、それぞれの上がりまでのマス。足していけば合計になるんだ。', tt: '合計はいくつ？', g: '数字を足して、合計を選んでみて！', h: '数字の書いてある駒を、ひとつずつ足してね！', y: '正解！ ひとつずつ足せたね。' },
      },
      ask: ['投げ棒は<b>{n}</b>！ どの駒を動かすのがいちばんかな？', '棒を投げたら<b>{n}</b>が出たよ。きみならどう動かす？', '<b>{n}</b>が出たね。いちばんいい手を探してみて！', 'さあ、出目は<b>{n}</b>。ここはどの駒でいく？', '今度の目は<b>{n}</b>だね。よく見て選んでみよう！', '<b>{n}</b>が出た！ さて、どの駒を進めようか？', '出目は<b>{n}</b>。盤をじっくり見てから決めようね。'],
      askLast: ['これで最後！ 出目は<b>{n}</b>、いちばんの手はどれ？', 'ラストの問題さ。<b>{n}</b>が出たよ、どうする？'],
      hint: {
        swap: ['赤い輪の相手の駒に、ちょうど<b>{n}</b>マスで届く駒はどれかな？', '相手の駒の<b>{n}</b>マス手前にいるのは、どの駒だろう？', 'ペアになっていない相手の駒を探して、距離を数えてみて！', '入れ替えたら、相手はどこまで下がるかな？', '赤い輪をよく見て！ そこに止まれる駒は？'],
        pair: ['<b>{n}</b>マス進めると、味方の隣に並ぶ駒はある？', '並んだ2枚は入れ替えられない。どの駒なら並べられる？', 'ひとりぼっちになる手は危ないよ。', '動かしたあと、その駒の両隣を見てみて！', '味方とくっつけば、相手の目はとどかないよ。'],
        escape: ['赤い印の駒がねらわれているよ。どこまで逃げられる？', '赤い印の数字は、ねらわれている目の数。それを減らせる手は？', '<b>{n}</b>マス逃げた先は安全かな？ 数えてみて！', '味方の隣や、相手の駒から6マス以上先は安全さ。', 'ねらわれた駒を、相手の目の届かないところへ！'],
        safe: ['動かしたあと、その駒は相手の駒の何マス先になる？', '相手の駒の2マス先は6通りでいちばん危ないよ。', '<b>{n}</b>マス動かした先に、相手の目は届くかな？', '26・28・29・30と、味方の隣は入れ替えられないマスさ。', 'どの手なら、入れ替えられる通り数がいちばん少なくなる？'],
        beauty: ['光っている26に、ちょうど<b>{n}</b>で届く駒はどれ？', '26から<b>{n}</b>マス戻ったところを見てね！', '26を越える目では動けない。ぴったりの駒を探そう！', '美の家の手前<b>{n}</b>マスにいるのは、どの駒かな？', '美の家に入れば、入れ替えの心配はなくなるよ。'],
        water: ['26の駒を1で動かすと、どこへ行っちゃう？', '1の目を使える駒は、26のほかにいるかな？', '青く光る27は水の家。そこに落ちない手は？', '26の駒はそのまま。ほかの駒の手をくらべてみて！', 'ドボンをよけて、1を上手に使おう！'],
        exit: ['どの駒なら、この目でちょうど盤の外に出られる？', 'ちょうど<b>{n}</b>で上がれる駒、見つかるかな？', '盤から出た駒には、相手はもう手が出せない。チャンスはどこ？', '光っているマスの駒を見てみて！', '出口の目と駒の場所を合わせてみよう！'],
      },
      cheer: ['いいね！', 'ナイス！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', 'よく見つけた！', 'すごい！', 'やったね！', '上手！', '完璧！', 'コブまで喜んでるよ！'],
      push: ['次もこの調子でいこう！', 'どんどんいこう！', 'つぎも楽しみだね！', 'その勢いで次へ！', 'まだまだいけるよ！'],
      soft: ['おしい！', 'ドンマイ！', '大丈夫だよ！', 'あと一歩！', 'いい線！', '気にしない、気にしない！', '次はいけるさ！'],
      w: {
        'w.swap': ['ねらいどおりに入れ替え！ 相手は<b>{f}</b>まで下がったね。', '入れ替え成功！ 相手の駒は、きみがいた<b>{f}</b>へ逆戻りさ。', '相手の駒を<b>{f}</b>まで押し戻したよ。きみは前へ、相手は後ろへ！', 'ちょうどの目で入れ替え。相手は<b>{d}</b>マスも損したね。', 'これで相手は<b>{f}</b>からやり直し。大きいよ！'],
        'w.pair': ['味方の隣に並べたね。並んだ2枚は入れ替えられないんだ。', 'ペア完成！ 手をつないだ駒には、相手は止まれないよ。', '隣どうしになったから、どの目が出ても入れ替えられないね。', 'ひとりぼっちをなくしたね。2枚並べば安心さ。', '味方とくっついて守りを固めた。いい形だよ！'],
        'w.wall': ['3枚並んで壁ができた！ 相手はここを越えられないよ。', '壁完成！ 後ろの相手は通せんぼされちゃうね。', '3枚つながったから、相手の駒は跳び越えられないんだ。'],
        'w.escape': ['逃げたあと、その駒が入れ替えられる目は16通り中<b>{r1}</b>通り。前は<b>{r0}</b>通りだったんだ。', 'ねらわれていた駒（<b>{r0}</b>通り）を、<b>{r1}</b>通りのマスへ逃がしたね。', 'うまく逃げた！ 危ない目は<b>{r0}</b>通りから<b>{r1}</b>通りに減ったよ。'],
        'w.escape0': ['ねらわれていた駒（<b>{r0}</b>通り）を、どの目でも入れ替えられないマスへ逃がしたね！', '逃げきり成功！ 前は<b>{r0}</b>通りでねらわれていたけど、もう相手の目は届かないよ。', '<b>{r0}</b>通りの危険から、危険ゼロのマスへ。ラクダもびっくりの逃げ足さ。'],
        'w.safe': ['この手のあと、相手の次の投げで入れ替えられる目は16通り中<b>{r}</b>通り。どの手よりも少ないんだ。', '危ない目をいちばん少なくできたね。残るのは<b>{r}</b>通りだけ！', 'くらべると、この手がいちばん安全。入れ替えられる目は<b>{r}</b>通りさ。'],
        'w.safe0': ['この手なら、相手がどの目を出しても入れ替えられないんだ！', '相手の目はどれも届かない。危険ゼロの手だよ！', '動かしたあと、ねらわれる目は16通りのうち0通り。', 'ほかの手だと危ない駒が残るけど、この手なら全部守れたさ。', '相手が何を投げても安心な形。これが安全第一だよ！'],
        'w.beauty': ['ちょうど<b>{n}</b>で美の家に入ったね！ 26の駒は入れ替えられないんだ。', '美の家に到着！ ここからは出口をめざせるよ。', 'ぴったり26！ ここなら相手は手が出せないね。', '26に止まらないと先へ進めない。その関所を通ったね！', '美の家へようこそ。きらきらで安全なマスさ。'],
        'w.water': ['26の駒はそのまま、1はほかの駒で使ったね。26から1だと<b>{d}</b>まで流されちゃうんだ。', 'ドボン回避！ 26から1で進むと水の家に落ちて<b>{d}</b>へ戻るところだったよ。', '水の家をよけたね。26の駒を動かしていたら、<b>{d}</b>までびしょぬれの逆戻りさ。'],
        'w.home': ['<b>{f}</b>の駒が、ちょうど<b>{n}</b>で上がり！ これで盤から1枚減ったよ。', 'ちょうどの目を見のがさなかったね。<b>{f}</b>から上がりだ！', '上がれる目でしっかり上げたね。終盤はこれが大事さ！', '<b>{f}</b>の駒、いってらっしゃい！ 1枚安心さ。', '上がりに1枚追加！ 勝ちにまた1歩近づいたよ。'],
      },
      n: {
        'n.noSwap': ['緑の手なら相手の駒にちょうど止まれたから、<b>入れ替え</b>で<b>{f}</b>まで下げられたんだ。', 'この目だと緑の駒が相手の駒にちょうど届くので、入れ替えのチャンスだったんだ。', '緑の道の先に相手の駒がいるでしょ？ そこへ止まれば、相手は<b>{f}</b>まで逆戻りだったよ。', '緑の手で入れ替えれば相手を<b>{f}</b>へ押し戻せたのに、その手だと相手の駒はそのまま残っちゃう。', '緑の駒で入れ替えると、相手の駒は<b>{f}</b>からやり直し。見のがすと損なんだ。'],
        'n.water': ['その手だと26から水の家にドボン！ <b>{d}</b>まで流されちゃうんだ。', '26の駒を1で動かすと水の家に落ちるから、<b>{d}</b>へ逆戻り。泳げないぼくには見ていられないよ…。', 'それだと水の家に落ちて<b>{d}</b>まで戻されちゃう。1はほかの駒で使おう！', '26から1で進めば27の水の家。<b>{d}</b>まで流されるので、緑の手がいいんだ。', 'ドボンすると<b>{d}</b>からやり直しになるから、26の駒は動かさないのが正解さ。'],
        'n.noHome': ['<b>{f}</b>の緑の駒は、ちょうどの目で<b>上がれた</b>んだ。上がった駒は、相手の手が届かないからね。', '上がれる緑の手があったから、<b>{f}</b>の駒を上げるのが先なんだ。', 'この目なら<b>{f}</b>の緑の駒が上がりだった。上がりのチャンスは逃すと損だよ！', 'ちょうどの目が出たので、<b>{f}</b>の緑の駒で上がるのが正解なんだ。', '<b>{f}</b>の駒を緑の手で上げれば、その駒は盤から出て、相手にねらわれる心配がなくなるんだ。'],
        'n.noBeauty': ['緑の駒なら、ちょうど美の家（26）に入れたんだ。26なら入れ替えられないから安心だよ。', '美の家にぴったり届く緑の手があったよ。26は必ず止まる関所だから、入れるときに入ろう！', 'その手だと美の家に入れないまま。緑の駒なら26にぴったりだったんだ。', '26に止まれるチャンスだったのに、赤の手では見送りになっちゃう。緑の道の先が美の家さ。', '緑の手で26に入れば、そこから出口をめざせるし、入れ替えの心配もなくなるよ。'],
        'n.risk': ['その手だと、相手の次の投げで入れ替えられる目が16通り中<b>{r}</b>通り。緑の手なら<b>{q}</b>通りで済むんだ。', '赤の手のあとは<b>{r}</b>通りの目でねらわれるから、<b>{q}</b>通りの緑の手のほうが安全だよ。', 'ねらわれる目の数をくらべると、赤は<b>{r}</b>、緑は<b>{q}</b>。だから緑なんだ。', '赤の手のあとは、ひとりの駒が相手の目の届くマスにいることになる。<b>{r}</b>通り、緑なら<b>{q}</b>通りさ。', '赤の手のあとは、相手の駒の1〜5マス先にひとりの駒がいることになるから危ないんだ。赤は<b>{r}</b>通り、緑は<b>{q}</b>通りさ。'],
        'n.risk0': ['その手だと、相手の次の投げで<b>{r}</b>通りの目に入れ替えられちゃう。緑の手ならどの目でも入れ替えられないよ。', '赤の手のあとは16通り中<b>{r}</b>通りで入れ替えになるから、危険ゼロの緑がいいんだ。', '赤は<b>{r}</b>通りの目でねらわれる。緑なら相手のどの目も届かないよ。', '緑の手を選べば相手の目は届かないのに、赤だと<b>{r}</b>通りも危ないんだ。'],
        'n.capRisk': ['入れ替えはできるけど、入った駒が次に<b>{r}</b>通りの目で入れ替え返されるんだ。緑の手なら<b>{q}</b>通りさ。', '入れ替えたあと、その駒は相手の駒のすぐ前だから、<b>{r}</b>通りでやり返されちゃう。緑の<b>{q}</b>通りのほうがいいね。', 'その入れ替えは、やり返される目が<b>{r}</b>通りもあるよ。緑の手なら<b>{q}</b>通りで済むんだ。', '入れ替えても取り返されやすいと損。赤は<b>{r}</b>通り、緑は<b>{q}</b>通りなんだ。'],
      },
      cq: { wdest: ['26の駒が1で動くと水の家にドボン。どのマスまで流される？', '今度はどこまで流されるかな？ 15から手前へ数えてみて！', 'これで最後！ ずらっと駒が並んでいるよ。26の駒は、どこまで流される？'],
        wcnt: ['出目は<b>1</b>。水の家に落ちない手は、何通りある？', '駒が増えたよ！ <b>1</b>で水に落ちない手は何通り？'],
        roll: ['出目が<b>{n}</b>になる確率は？ 16通りで考えてみて！', '今度は<b>{n}</b>。16通りのうち何通りかな？'],
        again: ['もう一度投げられる目（1・4・5）の確率は、合わせていくつ？'],
        risk: ['赤い印の駒が、相手の次の投げで入れ替えられる確率は？', 'これで最後！ 黄色の数字は相手の駒からの距離。赤い印の駒がねらわれる確率はいくつかな？'],
        pips: ['きみ（糸巻き）の駒は、上がりまで合わせて何マス？', '今度は5枚！ 糸巻きの数字を、ぜんぶ足すといくつ？'], rpips: ['今度は相手（円錐）の番！ 上がりまで合計何マスかな？'], lead2: ['上がりまでのマスで、どっちが何マスリードしている？', 'これで最後！ リードしているのはどっちで、何マスかな？'] },
      chint: { wdest: ['15から手前へ、ひとつずつ見ていこう。駒がいたら、もうひとつ手前！', '自分の駒でも相手の駒でも、いるマスには止まれないよ。', '27には止まれない。流される先は、15から手前の最初の空きマスさ。'],
        wcnt: ['26以外の駒を、1マス先へ動かせるか確かめてみて！', 'すぐ前に味方がいたら進めないよ。並んだ相手の駒にも止まれないんだ。', '26に相手の駒がいると、25からは入れないよ。'],
        roll: ['白い面の数ごとに数えると、1は4通り・2は6通り・3は4通り・4は1通りだよ。', '4本とも黒になるのは、16通りのうち何通りかな？'],
        again: ['1・4・5、それぞれの通り数を足してみて！'],
        prob: ['相手の駒から何マス先か、黄色の数字を見てね！', '届く距離の目だけ、出やすさを足すんだ！', '距離が1なら4通り、2なら6通り、3なら4通りだよ。', '黄色の数字の目が出たら入れ替えられる。その通り数を合わせよう！'],
        race: ['駒の上の数字を見ながら、ひとつずつ足してみて！', '上がった駒は0。数えなくていいよ！', '31からいるマスを引けば、上がりまでのマスがわかるよ！', '26は5、28は3、29は2、30は1だよ！'],
        lead2: ['両方の合計を出して、差を見てみよう！', '少ないほうが上がりに近いんだ。差はいくつかな？'] },
      cw: { 'c.wdest15': ['15が空いているから、そのまま<b>{d}</b>に流されるんだ。', '再生の家の15は空き。だから<b>{d}</b>に戻るよ。'],
        'c.wdest1': ['15に駒がいるから、ひとつ手前の<b>{d}</b>まで流されちゃうんだ。', '15はふさがっていて、<b>{d}</b>は空き。だから<b>{d}</b>に戻るよ。'],
        'c.wdest': ['15から<b>{e}</b>までは駒でふさがっているから、その手前の<b>{d}</b>まで流されちゃうんだ。', 'ふさがったマスを飛ばして、最初の空きマスは<b>{d}</b>。そこまでびしょぬれの逆戻りさ。', '15〜<b>{e}</b>は満員！ だから<b>{d}</b>まで流されるんだ。', '15から数えると、駒のいないマスは<b>{d}</b>が最初。そこまで流されるよ。', '15〜<b>{e}</b>はぜんぶ駒がいるね。止まれるのは<b>{d}</b>なんだ。'],
        'c.wcnt': ['水に落ちない手は {list} の<b>{m}通り</b>。26の駒は動かさずにすむね！', '1マス先へ進めるのは {list}。だから<b>{m}通り</b>なんだ。', '26のほかで1を使えるのは {list}。ちょうど<b>{m}通り</b>さ。', 'ふさがった駒をのぞくと {list} が残る。<b>{m}通り</b>だね！', '数えると {list}、<b>{m}通り</b>。残りの駒は前がふさがっているか、水の家行きなんだ。'],
        'c.roll': ['白い面が<b>{n}</b>本になる出方は、16通り中<b>{m}通り</b>なんだ。', '<b>{n}</b>が出るのは16通りのうち<b>{m}通り</b>。覚えておくと便利さ！', '<b>{n}</b>の出方は<b>{m}通り</b>あるから、確率は<b>{m}/16</b>！'],
        'c.again': ['1は4通り、4と5は1通りずつ。足して<b>6/16</b>なんだ。', '4＋1＋1＝6通り。だから<b>6/16</b>、3回に1回くらいはおかわりできるね！'],
        'c.risk': ['相手の駒からの距離の目を足すんだ。{list} で、合わせて<b>{m}/16</b>！', '届く目の出やすさを足すと {list}、つまり<b>{m}/16</b>だね。', '{list} を合わせると<b>{m}/16</b>。これがねらわれる確率さ。', '黄色の数字の目が出たら入れ替え。{list} で<b>{m}/16</b>になるよ。', '距離の目ごとに数えて {list}。全部で<b>{m}/16</b>なんだ。', '当たる目を拾っていくと {list}、合計<b>{m}/16</b>！'],
        'c.pips': ['ひとつずつ足すと、合計<b>{m}</b>マスなんだ。', '数字を足していくと<b>{m}</b>。ぴったりだね！', '糸巻きの駒をぜんぶ合わせて<b>{m}</b>マス。これが答え！'],
        'c.rpips': ['相手の駒も同じように数えるよ。合計<b>{m}</b>マス！', '円錐の駒をぜんぶ合わせると<b>{m}</b>マスになるんだ。'],
        'c.lead2y': ['上がりまで きみ<b>{a}</b>・相手<b>{b}</b>。<b>{d}マス</b>少ないきみがリードしているんだ！', 'きみ<b>{a}</b>マス、相手<b>{b}</b>マス。少ないきみが<b>{d}マス</b>リードだね！', '<b>{a}</b>対<b>{b}</b>だから、きみのほうが<b>{d}マス</b>上がりに近いよ！', '数えると きみは<b>{a}</b>、相手は<b>{b}</b>。差の<b>{d}マス</b>だけ、きみが前にいるんだ。'],
        'c.lead2r': ['上がりまで きみ<b>{a}</b>・相手<b>{b}</b>。<b>{d}マス</b>少ない相手がリードしているんだ。', 'きみ<b>{a}</b>マス、相手<b>{b}</b>マス。少ない相手が<b>{d}マス</b>リードしているね。', '<b>{a}</b>対<b>{b}</b>だから、相手のほうが<b>{d}マス</b>上がりに近いんだ。', '数えると きみは<b>{a}</b>、相手は<b>{b}</b>。差の<b>{d}マス</b>だけ、相手が前にいるよ。'] },
      cn: { 'c.mostNg': ['<b>{x}</b>が出るのは16通り中<b>{m}通り</b>。2の6通りにはかなわないんだ。', '<b>{x}</b>は<b>{m}通り</b>しかないよ。いちばん多いのは6通りの目さ。'],
        'c.wOccNg': ['<b>{x}</b>には駒がいるから、そこには止まれないんだ。', '<b>{x}</b>はふさがっているよ。もっと手前まで流されるのさ。'],
        'c.wPastNg': ['<b>{d}</b>が空いているから、<b>{x}</b>まで流されることはないよ。', '<b>{x}</b>だと行きすぎ！ 手前の<b>{d}</b>が空いているんだ。'],
        'c.w27Ng': ['27の水の家には止まれないんだ。そのまま流されちゃうよ。', '水の家にはとどまれない。泳げないぼくと同じで、流されるしかないのさ…。'],
        'c.rollNg': ['<b>{x}</b>は出目が<b>{v}</b>になる確率だから、ちがうんだ。', '<b>{x}</b>だと、<b>{v}</b>が出る確率になっちゃうよ。'], 'c.roll8Ng': ['<b>{x}</b>になる目はないから、ちがうよ。', '16通りで<b>{x}</b>になる目はひとつもないね。'],
        'c.lowNg': ['<b>{x}</b>だと少なすぎるから、数え落としがあるね。', '<b>{x}</b>では足りないよ。足しわすれがあるみたい。', '<b>{x}</b>は小さすぎるから、まだ数えていないものがあるんだ。'],
        'c.highNg': ['<b>{x}</b>だと多すぎるから、数えなくていいものまで足しているね。', '<b>{x}</b>では大きすぎるよ。よけいに足したところがあるんだ。', '<b>{x}</b>は多いから、どこかで数えすぎているみたい。'],
        'c.sideNg': ['上がりまでのマスは少ないほうがリード。きみ<b>{a}</b>・相手<b>{b}</b>だから、向きが逆なんだ。', 'くらべる向きに注意！ きみ<b>{a}</b>、相手<b>{b}</b>で、少ないほうが前にいるんだよ。'] },
    };
    const ROT = (a, k) => a.map((_, i) => a[(i + k) % a.length]);
    // a lesson's voice: a line is not said twice in a lesson
    function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
      const used = new Set(), perm = new Map();
      const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
      return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
    }
    const CAT = { basic: '基本', tactics: '戦術', end: '終盤' };
    function mini(s) {   // a small picture of the board for the list (3 × 10, the spools light, the cones dark)
      if (!s) return '';
      const cells = [], pc = [], at = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return [r, r === 1 ? 9 - k : k]; };
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) cells.push(`<rect x="${1 + c * 9.8}" y="${2 + r * 12}" width="9.2" height="11" rx="1.5" fill="${(r * 10 + c) % 2 ? '#c89b5a' : '#a77a45'}"/>`);
      for (const side of [0, 1]) for (const p of s.pos[side]) if (p >= 1 && p <= 30) { const [r, c] = at(p); pc.push(`<circle cx="${5.6 + c * 9.8}" cy="${7.5 + r * 12}" r="3.6" fill="${side ? '#2a2c31' : '#f4ecd8'}" stroke="#000" stroke-width=".6"/>`); }
      return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">${cells.join('')}${pc.join('')}</svg>`;
    }
    const EMPTY = { rule: 'std', pos: [[31, 31, 31, 31, 31], [31, 31, 31, 31, 31]] };
    const KO = { 'c.wdest': 'wdest', 'c.wdest1': 'wdest', 'c.wdest15': 'wdest', 'c.wcnt': 'wcnt', 'c.roll': 'roll', 'c.again': 'again', 'c.risk': 'risk', 'c.pips': 'pips', 'c.rpips': 'rpips', 'c.lead2y': 'lead2', 'c.lead2r': 'lead2' };
    const D = {
      LKEY: 'aicoding-senet-lessons', data: null,
      load() {
        const eng = window.SenetEngine ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = '../senet/engine.js?v=7'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
        return this.p || (this.p = Promise.all([getJ('../senet/lessons.json?v=20261124f'), eng]).then(([d]) => { this.data = d; return this; }).catch(e => { this.p = null; throw e; }));
      },
      list(kind, lang) {
        if (kind === 'open') return [];
        const pr = J(this.LKEY, {}), d = this.data;
        return d.steps.map((s, i) => [s, i]).filter(([s]) => s.v2).map(([s, i]) => { const c = d.cats.find(x => x.steps.includes(s.id)) || {};
          return { key: String(i), cat: c.id || s.cat, catName: lang === 'ja' ? CAT[s.cat] || tx(c.name, lang) : tx(c.name, lang), title: tx(s.title, lang), sub: tx(s.tip, lang), svg: mini(s.diagram && s.diagram.s), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '', full: false }; });   // (only the lessons rebuilt and checked — v2 — are listed)
      },
      msg(r, lang) { const t = r && this.data.msg[r[0]]; return t ? fill(tx(t, lang), r[1] || {}) : ''; },
      pos: (s, n, marks, lock) => ({ senet: { s: s || EMPTY, n: n == null ? null : n, marks: marks || [], lock: !!lock }, me: 1, dice: [n == null ? -1 : n] }),   // (dice: the throw — two problems with another throw are not the same problem)
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s) return null;
        const ja = lang === 'ja', kk = +key, V = voice(kk * 3 + 1), id = s.id;
        const R = ja ? JA.ramp[id] : null;
        const RUI = { step: d.ui.rampStep, main: d.ui.rampMain, next: d.ui.next, note: d.ui.rampNote, look: d.ui.look, ans: d.ui.ans, ng: d.ui.rampRetry, cont: d.ui.next };
        const RU = (k, v) => ja && k === 'ng' ? V.v(['ちがうみたい。もう一回考えてみよう！', 'うーん、もう一度！ 困ったら「ヒント」を押してね。', 'あと少し！ もう一回やってみよう。']) : ja && k === 'note' ? '準備は点数に入らないから、何回でも試していいよ。' : fill(tx(RUI[k], lang), v || {});
        const ramp = (s.ramp || []).map(r => {
          const o = { k: r.k, s: r.s, n: r.n, seq: r.seq, marks: r.marks || [], look: r.look || [], ok: r.ok, kind: r.kind, opts: r.opts, ans: r.ans };
          if (r.k === 'explain') { o.t = ja ? R.et : tx(r.t, lang); o.b = ja ? R.eb : tx(r.body, lang); }
          else { o.t = ja ? R.tt : tx(r.t, lang); o.g = ja ? R.g : tx(r.t, lang); o.h = ja ? R.h : tx(r.h, lang); o.y = ja ? R.y : tx(r.g, lang) || tx(d.ui.rampGood, lang); }
          if (r.kind === 'choice') { o.choices = r.opts.map(x => tx(x, lang)); o.right = r.ans;
            // 追47: why the picked choice is wrong (the same facts as the problems' ngo)
            o.ngx = k => { const g = r.ngo && r.ngo[k]; if (!g) return ''; return ja ? fill(V.v(JA.cn[g[0]] || ['<b>{x}</b>はちがうよ。']), Object.assign({}, g[1], { x: plain(tx(r.opts[k], lang)) })) : this.msg(g, lang); }; }
          return o;
        });
        const intro = ja ? JA.intro[id] : tx(s.body, lang);
        const N = s.problems.length;
        const probs = s.problems.map((q, pi) => {
          const last = pi === N - 1;
          if (q.kind === 'choice') {
            const kind = KO[q.why[0]];
            const lab = x => { const t = tx(x, lang); return ja ? t.replace('あなた', 'きみ') : t; };
            const cq = JA.cq[kind], nth = s.problems.slice(0, pi).filter(x => x.why && KO[x.why[0]] === kind).length;
            const o = { kind: 'choice', P: q, pos: this.pos(q.s || EMPTY, kind === 'roll' ? q.why[1].n : q.n || null, q.marks || [], true), marks: q.marks || [], choices: q.opts.map(lab), right: q.ans, ans: q.ans, dHint: true, hint: [], own: ja,
              ask: ja ? fill(cq[Math.min(cq.length - 1, last && cq.length > 1 ? cq.length - 1 : nth)], q.why[1] || {}) : tx(q.q, lang), hintTx: ja ? V.v(JA.chint[kind === 'roll' || kind === 'again' || kind === 'lead2' || kind === 'wdest' || kind === 'wcnt' ? kind : id] || JA.chint.prob) : tx(s.hints[pi % 2], lang) };
            const why0 = this.msg(q.why, lang), why = () => ja ? fill(V.v(JA.cw[q.why[0]]), q.why[1]) : why0;
            o.good = () => ja ? `${V.v(JA.cheer)} ${why()}${last ? ' ' + V.v(JA.push) : ''}` : why0;
            o.ng = u => { const i = typeof u === 'number' && u !== q.ans ? u : q.ans === 0 ? 1 : 0, g = q.ngo && q.ngo[i];
              if (!ja) return (g ? this.msg(g, lang) + ' ' : '') + why0;
              const gx = g ? fill(V.v(JA.cn[g[0]]), Object.assign({}, g[1], { x: plain(lab(q.opts[i])) })) : '';
              return `${V.v(JA.soft)} ${gx} ${fill(V.v(['正解は<b>{a}</b>。', '正解は<b>{a}</b>だよ。', '<b>{a}</b>が正解！', 'ほんとうの正解は<b>{a}</b>なんだ。', '正解はこっち、<b>{a}</b>。']), { a: plain(lab(q.opts[q.ans])) })}${why()}`; };
            return o;
          }
          const wv = Object.assign({ n: q.n }, q.why[1]);
          const ask = ja ? fill(V.v(last ? JA.askLast : JA.ask), { n: q.n }) : fill(tx(d.ui.qMove, lang), { n: q.n });
          const o = { kind: 'snmove', P: q, pos: this.pos(q.s, q.n, [], false), ans: q.best[0], ok: [q.best[0]], dHint: true, hint: (q.look || []).slice(), own: ja, ask,
            hintTx: ja ? fill(V.v(JA.hint[id] || JA.hint.safe), { n: q.n }) : tx(s.hints[pi % 2], lang) };
          o.good = () => ja ? `${V.v(JA.cheer)} ${fill(V.v(JA.w[q.why[0]] || JA.w['w.safe']), wv)}${pi % 2 || last ? ' ' + V.v(JA.push) : ''}` : this.msg(q.why, lang);
          o.ng = u => { const from = Array.isArray(u) ? u[0] : u, f = q.ng && q.ng[from] ? from : Object.keys(q.ng || {})[0], r = q.ng && q.ng[f];
            if (!ja) return this.msg(r, lang);
            return `${V.v(JA.soft)} ${r ? fill(V.v(JA.n[r[0]] || JA.n['n.risk']), r[1] || {}) : ''}`; };
          return o;
        });
        return { id, title: tx(s.title, lang), intro, ramp, RU, probs, first: +key === 0,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, pass: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), pass: !!o.pass || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u, p) { const from = Array.isArray(u) ? u[0] : u; return from === p.ans ? 20 : 0; },   // (= senet/app-learn.js: only the best move is right — 追3)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id); if (!s || !s.diagram) return null; return { pos: this.pos(s.diagram.s, null, s.diagram.marks || [], true) }; },
      // the warm-up
      rampPos(it) { return D.pos(it.s || (it.kind === 'choice' ? null : EMPTY), it.k === 'try' && it.kind !== 'choice' ? it.n : it.k === 'explain' ? it.n : null, [], it.k !== 'try' || it.kind === 'choice'); },
      rampBody: (it, lang) => it.b,
      rampSeq: it => (it.seq || []).map(x => x.slice()),
      rampMarks: it => (it.k === 'explain' || it.kind === 'choice' ? it.marks : []).slice(),
      rampLook: it => (it.look || []).slice(),
      rampAns: it => it.ok ? it.ok[0][0] : it.right,
      rampAnsMk: it => it.ok ? [{ m: it.ok[0].slice(), cls: 'ok' }] : [],
      rampOk: (it, u) => { const from = Array.isArray(u) ? u[0] : u; return !!(it.ok && it.ok.some(x => x[0] === from)); },
      rampUndo: P => P.undo(),
    };
    return D;
  }
  window.AtlasLsSenet = { make };
})();
