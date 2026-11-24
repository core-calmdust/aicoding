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
  const DONE = ['b_rook', 'b_horse', 'b_pawn', 'b_mate1', 'm_mate2', 'm_mate3'];   // (verified: tools/lesson-verify-janggi.js; the rest are not listed yet)
  const KIND = { b_rook: 5, b_horse: 4, b_elephant: 3, b_cannon: 6, b_pawn: 7 };
  const MATE = { b_mate1: 1, m_mate2: 2, m_mate3: 3 };   // (the mate steps: P.ok = the one first move that mates within n)
  const PTS = [0, 0, 3, 3, 5, 13, 7, 2];
  // the side to move is always 楚 (Cho) in the lessons: its pawn is 卒, the opponent's (漢) is 兵
  const NM = (t, cho) => ['', '将', '士', '象', '馬', '車', '包', cho ? '卒' : '兵'][t] || '駒';
  const INTRO = {
    b_rook: 'わたしはショウギツネ。今日は<b>チャンギ</b>（韓国の将棋）をいっしょにやろう！<br>きみは手前の<b>緑（楚）</b>。相手の<b>将</b>を詰ませたら勝ちのゲームだよ。<br>まずは<b>車</b>から。タテとヨコに、どこまでも進める13点の駒なの。取り返されない駒を、車で取ってみよう！',
    b_horse: '<b>馬</b>は「1つまっすぐ、それから1つななめ」に跳ぶ駒。<br>最初のまっすぐの点（<b>馬の足</b>）に駒があると、そっちへは跳べないの。<br>足がふさがっていない跳び先から、ただの駒を探してみてね！',
    b_cannon: '<b>包</b>はちょっとクセのある駒だコン。<br>動くときも取るときも、タテ・ヨコに<b>ちょうど1つの駒（台）</b>を跳び越えるの。<br>でも<b>包は台にできないし、包を取ることもできない</b>。台を見つけて、ただの駒を取ろう！',
    b_pawn: '<b>卒</b>（相手は<b>兵</b>）は、前かヨコに1歩ずつ進む駒。<br>チャンギには川がないから、はじめからヨコにも動けるんだ。<br>2点の小さな駒だけど、大きな駒をただで取れることもあるコン！',
    b_mate1: 'ここからは<b>詰み</b>の練習だコン。<br>王手をかけて、相手がどう動いても王手をはずせなければ<b>詰み</b>、きみの勝ち！<br>将は<b>九宮</b>から出られないし、九宮の<b>ななめの線</b>も通り道になるの。1手で詰ませてみよう！',
    m_mate2: '今度は<b>2手で詰ます</b>問題。<br>最初の1手のあと、相手がどう受けても<b>次の手で必ず詰む</b>手を探してね。<br>王手から始まるとは限らないよ。逃げ道を先にふさぐ、静かな手もあるんだコン！',
    m_mate3: 'いよいよ<b>3手で詰ます</b>問題だよ。<br>最初の1手のあと、相手のどの受けにも<b>3手目までに必ず詰む</b>続きがある手を選んでね。<br>相手の受けを1つずつ読むのがコツ。自分の将が詰まされないかも、ちゃんと見てね！',
  };
  const ASK = {
    b_rook: ['車で、取り返されない駒を取ってみて！', '車でただ取りできる駒はどれかな？', 'どの駒なら車で取っても安全？', '車の道の先に、守られていない駒はある？', '取ったあと取り返されない駒を、車で取ろうコン！'],
    b_horse: ['馬で、ただの駒を取ってみて！', '馬の跳び先に、守られていない駒はある？', 'どの駒なら馬で取っても取り返されない？', '馬の足を確かめて、ただの駒を取ろう！', '馬でただ取りできる駒を探してね！'],
    b_cannon: ['包で、ただの駒を取ってみて！', '台を使って取れる、守られていない駒はどれ？', 'どの駒なら包で取っても取り返されない？', '包の台はどこかな？ ただの駒を取ろう！', '包でただ取りできる駒を探してね！'],
    b_mate1: ['1手で詰ませてみて！', 'どの王手なら、将がどこへも逃げられない？', '王手をはずす手がなくなる1手はどれかな？', '逃げ道も、王手を防ぐ手もなくす王手を探してね！', '1手で詰む王手、見つけられるかなコン？'],
    m_mate2: ['2手で詰ます最初の1手は？', '相手がどう受けても、次で詰む1手はどれ？', '王手とは限らないよ。次に必ず詰む形を作る手は？', '逃げ道を先にふさぐ手はあるかな？ 2手で詰ませよう！', 'どの受けにも次の詰みが残る1手を探してね！'],
    m_mate3: ['3手で詰ます最初の1手は？', '相手のどの受けにも、3手目までに詰む手はどれ？', '受けを1つずつ読んで、3手で詰ませよう！', '最初の1手のあと、相手はどう受ける？ 3手で詰む手を探してね！', '3手目までに必ず詰む1手、見つけられるかなコン？'],
    b_pawn: ['卒で駒を取ってみて！', '卒の前とヨコに、ただの駒はある？', 'どの駒なら卒で取っても取り返されない？', '小さな卒で、得をする取り方は？', '卒でただ取りできる駒を探してね！'],
  };
  const HINT = {
    b_rook: ['金の輪の車から、タテとヨコをのぞいてみて。どの駒に届く？', '金の輪の車で取れる駒を、ぜんぶ数えてみよう。相手が取り返せないのはどれ？', '車で取ったあと、相手の駒がその点へ届くか確かめてね。届かない駒がねらい目だコン！', '車は、道に駒があるとその先へ進めないの。通り道を1本ずつたどってみて！', '守っている相手の駒がいないのはどれ？ 金の輪の車から、順番に調べよう。'],
    b_horse: ['金の輪の馬の跳び先を、1つずつ数えてみて。どこに届く？', '馬の足（最初のまっすぐの点）に駒があると、その方向へは跳べないの。ふさがっていない跳び先は？', '金の輪の馬が取れる駒のうち、相手が取り返せないのはどれかな？', '馬で取ったあと、相手の駒がその点へ届かないか、確かめてみてね！', '馬の跳び先は8つまで。ふさがった足を除いて、ただの駒を探そうコン！'],
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
    const N = MATE[s.id], v = (L, o) => L[(i + n + (o || 0)) % L.length], T = E.typeOf, p = E.Pos.from(P.s), A = P.best, M = ck('ok'), X = ck('ng');
    const mover = m => NM(T(p.at(E.mFrom(m))), true), AM = mover(A), ckd = m => p.clone().play(m).inCheck(), aq = !ckd(A);
    // how the general gets out of the check u gives (the opponent's legal replies)
    const esc = u => { const q = p.clone().play(u), R = q.moves().filter(x => !E.isPass(x));
      if (R.some(x => T(q.at(E.mFrom(x))) === E.KING)) return '将が逃げられ';
      if (R.some(x => E.mTo(x) === E.mTo(u))) return `王手した${mover(u)}を取られ`;
      return 'ほかの駒を動かして王手を防がれ'; };
    const lose = u => { const q = p.clone().play(u); return q.moves().some(x => q.clone().play(x).status() === -1); };
    const nCk = p.moves().filter(ckd).length, nRe = p.clone().play(A).moves().filter(x => !E.isPass(x)).length;
    const good = () => N === 1 ? v(MGOOD[1])(AM, nCk) : v(MGOOD[aq ? 'q' : 'c'])(AM, N, nRe);
    // the move the words are about: yours, or (when called with the right move) the most tempting wrong one — a check that fails
    const wrongOf = u => { const L = p.moves(); if (u != null && u !== A && L.includes(u)) return u; return L.find(x => x !== A && ckd(x)) || L.find(x => x !== A); };
    const ng = u0 => { const u = wrongOf(u0); let w = '';
      if (u != null) {
        if (N > 1 && lose(u)) w = v([`${X}だと、相手に1手で詰まされちゃう！ 自分の将の守りも見てね。`, `${X}のあと、相手には1手で詰ませる手があるの。こっちの将が先に詰んじゃう！`], 1);
        else if (!ckd(u)) w = N === 1 ? v([`${X}は王手になっていないから、詰みにならないの。`, `${X}だと王手がかからないね。1手で詰ますには王手が必要だコン。`], 1)
          : v([`${X}だと、相手にうまく受けられて、${N}手では詰まないの。`, `${X}のあとは、相手にしのぐ受けがあって、${N}手では詰まないんだ。`], 1);
        else { const e = esc(u); w = N === 1 ? v([`${X}は王手だけど、${e}ちゃうから詰みじゃないの。`, `${X}で王手しても、${e}るの。それだと詰みにならないね。`, `${X}の王手は惜しいけど、${e}るから詰まないんだ。`, `${X}は王手をかけても、${e}ちゃう形。だから詰みにならないコン。`, `${X}だと王手はかかるけど、${e}るから、まだ詰みじゃないの。`], 3)
          : v([`${X}は王手だけど、${e}て、${N}手では詰まないの。`, `${X}で王手しても、${e}るから、${N}手では詰まないね。`, `${X}の王手は惜しいけど、${e}て、${N}手では詰まないコン。`, `${X}は王手をかけても、${e}ちゃう。それで${N}手では詰まないんだ。`, `${X}だと王手はかかるけど、${e}るから、${N}手では詰まないの。`], 3); }
      }
      const R = N === 1 ? v(MRIGHT[1], 2)(M, AM, nCk) : v(MRIGHT[2], 2)(M, AM, N, aq);
      return v(MOPEN) + w + R; };   // (the mate steps' own openers: not the capture steps' in the same order)
    return { ask: v(ASK[s.id]), hintTx: v(MHINT[N])(AM), good, ng, own: true };
  }
  function lsJa(E, s, P, i, ck, n) {
    if (MATE[s.id] && ASK[s.id]) return mateJa(E, s, P, i, ck, n || 0);
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
  window.AtlasJanggiLs = { DONE, INTRO, lsJa, NM, PTS, KIND, MATE };
})();
