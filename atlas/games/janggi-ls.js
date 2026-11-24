/* =====================================================================
   Janggi lessons on the 3D table (2026-11-24, 担当D) — ショウギツネ's own words for the lessons of the full game (janggi/lessons.json),
   played by atlas/lessons3d.js (DATA.janggi, the same runner as xiangqi's lessons) on the janggi table (atlas/games/janggi.js ctx.pz).
   Loaded by lessons3d.js (JANGGI.load). Only the steps in DONE are listed on the 3D table (the others are still to be checked:
   claude/lesson-quality.md「検証の進み具合」). Checked by tools/lesson-verify-janggi.js (the board facts behind each line).
   · intro / ask / hint — what the step teaches, the question and two hints, in her casual voice (わたし, コン now and then).
   · good(u) — names the piece taken, its points (車13・包7・馬5・象3・士3・兵2) and that no piece of the opponent can take back.
   · ng(u) — what the move does on the board: a capture that is taken back (which piece of yours is lost), a smaller capture that
     is not taken back (both pieces' points), or a move that takes nothing; then the right move (the green arrow) and what it takes.
   ===================================================================== */
(function () {
  'use strict';
  const DONE = ['b_rook', 'b_horse', 'b_elephant', 'b_cannon', 'b_pawn', 'b_escape', 'b_mate1', 't_capture', 't_fork', 't_check', 't_defend', 'm_mate2', 'm_mate3', 'e_rook', 'e_pawn'];   // (verified: tools/lesson-verify-janggi.js; the rest are not listed yet)
  const KIND = { b_rook: 5, b_horse: 4, b_elephant: 3, b_cannon: 6, b_pawn: 7 };
  const MATE = { b_mate1: 1, m_mate2: 2, m_mate3: 3, e_rook: 'n', e_pawn: 'n' };   // (the mate steps: P.ok = the one first move that mates within n; 'n' = the endgames: n is the problem's own P.n, the fastest mate)
  const PTS = [0, 0, 3, 3, 5, 13, 7, 2];
  // the side to move is always 楚 (Cho) in the lessons: its pawn is 卒, the opponent's (漢) is 兵
  const NM = (t, cho) => ['', '将', '士', '象', '馬', '車', '包', cho ? '卒' : '兵'][t] || '駒';
  const INTRO = {
    b_rook: 'わたしはショウギツネ。今日は<b>チャンギ</b>（韓国の将棋）をいっしょにやろう！<br>きみは手前の<b>緑（楚）</b>。相手の<b>将</b>を詰ませたら勝ちのゲームだよ。<br>まずは<b>車</b>から。タテとヨコに、どこまでも進める13点の駒なの。取り返されない駒を、車で取ってみよう！',
    b_horse: '<b>馬</b>は「1つまっすぐ、それから1つななめ」に跳ぶ駒。<br>最初のまっすぐの点（<b>馬の足</b>）に駒があると、そっちへは跳べないの。<br>足がふさがっていない跳び先から、ただの駒を探してみてね！',
    b_elephant: '<b>象</b>は「1つまっすぐ、それから2つななめ」に進む、遠くまで跳ぶ駒だよ。<br>とちゅうの<b>2つの点</b>のどちらかに駒があると、そっちへは行けないの。<br>3点の駒だけど、思わぬ遠くから取れることがあるコン。ただの駒を、象で取ってみよう！',
    b_cannon: '<b>包</b>はちょっとクセのある駒だコン。<br>動くときも取るときも、タテ・ヨコに<b>ちょうど1つの駒（台）</b>を跳び越えるの。<br>でも<b>包は台にできないし、包を取ることもできない</b>。台を見つけて、ただの駒を取ろう！',
    b_pawn: '<b>卒</b>（相手は<b>兵</b>）は、前かヨコに1歩ずつ進む駒。<br>チャンギには川がないから、はじめからヨコにも動けるんだ。<br>2点の小さな駒だけど、大きな駒をただで取れることもあるコン！',
    b_mate1: 'ここからは<b>詰み</b>の練習だコン。<br>王手をかけて、相手がどう動いても王手をはずせなければ<b>詰み</b>、きみの勝ち！<br>将は<b>九宮</b>から出られないし、九宮の<b>ななめの線</b>も通り道になるの。1手で詰ませてみよう！',
    m_mate2: '今度は<b>2手で詰ます</b>問題。<br>最初の1手のあと、相手がどう受けても<b>次の手で必ず詰む</b>手を探してね。<br>王手から始まるとは限らないよ。逃げ道を先にふさぐ、静かな手もあるんだコン！',
    e_rook: 'ここからは<b>終盤</b>。駒が少なくなったら、残った駒で将を詰ませにいくの。<br>きみには<b>車と馬</b>、相手の将には<b>士</b>がついてる。車で将の<b>動ける点を減らして</b>、馬で逃げ道をふさぐのがコツ。<br>九宮のななめの線も通り道だよ。<b>いちばん早く詰む</b>手を探そうコン！',
    e_pawn: '今度は<b>卒2つ</b>の終盤だよ。<br>卒は相手の九宮に入ると、<b>ななめの線にそって前へ</b>も進めるの。でも後ろには戻れないから、急いで奥まで進めすぎないでね。<br>自分の<b>将</b>も、相手の将の動きをふさぐ大事な駒。<b>いちばん早く詰む</b>手を探してみてコン！',
    b_escape: 'ピンチだコン！ 相手の駒が、きみの<b>大事な駒</b>をねらっているの。<br>取られる前に、相手の駒が<b>届かない点</b>へ逃がそう。<br>逃げた先で<b>別の駒</b>にねらわれないか、ほかの駒が取られる形にならないかも確かめてね！',
    t_capture: 'ここからは<b>戦術</b>だコン。<br>相手に守られている駒でも、<b>自分の駒より点数が高ければ</b>取る値打ちがあるの。点数の目安は、車13・包7・馬5・象と士3・卒2。<br>取り返されても、<b>差し引きで得をする</b>取り方を探してみよう！',
    t_check: '<b>王手</b>は、相手が必ず受けなきゃいけない手だよ。<br>だから王手と同時に<b>別の駒もねらう</b>と、相手は将を助けるのが先で、もう1つを守る手が間に合わないの。<br>動いた駒が取られないかも確かめてね。王手を<b>得をする道具</b>にしようコン！',
    t_fork: '今度は<b>両取り</b>だコン。<br>1つの駒で<b>相手の駒を2つ同時にねらう</b>と、相手は1手で片方しか助けられないの。<br>ねらう2つが、守られていないか自分の駒より高いこと、動いた駒が取られないことも確かめてね。<b>馬</b>や<b>車</b>の両取りはよく出てくるよ！',
    t_defend: 'ねらわれた駒は、<b>逃げるだけ</b>が守りじゃないコン。<br>逃げ場がないときは、<b>ほかの駒で守る</b>の。取られても<b>取り返せる</b>ようにする（ひもをつける）か、相手の駒との<b>間に駒を入れて</b>さえぎるんだ。<br>守りに動いた駒のせいで、ほかの駒が取られないかも確かめてね！',
    m_mate3: 'いよいよ<b>3手で詰ます</b>問題だよ。<br>最初の1手のあと、相手のどの受けにも<b>3手目までに必ず詰む</b>続きがある手を選んでね。<br>相手の受けを1つずつ読むのがコツ。自分の将が詰まされないかも、ちゃんと見てね！',
  };
  const ASK = {
    b_rook: ['車で、取り返されない駒を取ってみて！', '車でただ取りできる駒はどれかな？', 'どの駒なら車で取っても安全？', '車の道の先に、守られていない駒はある？', '取ったあと取り返されない駒を、車で取ろうコン！'],
    b_horse: ['馬で、ただの駒を取ってみて！', '馬の跳び先に、守られていない駒はある？', 'どの駒なら馬で取っても取り返されない？', '馬の足を確かめて、ただの駒を取ろう！', '馬でただ取りできる駒を探してね！'],
    b_elephant: ['象で、ただの駒を取ってみて！', '象の行き先に、守られていない駒はある？', 'どの駒なら象で取っても取り返されない？', 'とちゅうの点を確かめて、象でただの駒を取ろう！', '象でただ取りできる駒を探してね！'],
    b_cannon: ['包で、ただの駒を取ってみて！', '台を使って取れる、守られていない駒はどれ？', 'どの駒なら包で取っても取り返されない？', '包の台はどこかな？ ただの駒を取ろう！', '包でただ取りできる駒を探してね！'],
    b_mate1: ['1手で詰ませてみて！', 'どの王手なら、将がどこへも逃げられない？', '王手をはずす手がなくなる1手はどれかな？', '逃げ道も、王手を防ぐ手もなくす王手を探してね！', '1手で詰む王手、見つけられるかなコン？'],
    m_mate2: ['2手で詰ます最初の1手は？', '相手がどう受けても、次で詰む1手はどれ？', '王手とは限らないよ。次に必ず詰む形を作る手は？', '逃げ道を先にふさぐ手はあるかな？ 2手で詰ませよう！', 'どの受けにも次の詰みが残る1手を探してね！'],
    m_mate3: ['3手で詰ます最初の1手は？', '相手のどの受けにも、3手目までに詰む手はどれ？', '受けを1つずつ読んで、3手で詰ませよう！', '最初の1手のあと、相手はどう受ける？ 3手で詰む手を探してね！', '3手目までに必ず詰む1手、見つけられるかなコン？'],
    e_rook: [N => `車と馬で、${N}手で詰ませてみて！`, N => `いちばん早く詰む1手は？ この形は${N}手で詰むよ。`, N => `相手がどう受けても${N}手目までに詰む、最初の1手はどれ？`, N => `将の動ける点を減らす手はどれかな？ ${N}手で詰ませよう！`, N => `車と馬の協力で${N}手の詰み、見つけられるかなコン？`],
    e_pawn: [N => `卒2つで、${N}手で詰ませてみて！`, N => `いちばん早く詰む1手は？ この形は${N}手で詰むよ。`, N => `相手がどう受けても${N}手目までに詰む、最初の1手はどれ？`, N => `将の逃げ道を先にふさぐ手はあるかな？ ${N}手で詰ませよう！`, N => `卒と将の協力で${N}手の詰み、見つけられるかなコン？`],
    b_pawn: ['卒で駒を取ってみて！', '卒の前とヨコに、ただの駒はある？', 'どの駒なら卒で取っても取り返されない？', '小さな卒で、得をする取り方は？', '卒でただ取りできる駒を探してね！'],
  };
  const HINT = {
    b_rook: ['金の輪の車から、タテとヨコをのぞいてみて。どの駒に届く？', '金の輪の車で取れる駒を、ぜんぶ数えてみよう。相手が取り返せないのはどれ？', '車で取ったあと、相手の駒がその点へ届くか確かめてね。届かない駒がねらい目だコン！', '車は、道に駒があるとその先へ進めないの。通り道を1本ずつたどってみて！', '守っている相手の駒がいないのはどれ？ 金の輪の車から、順番に調べよう。'],
    b_horse: ['金の輪の馬の跳び先を、1つずつ数えてみて。どこに届く？', '馬の足（最初のまっすぐの点）に駒があると、その方向へは跳べないの。ふさがっていない跳び先は？', '金の輪の馬が取れる駒のうち、相手が取り返せないのはどれかな？', '馬で取ったあと、相手の駒がその点へ届かないか、確かめてみてね！', '馬の跳び先は8つまで。ふさがった足を除いて、ただの駒を探そうコン！'],
    b_elephant: ['金の輪の象の行き先を、1つずつ数えてみて。まっすぐ1つ、ななめに2つだよ！', 'とちゅうの2つの点のどちらかに駒があると、象はその方向へ行けないの。通れる行き先は？', '金の輪の象が取れる駒のうち、相手が取り返せないのはどれかな？', '象で取ったあと、相手の駒がその点へ届かないか、確かめてみてね！', '象の行き先は8つまで。ふさがった道を除いて、ただの駒を探そうコン！'],
    b_cannon: ['金の輪の包から、タテとヨコをのぞいてみて。台になる駒はどれ？', '包は台をちょうど1つ跳び越えて取るの。台の先にいる駒で、守られていないのは？', '包は包を台にできないし、包を取ることもできないよ。金の輪の包で取れる駒を数えてみて！', '包で取ったあと、相手の駒がその点へ届かないか確かめてね。届かない駒がねらい目だコン！', '台の向こうの最初の駒だけが取れるの。金の輪の包の4つの方向を、順番に調べよう。'],
    b_pawn: ['金の輪の卒の、前と左右を見てみて。後ろには動けないよ！', '金の輪の卒で取れる駒のうち、相手が取り返せないのはどれかな？', '卒が取れるのは、前かヨコのとなりだけ。そこにいる相手の駒は？', '卒で取ったあと、その点へ相手の駒が届かないか確かめてね！', '小さな卒でも、守られていない大きな駒なら得になるの。金の輪の卒の周りを探そうコン！'],
  };
  // praise: five wordings (each names the piece taken, its points, and that nothing takes back)
  const GOOD = [
    (c, v) => `正解！ ${c}（${v}点）をいただきだね。相手のどの駒も、そこへは届かないの。その調子！`,
    (c, v) => `お見事！ ${v}点の${c}を取って、取り返される心配もなし。次もこの目でいこうコン！`,
    (c, v) => `やったね！ ${c}を取ったあと、相手にはそこを取れる駒がいないの。${v}点まるもうけ！`,
    (c, v) => `すごい！ 取り返しのきかない${c}を見つけたね。${v}点の得、ばっちりだコン。`,
    (c, v) => `さすが！ ${c}は${v}点。取ったあと相手の駒は届かないから、安心して取れるんだ。どんどんいこう！`,
  ];
  const OPEN = ['', 'いっしょに確かめよう。', '', '大丈夫、よくある見落とし。', 'これで覚えちゃおう！ '];   // (the runner's own heading says おしい！ first)
  const RIGHT = [
    (m, c) => `正解は${m}。${c}をただで取れたんだコン。`,
    (m, c) => `${m}なら、${c}をただで取れたの。次はきっと見つかるね！`,
    (m, c) => `答えは${m}。${c}が守られていなかったんだ。`,
    (m, c) => `いちばんは${m}で、取り返されない${c}を取る手だったよ。今度はいけるコン！`,
    (m, c) => `${m}がよかったね。そこの${c}は、相手の誰も守っていなかったの。`,
  ];
  const takeBack = (E, p, m) => { const q = p.clone().play(m); return q.moves().some(x => E.mTo(x) === E.mTo(m)); };
  // the mate steps: the words read one ply of the board only (check or not, how the general gets out, a mate in 1 for the opponent);
  // that no wrong first move mates within n is the solver's (tools/lesson-verify-janggi.js ①②)
  const MHINT = {
    1: [M => `金の輪の${M}で王手をかけてみて。将の逃げ道は残ってない？`, M => `金の輪の${M}の王手を考えよう。将の動ける点を、1つずつ数えてみてね！`, M => `九宮の中で、将が行ける点はいくつかな？ 金の輪の${M}で、ぜんぶふさげる王手を探そうコン。`, M => `王手した${M}が取られないか、間に駒を入れられないかも確かめてね。金の輪の駒からだよ！`, M => `金の輪の${M}の王手のうち、将が逃げられず、ほかの駒でも防げないのはどれ？`],
    2: [M => `金の輪の${M}から始めてみて。そのあと相手の受けは何通りある？`, M => `金の輪の${M}を動かしたあと、相手のどの受けにも次の詰みが残るか確かめてね！`, M => `王手だけが正解とは限らないの。金の輪の${M}で、将の逃げ道を先に消せないかな？`, M => `金の輪の${M}の1手のあと、相手がいちばん粘る受けを考えよう。それでも次で詰む？`, M => `金の輪の${M}を使うよ。相手の受けを1つずつ、次の詰みと組にして読んでみてコン。`],
    3: [M => `金の輪の${M}から始めてみて。相手の受けを1つずつ読もう！`, M => `金の輪の${M}の1手のあと、相手がいちばん粘る受けは？ それでも3手目までに詰む？`, M => `金の輪の${M}を使うよ。王手で追うか、静かに包むか、どっちだろう？`, M => `相手の受けのあと、2手目と3手目で詰む形になるか確かめてね。金の輪の${M}からだコン！`, M => `金の輪の${M}で始めよう。手を抜くと、相手に詰まされることもあるから気をつけて！`],
  };
  // praise: the mating piece and a fact of the problem (how many checks there were / how many replies the opponent has after it)
  // the endgames (n = the problem's fastest mate, 2〜5)
  const EHINT = [(M, N) => `金の輪の${M}から始めてみて。相手の将が動ける点を数えて、${N}手で消せるかな？`, (M, N) => `金の輪の${M}の1手のあと、相手がいちばん粘る受けを考えよう。それでも${N}手目までに詰む？`, (M, N) => `急がば回れ、王手だけが近道とは限らないの。金の輪の${M}で、${N}手の詰みの形を作ろう！`, (M, N) => `相手の将の逃げ道はどこ？ 金の輪の${M}で、先に1つふさいでみて。${N}手で詰むよ！`, (M, N) => `金の輪の${M}を使うよ。受けを1つずつ読んで、${N}手目までの詰みを確かめてねコン。`];
  const MGOOD = {
    1: [(M, c) => `正解！ ${M}で詰み。王手は${c}通りあったけど、どうやってもはずせないのはこれだけなの。その調子！`, (M, c) => `お見事！ ${c}つの王手から、詰む${M}の1手を選べたね。逃げ道も防ぐ手も残ってないコン。`, M => `やったね！ ${M}の王手で詰み、将は九宮のどこへも動けないの。次もこの目でいこう！`, (M, c) => `すごい！ ${M}で詰ませたね。ほかの${c - 1}つの王手は、相手にかわされちゃう形だったんだ。`, M => `さすが！ ${M}の1手で詰み、勝負ありだね。どんどん詰ませていこうコン！`],
    q: [(M, n, r) => `正解！ 王手じゃない静かな${M}の1手。相手の受けは${r}通りあるけど、どれでも${n}手目までに詰むの！`, (M, n, r) => `お見事！ 王手をかけずに${M}を動かすのが正解。相手は${r}通りの手のどれを選んでも、詰みを防げないんだコン。`, M => `やったね！ 静かな${M}の1手で、相手はもう詰みから助からないの。次もこの読みでいこう！`, (M, n) => `すごい！ 王手をかけない${M}で、${n}手の詰みを読み切ったね。その調子！`, (M, n, r) => `さすが！ 静かな${M}のあと、相手の${r}通りの受けは、ぜんぶ詰みにつながるの。どんどんいこうコン！`],
    c: [(M, n, r) => `正解！ ${M}の王手。相手の受けは${r}通り、そのどれでも${n}手目までに詰むの！`, (M, n) => `お見事！ ${M}の王手から、${n}手の詰みを読み切ったね。その調子だコン！`, (M, n, r) => `やったね！ ${M}で王手すると、相手の${r}通りの受けは、ぜんぶ詰みにつながるの。`, M => `すごい！ ${M}の王手で、相手はもう詰みから助からないの。次もこの目でいこう！`, (M, n) => `さすが！ ${M}の王手のあと、相手がどう受けても${n}手目までに詰み。どんどんいこうコン！`],
  };
  const MRIGHT = {
    1: [(K, M) => `正解は${K}。${M}の王手で詰みだったの。`, (K, M) => `${K}なら、${M}の王手で詰みだったよ。次はきっと見つかるね！`, (K, M) => `答えは${K}。${M}の王手は、どうやってもはずせなかったんだ。`, (K, M, c) => `いちばんは${K}。${c}つの王手のうち、詰むのは${M}のこれだけだったコン。`, (K, M) => `${K}がよかったね。${M}で王手すれば、逃げ道も防ぐ手もなかったの。`],
    2: [(K, M, n, q) => `正解は${K}（${M}）。${q ? '王手じゃない静かな手' : '王手'}から、どう受けても${n}手目までに詰むんだコン。`, (K, M, n, q) => `${K}の${M}の${q ? '静かな手' : '王手'}なら、相手は詰みを防げなかったよ。`, (K, M, n, q) => `答えは${K}。${M}の${q ? '静かな1手' : '王手'}で、相手のどの受けも詰みにつながったの。`, (K, M, n, q) => `いちばんは${K}の${M}。${q ? '王手をかけない手' : 'その王手'}が、${n}手の詰みの始まりだったんだ。`, (K, M, n, q) => `${K}がよかったね。${M}の${q ? '静かな手' : '王手'}のあとは、どう受けても詰みだったコン。`],
  };
  const MOPEN = ['ドンマイ！ ', 'ここは読みどころ、いっしょに見よう。', '気にしない、詰みは慣れだコン。', '詰みの形は、覚えておけば次は見えるよ。', 'いっしょに読んでみよう。'];
  function mateJa(E, s, P, i, ck, n) {
    const N = MATE[s.id] === 'n' ? P.n : MATE[s.id], v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng');
    const mover = m => NM(T(p.at(E.mFrom(m))), true), AM = mover(A), ckd = m => p.clone().play(m).inCheck(), aq = !ckd(A);
    // how the general gets out of the check u gives (the opponent's legal replies)
    const esc = u => { const q = p.clone().play(u), R = q.moves().filter(x => !E.isPass(x));
      if (R.some(x => T(q.at(E.mFrom(x))) === E.KING)) return '将が逃げられ';
      if (R.some(x => E.mTo(x) === E.mTo(u))) return `王手した${mover(u)}を取られ`;
      return 'ほかの駒を動かして王手を防がれ'; };
    // a quiet move that leaves a piece of yours to be taken: the most valuable one the opponent can capture (0 = none)
    const hang = u => { const q = p.clone().play(u); let t = 0; for (const x of q.moves()) { if (E.isPass(x) || !q.at(E.mTo(x))) continue; const k = T(q.at(E.mTo(x))); if (PTS[k] > PTS[t]) t = k; } return t; };
    const lose = u => { const q = p.clone().play(u); return q.moves().some(x => q.clone().play(x).status() === -1); };
    const nCk = p.moves().filter(ckd).length, nRe = p.clone().play(A).moves().filter(x => !E.isPass(x)).length;
    const good = () => N === 1 ? v(MGOOD[1])(AM, nCk) : v(MGOOD[aq ? 'q' : 'c'])(AM, N, nRe);
    // the move the words are about: yours, or (when called with the right move) the most tempting wrong one — a check that fails
    const wrongOf = u => { const L = p.moves(); if (u != null && u !== A && L.includes(u)) return u; return L.find(x => x !== A && ckd(x)) || L.find(x => x !== A); };
    const ng = u0 => { const u = wrongOf(u0); let w = '';
      if (u != null) {
        if (N > 1 && lose(u)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (!ckd(u) && N > 1 && hang(u)) { const H = NM(hang(u), true); w = v([`${X}だと、相手に${H}を取られる手があって、${N}手では詰まないの。`, `${X}のあと、きみの${H}が取られる形になるの。それで${N}手では詰まないんだ。`], 1); }
        else if (!ckd(u)) w = N === 1 ? v([`${X}は王手になっていないから、詰みにならないの。`, `${X}だと王手がかからないね。1手で詰ますには王手が必要だコン。`], 1)
          : v([`${X}だと、相手にうまく受けられて、${N}手では詰まないの。`, `${X}のあとは、相手にしのぐ受けがあって、${N}手では詰まないんだ。`], 1);
        else { const e = esc(u); w = N === 1 ? v([`${X}は王手だけど、${e}ちゃうから詰みじゃないの。`, `${X}で王手しても、${e}るの。それだと詰みにならないね。`, `${X}の王手は惜しいけど、${e}るから詰まないんだ。`, `${X}は王手をかけても、${e}ちゃう形。だから詰みにならないコン。`, `${X}だと王手はかかるけど、${e}るから、まだ詰みじゃないの。`], 3)
          : v([`${X}は王手だけど、${e}て、${N}手では詰まないの。`, `${X}で王手しても、${e}るから、${N}手では詰まないね。`, `${X}の王手は惜しいけど、${e}て、${N}手では詰まないコン。`, `${X}は王手をかけても、${e}ちゃう。それで${N}手では詰まないんだ。`, `${X}だと王手はかかるけど、${e}るから、${N}手では詰まないの。`], 3); }
      }
      const R = N === 1 ? v(MRIGHT[1], 2)(M, AM, nCk) : v(MRIGHT[2], 2)(M, AM, N, aq);
      return v(MOPEN) + w + R; };   // (the mate steps' own openers: not the capture steps' in the same order)
    const q0 = v(ASK[s.id]), ask = typeof q0 === 'function' ? q0(N) : q0;
    return { ask, hintTx: MATE[s.id] === 'n' ? v(EHINT)(AM, N) : v(MHINT[N])(AM), good, ng, own: true };
  }

  // (2026-11-24 担当D) b_escape: one piece of yours is in danger (the opponent wins something on it: a static exchange, SEE); the answer
  // is the one move after which nothing of yours is in danger. The words name the piece, its attacker, the piece lost after a wrong
  // move and who takes it (the cheapest taker) — the board facts tools/lesson-verify-janggi.js counts again on its own.
  const SV = [0, 1000, 3, 3, 5, 13, 7, 2];
  function escFacts(E) {
    const T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
    const takers = (q, s) => q.moves().filter(m => !E.isPass(m) && mTo(m) === s);
    const see = (q, s, d) => { const x = q.at(s); if (!x || T(x) === E.KING || C(x) === q.side || d > 8) return 0; const L = takers(q, s); if (!L.length) return 0;
      const m = L.reduce((a, y) => SV[T(q.at(mFrom(y)))] < SV[T(q.at(mFrom(a)))] ? y : a); return Math.max(0, SV[T(x)] - see(q.clone().play(m), s, d + 1)); };
    // the pieces of the side not to move in q that are lost: [{ s, t, by }] (by = the cheapest taker's type), the biggest loss first
    const danger = q => { const out = []; for (let s = 0; s < 90; s++) { const x = q.at(s); if (!x || C(x) === q.side || T(x) === E.KING) continue; const g = see(q, s, 0);
      if (g > 0) out.push({ s, t: T(x), g, by: takers(q, s).map(m => T(q.at(mFrom(m)))).reduce((a, b) => SV[b] < SV[a] ? b : a) }); } return out.sort((a, b) => b.g - a.g || SV[b.t] - SV[a.t]); };
    const flip = p => { const q = p.clone(); q.side ^= 1; q.rehash(); return q; };
    const mate1 = q => q.moves().some(x => q.clone().play(x).status() === -1);
    return { danger, flip, mate1, takers, see };
  }
  const EASK = [(H, A) => `相手の${A}が、きみの${H}をねらってる！ どこへ逃がす？`, (H, A) => `このままだと${H}を${A}に取られちゃう。安全な逃げ先はどこかな？`, H => `ねらわれた${H}を、取られない点へ逃がしてあげて！`, (H, A) => `${A}のねらいから${H}を助けよう。逃げた先も安全な点はどれ？`, H => `${H}の逃げ先はいくつもあるけど、本当に安全なのは1つだけ。見つけられるかなコン？`];
  const EHINT2 = [H => `金の輪の${H}の行き先を、1つずつ確かめて。相手の駒が届かない点はどこ？`, H => `金の輪の${H}が逃げた先に、相手の車・包・馬が届かないか見てね。包は台を1つ跳び越えて取るよ！`, H => `金の輪の${H}を動かしたあと、ほかの駒がただで取られる形にならないかも確かめようコン。`, H => `逃げ先の候補を全部並べてみて。金の輪の${H}が、そこでまた取られない点は？`, H => `金の輪の${H}だよ。今ねらっている駒だけじゃなく、ほかの相手の駒の利きもたどってみて！`];
  const EGOOD = [(H, k) => `ばっちり！ ${H}を逃がして、相手のどの駒にも取られない形になったね。行き先は${k}つあったけど、安全なのはここだけなの。`, H => `助かったね！ ${H}は無事に逃げられたコン。逃げた先も、ほかの駒も、もう取られる心配はないよ。その調子！`, (H, k) => `その通り！ ${k}つの行き先のうち、${H}が取られずにすむのはここだけ。よく確かめたね、次もこの目でいこう！`, H => `いい逃げ方！ ${H}を、相手の駒の届かない点へ逃がせたね。この確かめ方で次もいこう！`, (H, k) => `見事だコン！ ${H}の行き先${k}つから、ただ1つの安全な点を選べたね。どんどんいこう！`];
  const EOPEN = ['ここは見落としやすいの。', 'いっしょに確かめよう。', '', '大丈夫、よくある見落とし。', 'これで覚えちゃおう！ '];
  const ERIGHT = [(M, H) => `正解は${M}。そこなら${H}はどの駒にも取られなかったの。`, (M, H) => `${M}なら、${H}が取られない点へ逃げられたよ。次はきっと見つかるね！`, (M, H) => `答えは${M}。${H}も、ほかの駒も無事な点だったんだコン。`, (M, H) => `いちばんは${M}。相手の駒が${H}に届かない、ただ1つの点だったの。`, (M, H) => `${M}がよかったね。そこへ逃げれば、${H}はもう安全だったんだ。`];
  function escJa(E, s, P, i, ck, n) {
    const v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng'), F = escFacts(E);
    const D = F.danger(F.flip(p)), d0 = D[0] || { s: E.mFrom(A), t: T(p.at(E.mFrom(A))), by: 0 }, H = NM(d0.t, true), AT = NM(d0.by, false), k = p.movesFrom(d0.s).length;
    const ng = u0 => { const L = p.moves(), u = u0 != null && u0 !== A && L.includes(u0) ? u0 : L.find(x => x !== A && E.mFrom(x) === d0.s) || L.find(x => x !== A); let w = '';
      if (u != null) { const q = p.clone().play(u), Q = F.danger(q), dd = Q[0], moved = E.mFrom(u) === d0.s;
        if (F.mate1(q)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false);
          if (moved && dd.s === E.mTo(u)) w = v([`${X}だと、逃げた先の${H}を相手の${B}に取られちゃう。`, `${X}に逃げても、そこには相手の${B}が届くの。${H}が取られる形だコン。`, `${X}の逃げ先は、相手の${B}の利きの中なの。${H}が取られちゃうよ。`], 1);
          else if (moved) w = v([`${X}で${H}は逃げられるけど、こんどは${Lp}を相手の${B}に取られちゃう。`, `${X}だと${H}は助かっても、${Lp}が相手の${B}に取られる形になるの。`], 1);
          else if (dd.s === d0.s) w = v([`${X}では、ねらわれた${H}を助けられないの。相手の${B}に取られちゃう。`, `${X}を指しても、${H}は相手の${B}に取られたままだコン。`, `${X}だと、${H}へのねらいが消えないの。相手の${B}に取られちゃう。`], 1);
          else w = v([`${X}のあと、${Lp}を相手の${B}に取られる形になるの。`, `${X}だと、こんどは${Lp}が相手の${B}に取られちゃう。`], 1); } }
      return v(EOPEN) + w + v(ERIGHT, 2)(M, H); };
    return { ask: v(EASK)(H, AT), hintTx: v(EHINT2)(H), good: () => v(EGOOD)(H, k), ng, own: true };
  }

  // (2026-11-24 担当D) t_capture 「得な交換」: the answer takes a guarded 馬・車・包 with a cheaper piece; the opponent takes it back and
  // 楚 is still ahead (the piece taken minus the opponent's best exchange afterwards = the net, escFacts' SEE). Every other move wins
  // nothing: the words say what the board does after it — the piece taken back (both points, the net), another piece lost and its taker,
  // a quiet move (and what it leaves en prise), or a mate in 1 — counted again by tools/lesson-verify-janggi.js.
  const TASK = ['得になる取り方を見つけてみて！', '取り返されても損をしない取り方はどれかな？', '安い駒で高い駒を取れるところはある？', '駒の点数を比べてみて。差し引きで得をする手は？', 'ここは駒得のチャンスだコン！ どの駒で、どれを取る？'];
  const THINT = [M => `金の輪の${M}で取れる駒を見てみて。取り返されても、取った駒のほうが高いのはどれ？`, M => `金の輪の${M}を使うよ。取ったあと取り返されるときの、点数の足し算と引き算をしてみてね！`, M => `守られている駒でも、金の輪の${M}より点数が高ければ得になるの。ねらいはどれかな？`, M => `高い駒で取ると、取り返されて損をすることがあるの。金の輪の${M}みたいな安い駒で取れないかなコン？`, M => `金の輪の${M}から、取れる駒を1つずつ数えてみて。差し引きで得をするのは1つだけだよ。`];
  const TGOOD = [(MA, W, AC, V, g) => `正解！ ${W}点の${MA}で${V}点の${AC}を取ったね。相手に取り返されても、${g}点のおつりがくるの。その調子！`, (MA, W, AC, V, g) => `お見事！ ${AC}（${V}点）と${MA}（${W}点）の取りかえっこで、${g}点のもうけだコン。この計算、忘れないでね！`, (MA, W, AC, V, g) => `やったね！ 守られている${AC}でも、${MA}で取れば${g}点の得。点数を比べる目、ばっちりだよ！`, (MA, W, AC, V, g) => `すごい！ ${MA}（${W}点）を取り返されても、${AC}は${V}点。差し引き${g}点、きみの得だね。次もこの目でいこう！`, (MA, W, AC, V, g) => `さすが！ 安い${MA}で高い${AC}を取る、いちばん得な交換だね。${g}点のもうけ、どんどんいこうコン！`];
  const TOPEN = ['ここは計算どころ、いっしょに見よう。', '惜しかったね、いっしょに数えよう。', '', '大丈夫、交換の計算は慣れだコン。', '点数を比べてみよう。'];
  const TRIGHT = [(K, MA, W, AC, V, g) => `正解は${K}。${MA}で${AC}を取れば、${g}点の得だったの。`, (K, MA, W, AC, V, g) => `${K}なら、${MA}を取り返されても${AC}のほうが高かったよ。次は見つかるね！`, (K, MA, W, AC, V, g) => `答えは${K}。${MA}と${AC}の交換で、${g}点もうかったんだコン。`, (K, MA, W, AC, V, g) => `いちばんは${K}、${MA}で${AC}を取る得な交換だったの。`, (K, MA, W, AC, V, g) => `${K}がよかったね。${AC}は${MA}より${g}点も高いんだ。`];
  const sayNet = g => g < 0 ? `差し引き${-g}点の損になっちゃう` : '差し引きとんとんで、得にならない';
  function tradeJa(E, s, P, i, ck, n) {
    const v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng'), F = escFacts(E);
    const cap = m => !E.isPass(m) && p.at(E.mTo(m)) ? T(p.at(E.mTo(m))) : 0, mover = m => T(p.at(E.mFrom(m)));
    const act = u => { const q = p.clone().play(u), D = F.danger(q); return { q, D, dd: D[0], m1: F.mate1(q), net: PTS[cap(u)] - (D[0] ? D[0].g : 0) }; };
    const a0 = act(A), MA = NM(mover(A), true), W = PTS[mover(A)], AC = NM(cap(A), false), V = PTS[cap(A)], g = a0.net;
    const ng = u0 => { const L = p.moves(), u = u0 != null && u0 !== A && L.includes(u0) ? u0 : L.find(x => x !== A && cap(x)) || L.find(x => x !== A); let w = '';
      if (u != null) { const r = act(u), c = cap(u), C = NM(c, false), CV = PTS[c], MT = NM(mover(u), true), MV = PTS[mover(u)], dd = r.dd;
        if (r.m1) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (c && dd && dd.s === E.mTo(u)) { const B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）を取ると、きみの${MT}（${MV}点）を相手の${B}に取り返されて、${sayNet(r.net)}の。`, `${X}だと${C}（${CV}点）は取れるけど、${MT}（${MV}点）が相手の${B}に取り返されるの。${sayNet(r.net)}んだ。`, `${X}の${C}（${CV}点）取りは、${MT}（${MV}点）を相手の${B}に取り返される形。${sayNet(r.net)}コン。`], 1); }
        else if (c && dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）は取れるけど、こんどは${Lp}を相手の${B}に取られちゃう。${sayNet(r.net)}の。`, `${X}だと${C}（${CV}点）を取っても、${Lp}が相手の${B}に取られる形になるの。${sayNet(r.net)}んだ。`], 1); }
        else if (c) w = `${X}で${C}（${CV}点）を取れるの。`;
        else if (dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = v([`${X}は駒を取らない手で、しかも${Lp}を相手の${B}に取られる形になるの。`, `${X}だと駒を取れないうえに、${Lp}が相手の${B}に取られちゃう。`], 1); }
        else w = v([`${X}では駒を取れないの。せっかくの駒得のチャンスを逃しちゃう。`, `${X}は駒を取る手じゃないね。得をするチャンスがそのまま残っちゃう。`, `${X}だと、得な交換をしそこねちゃう。`], 1); }
      return v(TOPEN) + w + v(TRIGHT, 2)(M, MA, W, AC, V, g); };
    return { ask: v(TASK), hintTx: v(THINT)(MA), good: () => v(TGOOD)(MA, W, AC, V, g), ng, own: true };
  }
  // (2026-11-24 担当D) t_fork 「両取り」: the answer is a quiet move (no capture, no check) after which the moved piece attacks two pieces of
  // 漢 (3 points or more) that 楚 would win; whatever 漢 replies, 楚 still wins something (the fork value, three plies: the piece the
  // reply takes back − / + 楚's best 1-move net after it). The words name the two targets (the biggest two), the value, and for a wrong
  // move what the board does: a mate in 1, a capture taken back (the net), a piece of yours left to be taken, a double threat the
  // opponent answers with one move (the piece that moves), a single threat, or no threat — counted again by tools/lesson-verify-janggi.js.
  function forkFacts(E) {
    const F = escFacts(E), T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
    const capOf = (q, m) => !E.isPass(m) && q.at(mTo(m)) ? T(q.at(mTo(m))) : 0;
    // the pieces of 漢 (not the general) 楚 would win something on with 楚 to move: [{ s, t, g }], the biggest first
    const threats = (q, me) => { const r = q.side === me ? q : F.flip(q), o = []; for (let s = 0; s < 90; s++) { const x = r.at(s); if (!x || C(x) === me || T(x) === E.KING) continue; const g = F.see(r, s, 0); if (g > 0) o.push({ s, t: T(x), g }); } return o.sort((a, b) => b.g - a.g || PTS[b.t] - PTS[a.t]); };
    const net = (q, x) => { const r = q.clone().play(x); if (F.mate1(r)) return -99; const D = F.danger(r); return PTS[capOf(q, x)] - (D[0] ? D[0].g : 0); };
    const best1 = (q, stop) => { const L = q.moves(); if (!L.length) return -99; let b = -1e9; const cs = L.filter(x => capOf(q, x)).sort((x, y) => PTS[capOf(q, y)] - PTS[capOf(q, x)]);
      for (const x of cs) { if (PTS[capOf(q, x)] <= b) break; b = Math.max(b, net(q, x)); if (b >= stop) return b; } if (b >= 0) return b;
      for (const x of L) { if (capOf(q, x)) continue; b = Math.max(b, net(q, x)); if (b >= 0 || b >= stop) return b; } return b; };
    const fork = (p, u, cut) => { const c0 = PTS[capOf(p, u)], q = p.clone().play(u); if (F.mate1(q)) return { v: -99, by: null };
      const R = q.moves(); if (!R.length) return { v: 99, by: null }; const th = new Set(threats(q, p.side).map(o => o.s)), key = r => (capOf(q, r) ? 100 + PTS[capOf(q, r)] : 0) + (!E.isPass(r) && th.has(mFrom(r)) ? 50 : 0);
      R.sort((a, b) => key(b) - key(a)); let mn = 1e9, by = null;
      for (const r of R) { const cr = PTS[capOf(q, r)], v = c0 - cr + best1(q.clone().play(r), mn - c0 + cr); if (v < mn) { mn = v; by = r; if (cut != null && mn <= cut) break; } } return { v: mn, by }; };
    return Object.assign({}, F, { threats, fork, capOf });
  }
  const FASK = ['両取りをかけてみよう！', '1手で2つの駒を同時にねらえる手はどれかな？', '相手が1手では守りきれない手、見つけられる？', '両取りのチャンスだコン。どの駒を、どこへ動かす？', '2つの駒に同時に届く点はどこかな？'];
  const FHINT = [M => `金の輪の${M}を動かした先から、相手の駒が2つ見える点を探してみて。`, M => `金の輪の${M}の行き先を1つずつ確かめよう。そこから取れる相手の駒はいくつ？`, M => `金の輪の${M}だよ。ねらう2つの駒が、どちらも守られていないか、守りより高い駒かも見てね！`, M => `金の輪の${M}で、相手の大きな駒2つの両方に届く点はどこかな？ 動いた${M}が取られないかも確かめてね。`, M => `金の輪の${M}を使うよ。1つだけねらっても逃げられちゃう。2つ同時がコツだコン！`];
  const FGOOD = [(M, A, B, g) => `正解！ ${M}で${A}と${B}の両取り。相手はどちらか一方しか救えないから、${g}点の得だコン。その調子！`, (M, A, B, g) => `やったね！ ${M}の両取りで、${A}か${B}のどちらかが取れるの。少なくとも${g}点の得、ばっちりだよ！`, (M, A, B, g) => `お見事！ ${M}が${A}と${B}を同時にねらってるの。相手がどう受けても、${g}点はきみのものだね。`, (M, A, B, g) => `さすが！ ${M}1つで${A}と${B}の2つをねらう、きれいな両取り。相手は1手で両方は守れないから、${g}点の得なんだ。`, (M, A, B, g) => `すごい！ ${A}と${B}の両方に${M}が届く、ただ1つの点を見つけたね。${g}点もうけ、次もこの目でいこう！`];
  const FOPEN = ['いっしょに確かめよう。', '惜しかったね、盤をよく見よう。', '', '大丈夫、両取りは見つけるのに慣れがいるの。', 'これで覚えちゃおうコン！ '];
  const FRIGHT = [(K, M, A, B) => `正解は${K}。${M}で${A}と${B}を同時にねらえたの。`, (K, M, A, B) => `${K}なら、${M}が${A}と${B}の両方に届いたよ。次はきっと見つかるね！`, (K, M, A, B) => `答えは${K}。${M}の両取りで、${A}か${B}のどちらかが取れたんだコン。`, (K, M, A, B) => `いちばんは${K}、${M}で${A}と${B}をねらう両取りだったの。`, (K, M, A, B) => `${K}がよかったね。そこの${M}は、${A}と${B}の両方に届くんだ。`];
  function forkJa(E, s, P, i, ck, n) {
    const v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng'), F = forkFacts(E);
    const mover = m => T(p.at(E.mFrom(m))), MA = NM(mover(A), true), qa = p.clone().play(A);
    const hit = F.threats(qa, p.side).filter(o => PTS[o.t] >= 3 && F.flip(qa).movesFrom(E.mTo(A)).some(x => E.mTo(x) === o.s));
    const TA = NM((hit[0] || {}).t, false), TB = NM((hit[1] || {}).t, false), g = F.fork(p, A).v;
    const ng = u0 => { const L = p.moves(), u = u0 != null && u0 !== A && L.includes(u0) ? u0 : L.find(x => x !== A && F.threats(p.clone().play(x), p.side).length >= 2) || L.find(x => x !== A && F.capOf(p, x)) || L.find(x => x !== A); let w = '';
      if (u != null) { const q = p.clone().play(u), c = F.capOf(p, u), C = NM(c, false), CV = PTS[c], MT = NM(mover(u), true), MV = PTS[mover(u)], D = F.danger(q), dd = D[0];
        const nt = F.mate1(q) ? -99 : CV - (dd ? dd.g : 0);
        if (F.mate1(q)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (c && dd && dd.s === E.mTo(u)) { const B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）を取ると、きみの${MT}（${MV}点）を相手の${B}に取り返されて、${sayNet(nt)}の。`, `${X}だと${C}（${CV}点）は取れるけど、${MT}（${MV}点）が相手の${B}に取り返されるの。${sayNet(nt)}んだ。`], 1); }
        else if (c && dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）は取れるけど、こんどは${Lp}を相手の${B}に取られちゃう。${sayNet(nt)}の。`, `${X}だと${C}（${CV}点）を取っても、${Lp}が相手の${B}に取られる形になるの。${sayNet(nt)}んだ。`], 1); }
        else if (dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = v([`${X}だと、こんどは${Lp}を相手の${B}に取られる形になるの。`, `${X}のあと、きみの${Lp}が相手の${B}に取られちゃう。`], 1); }
        else { const H = F.threats(q, p.side);
          if (H.length >= 2) { const f = F.fork(p, u, 0), R = f.by != null && !E.isPass(f.by) ? NM(T(q.at(E.mFrom(f.by))), false) : '';
            w = R ? v([`${X}で${NM(H[0].t, false)}と${NM(H[1].t, false)}をねらえるけど、相手は${R}を動かす1手で両方しのげるから、得にならないの。`, `${X}だと${NM(H[0].t, false)}と${NM(H[1].t, false)}に届くけど、相手の${R}の1手で、どちらも取れなくなるの。`], 1)
              : `${X}で${NM(H[0].t, false)}と${NM(H[1].t, false)}をねらえるけど、相手に1手で両方しのがれるから、得にならないの。`; }
          else if (H.length === 1) w = v([`${X}だと、ねらえるのは${NM(H[0].t, false)}の1つだけ。1つなら、相手は1手でしのげるの。`, `${X}では${NM(H[0].t, false)}しかねらえないの。ねらいが1つだと、相手に守られちゃう。`], 1);
          else w = v([`${X}は、相手の駒をねらう手になっていないの。`, `${X}だと、取れそうな相手の駒が1つもできないね。`], 1); } }
      return v(FOPEN) + w + v(FRIGHT, 2)(M, MA, TA, TB); };
    return { ask: v(FASK), hintTx: v(FHINT)(MA), good: () => v(FGOOD)(MA, TA, TB, g), ng, own: true };
  }
  // (2026-11-24 担当D) t_check 「王手で得をする」: the answer is a quiet check (no capture); 漢 must answer the check first, and the moved
  // piece (or the piece it unmasks) also attacks a piece of 漢 of 3 points or more, so whatever 漢 replies 楚 still wins something (the
  // fork value of forkFacts, three plies deep). The words name the piece moved, the piece attacked (the biggest) and the value; for a
  // wrong move what the board does: a mate in 1, a capture taken back (the net), a piece of yours left to be taken, another check and the
  // piece whose move answers it (after which 楚 wins nothing), a quiet move and what it attacks — counted again by tools/lesson-verify-janggi.js.
  const CASK = ['王手をかけて、駒得をねらってみよう！', '相手が王手を受けているあいだに、得をする手はどれかな？', '王手と同時に、相手の駒もねらえる手はある？', '王手をかけられたら、相手は受けるしかないの。それを使って得をする1手は？', 'ここは王手が決め手だコン。どの駒を、どこへ動かす？'];
  const CHINT = [M => `金の輪の${M}で王手をかけてみて。そのとき、ほかにねらえる相手の駒はある？`, M => `金の輪の${M}を動かして王手。相手が将を助けているあいだに、取れる駒はどれかな？`, M => `金の輪の${M}を使うよ。王手をかけたあと、相手の大きな駒に届いていないか見てね！`, M => `王手はいくつかあるけど、得になるのは1つだけ。金の輪の${M}の王手を1つずつ確かめようコン。`, M => `金の輪の${M}で王手するとき、動いた先で取られないかも確かめてね。将と、もう1つの駒をねらう形を探そう！`];
  const CGOOD = [(M, A, g) => `正解！ ${M}を動かして王手、しかも${A}もねらってるの。相手は王手を受けるのが先だから、どう受けても${g}点の得だコン。その調子！`, (M, A, g) => `すごい！ ${M}を動かす王手が、${A}へのねらいにもなってるんだ。どう受けられても${g}点の得、次もこの目でいこう！`, (M, A, g) => `さすが！ 王手と${A}ねらいを${M}の1手でかけたよ。相手は1手で両方は防げないから、${g}点のもうけだコン。`, (M, A, g) => `やったね！ ${M}で王手をかけて、将と${A}を同時にねらったから、どう受けられても${g}点の得。ばっちり！`, (M, A, g) => `お見事！ ${M}の王手で、将と${A}が同時にねらわれてるの。相手がどう受けても、少なくとも${g}点はきみのものだよ。`];
  const COPEN = ['いっしょに確かめよう。', '惜しかったね、盤をよく見よう。', '', '大丈夫、王手の使い方は慣れだコン。', 'これで覚えちゃおう！ '];
  const CRIGHT = [(K, M, A) => `正解は${K}。${M}を動かして王手をかけると、${A}もねらえたの。`, (K, M, A) => `${K}なら、${M}の王手と同時に${A}をねらえたよ。次はきっと見つかるね！`, (K, M, A) => `答えは${K}。${M}の王手で、将と${A}を同時にねらえたんだコン。`, (K, M, A) => `いちばんは${K}、${M}で王手をかけながら${A}をねらう手だったの。`, (K, M, A) => `${K}がよかったね。${M}を動かすと、王手と${A}ねらいが同時にかかったんだ。`];
  function checkJa(E, s, P, i, ck, n) {
    const v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng'), F = forkFacts(E);
    const mover = m => T(p.at(E.mFrom(m))), MA = NM(mover(A), true), qa = p.clone().play(A);
    const hit = F.threats(qa, p.side).filter(o => PTS[o.t] >= 3), TA = NM((hit[0] || {}).t, false), g = F.fork(p, A).v;
    const ng = u0 => { const L = p.moves(), u = u0 != null && u0 !== A && L.includes(u0) ? u0 : L.find(x => x !== A && p.clone().play(x).inCheck()) || L.find(x => x !== A && F.capOf(p, x)) || L.find(x => x !== A); let w = '';
      if (u != null) { const q = p.clone().play(u), c = F.capOf(p, u), C = NM(c, false), CV = PTS[c], MT = NM(mover(u), true), MV = PTS[mover(u)], D = F.danger(q), dd = D[0];
        const nt = F.mate1(q) ? -99 : CV - (dd ? dd.g : 0);
        if (F.mate1(q)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (c && dd && dd.s === E.mTo(u)) { const B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）を取ると、きみの${MT}（${MV}点）を相手の${B}に取り返されて、${sayNet(nt)}の。`, `${X}だと${C}（${CV}点）は取れるけど、${MT}（${MV}点）が相手の${B}に取り返されるの。${sayNet(nt)}んだ。`], 1); }
        else if (c && dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = v([`${X}で${C}（${CV}点）は取れるけど、こんどは${Lp}を相手の${B}に取られちゃう。${sayNet(nt)}の。`, `${X}だと${C}（${CV}点）を取っても、${Lp}が相手の${B}に取られる形になるの。${sayNet(nt)}んだ。`], 1); }
        else if (dd) { const Lp = NM(dd.t, true), B = NM(dd.by, false); w = q.inCheck() ? v([`${X}も王手だけど、相手は${B}で${Lp}を取って、王手を受けられちゃう。それだと損だコン。`, `${X}で王手しても、相手の${B}が${Lp}を取る手で受けられるの。${Lp}を取られて損しちゃう。`], 1)
          : v([`${X}だと、こんどは${Lp}を相手の${B}に取られる形になるの。`, `${X}のあと、きみの${Lp}が相手の${B}に取られちゃう。`], 1); }
        else if (q.inCheck()) { const f = F.fork(p, u, 0), R = f.by != null && !E.isPass(f.by) ? NM(T(q.at(E.mFrom(f.by))), false) : '';
          w = R ? v([`${X}で王手をかけても、相手は${R}を動かして受ければ、得になる取りが残らないの。`, `${X}の王手は、相手の${R}の1手で受けられて、そのあと得をする手がないんだ。`], 1) : `${X}で王手をかけても、受けられたあと、得をする手が残らないの。`; }
        else { const H = F.threats(q, p.side);
          if (H.length) w = v([`${X}は王手じゃないから、相手は${NM(H[0].t, false)}を守る手を指せちゃう。`, `${X}で${NM(H[0].t, false)}をねらっても、王手じゃないと相手に1手で守られちゃうの。`], 1);
          else w = v([`${X}は王手でもないし、相手の駒をねらう手にもなっていないの。`, `${X}だと王手もかからないし、取れそうな相手の駒も1つもできないね。`], 1); } }
      return v(COPEN) + w + v(CRIGHT, 2)(M, MA, TA); };
    return { ask: v(CASK), hintTx: v(CHINT)(MA), good: () => v(CGOOD)(MA, TA, g), ng, own: true };
  }
  // (2026-11-24 担当D) t_defend 「守る」: one piece of 楚 (車・包・馬) is in danger and every move of it fails; the answer is a quiet move of
  // another piece after which nothing of 楚 is in danger: 'guard' (the attacker still reaches the piece, but the moved piece takes back,
  // so taking loses for 漢), 'line' (the moved piece stands between a 車 / 包 and the piece), 'leg' (it stands on a 馬 / 象's leg),
  // 'screen' (it leaves the point a 包 jumped over). The words name the piece in danger, its attacker, the defender and the way; for a
  // wrong move what the board does: a mate in 1, the piece in danger (or the escaped piece where it went, or another piece) taken by
  // the opponent's cheapest taker, a guard that does not hold — counted again by tools/lesson-verify-janggi.js (defendStep).
  function defendFacts(E, p, A) {
    const F = escFacts(E), T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, z = F.flip(p), D = F.danger(z), d0 = D[0], H = d0.s;
    const att = F.takers(z, H).map(mFrom), q = p.clone().play(A), rc = s => [(s / 9) | 0, s % 9];
    let how = null;
    if (F.takers(q, H).length) how = 'guard';
    else for (const a of att) { const t = T(p.at(a)), [r1, c1] = rc(a), [r2, c2] = rc(H), btw = s => { const [r, c] = rc(s); return (r1 === r2 && r === r1 && (c - c1) * (c - c2) < 0) || (c1 === c2 && c === c1 && (r - r1) * (r - r2) < 0); };
      if ((t === 5 || t === 6) && btw(mTo(A))) { how = 'line'; break; }
      if (t === 6 && btw(mFrom(A))) { how = 'screen'; break; }
      if (t === 4 || t === 3) { const dr = r2 - r1, dc = c2 - c1, l1 = Math.abs(dr) > Math.abs(dc) ? [r1 + Math.sign(dr), c1] : [r1, c1 + Math.sign(dc)], L = [l1];
        if (t === 3) L.push([l1[0] + Math.sign(dr), l1[1] + Math.sign(dc)]); if (L.some(([r, c]) => r * 9 + c === mTo(A))) { how = 'leg'; break; } } }
    return { F, z, d0, H, att, how };
  }
  const DASK = [(H, B) => `相手の${B}が、きみの${H}をねらってるよ。どう守る？`, (H, B) => `${H}がピンチ！ 相手の${B}に取られないようにする1手は？`, (H, B) => `${H}は逃げてもうまくいかないの。相手の${B}のねらいを、ほかの駒で防げるかな？`, (H, B) => `相手の${B}のねらいを消す手はどれかな？ ${H}を守ろうコン！`, (H, B) => `${H}を助ける手、見つけられる？ 相手の${B}をよく見てね。`];
  const DHINT = [(M, H) => `${H}は、どこへ逃げてもうまくいかないの。金の輪の${M}で守れないかな？`, (M, H) => `金の輪の${M}を動かして、${H}を取られないようにしよう。動いた先から${H}に届く？ それとも、間に入れる？`, (M, H) => `金の輪の${M}の行き先を1つずつ確かめてね。そのあと相手が${H}を取ったら、取り返せるかな？`, (M, H) => `ねらわれた${H}を、金の輪の${M}で助けるの。${M}が動いたあと、ほかの駒が取られる形にならないかも見てね！`, (M, H) => `逃げるだけが守りじゃないコン。金の輪の${M}で、${H}を守る点を探そう！`];
  const DWAY = { guard: (M, H, B, k) => [[`${M}で${H}にひもをつけた`, `${M}で${H}にひもをつけて`], [`${M}を${H}の守りにつけた`, `${M}を${H}の守りにつけて`], [`${M}が${H}を守る形にした`, `${M}が${H}を守る形にして`]][k % 3], line: (M, H, B) => [`${M}を相手の${B}と${H}の間に入れた`, `${M}を相手の${B}と${H}の間に入れて`], leg: (M, H, B) => [`${M}で相手の${B}の足をふさいだ`, `${M}で相手の${B}の足をふさいで`], screen: (M, H, B) => [`${M}をどけて、相手の${B}の台をなくした`, `${M}をどけて、相手の${B}の台をなくして`] };
  const DWHY = { guard: (M, H, B, k) => [`相手が${H}を取っても${M}で取り返せるから、取っても相手の得にならないの`, `${H}を取られても、すぐ${M}で取り返せるの。相手は取っても得をしないんだ`, `相手が${H}を取ったら、${M}で取り返せるの。これで取り合いは相手の得にならないよ`][k % 3], line: (M, H, B) => `相手の${B}は、もう${H}に届かないの`, leg: (M, H, B) => `相手の${B}は、もう${H}へ跳べないの`, screen: (M, H, B) => `台がないと、相手の${B}は${H}を取れないの` };
  const DGOOD = [(W, Y) => `ナイス！ ${W}ね。${Y}。その調子！`, (W, Y) => `いいね！ ${W}よ。${Y}。守りもばっちりだコン！`, (W, Y) => `そのとおり！ ${W}の。${Y}。逃げずに守る手、覚えておいて！`, (W, Y) => `ばっちり！ ${W}わけ。これで${Y}。次もこの目でいこう！`, (W, Y) => `お見事！ ${W}んだ。${Y}。ほかの駒が取られる形にもなってないよ！`];
  const DOPEN = ['いっしょに確かめよう。', '惜しかったね、盤をよく見よう。', '', '大丈夫、守りは慣れだコン。', 'これで覚えちゃおう！ '];
  const DRIGHT = [(K, Wt, H) => `正解は${K}。${Wt}、${H}を守れたの。`, (K, Wt, H) => `${K}なら、${Wt}${H}を守れたよ。次はきっと見つかるね！`, (K, Wt, H) => `答えは${K}。${Wt}、${H}を助けられたんだコン。`, (K, Wt, H) => `いちばんは${K}、${Wt}${H}を守る手だったの。`, (K, Wt, H) => `${K}がよかったね。${Wt}おけば、${H}は守れたんだ。`];
  function defendJa(E, s, P, i, ck, n) {
    const v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng');
    const DF = defendFacts(E, p, A), F = DF.F, d0 = DF.d0, H = NM(d0.t, true), AT = NM(d0.by, false), MA0 = NM(T(p.at(E.mFrom(A))), true), MA = MA0 === H ? `別の${MA0}` : MA0;   // (a 馬 guarding a 馬: 「別の馬」)
    const B1 = DF.how === 'guard' ? AT : NM(T(p.at(DF.att.find(a => [4, 5, 6, 3].includes(T(p.at(a)))) != null ? DF.att.find(a => [4, 5, 6, 3].includes(T(p.at(a)))) : DF.att[0])), false);
    const [W, Wt] = (DWAY[DF.how] || DWAY.guard)(MA, H, B1, i), Y = (DWHY[DF.how] || DWHY.guard)(MA, H, B1, i);
    const ng = u0 => { const L = p.moves(), u = u0 != null && u0 !== A && L.includes(u0) ? u0 : L.find(x => x !== A && E.mFrom(x) === d0.s) || L.find(x => x !== A); let w = '';
      if (u != null) { const q = p.clone().play(u), Q = F.danger(q), dd = Q[0], moved = E.mFrom(u) === d0.s, c = !E.isPass(u) && p.at(E.mTo(u)) ? T(p.at(E.mTo(u))) : 0, C = NM(c, false), MT = NM(T(p.at(E.mFrom(u))), true);
        const reach = !moved && F.takers(F.flip(q), d0.s).some(x => E.mFrom(x) === E.mTo(u)), inQ = !moved && Q.some(x => x.s === d0.s), MT2 = MT === H ? `動かした${MT}` : MT, Hs = MT === H ? `ねらわれた${H}` : H;
        if (F.mate1(q)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (dd) { const Lp = (dd.s !== d0.s && dd.s !== E.mTo(u) && NM(dd.t, true) === H ? '別の' : '') + NM(dd.t, true), B = NM(dd.by, false);
          if (moved && dd.s === E.mTo(u)) w = v([`${X}${c ? `で${C}を取って` : 'で'}逃げても、逃げた先の${H}を相手の${B}に取られちゃう。`, `${X}${c ? `で${C}を取って` : 'に'}逃げても、そこには相手の${B}が届くの。${H}が取られる形だコン。`], 1);
          else if (moved) { const V3 = `${X}${c ? `で${C}を取る` : 'の'}逃げ方だと、${Lp}が相手の${B}に取られちゃう。`;
            w = Q.some(x => x.s === E.mTo(u)) ? V3 : v([`${X}${c ? `で${C}を取って` : 'で'}${H}は逃げられるけど、こんどは${Lp}を相手の${B}に取られちゃう。`, `${H}は${X}${c ? `で${C}を取って` : 'で'}逃げきれても、${Lp}が相手の${B}に取られる形になるの。`, V3], 1); }
          else if (c && dd.s === E.mTo(u)) w = v([`${X}で${C}を取っても、${MT2}を相手の${B}に取り返されちゃう。`, `${X}の${C}取りは、${MT2}が相手の${B}に取り返される形なの。`], 1) + (inQ ? `${Hs}も、まだ取られる形のままだよ。` : '');
          else if (dd.s === E.mTo(u)) w = v([`${X}だと、動かした${MT}が相手の${B}に取られちゃう。`, `${X}の行き先には相手の${B}が届くの。${MT2}が取られる形だコン。`], 1) + (inQ ? `${Hs}も、まだ取られる形のままだよ。` : '');
          else if (c && dd.s === d0.s) w = v([`${X}で${C}を取っても、${H}は相手の${B}に取られたままなの。`, `${X}だと${C}は取れるけど、${H}へのねらいは消えないの。相手の${B}に取られちゃう。`], 1);
          else if (dd.s === d0.s && reach) w = v([`${X}で${MT}も${H}に届くけど、相手の${B}に取られる形は変わらないの。取り合いになっても、相手のほうが得をするんだ。`, `${X}で${H}に${MT}のひもをつけても、取り合いは相手の得のまま。${H}は相手の${B}に取られちゃう。`], 1);
          else if (dd.s === d0.s) w = v([`${X}では、ねらわれた${H}を助けられないの。相手の${B}に取られちゃう。`, `${X}を指しても、${H}は相手の${B}に取られたままだコン。`, `${X}だと、${H}へのねらいが消えないの。相手の${B}に取られちゃう。`], 1);
          else if (inQ) w = `${X}だと、${H}へのねらいは消えないし、${Lp}も相手の${B}に取られる形になるの。`;
          else w = v([`${X}で${H}は守れるけど、こんどは${Lp}を相手の${B}に取られちゃう。`, `${X}だと${H}は助かっても、${Lp}が相手の${B}に取られる形になるの。`], 1); } }
      return v(DOPEN) + w + v(DRIGHT, 2)(M, Wt, H); };
    return { ask: v(DASK)(H, AT), hintTx: v(DHINT)(MA0, MA0 === H ? `ねらわれた${H}` : H), good: () => v(DGOOD)(W, Y), ng, own: true };
  }
  function lsJa(E, s, P, i, ck, n) {
    if (s.id === 't_check') return checkJa(E, s, P, i, ck, n || 0);
    if (s.id === 't_capture') return tradeJa(E, s, P, i, ck, n || 0);
    if (s.id === 't_fork') return forkJa(E, s, P, i, ck, n || 0);
    if (s.id === 'b_escape') return escJa(E, s, P, i, ck, n || 0);
    if (s.id === 't_defend') return defendJa(E, s, P, i, ck, n || 0);
    if (MATE[s.id] && ASK[s.id]) return mateJa(E, s, P, i, ck, ['b_mate1', 'm_mate2', 'm_mate3', 'e_rook', 'e_pawn'].indexOf(s.id) + 1);   // (an offset of its own: no two mate steps read the openers in the same order, wherever they sit on the list)
    const id = s.id, K = KIND[id]; if (!K || !ASK[id]) return null; n = n || 0;
    const v = (L, o) => L[(i + n + (o || 0)) % L.length];
    const p = E.Pos.from(P.s), T = E.typeOf, A = P.best, M = ck('ok'), X = ck('ng');
    const cap = m => !E.isPass(m) && p.at(E.mTo(m)) ? T(p.at(E.mTo(m))) : 0, mover = m => T(p.at(E.mFrom(m)));
    const ac = cap(A), AC = NM(ac, false), AV = PTS[ac];
    const good = () => v(GOOD)(AC, AV);
    // the move the words are about: yours, or (when called with the right move) the strongest wrong one
    const wrongOf = u => { if (u != null && u !== A && p.moves().includes(u)) return u; const S = (P.sc || []).slice().sort((a, b) => b[1] - a[1]).map(e => e[0]).filter(x => x !== A);
      return S.find(x => cap(x) && takeBack(E, p, x)) || S.find(x => cap(x)) || S[0]; };
    const ng = u0 => { const u = wrongOf(u0), c = cap(u), C = NM(c, false), V = PTS[c], mt = mover(u), MT = NM(mt, true); let w;
      if (c && takeBack(E, p, u)) w = v([`${X}で${C}を取ると、きみの${MT}を取り返されちゃう。`, `${X}だと${C}は取れるけど、相手が守っているから、すぐに${MT}が取り返されるの。`, `${X}の${C}は相手の駒が守っているから、取った${MT}がそのまま取り返される形だコン。`], 1);
      else if (c) w = v([`${X}の${C}取りは、${AC}取りより得が小さいの。${C}は${V}点で、${AC}は${AV}点だから。`, `でも${X}だと${C}（${V}点）止まり。${AC}は${AV}点もあるんだ。`], 2);
      else w = v([`${X}では駒を取れないの。`, `${X}は駒を取る手じゃないね。`, `${X}だと、ただの${AC}を取りそこねちゃう。`], 3);
      return v(OPEN) + w + v(RIGHT, 2)(M, AC); };
    return { ask: v(ASK[id]), hintTx: v(HINT[id]), good, ng, own: true };
  }
  window.AtlasJanggiLs = { DONE, INTRO, lsJa, NM, PTS, KIND, MATE, escFacts, defendFacts };
})();
