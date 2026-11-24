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
  const DONE = ['b_rook', 'b_horse', 'b_pawn'];   // (verified: tools/lesson-verify-janggi.js; the rest are not listed yet)
  const KIND = { b_rook: 5, b_horse: 4, b_elephant: 3, b_cannon: 6, b_pawn: 7 };
  const PTS = [0, 0, 3, 3, 5, 13, 7, 2];
  // the side to move is always 楚 (Cho) in the lessons: its pawn is 卒, the opponent's (漢) is 兵
  const NM = (t, cho) => ['', '将', '士', '象', '馬', '車', '包', cho ? '卒' : '兵'][t] || '駒';
  const INTRO = {
    b_rook: 'わたしはショウギツネ。今日は<b>チャンギ</b>（韓国の将棋）をいっしょにやろう！<br>きみは手前の<b>緑（楚）</b>。相手の<b>将</b>を詰ませたら勝ちのゲームだよ。<br>まずは<b>車</b>から。タテとヨコに、どこまでも進める13点の駒なの。取り返されない駒を、車で取ってみよう！',
    b_horse: '<b>馬</b>は「1つまっすぐ、それから1つななめ」に跳ぶ駒。<br>最初のまっすぐの点（<b>馬の足</b>）に駒があると、そっちへは跳べないの。<br>足がふさがっていない跳び先から、ただの駒を探してみてね！',
    b_cannon: '<b>包</b>はちょっとクセのある駒だコン。<br>動くときも取るときも、タテ・ヨコに<b>ちょうど1つの駒（台）</b>を跳び越えるの。<br>でも<b>包は台にできないし、包を取ることもできない</b>。台を見つけて、ただの駒を取ろう！',
    b_pawn: '<b>卒</b>（相手は<b>兵</b>）は、前かヨコに1歩ずつ進む駒。<br>チャンギには川がないから、はじめからヨコにも動けるんだ。<br>2点の小さな駒だけど、大きな駒をただで取れることもあるコン！',
  };
  const ASK = {
    b_rook: ['車で、取り返されない駒を取ってみて！', '車でただ取りできる駒はどれかな？', 'どの駒なら車で取っても安全？', '車の道の先に、守られていない駒はある？', '取ったあと取り返されない駒を、車で取ろうコン！'],
    b_horse: ['馬で、ただの駒を取ってみて！', '馬の跳び先に、守られていない駒はある？', 'どの駒なら馬で取っても取り返されない？', '馬の足を確かめて、ただの駒を取ろう！', '馬でただ取りできる駒を探してね！'],
    b_cannon: ['包で、ただの駒を取ってみて！', '台を使って取れる、守られていない駒はどれ？', 'どの駒なら包で取っても取り返されない？', '包の台はどこかな？ ただの駒を取ろう！', '包でただ取りできる駒を探してね！'],
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
  function lsJa(E, s, P, i, ck, n) {
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
  window.AtlasJanggiLs = { DONE, INTRO, lsJa, NM, PTS, KIND };
})();
