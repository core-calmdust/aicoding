/* =====================================================================
   Senet — the lessons on the 3D box (atlas/lessons3d.js DATA.senet, 2026-11-24 担当C).
   senet/lessons.json (rebuilt with the expectiminimax search at depths 2 · 3 · 4: senet/tools/gen_lessons_v2.js, checked by
   tools/lesson-verify.js senet) on Tutankhamun's game box, told by セティ the camel (the rules tour's guide, atlas/rules/senet.js).
   Progress = the full game's aicoding-senet-lessons { id: { best, pass } }.
   Japanese: セティ's own words — every reason is a fact of the board (a swap and how far it sends the rival back, the House of
   Beauty, the House of Water and where it sends you, bearing off, the chance the rival's next throw can swap you, counted over the
   16 ways the sticks fall); never a win chance. Other languages: the 2D texts.
   AtlasLsSenet.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  function make(H) {
    const { getJ, J, put, L, fill } = H;
    const tx = (o, lang) => L(o, lang);
    const plain = h => String(h || '').replace(/<[^>]+>/g, '');
    // ---------- セティ's words (ja) ----------
    const JA = {
      intro: {
        prob: 'やっほー、<b>セティ</b>だよ！ セネトは古代エジプトの盤ゲーム。4本の棒を投げて進み、<b>5枚を先に全部上げたら勝ち</b>なんだ。<br>まずは棒の目の出やすさから。4本の白黒の出方は16通りあるのさ。',
        block: '動かせる駒を見分けよう！<br><b>味方の駒</b>や<b>2枚並んだ相手</b>（ペア）には止まれないし、<b>3枚並んだ壁</b>は越えられない。26もぴったりでないと越えられないんだ。',
        swap: 'ひとりぼっちの相手にぴったり止まると<b>入れ替え</b>！<br>相手は、きみの駒がいたマスまで下がる。ちょうどの目で届く相手を探そう。',
        risk: '今度は守る側の考え方。相手の駒の<b>1〜5マス先</b>にひとりでいる駒は、その目が出ると入れ替えられちゃう。<br>届く目の出やすさを足せば、危なさが数字でわかるのさ。',
        beauty: '26は<b>美の家</b>。どの駒も、ここに<b>ぴったり止まらないと</b>先へ進めない。<br>美の家にいれば入れ替えの心配もなし。ぼくの顔くらい大事な場所なんだ（…笑った？）。',
        water: '気をつけて！ 美の家から<b>1</b>で進むと、27の<b>水の家</b>にドボン。再生の家まで流されちゃう。<br>ぼくは泳げないから、1が出たらほかの駒で使うのが基本さ。',
        exit: '終盤は出口のお話！ 上がりの目は<b>26は5・28は3・29は2・30は1</b>。<br>次の1回で上がれる確率を、目の出やすさで数えてみよう。2は6通りでいちばん出るから、29は特等席さ。',
      },
      ramp: {
        prob: { et: '距離を数えてみよう！', eb: '赤い印の駒は、相手の駒の<b>2マス先</b>。相手が2を出したら入れ替えだから、16通り中6通りなんだ。', tt: 'いちばん出やすい目は？', g: '4本の棒で、いちばん出やすい目を選んでみて！', h: '1〜5の出方は、16通りのうち4・6・4・1・1通り。', y: 'そのとおり！ 2は6通りでトップなんだ。' },
        block: { et: '動けない駒を見つけよう', eb: '黄色の数字は駒のいるマス。この目で進んだ先がふさがっている駒は、動けないんだ。', tt: '動かせる駒を数えよう', g: '出目だけ先へ進めるか、駒ごとに確かめて数えてみて！', h: '行き先が空いているか、ひとりの相手なら動けるよ。', y: '正解！ 数え方のコツはつかめたかな？' },
        swap: { et: '入れ替えてみよう！', eb: 'この目で、ひとりぼっちの相手にぴったり届く駒がいるんだ。入れ替えれば相手は後ろへ下がるよ。', tt: '入れ替えのチャンス！', g: '相手と場所を交換できる駒を動かしてみて！', h: 'ちょうど出目の距離に、ひとりでいる相手の駒はいる？', y: '入れ替え成功！ 相手は「えっ、なんで〜！」って顔してる。' },
        risk: { et: '数えてみよう', eb: '黄色の数字が、赤い印の駒までの相手の距離。2と3が届くから、6通り＋4通りで<b>10/16</b>なんだ。', tt: '確率を答えよう', g: '距離の目を足して、赤い印の駒のピンチ度を答えてみて！', h: '1マス後ろの相手は1で届く。出方は4通りだよ。', y: 'ばっちり！ ピンチ度の計算は完璧。' },
        beauty: { et: '美の家へ！', eb: 'この目で26にぴったり届く駒がいるんだ。入れば相手に手出しされないし、出口はもうすぐさ。', tt: '美の家に入ろう！', g: '26にちょうど止まれる駒を動かしてみて！', h: '26から出目だけ戻ったマスにいる駒は？', y: '到着！ 美の家はぴかぴかだね。' },
        water: { et: '1はほかの駒で！', eb: '26の駒を1で動かすと水の家にドボン。だから1はほかの駒で使ったんだ。', tt: '水の家をよけよう！', g: '1が出たよ。26の駒をドボンさせない手を選んでみて！', h: '1で動ける、26以外の駒はどれかな？', y: 'セーフ！ 濡れずにすんだ。' },
        exit: { et: '上がれる目を数えよう', eb: '光っている29の駒は、<b>2</b>で上がれる。2は16通りのうち6通りだから、<b>6/16</b>なんだ。', tt: '上がれる確率は？', g: '光る駒の上がりの目を数えて、確率を選んでみて！', h: '駒ごとに上がりの目を思い出して。28なら3だよ。', y: '正解！ 28の駒は3を待つんだ。' },
      },
      ask: ['棒は<b>{n}</b>！ どの駒を動かすのがいちばんかな？', '<b>{n}</b>が出たよ。きみならどう動かす？', '出目は<b>{n}</b>。いちばんいい手を探してみて！', 'さあ、<b>{n}</b>だ。ここはどの駒でいく？', '今度の目は<b>{n}</b>。盤をよく見て選ぼう！', '<b>{n}</b>が出た！ さて、どの糸巻きを進める？', '出目<b>{n}</b>。じっくり考えてから決めてね。'],
      askLast: ['これで最後！ 出目は<b>{n}</b>、いちばんの手はどれ？', 'ラストの問題さ。<b>{n}</b>が出たけど、どうする？'],
      hint: {
        swap: ['ちょうど<b>{n}</b>マス先に、ひとりでいる相手の駒はいる？', '輪の付いた相手の駒に、<b>{n}</b>で届く駒はどれかな？', '相手の駒の<b>{n}</b>マス手前にいる駒を探してみて！', '並んだ2枚の相手には止まれない。ひとりの相手をねらおう！', '場所を交換すれば相手は後ろへ。届く駒はどれだろう？'],
        beauty: ['光っている26に、ちょうど<b>{n}</b>で届く駒は？', '26から<b>{n}</b>戻ったマスにいる駒を探そう！', '26は越えられない。ぴったり止まれる駒はどれ？', '美の家まであと<b>{n}</b>の駒、いるかな？', '26から駒の場所を引いて<b>{n}</b>になる駒は？'],
        water: ['26の駒を1で動かすとドボン！ ほかの駒で1を使えないかな？', '光っている水の家に落ちない手を探してみて！', '1はほかの駒で使おう。動ける駒はどれかな？', '26の駒はそのまま。1で進める駒は？', '水の家は27。落ちたら再生の家まで流されちゃう。'],
      },
      cheer: ['いいね！', 'いい感じ！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', 'よく見つけたね！', 'すごい！', 'やったね！', '上手！', '完璧！', 'いい目してる！'],
      push: ['次もこの調子でいこう！', 'どんどんいこう！', '次も楽しみだ。', 'その勢いで次へ！', 'まだまだいけるさ！'],
      soft: ['おしい！', 'ドンマイ！', '大丈夫、大丈夫！', 'あと一歩！', 'いい線いってる！', '気にしない、気にしない！', '次はいけるさ！'],
      w: {
        'w.swap': ['入れ替え成功！ 相手の駒は<b>{k}マス</b>うしろへ、すごすご下がった。', 'ひとりぼっちの相手と場所を交換！ 相手は<b>{k}マス</b>戻されたんだ。', 'ぴったり止まって入れ替え。相手は<b>{k}マス</b>分を損したね！', '相手の駒をつかまえて<b>{k}マス</b>押し戻した！ きみは前へ進めたよ。', 'この目で届くひとりの相手はそこだけ。<b>{k}マス</b>下げられたのさ！'],
        'w.beauty': ['美の家にぴったり到着！ 出口はもうすぐそこさ。', '26にちょうど止まれたね。美の家なら相手も手出しできないんだ。', 'ぴったりの目で美の家へ！ 26は越えられないから、この目は大当たり！', '美の家に入ったから、次からは出口をめざせるのさ。', '26に着いた駒は安全地帯。いいところに入ったよ！'],
        'w.water': ['26の駒はそのまま、1はほかの駒で使えた。ドボンを回避！', '水の家に落ちずにすんだ！ 1をほかの駒で使うのが正解なんだ。', '美の家の駒は動かさない。これで流されずにすむよ。', 'ドボンを避けて、ほかの駒をちゃんと進めたね！', 'セーフ！ 26の駒は濡れずに出口を待てるのさ。'],
        'w.home': ['ぴったりの目で上がり！ 上がった駒はもう入れ替えられないんだ。', '<b>{f}</b>の駒が上がった。これで1枚安心さ！'],
      },
      n: {
        'n.noSwap': ['緑の駒なら、ひとりぼっちの相手と入れ替えて<b>{k}マス</b>下げられたんだ。', '緑の手は入れ替えの手。相手を<b>{k}マス</b>押し戻せたから、見逃しはもったいない！', 'この目なら緑の駒が相手にぴったり届いて、<b>{k}マス</b>下げられたのさ。', '緑の道の先にひとりの相手がいたから、交換すれば<b>{k}マス</b>分の得だったんだ。', '緑の駒で入れ替えれば、相手は<b>{k}マス</b>後ろへ。だから緑が正解なんだ。'],
        'n.noBeauty': ['緑の手なら、美の家（26）にぴったり入れたんだ。26は越えられないから、ちょうどの目はお宝さ。', '26に届く緑の駒がいたよ。美の家に入れば手出しされないから、そっちが先なんだ。', '緑の道の先が美の家。ぴったりの目はめったに来ないから、使わなきゃ損だね。', 'この目で26に止まれるのは緑の駒だけだから、そっちを先に入れるのが正解なんだ。', '美の家に入る緑の手を見のがしちゃった。26に入れば出口がすぐだから、もったいない！'],
        'n.water': ['赤の手だと26の駒が水の家にドボン！ <b>{d}</b>まで流されちゃう。ぼく泳げないから見てられないよ…', 'その手は美の家から1で水の家へ落ちるから、駒は<b>{d}</b>まで戻されちゃうんだ。', '赤の駒がドボン！ せっかくの26から<b>{d}</b>へ逆戻りだから、もったいない。', '1で26の駒を動かすと水の家行き。<b>{d}</b>まで流されるから、緑の手にしよう。', '水の家は27。赤の手だと駒は<b>{d}</b>まで流されちゃうのさ。'],
        'n.noHome': ['緑の手なら、<b>{f}</b>の駒をこの目で上げられたんだ。上がった駒はもう入れ替えられないよ。', 'この目は<b>{f}</b>の駒の上がりの目。緑の手で上げれば1枚安心だったから、そっちが先さ。', '上がれる駒がいたよ。緑の<b>{f}</b>の駒なら、この目でぴったり出口だったんだ。'],
        'n.risk': ['その手だと、相手の次の投げで入れ替えられうる確率が<b>{r}%</b>。緑の手なら<b>{q}%</b>ですむんだ。', '赤の手のあとは<b>{r}%</b>でつかまりうるから、<b>{q}%</b>の緑の手がいいのさ。'],
      },
      n0: { 'n.risk': ['その手だと、相手の次の投げで入れ替えられうる確率が<b>{r}%</b>になっちゃう。', '赤の手のあとは<b>{r}%</b>の確率でつかまりうるから、危ないんだ。'] },
      zero: ['緑の手なら、相手がどの目を出しても入れ替えられないよ。', '緑の手のあとは、相手の目がどれも届かないんだ。'],
      cq: {
        roll: ['棒を4本投げて<b>{n}</b>が出る確率は？ 16通りで考えてみて！', '今度は<b>{n}</b>の目！ 16通りのうち何通りかな？'],
        again: ['これで最後！ もう一度投げられる目（1・4・5）の確率は、合わせていくつ？'],
        risk: ['赤い印の駒が、相手の次の投げで入れ替えられる確率は？', '黄色の数字は相手の駒からの距離。赤い印の駒がねらわれる確率は？', '今度はどうかな？ 赤い印の駒のピンチ度を答えて！', '相手の駒が3枚も後ろにいる。赤い印の駒がつかまる確率は？', 'これで最後！ 赤い印の駒は、何/16でつかまりうる？'],
        block: ['出目は<b>{n}</b>。動かせる駒は何枚あるかな？', '<b>{n}</b>が出たよ。止まれる駒を数えてみて！', '今度の目は<b>{n}</b>。動ける駒は何枚？', '<b>{n}</b>が出た！ 動かせる駒を1枚ずつ確かめてみて。', 'これで最後！ 出目<b>{n}</b>で進める糸巻きは何枚？'],
        exit: ['次の1回の投げで、どれかの駒を上げられる確率は？', '光っている駒の上がりの目を足してみよう。何/16？', '今度はどう？ 出口から出られる見込みを答えて！', '出口の駒を全部見て、上がりの目を数えてみて！', 'これで最後！ 次の投げで1枚でも出られるのは何/16？'],
      },
      chint: {
        roll: ['1〜5の出方は、16通りのうち4・6・4・1・1通りなんだ。', '白い面が何本上を向くか、組み合わせを数えてみて！'],
        again: ['1は4通り、4と5は1通りずつ。足すといくつ？'],
        risk: ['黄色の数字が相手の駒からの距離。その目が出たらアウトさ。', '数字の目ごとに出やすさを出して、足し算してみて！', '並んだ味方がいれば手出しされない。壁の向こうの相手も届かないよ。', '距離1は4通り、2は6通り、3は4通り、4と5は1通りずつ。', '後ろの相手を1枚ずつ見て、何マス離れているか確かめよう！'],
        block: ['駒ごとに、出目だけ先のマスを見てみて！', '行き先に味方がいたら、その駒はお休みだよ。', '相手の3枚の壁は越えられない。26も越えられないんだ。', '手をつないだ相手2枚の上には乗れないのさ。', '黄色の数字に出目を足して、行き先を1つずつ確かめて！'],
        exit: ['上がりの目は、30なら1、29なら2、28なら3、26なら5。', '光る駒それぞれの上がりの目を調べてから足し算！', '28・29の駒は先へ進むこともできるけど、上がれるのは決まった目だけさ。', '29の駒は1で30へ進めるけど、それは上がりじゃないよ。', '出やすさは 1が4通り・2が6通り・3が4通り・5が1通り。'],
      },
      cw: {
        'c.roll': ['<b>{n}</b>の目は16通り中<b>{m}通り</b>なんだ。', '<b>{n}</b>が出るのは16通りのうち<b>{m}通り</b>。覚えておくと便利さ！', '<b>{n}</b>の出方は<b>{m}通り</b>だから、確率は<b>{m}/16</b>！'],
        'c.again': ['1が4通り、4と5が1通りずつ。足して<b>6/16</b>、3回に1回ちょっとなんだ。', '4＋1＋1で<b>6/16</b>！ おかわりは意外とよく来るね。'],
        'c.riskL': ['届く目の出やすさを足すと {list}、つまり<b>{m}/16</b>なのさ。', '{list} と足して、<b>{m}/16</b>になるのさ。', '距離の目ごとに数えると {list}、合計<b>{m}/16</b>なんだ。', '当たる目を拾っていくと {list}。全部で<b>{m}/16</b>！', '{list} を合わせた<b>{m}/16</b>が、ピンチ度の答えだよ。'],
        'c.risk0p': ['赤い印の駒は味方と並んだペア。だからどの目でもつかまらない、<b>0/16</b>なんだ。', '手をつないだ2枚には手が出せない！ 答えは<b>0/16</b>さ。'],
        'c.risk0w': ['あいだに味方の3枚の壁があって、相手は越えられない。だから<b>0/16</b>なんだ。'],
        'c.block': ['動かせるのは<b>{ok}</b>の糸巻き、<b>{m}枚</b>！', '数えると<b>{m}枚</b>。<b>{ok}</b>はちゃんと行き先があるんだ。', '<b>{ok}</b>の<b>{m}枚</b>が動ける駒さ。', '進めるのは<b>{ok}</b>。全部で<b>{m}枚</b>だよ！', '行き先が空いているのは<b>{ok}</b>の<b>{m}枚</b>なんだ。'],
        'c.exitL': ['上がれる目は {list}。足して<b>{m}/16</b>なんだ。', '{list} を合わせて<b>{m}/16</b>！', '光る駒ごとに目を数えると {list}。全部で<b>{m}/16</b>さ。', '出口の目を拾うと {list}、合計<b>{m}/16</b>だよ。', '{list} と足せば<b>{m}/16</b>。これが上がれる確率！'],
      },
      // the answer's reason after a miss (another list than the praise's, so a lesson's bubbles do not repeat)
      cwn: {
        'c.roll': ['<b>{n}</b>は16通りのうち<b>{m}通り</b>出るんだ。', '数えると<b>{n}</b>は<b>{m}通り</b>あるのさ。', '白黒の組み合わせで<b>{n}</b>になるのは<b>{m}通り</b>。'],
        'c.again': ['1の4通りに、4と5の1通りずつを足すんだ。'],
        'c.riskL': ['相手から届くのは<b>{nums}</b>の目だから、合わせて{m}通り。', '当たるのは<b>{nums}</b>の目。その出方を足して{m}通りさ。', '<b>{nums}</b>が出たらアウトだから、{m}通りなんだ。', 'つかまる目は<b>{nums}</b>だけ。数えると{m}通り。', '赤い印に届くのは<b>{nums}</b>の目、全部で{m}通りだよ。'],
        'c.risk0p': ['味方と並んだ駒は、どの目でも手出しされないんだ。'],
        'c.risk0w': ['味方の壁が、相手の通り道をふさいでいるからさ。'],
        'c.block': ['行き先があるのは<b>{ok}</b>だけ。', '<b>{ok}</b>以外は止まれないんだ。', '確かめると、進めるのは<b>{ok}</b>。', '数えられるのは<b>{ok}</b>の駒さ。', '<b>{ok}</b>なら行き先が空いているんだ。'],
        'c.exitL': ['上がれるのは<b>{nums}</b>の目だから、合わせて{m}通り。', '出口から出られる目は<b>{nums}</b>。出方を足すと{m}通りさ。', '<b>{nums}</b>が出れば上がれるから、{m}通りなんだ。', '上がりの目は<b>{nums}</b>だけ。数えると{m}通り。', '出口に合う目は<b>{nums}</b>、全部で{m}通りだよ。'],
      },
      cn: {
        'c.rollNg': ['<b>{x}</b>は<b>{v}</b>が出る確率だから、ちがうんだ。', '<b>{x}</b>だと、<b>{v}</b>の出やすさになっちゃう。'],
        'c.roll8Ng': ['<b>{x}</b>になる目はないから、ちがうよ。', '16通りで<b>{x}</b>になる目はひとつもないんだ。'],
        'c.roll': ['<b>{n}</b>は16通り中<b>{m}通り</b>。いちばん多い目はほかにあるんだ。', '<b>{n}</b>の出方は<b>{m}通り</b>だから、トップではないね。'],
        'c.lowNg': ['<b>{x}</b>だと少なすぎるから、数え落としがあるみたい。', '<b>{x}</b>では足りない。足しわすれがあるみたい。', '<b>{x}</b>は小さすぎるから、まだ数えていないものがあるんだ。', 'それだと<b>{x}</b>。もう少し大きくなるはずだから、数え直してみて！'],
        'c.highNg': ['<b>{x}</b>だと多すぎるから、数えなくていいものまで足しているよ。', '<b>{x}</b>では大きすぎる。よけいに足したところがあるんだ。', '<b>{x}</b>は多いから、どこかで数えすぎているみたい。', 'それだと<b>{x}</b>。もっと小さくなるはずだから、見直してみて！'],
        'c.blockLow': ['<b>{x}</b>では少ないよ。数え落とした糸巻きがあるんだ。', '<b>{x}</b>枚より多く動けるのさ。見落としがあるみたい。', 'それだと<b>{x}</b>枚。行き先の空いた駒をもう一度探して！', '<b>{x}</b>は小さい数。止まれる駒はもっといるよ。', '<b>{x}</b>枚と数えたなら、ひとつ見落としているかも。'],
        'c.blockHigh': ['<b>{x}</b>では多すぎる。止まれない駒まで数えているんだ。', '<b>{x}</b>は多いよ。行き先がふさがった駒もいるのさ。', 'それだと<b>{x}</b>枚。お休みの駒まで入っているみたい。', '<b>{x}</b>枚は数えすぎ。進めない駒をよけてみて！', '<b>{x}</b>は大きい数。動けない駒が混ざっているよ。'],
      },
      ans: ['正解は<b>{a}</b>。', '正解は<b>{a}</b>なんだ。', '<b>{a}</b>が正解！', 'ほんとうの正解は<b>{a}</b>。', '正解はこっち、<b>{a}</b>。'],
      bk: { own: '味方の駒の上', pair: 'ペアの相手の上', safe: '安全なマスの相手の上', wall: '壁の向こう', over: '26の向こう', exit: '出口の目でない' },
      bkl: ['動けないのは {list}。', '{list} は行き先がふさがっている。', '止まれないのは {list}。', '{list} はだめなんだ。', 'ふさがっているのは {list}。'],
    };
    function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
      const used = new Set(), perm = new Map();
      const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
      return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
    }
    const CAT = { basic: '基本', tactics: '戦術', end: '終盤' };
    const sq = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return [r, r === 1 ? 9 - k : k]; };
    function mini(s) {   // a small picture of the box for the list (3 × 10, the spools white, the cones black)
      if (!s) return '';
      const cells = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) { const i = r * 10 + (r === 1 ? 9 - c : c) + 1; cells.push(`<rect x="${1 + c * 9.8}" y="${4 + r * 10.5}" width="9" height="9.6" rx="1.5" fill="${[15, 26, 27, 28, 29, 30].includes(i) ? '#c89b5a' : '#7a5a3a'}"/>`); }
      const pc = [];
      for (const side of [0, 1]) for (const p of s.pos[side]) { if (p < 1 || p > 30) continue; const [r, c] = sq(p); pc.push(`<circle cx="${5.5 + c * 9.8}" cy="${8.8 + r * 10.5}" r="3.4" fill="${side ? '#2a2c31' : '#f4ecd8'}" stroke="#000" stroke-width=".6"/>`); }
      return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">${cells.join('')}${pc.join('')}</svg>`;
    }
    // why a piece cannot move with the throw (the 3D words of 「動かせる駒は何枚」 — as senet/tools/gen_lessons_v2.js blockReason)
    function blockWhy(E, s, n, from) {
      const b = E.board(s), t = from + n;
      if (from >= 28) return 'exit';
      if (from === 26) return b[t] === 0 ? 'own' : 'safe';
      if (t > 26) return 'over';
      for (let q = from + 1; q < t; q++) if (b[q] === 1) { let a = q, z = q; while (a - 1 >= 1 && b[a - 1] === 1) a--; while (z + 1 <= 30 && b[z + 1] === 1) z++; if (z - a + 1 >= 3) return 'wall'; }
      return b[t] === 0 ? 'own' : t === 26 ? 'safe' : 'pair';
    }
    const EMPTY = { rule: 'std', pos: [[31, 31, 31, 31, 31], [31, 31, 31, 31, 31]] };
    const D = {
      LKEY: 'aicoding-senet-lessons', data: null,
      load() {
        const eng = window.SenetEngine ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = '../senet/engine.js?v=7'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
        return this.p || (this.p = Promise.all([getJ('../senet/lessons.json?v=20261124a'), eng]).then(([d]) => { this.data = d; return this; }).catch(e => { this.p = null; throw e; }));
      },
      list(kind, lang) {
        if (kind === 'open') return [];
        const pr = J(this.LKEY, {}), d = this.data;
        return d.steps.map((s, i) => { const c = d.cats.find(x => x.steps.includes(s.id)) || {};
          return { key: String(i), cat: c.id || s.cat, catName: lang === 'ja' ? CAT[s.cat] || tx(c.name, lang) : tx(c.name, lang), title: tx(s.title, lang), sub: tx(s.tip, lang), svg: mini(s.diagram && s.diagram.s), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '', full: false }; });
      },
      msg(r, lang) { const t = r && this.data.msg[r[0]]; return t ? fill(tx(t, lang), r[1] || {}) : ''; },
      pos: (s, n, marks, lock, dn) => ({ ur: { s: s || EMPTY, n: n == null ? (dn == null ? null : dn) : n, marks: marks || [], lock: !!lock }, me: 1, dice: [n == null ? (dn == null ? -1 : dn) : n] }),   // (the same shape as ur's dice-race position; dice: the throw)
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s) return null;
        const ja = lang === 'ja', kk = +key, V = voice(kk * 3 + 2), id = s.id, E = window.SenetEngine;
        const R = ja ? JA.ramp[id] : null;
        const RUI = { step: d.ui.rampStep, main: d.ui.rampMain, next: d.ui.next, note: d.ui.rampNote, look: d.ui.look, ans: d.ui.ans, ng: d.ui.rampRetry, cont: d.ui.next };
        const RU = (k, v) => ja && k === 'ng' ? V.v(['ちがうみたい。もう一回考えてみよう！', 'うーん、もう一度！ 困ったら「ヒント」を押してね。', 'あと少し！ もう一回やってみよう。']) : ja && k === 'note' ? '準備は点数に入らないから、何回でも試していいよ。' : fill(tx(RUI[k], lang), v || {});
        const ramp = (s.ramp || []).map(r => {
          const o = { k: r.k, s: r.s, n: r.n, seq: r.seq, marks: r.marks || [], look: r.look || [], ok: r.ok, kind: r.kind, opts: r.opts, ans: r.ans };
          if (r.k === 'explain') { o.t = ja ? R.et : tx(r.t, lang); o.b = ja ? R.eb : tx(r.body, lang); }
          else { o.t = ja ? R.tt : tx(r.t, lang); o.g = ja ? R.g : tx(r.q || r.t, lang); o.h = ja ? R.h : tx(r.h, lang); o.y = ja ? R.y : tx(r.g, lang) || tx(d.ui.rampGood, lang); }
          if (r.kind === 'choice') { o.choices = r.opts.map(x => tx(x, lang)); o.right = r.ans; }
          return o;
        });
        const intro = ja ? JA.intro[id] : tx(s.body, lang);
        const N = s.problems.length;
        const KO = { 'c.roll': 'roll', 'c.again': 'again', 'c.riskL': 'risk', 'c.risk0p': 'risk', 'c.risk0w': 'risk', 'c.block': 'block', 'c.exitL': 'exit' };
        const probs = s.problems.map((q, pi) => {
          const last = pi === N - 1;
          if (q.kind === 'choice') {
            const kind = KO[q.why[0]], lab = x => tx(x, lang);
            const o = { kind: 'choice', P: q, pos: this.pos(q.s || EMPTY, q.n == null ? null : q.n, q.marks || [], true, q.why[0] === 'c.roll' ? q.why[1].n : null), marks: q.marks || [], choices: q.opts.map(lab), right: q.ans, ans: q.ans, dHint: true, hint: [], own: ja,
              ask: ja ? fill(JA.cq[kind][Math.min(JA.cq[kind].length - 1, s.problems.slice(0, pi).filter(x => x.why && KO[x.why[0]] === kind).length)], Object.assign({ n: q.n }, q.why[1] || {})) : tx(q.q, lang),
              hintTx: ja ? V.v(JA.chint[kind]) : tx(s.hints[pi % 2], lang) };
            let extra = '';
            if (ja && q.why[0] === 'c.block' && E) { const st = Object.assign({ winner: -1 }, q.s, { turn: 0 }), ms = E.legalMoves(st, q.n), on = [...new Set(st.pos[0].filter(p => p < 31))].filter(p => !ms.some(m => m.from === p)).sort((a, b) => a - b);
              if (on.length) extra = ' ' + fill(JA.bkl[pi % JA.bkl.length], { list: on.map(p => `<b>${p}</b>（${JA.bk[blockWhy(E, st, q.n, p)]}）`).join('・') }); }
            if (ja && q.why[0] === 'c.riskL' && /c\.risk/.test(q.why[0]) && q.s && E) {   // (a rival behind a wall of yours: named, so the count is the board's)
              const st = Object.assign({ winner: -1 }, q.s, { turn: 0 }), dm = (q.marks || []).find(x => x.type === 'danger'), p = dm ? (dm.r === 1 ? 19 - dm.c : dm.r * 10 + dm.c) + 1 : 0, b = E.board(st);
              const far = st.pos[1].filter(x => x < p && p - x <= 5 && !q.why[1].list.split(' + ').some(t => +t.split('→')[0] === p - x));
              if (far.length) extra = ` <b>${far.map(x => p - x).join('・')}</b>マス後ろの相手は、味方の壁にじゃまされて届かないんだ。`;
            }
            const why0 = this.msg(q.why, lang), why = () => ja ? fill(V.v(JA.cw[q.why[0]]), q.why[1]) + (q.why[0] === 'c.block' ? '' : extra) : why0;   // (the pieces that cannot move: named after a miss, not in every praise)
            const nums = String((q.why[1] || {}).list || '').split(' + ').filter(Boolean).map(t => t.split('→')[0]).join('と');
            const whyN = () => fill(V.v(JA.cwn[q.why[0]] || JA.cw[q.why[0]]), Object.assign({ nums }, q.why[1])) + extra;
            o.good = () => ja ? `${V.v(JA.cheer)} ${why()}${last ? ' ' + V.v(JA.push) : ''}` : why0;
            o.ng = u => { const i = typeof u === 'number' && u !== q.ans ? u : q.ans === 0 ? 1 : 0, g = q.ngo && q.ngo[i];
              if (!ja) return (g ? this.msg(g, lang) + ' ' : '') + why0;
              const gx = g ? fill(V.v(JA.cn[g[0]]), Object.assign({}, g[1], { x: plain(lab(q.opts[i])) })) : '';
              return `${V.v(JA.soft)} ${gx} ${fill(V.v(JA.ans), { a: plain(lab(q.opts[q.ans])) })}${whyN()}`; };
            return o;
          }
          const ask = ja ? fill(V.v(last ? JA.askLast : JA.ask), { n: q.n }) : fill(tx(d.ui.qMove, lang), { n: q.n });
          const o = { kind: 'urmove', P: q, pos: this.pos(q.s, q.n, [], false), ans: q.best[0], ok: [q.best[0]], dHint: true, hint: (q.look || []).slice(), own: ja, ask,
            hintTx: ja ? fill(V.v(JA.hint[id] || JA.hint.swap), { n: q.n }) : tx(s.hints[pi % 2], lang) };
          o.good = () => ja ? `${V.v(JA.cheer)} ${fill(V.v(JA.w[q.why[0]] || JA.w['w.beauty']), q.why[1] || {})}${pi % 2 || last ? ' ' + V.v(JA.push) : ''}` : this.msg(q.why, lang);
          o.ng = u => { const from = Array.isArray(u) ? u[0] : u, f = q.ng && q.ng[from] ? from : Object.keys(q.ng || {})[0], r = q.ng && q.ng[f];
            if (!ja) return this.msg(r, lang);
            const z = r && JA.n0[r[0]] && r[1] && r[1].q === 0;
            const t = !r ? '' : z ? fill(V.v(JA.n0[r[0]]), r[1]) + ' ' + V.v(JA.zero) : fill(V.v(JA.n[r[0]] || JA.n['n.noSwap']), r[1] || {});
            return `${V.v(JA.soft)} ${t}`; };
          return o;
        });
        return { id, title: tx(s.title, lang), intro, ramp, RU, probs, first: +key === 0,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, pass: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), pass: !!o.pass || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u, p) { const from = Array.isArray(u) ? u[0] : u; return from === p.ans ? 20 : 0; },   // (= senet/app-learn.js: only the best move is right — 追3)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id); if (!s || !s.diagram) return null; return { pos: this.pos(s.diagram.s, null, s.diagram.marks || [], true) }; },
      rampPos(it) { return D.pos(it.s || EMPTY, it.k === 'try' && it.kind !== 'choice' ? it.n : it.k === 'explain' ? it.n : it.n, [], it.k !== 'try' || it.kind === 'choice'); },
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
