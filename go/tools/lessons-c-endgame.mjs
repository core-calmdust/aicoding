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
// (2026-11-23 lesson loop) new boards, so that no two problems of the course share a position (the old q2-q4 / q1-q2 were the same
// board with the other side to move, or one stone apart). Values measured with lessons-eng.mjs (strong net, 200/80, komi 7).
const SL = [E9, '..O...O..', E9, '....OOOO.', '.OOOOXXXX', '.XXXXX...', E9, '..X...X..', E9];   // white: sente hane on the left vs gote on the right
const SV = ['...XO....', '...XO....', '.X.XO.O..', '...XO....', '....O....', '.X.XO.O..', '...XO....', E9, E9];   // black: hane at the bottom vs own gap
const ST = ['..XO.....', '..XO..O..', '..XOOO...', '..X..O...', '....XO...', '.X..XOOO.', '....XXXO.', '......XO.', E9];   // white: two sente moves
const HT = [E9, '...OX....', '.O.OX.X..', '...OX....', 'OOOOX....', 'XXXXX.X..', E9, '..X...X..', E9];   // black: first-line hane at the top
const HB = ['....XO...', '....XO...', '..X.XO.O.', '....XO...', '....XO...', '..X.XO.O.', '....XO...', E9, E9];   // white: hane at the bottom
const HS = [E9, '..O...O..', E9, '.OOOOOOOO', '.OXXXXXXX', E9, '...X...X.', E9, E9];   // white: second-line slide down the left side
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
    { rows: SL, turn: 2, ok: ['A4'], line: ['A4', 'A3', 'A5'],
      eng: ENG({ top: [{ m: 'A4', n: 179, lead: 7.77 }, { m: 'J6', n: 17, lead: 5.28 }, { m: 'A5', n: 4, lead: 5.44 }], vals: { A4: 7.95, J6: 5.58, A5: 5.77, A3: 4.71 }, wrong: ['J6', 'A5', 'A3'] }),
      why: { ja: '左端の<bdi>A4</bdi>ハネは、黒が<bdi>A3</bdi>と受けなければならない先手。<bdi>A5</bdi>とツいでも、まだ白の番です。右の<bdi>J6</bdi>はそのあとで打てます。', en: 'The hane at <bdi>A4</bdi> on the left edge is sente: Black must block at <bdi>A3</bdi>. After White connects at <bdi>A5</bdi>, it is still White’s turn, and <bdi>J6</bdi> can wait.' },
      ng: { ja: '右の<bdi>J6</bdi>は自分の側を守るだけの後手。先に打つと、黒に<bdi>A5</bdi>とハネられて左側を押し込まれます（2目以上の損）。', en: '<bdi>J6</bdi> on the right only guards your own side and is gote. Play it first and Black hanes at <bdi>A5</bdi> on the left (over two points lost).' } },
    { rows: SV, turn: 1, ok: ['E2'], good: ['D2'], line: ['E2', 'F2', 'D2'],
      eng: ENG({ top: [{ m: 'E2', n: 145, lead: -12.86 }, { m: 'D2', n: 52, lead: -14.03 }, { m: 'D1', n: 2, lead: -16.42 }, { m: 'E1', n: 1, lead: -17.54 }], vals: { E2: -13.09, D2: -13.91, D5: -17.8, D1: -15.97, E1: -15.43 }, wrong: ['D5', 'D1', 'E1'] }),
      why: { ja: '下の<bdi>E2</bdi>ハネは、白が<bdi>F2</bdi>と受けなければならない先手。<bdi>D2</bdi>とツいでから、自分の壁のすき間<bdi>D5</bdi>を考えれば間に合います（<bdi>D2</bdi>と下がる手もまずまず）。', en: 'The hane at <bdi>E2</bdi> at the bottom is sente: White must block at <bdi>F2</bdi>. Connect at <bdi>D2</bdi>, and there is still time for the gap at <bdi>D5</bdi> in your wall (<bdi>D2</bdi> straight down is also fine).' },
      ng: { ja: 'すき間の<bdi>D5</bdi>をふさぐ手は後手。白に下で先にハネられて、4目以上の損になります。', en: 'Closing the gap at <bdi>D5</bdi> is gote. White then hanes first at the bottom, and Black loses over four points.' } },
    { rows: ST, turn: 2, ok: ['D6', 'G1'], good: ['H1'], line: ['D6', 'D5', 'G1', 'F1', 'H1'],
      eng: ENG({ top: [{ m: 'D6', n: 95, lead: 2.07 }, { m: 'G1', n: 90, lead: 2.01 }, { m: 'H1', n: 15, lead: 1.81 }], vals: { D6: 2.04, G1: 2.05, H1: 1.8, E6: -0.11, D5: 0.37, F1: 0.48 }, wrong: ['E6', 'D5', 'F1'] }),
      why: { ja: '黒の壁のすき間への<bdi>D6</bdi>の押しも、下の<bdi>G1</bdi>のハネも、黒が受けなければならない先手。どちらから打っても、両方打てます（<bdi>H1</bdi>と守る手もまずまず）。', en: 'Both the push into the gap at <bdi>D6</bdi> and the hane at <bdi>G1</bdi> at the bottom are sente: Black must answer each, so White gets to play both (<bdi>H1</bdi> is also fine).' },
      ng: { ja: '<bdi>E6</bdi>は黒が受けなくてよい後手、<bdi>D5</bdi>は深すぎて切られます。黒が受けるしかない手から打ちましょう。', en: '<bdi>E6</bdi> is gote — Black need not answer — and <bdi>D5</bdi> goes too deep and gets cut. Start with the moves Black must answer.' } },
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
    { rows: HT, turn: 1, ok: ['D9'], line: ['D9', 'C9', 'E9'],
      eng: ENG({ top: [{ m: 'D9', n: 195, lead: 35.1 }, { m: 'E9', n: 5, lead: 33.56 }], vals: { D9: 35.13, E9: 33.14, C9: 33.88, F9: 33.06 }, wrong: ['E9', 'F9'] }),
      why: { ja: '上の<bdi>D9</bdi>にハネて、白<bdi>C9</bdi>には<bdi>E9</bdi>とツぎます。白の陣地が1路へり、黒の陣地は守れます。', en: 'Hane at <bdi>D9</bdi> at the top; when White blocks at <bdi>C9</bdi>, connect at <bdi>E9</bdi>. White’s area shrinks by a line and Black’s stays intact.' },
      ng: { ja: '<bdi>E9</bdi>と下がるだけでは、白に<bdi>D9</bdi>と止められて、ハネる権利を白にゆずります（約2目の損）。', en: 'Just descending to <bdi>E9</bdi> lets White block at <bdi>D9</bdi>, and the hane is gone — about two points lost.' } },
    { rows: HB, turn: 2, ok: ['E2'], line: ['E2', 'D2', 'F1'],
      eng: ENG({ top: [{ m: 'E2', n: 191, lead: 1.55 }, { m: 'F2', n: 8, lead: 0.8 }, { m: 'F1', n: 1, lead: -0.08 }], vals: { E2: 1.63, F2: 0.05, E1: 0.24, D2: -3.86, F1: -1.76 }, wrong: ['F2', 'D2', 'F1'] }),
      why: { ja: '下の<bdi>E2</bdi>にハネて、黒<bdi>D2</bdi>には<bdi>F1</bdi>で守ります。黒の陣地が1路へり、白の陣地は守れます。', en: 'Hane at <bdi>E2</bdi> at the bottom; when Black blocks at <bdi>D2</bdi>, guard with <bdi>F1</bdi>. Black’s area shrinks by a line and White’s stays intact.' },
      ng: { ja: '<bdi>F2</bdi>と守るだけでは、黒にハネられる分、約1目半の損。<bdi>D2</bdi>まで深く入ると、黒に切られて取られます。', en: 'Defending at <bdi>F2</bdi> gives Black the hane — about one and a half points lost. Going as deep as <bdi>D2</bdi> gets cut off and captured.' } },
    { rows: M, turn: 1, ok: ['E2'], good: ['F1'], view: [0, 3, 8, 8],
      eng: ENG({ top: [{ m: 'E2', n: 195, lead: -10.17 }, { m: 'F1', n: 4, lead: -11.24 }], vals: { E1: -11.7, D2: -13.81, D1: -13.07, E2: -10.08, F1: -10.76, A5: -15.83, G6: -14.8 }, wrong: ['D2', 'D1', 'G6'] }),
      why: { ja: '二線の黒<bdi>C2</bdi>から<bdi>E2</bdi>と一間にすべり込むのが大きなヨセ。<bdi>D2</bdi>で切られる心配もありません（白は自分がアタリ）。', en: 'From the second-line stone <bdi>C2</bdi>, sliding one space to <bdi>E2</bdi> is the big move. White cannot cut at <bdi>D2</bdi>, because that stone would be in atari itself.' },
      ng: { ja: '<bdi>D2</bdi>のハネは1路しか進めず、3目以上小さい手です。二線は一歩でも深く。', en: 'The hane at <bdi>D2</bdi> advances only one line and is over three points smaller. Go as deep as you safely can on the second line.' } },
    { rows: HS, turn: 2, ok: ['B3'],
      eng: ENG({ top: [{ m: 'B3', n: 164, lead: 17.24 }, { m: 'C3', n: 25, lead: 15.78 }, { m: 'C2', n: 4, lead: 8.92 }, { m: 'B2', n: 4, lead: 16.24 }, { m: 'B4', n: 2, lead: 15.48 }, { m: 'C4', n: 1, lead: 14.26 }], vals: { B3: 17.37, B4: 15.35, C3: 14.92, B2: 15.76, C4: 13.3, A4: 12.25 }, wrong: ['B4', 'C3', 'B2'] }),
      why: { ja: '二線の白<bdi>B5</bdi>から<bdi>B3</bdi>と一間にすべり込むのが大きなヨセ。黒の陣地が大きくへります。', en: 'From the second-line stone at <bdi>B5</bdi>, sliding one space to <bdi>B3</bdi> is the big move. Black’s area shrinks a lot.' },
      ng: { ja: '<bdi>B4</bdi>と1路だけ進む手は2目小さく、<bdi>B2</bdi>まで飛ぶと深すぎて、黒に間を切られます。', en: 'Stepping only to <bdi>B4</bdi> is two points smaller, and jumping as far as <bdi>B2</bdi> is too deep: Black cuts in between.' } },
    { rows: V, turn: 2, ok: ['E2'], good: ['E1'], view: [0, 3, 8, 8],
      eng: ENG({ top: [{ m: 'E2', n: 182, lead: 13.11 }, { m: 'F2', n: 10, lead: 11.34 }], vals: { E2: 13.25, D1: 6.85, E1: 12.43, C1: 8.38, F2: 11.69, C2: 5.17 }, wrong: ['D1', 'C1', 'C2'] }),
      why: { ja: '黒<bdi>D2</bdi>から<bdi>E2</bdi>とハネられる前に、白から<bdi>E2</bdi>と止めます。白の陣地の入り口を閉じる手です。', en: 'Before Black can hane at <bdi>E2</bdi> from <bdi>D2</bdi>, White blocks there first, closing the entrance to White’s area.' },
      ng: { ja: '<bdi>D1</bdi>などで黒の陣地をねらうより、自分の入り口<bdi>E2</bdi>を閉じる方がずっと大きい場面です（6目以上の差）。', en: 'Attacking Black’s side with <bdi>D1</bdi> is far smaller here than closing your own entrance at <bdi>E2</bdi> (over six points).' } },
  ] },
];
