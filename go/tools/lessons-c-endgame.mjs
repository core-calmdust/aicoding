// Lessons — course "endgame" (ヨセ). 9x9 positions with settled groups; every answer measured with lessons-eng.mjs
// (strong net, 200 visits at the root and 80 visits after each candidate, komi 7). `eng.vals` = the mover's score lead
// after each candidate (points). Wrong moves listed in eng.wrong must lose at least eng.gap points.
export const course = {
  id: 'endgame',
  title: { ja: 'ヨセ', en: 'Endgame' },
  sub: { ja: '先手と後手、ハネツギ、二線のヨセ', en: 'Sente and gote, hane-and-connect, second-line moves' },
};
const E9 = '.........';
const H = [E9, E9, '..O...O..', E9, '.OOOOOOOO', '.XXXXXXXX', E9, '..X...X..', E9];
const Hg = [E9, E9, '..O...O..', E9, '.OOOOOOOO', '.XXX.XXXX', E9, '..X...X..', E9];
const H3 = [E9, E9, '..O...O..', E9, '.OOOOOOOO', '.XXXXXXX.', E9, '..X...X..', E9];
const Hgg = [E9, E9, '..O...O..', E9, '.OOOOOOOO', '.XX...XXX', E9, '..X...X..', E9];
const V = ['...XO....', '...XO....', '...XO..O.', '...XO....', '.X.XO....', '...XO....', '...XO..O.', '...X.....', E9];
const M = ['...XO....', '...XO..O.', '...XO....', '...XO....', '.X.XO....', '...XO....', '..XXOOOOO', '..X......', E9];
const ENG = (o) => Object.assign({ komi: 7, visits: '200/80', gap: 1.5 }, o);
export const steps = [
// ------------------------------------------------------------------ 1
{ id: 'sente', course: 'endgame',
  title: { ja: '先手と後手のヨセ', en: 'Sente and gote endgame' },
  sub: { ja: '相手が受けるヨセから先に打つ', en: 'Play the moves your opponent must answer first' },
  intro: {
    ja: '<p>終盤、境界線を決めていく打ち合いを<b>ヨセ</b>といいます。</p><p>打ったあと相手が受けなければならず、もう一度自分の番が来る手を<b>先手</b>、相手が受けなくてよい手を<b>後手</b>といいます。先手のヨセは「ただで打てる」ので、同じくらいの大きさなら<b>先手から先に打つ</b>のが基本です。</p><p>自分の陣地のすき間をふさぐ手は後手になりがち。あわてず、先に相手の境界をハネる手がないか探しましょう。</p>',
    en: '<p>The late stage of the game, where the borders are settled, is called the <b>endgame</b> (yose).</p><p>A move the opponent must answer, so that you get to play again, is <b>sente</b>; a move the opponent can ignore is <b>gote</b>. Sente moves are “free”, so as a rule, <b>play sente moves first</b> when the sizes are similar.</p><p>Closing a gap in your own wall is usually gote. Before doing that, look for a hane on the opponent’s border.</p>' },
  goal: { ja: '一番大きいヨセを打ってください', en: 'Play the biggest endgame move' },
  hint: { ja: '相手が必ず受けるハネはどこでしょう？', en: 'Which hane must the opponent answer?' },
  diagram: { rows: H3, marks: [['A5', 'ok'], ['J4', 'x']], arrows: [['B4', 'A5']] },
  problems: [
    { rows: H3, turn: 1, ok: ['A5'], line: ['A5', 'A6', 'A4'],
      eng: ENG({ top: [{ m: 'A5', n: 188, lead: -13.5 }, { m: 'J4', n: 10, lead: -17.62 }], vals: { A5: -13.61, J4: -16.97, A4: -16.14, J3: -18.69, E3: -22.59 }, wrong: ['J4', 'A4', 'J3'] }),
      why: { ja: '<bdi>A5</bdi>のハネは白が<bdi>A6</bdi>と受けなければならない先手。<bdi>A4</bdi>とついでも、まだ黒の番です。右の<bdi>J4</bdi>はそのあとで打てます。', en: 'The hane at <bdi>A5</bdi> is sente: White must block at <bdi>A6</bdi>. After Black connects at <bdi>A4</bdi>, it is still Black’s turn, and <bdi>J4</bdi> can be played afterwards.' },
      ng: { ja: '<bdi>J4</bdi>は後手の手。先に打つと、白に<bdi>A4</bdi>とハネられて左側を押し込まれます（約3目の損）。', en: '<bdi>J4</bdi> is gote. Playing it first lets White hane at <bdi>A4</bdi> on the left (about 3 points lost).' } },
    { rows: H3, turn: 2, ok: ['A4'], line: ['A4', 'A3', 'A5'],
      eng: ENG({ top: [{ m: 'A4', n: 156, lead: 23.4 }, { m: 'J4', n: 39, lead: 19.87 }], vals: { A4: 23.08, J4: 19.67, A5: 20.68, J3: 16.82, E6: 14.11 }, wrong: ['J4', 'A5', 'J3'] }),
      why: { ja: '白も左端の<bdi>A4</bdi>ハネが先手で一番大きい手。黒<bdi>A3</bdi>なら<bdi>A5</bdi>とツいで、まだ白の番です。', en: 'For White too, the hane at <bdi>A4</bdi> on the left edge is sente and the biggest move. After Black blocks at <bdi>A3</bdi>, White connects at <bdi>A5</bdi> and keeps the move.' },
      ng: { ja: '右の<bdi>J4</bdi>の押しは、<bdi>A4</bdi>のハネより3目以上小さい手です。', en: 'The push at <bdi>J4</bdi> on the right is more than three points smaller than the hane at <bdi>A4</bdi>.' } },
    { rows: Hg, turn: 1, ok: ['A5'], line: ['A5', 'A6', 'A4'],
      eng: ENG({ top: [{ m: 'A5', n: 195, lead: -14.05 }, { m: 'A4', n: 4, lead: -15.7 }], vals: { A5: -14.01, E4: -17.06, A4: -15.84, E3: -18.53, A6: -16.38 }, wrong: ['E4', 'A6', 'E3'] }),
      why: { ja: '自分の壁のすき間<bdi>E4</bdi>は気になりますが、まずは先手の<bdi>A5</bdi>ハネ。白が受けたら、ゆっくり<bdi>E4</bdi>をふさげます。', en: 'The gap at <bdi>E4</bdi> in Black’s wall is tempting, but first play the sente hane at <bdi>A5</bdi>. After White answers, Black can still close <bdi>E4</bdi>.' },
      ng: { ja: '<bdi>E4</bdi>は後手。白に<bdi>A4</bdi>とハネられると、黒の損は3目ほどになります。', en: '<bdi>E4</bdi> is gote. If White then hanes at <bdi>A4</bdi>, Black loses about three points.' } },
    { rows: Hg, turn: 2, ok: ['A4', 'E4'], line: ['A4', 'A3', 'A5'],
      eng: ENG({ top: [{ m: 'A4', n: 130, lead: 18.98 }, { m: 'E4', n: 67, lead: 18.4 }], vals: { A4: 19.01, E4: 18.66, A5: 17.18, E3: 16.66, A3: 16.81 }, wrong: ['A5', 'E3', 'A3'] }),
      why: { ja: '白から見ると、<bdi>A4</bdi>のハネも、すき間への<bdi>E4</bdi>の押しも、黒が受けなければならない先手。どちらから打っても正解です。', en: 'From White’s side both the hane at <bdi>A4</bdi> and the push into the gap at <bdi>E4</bdi> are sente — Black must answer each. Either one is correct.' },
      ng: { ja: '<bdi>A5</bdi>と自分の側を守る手は後手で、2目ほど小さくなります。', en: 'Defending your own side at <bdi>A5</bdi> is gote and about two points smaller.' } },
    { rows: Hgg, turn: 1, ok: ['E3'], good: ['D4', 'F4'],
      eng: ENG({ top: [{ m: 'E3', n: 145, lead: -24.18 }, { m: 'D3', n: 24, lead: -27.05 }, { m: 'F3', n: 12, lead: -26.67 }], vals: { A5: -28.16, E4: -26.84, D4: -24.7, F4: -25.15, A4: -30.19, E3: -24.43, D3: -26.99 }, wrong: ['A5', 'A4', 'D3'] }),
      why: { ja: '黒の壁に3路の大きなすき間があります。ここに白が入ってくると被害が大きいので、後手でも<bdi>E3</bdi>（または<bdi>D4</bdi>・<bdi>F4</bdi>）で守るのが一番大きい手です。', en: 'Black’s wall has a wide three-point gap. A White intrusion there would cost a lot, so defending with <bdi>E3</bdi> (or <bdi>D4</bdi>, <bdi>F4</bdi>) is the biggest move even though it is gote.' },
      ng: { ja: '先手のハネ<bdi>A5</bdi>より、大きな後手が優先する場面です（約4目の差）。「先手から」は、大きさが同じくらいのときの原則です。', en: 'Here a big gote move beats the sente hane at <bdi>A5</bdi> (about four points). “Sente first” applies when the sizes are similar.' } },
  ] },
// ------------------------------------------------------------------ 2
{ id: 'hane', course: 'endgame',
  title: { ja: 'ハネツギと二線のヨセ', en: 'Hane-and-connect, second-line moves' },
  sub: { ja: '一線・二線は一歩でも深く', en: 'On the edge, every step counts' },
  intro: {
    ja: '<p>境界が決まっていない端では、<b>ハネてツぐ</b>（ハネツギ）のが基本のヨセです。ハネた石が相手の陣地を1路へこませ、ツいで自分の石をしっかりさせます。</p><p>自分の側に下がって守るだけの手は、相手にハネられる分だけ損をします。ハネは<b>相手より先に</b>打つことが大切です。</p><p>二線の石があるときは、相手の陣地へ<b>二線をすべり込む</b>手も大きなヨセ。逆に守る側は、二線で<b>止める</b>のが急所です。</p>',
    en: '<p>Where a border is still open at the edge, the basic endgame move is <b>hane and connect</b>: the hane dents the opponent’s area by one line and the connection keeps your stones safe.</p><p>Simply drawing back on your own side loses the point your opponent then gains with their hane. Play the hane <b>before the opponent does</b>.</p><p>With a stone on the second line, <b>sliding along the second line</b> into the opponent’s area is a big move too; the defender’s key point is to <b>block it on the second line</b>.</p>' },
  goal: { ja: '境界の一番よいヨセを打ってください', en: 'Find the best endgame move on the border' },
  hint: { ja: '守るより、相手の側へ一歩踏み込めないか考えましょう。', en: 'Instead of defending, can you step one line into the opponent’s side?' },
  diagram: { rows: H, marks: [['A5', 'ok'], ['A4', 'x']], arrows: [['B4', 'A5']] },
  problems: [
    { rows: H, turn: 1, ok: ['A5'], line: ['A5', 'A6', 'A4'],
      eng: ENG({ top: [{ m: 'A5', n: 195, lead: -12.79 }, { m: 'A4', n: 5, lead: -13.79 }], vals: { A5: -12.51, A4: -15.07, A3: -14.93, A6: -14.5, E3: -16.75, E6: -15.84 }, wrong: ['A4', 'A3', 'E3'] }),
      why: { ja: '<bdi>A5</bdi>とハネて、白<bdi>A6</bdi>には<bdi>A4</bdi>とツぎます。白の陣地が1路減り、黒の陣地は守れます。', en: 'Hane at <bdi>A5</bdi>; when White blocks at <bdi>A6</bdi>, connect at <bdi>A4</bdi>. White’s area shrinks by a line and Black’s stays intact.' },
      ng: { ja: '<bdi>A4</bdi>と守るだけでは、白に<bdi>A5</bdi>とハネられたのと同じ形に近く、2目半ほど損です。', en: 'Just defending at <bdi>A4</bdi> loses about two and a half points compared with the hane.' } },
    { rows: H, turn: 2, ok: ['A4'], half: ['A3'], line: ['A4', 'A3', 'A5'],
      eng: ENG({ top: [{ m: 'A4', n: 191, lead: 17.1 }, { m: 'A5', n: 8, lead: 15.05 }], vals: { A4: 17.11, A5: 15.12, A6: 15.11, A3: 15.96, E3: 12.2, E6: 12.76 }, wrong: ['A5', 'A6', 'E3'] }),
      why: { ja: '白も同じく<bdi>A4</bdi>とハネ、黒<bdi>A3</bdi>なら<bdi>A5</bdi>とツぎます。先にハネた方が得をします。', en: 'White also hanes, at <bdi>A4</bdi>; after Black blocks at <bdi>A3</bdi>, White connects at <bdi>A5</bdi>. Whoever hanes first gains.' },
      ng: { ja: '<bdi>A5</bdi>と守ると、逆に黒に<bdi>A5</bdi>側からハネられる分（約2目）損をします。', en: 'Defending at <bdi>A5</bdi> lets Black gain the hane instead — about two points lost.' } },
    { rows: M, turn: 1, ok: ['E2'], good: ['F1'], view: [0, 3, 8, 8],
      eng: ENG({ top: [{ m: 'E2', n: 195, lead: -10.17 }, { m: 'F1', n: 4, lead: -11.24 }], vals: { E1: -11.7, D2: -13.81, D1: -13.07, E2: -10.08, F1: -10.76, A5: -15.83, G6: -14.8 }, wrong: ['D2', 'D1', 'G6'] }),
      why: { ja: '二線の黒<bdi>C2</bdi>から<bdi>E2</bdi>と一間にすべり込むのが大きなヨセ。<bdi>D2</bdi>で切られる心配もありません（白は自分がアタリ）。', en: 'From the second-line stone <bdi>C2</bdi>, sliding one space to <bdi>E2</bdi> is the big move. White cannot cut at <bdi>D2</bdi>, because that stone would be in atari itself.' },
      ng: { ja: '<bdi>D2</bdi>のハネは1路しか進めず、3目以上小さい手です。二線は一歩でも深く。', en: 'The hane at <bdi>D2</bdi> advances only one line and is over three points smaller. Go as deep as you safely can on the second line.' } },
    { rows: M, turn: 2, ok: ['E2'], good: ['E1'], view: [0, 3, 8, 8],
      eng: ENG({ top: [{ m: 'E2', n: 153, lead: 15.99 }, { m: 'E1', n: 38, lead: 15.48 }], vals: { D2: 11.8, D1: 13.18, C1: 12.03, E1: 15.68, E2: 16.16, A5: 9.57, G6: 10.13 }, wrong: ['D2', 'D1', 'C1'] }),
      why: { ja: '同じ形で白番。<bdi>E2</bdi>で黒の二線のすべり込みを止めるのが急所です。', en: 'The same shape with White to play: <bdi>E2</bdi> blocks Black’s slide along the second line.' },
      ng: { ja: '<bdi>D2</bdi>とハネると白石はダメが少なく、逆に黒に攻められて4目ほど損をします。', en: 'The hane at <bdi>D2</bdi> is short of liberties; Black hits back and White loses about four points.' } },
    { rows: V, turn: 2, ok: ['E2'], good: ['E1'], view: [0, 3, 8, 8],
      eng: ENG({ top: [{ m: 'E2', n: 182, lead: 13.11 }, { m: 'F2', n: 10, lead: 11.34 }], vals: { E2: 13.25, D1: 6.85, E1: 12.43, C1: 8.38, F2: 11.69, C2: 5.17 }, wrong: ['D1', 'C1', 'C2'] }),
      why: { ja: '黒<bdi>D2</bdi>から<bdi>E2</bdi>とハネられる前に、白から<bdi>E2</bdi>と止めます。白の陣地の入り口を閉じる手です。', en: 'Before Black can hane at <bdi>E2</bdi> from <bdi>D2</bdi>, White blocks there first, closing the entrance to White’s area.' },
      ng: { ja: '<bdi>D1</bdi>などで黒の陣地をねらうより、自分の入り口<bdi>E2</bdi>を閉じる方がずっと大きい場面です（6目以上の差）。', en: 'Attacking Black’s side with <bdi>D1</bdi> is far smaller here than closing your own entrance at <bdi>E2</bdi> (over six points).' } },
  ] },
];
