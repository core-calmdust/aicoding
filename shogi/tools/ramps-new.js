// Warm-up ramps for the grades that had none (2026-11-15): k20 k15 k12 k8 k4 k2 k1 d1 d2 d3 rx.
// Same format as tools/ramps.js (merged there). Texts without square names (the 3D boards have no coordinates).
// ja / en written here; the other languages come from ramps-new-tr.json (key '<grade>/<index>/<field>').
'use strict';
const fs = require('fs'), path = require('path');
const TRF = path.join(__dirname, 'ramps-new-tr.json'), TR = fs.existsSync(TRF) ? JSON.parse(fs.readFileSync(TRF, 'utf8')) : {};
const J = (ja, en) => ({ ja, en });

const R = {
  k20: [
    { k: 'explain', sfen: '8k/9/9/9/4R4/9/9/9/4K4 b - 1', arrows: [['5e', '5a'], ['5e', '5h'], ['5e', '9e'], ['5e', '1e']],
      t: J('飛車は縦と横に、どこまでも', 'The rook: straight lines, as far as it likes'),
      body: J('<p>まん中の<b>飛車</b>は、矢印のように<b>縦と横</b>へ、何マスでも進めるよ。<b>角</b>は同じように<b>斜め</b>へどこまでも進めるんだ。</p><p>どちらも、途中に駒があるとそこで止まって、飛びこえることはできないよ。</p>',
        '<p>The <b>rook</b> in the middle moves <b>up, down and sideways</b> as far as it likes, like the arrows. The <b>bishop</b> does the same along the <b>diagonals</b>.</p><p>Neither can jump: a piece in the way stops them.</p>') },
    { k: 'explain', sfen: 'k8/9/9/9/9/1P7/5N1G1/9/3LK4 b - 1', arrows: [['8f', '8e'], ['6i', '6a'], ['4g', '5e'], ['4g', '3e'], ['2g', '2f'], ['2g', '1f'], ['2g', '3f'], ['2g', '1g'], ['2g', '3g'], ['2g', '2h']],
      t: J('歩・香・桂は前へ、金と玉はまわりへ', 'Pawn, lance, knight go forward; gold and king step around'),
      body: J('<p><b>歩</b>は前に1つ、<b>香</b>は前にどこまでも。<b>桂</b>は2つ前の左右へジャンプして、駒を飛びこえられるよ。</p><p><b>金</b>は前・横・後ろと斜め前に1マス、<b>玉</b>はまわりどこへでも1マス動けるよ。</p>',
        '<p>The <b>pawn</b> moves one square forward; the <b>lance</b> goes straight forward as far as it likes. The <b>knight</b> jumps two forward and one to the side — the only piece that can leap over others.</p><p>The <b>gold</b> steps one square forward, sideways, back or diagonally forward: six ways (arrows). The <b>king</b> steps one square in any of the eight directions.</p>') },
    { k: 'explain', sfen: '8k/9/9/4S4/9/9/9/9/4K4 b - 1', seq: ['5d5c+'], marks: [['9c', 'hl'], ['8c', 'hl'], ['7c', 'hl'], ['6c', 'hl'], ['4c', 'hl'], ['3c', 'hl'], ['2c', 'hl'], ['1c', 'hl']],
      t: J('奥の3段に入ったら「成れる」', 'Enter the far three rows and you may promote'),
      body: J('<p>相手側の奥の3段が<b>敵陣</b>だよ（光っている段から奥）。駒が敵陣に入ったり、敵陣で動いたりすると、裏返して<b>成る</b>ことができるんだ。</p><p>今、銀が敵陣に入って<b>成銀</b>になったね。成った銀・桂・香・歩は<b>金と同じ動き</b>になるよ。</p>',
        '<p>The opponent’s far three rows are the <b>promotion zone</b> (the glowing row and beyond). When a piece moves into, inside or out of it, you may flip it over: it <b>promotes</b>.</p><p>The silver just entered the zone and became a <b>promoted silver</b>. A promoted silver, knight, lance or pawn moves <b>like a gold</b>.</p>') },
    { k: 'try', sfen: '9/7g1/9/9/4B4/9/9/k8/4K4 b - 1', goal: 'best', ok: ['5e2b+'], look: ['2b'],
      g: J('角で相手の金を取って、そのまま<b>成って</b>みよう！', 'Take the opponent’s gold with your bishop, and <b>promote</b> it as it lands!'),
      h: J('角は斜めにどこまでも進めるよ。斜めの線の先に、相手の金がいないかな？', 'The bishop slides along diagonals. Is a gold sitting at the end of one?'),
      y: J('金を取って<b>馬</b>に成ったね！ 角は敵陣に入ったら成れるよ。馬は斜めどこまでも＋まわり1マスに動ける、強い駒なんだ。', 'You took the gold and made a <b>horse</b>! A bishop entering the zone may promote; a horse slides diagonally and also steps one square any way.') },
    { k: 'try', sfen: '8k/9/9/4pr3/4S4/9/9/9/4K4 b - 1', goal: 'best', ok: ['5e4d'], look: ['5d', '4d'],
      g: J('銀で取れる駒が2つあるね。価値が高いほうを取ろう！', 'Your silver can take two pieces. Take the more valuable one!'),
      h: J('駒の価値の目安は、歩1・銀5・金6・角8・飛10くらい。銀は前と斜め前に動けるよ。', 'Rough values: pawn 1, silver 5, gold 6, bishop 8, rook 10. A silver moves straight ahead and diagonally forward.'),
      y: J('飛車を取った！ 取れる駒がいくつかあるときは、いちばん価値の高い駒からだね。', 'You took the rook! When several pieces can be taken, start with the most valuable.') },
  ],
  k15: [
    { k: 'explain', sfen: '8k/4g4/4p4/9/9/9/4R2s1/9/4K4 b - 1', arrows: [['5g', '5c'], ['5g', '2g']], marks: [['5c', 'ng'], ['2g', 'ok']],
      t: J('取り返される駒、取り返されない駒', 'Pieces that are defended — and pieces that are not'),
      body: J('<p>飛車は、上の歩も右の銀も取れるよ。でも上の歩は、すぐうしろの<b>金</b>が守っているから、取ると飛車を取り返されちゃう（赤）。</p><p>右の銀はだれにも守られていない<b>タダの駒</b>（緑）。取り返されない駒を取るのが、駒得の基本だよ。</p>',
        '<p>The rook can take the pawn above it or the silver to the right. But the pawn is guarded by the <b>gold</b> behind it: take it and you lose the rook (red).</p><p>The silver is guarded by nobody — a <b>free piece</b> (green). Taking pieces that can’t be taken back is how you win material.</p>') },
    { k: 'try', sfen: '8k/4g4/4p4/9/9/9/4R2s1/9/4K4 b - 1', goal: 'best', ok: ['5g2g'], look: ['2g'],
      g: J('図と同じ局面だよ。取り返されない駒を取ってみよう！', 'The same position. Take the piece that can’t be taken back!'),
      h: J('取ったあと、その駒を相手のだれかが取れるか考えてみて。', 'After the capture, could any opposing piece take yours?'),
      y: J('タダで銀をゲット！ 取る前に「取り返されないか」を見るのがコツだよ。', 'A free silver! Always check “can it be taken back?” before you capture.') },
  ],
  k12: [
    { k: 'explain', sfen: '8k/9/4r4/9/9/9/9/9/4KG3 b - 1', arrows: [['5i', '6h'], ['4i', '5h']], marks: [['5c', 'ng']],
      t: J('王手のかわし方は3つ', 'Three ways out of check'),
      body: J('<p>相手の飛車が、まっすぐ玉をねらっている（<b>王手</b>）。王手はかならず防がないといけないよ。</p><p>方法は3つ。①玉が<b>逃げる</b>、②王手している駒を<b>取る</b>、③間に駒を置いて<b>さえぎる</b>（合駒）。ここでは、玉が横へ逃げるか、金で間をふさげるね（矢印）。</p>',
        '<p>The opponent’s rook is aiming straight at your king: <b>check</b>. A check must always be answered.</p><p>Three ways: ① <b>move</b> the king, ② <b>capture</b> the checking piece, ③ <b>block</b> by putting a piece in between. Here the king can step aside, or the gold can block (arrows).</p>') },
    { k: 'try', sfen: '8k/9/9/9/9/9/5s3/4r4/4KG3 b - 1', goal: 'best', ok: ['4i5h'], look: ['5h'],
      g: J('今度は飛車がすぐ前まで来た！ いちばん良いかわし方は？', 'Now the rook is right in front of your king! What is the best way out?'),
      h: J('取れる駒があれば、取るのがいちばんだよ。玉では取れないけど、ほかの駒ではどうかな？', 'If you can capture the checker, do it. The king can’t — but can another piece?'),
      y: J('金で飛車を取った！ 王手をかわしながら、大きな駒も取れたね。', 'Your gold took the rook — out of check and a big piece won!') },
  ],
  k8: [
    { k: 'try', sfen: '7nk/9/7P1/9/9/9/9/9/4K4 b GS 1', goal: 'mate', n: 1, ok: ['G*2b'], look: ['2b', '1b'],
      g: J('王手のかけ方は5通りあるけど、詰むのは1つだけ。見つけてみよう！', 'There are five ways to give check, but only one mates. Find it!'),
      h: J('玉が逃げられるマスを1つずつ確かめてね。打った駒が取られないかも大事だよ。', 'Check each square the king could flee to — and whether your piece can be taken.'),
      y: J('詰み！ 歩に支えられた金が、逃げ道を全部ふさいだね。', 'Mate! The gold, backed by the pawn, covers every escape.') },
  ],
  k4: [
    { k: 'explain', sfen: 'l1S6/1GP1s3G/2n1b2s1/kpp3n2/p2p2g2/5n1pK/PP2P1P2/1B1P1G3/L8 w R2L6Prsnp 162', seq: ['S*2g', '1f1e', 'R*1d'],
      t: J('取らせてから詰ます', 'Let it be taken — then mate'),
      body: J('<p>3手詰の見本を動かしてみせるね。1手目は、相手に<b>取られる場所へわざと駒を打つ</b>手なんだ。</p><p>取らないと詰む、取ると玉の位置が変わって詰む──この「取らせて詰ます」が<b>捨て駒</b>の考え方だよ。</p>',
        '<p>Watch a sample mate in 3. The first move <b>drops a piece where it can be taken</b> — on purpose.</p><p>If they don’t take, it’s mate; if they do, the king moves and is mated. Letting a piece be taken to mate is the idea of the <b>sacrifice</b>.</p>') },
  ],
  k2: [
    { k: 'explain', sfen: 'lnS6/6+R2/2p1kpp2/p1g1p2+B1/9/2n6/P2PPPPg1/2+r1GK3/L4GS+l1 b SN4Pbsnl4p 99', seq: ['3b6b', '5c4d', 'N*5f', '4d5e', '2d4f'],
      t: J('王手を続けて追いこむ', 'Keep checking and drive the king in'),
      body: J('<p>5手詰の見本だよ。王手をして、相手が逃げて、また王手…と続けて、最後に詰ませるんだ。</p><p>ポイントは、玉を<b>広いほうへ逃がさない</b>こと。逃げ道をせまくする王手を選んでいこうね。</p>',
        '<p>A sample mate in 5: check, the king runs, check again… and finally mate.</p><p>The key is <b>not letting the king escape into open space</b>. Choose checks that shrink its room.</p>') },
  ],
  k1: [
    { k: 'explain', sfen: '7nl/7+B1/2pk1p1sp/3p2p2/5P3/2P5P/2+pP2Pp1/5K3/1+rBG2GNL w 2GSNL3Pr2snl3p 66',
      t: J('候補手をいくつか考える', 'Think of several candidate moves'),
      body: J('<p>中盤では、すぐ目につく手がいちばん良いとはかぎらないよ。まず<b>候補手を2つか3つ</b>あげてみよう。</p><p>それぞれ「相手はどう返す？」まで読んでくらべるのがコツ。王手、駒を取る手、相手の大事な駒をねらう手から探すと見つけやすいよ。</p>',
        '<p>In the middlegame the first move you see isn’t always the best. Start by listing <b>two or three candidate moves</b>.</p><p>Then read each one as far as “how will they reply?” and compare. Checks, captures and threats to important pieces are good places to start looking.</p>') },
  ],
  d1: [
    { k: 'explain', sfen: '3k4l/2g6/n1ppr3p/L3pB1P1/2N2pp2/2P2+l1KP/6P2/1rN4S1/3S1G1+bL w N2P2g2s6p 140', seq: ['S*2e', '2f2e', 'S*1d', '2e3d', 'G*4c', '3d3e', 'G*2e'],
      t: J('最後の形から考える', 'Picture the final position first'),
      body: J('<p>7手詰の見本だよ。長い詰みは、1手目から順に考えるより、<b>最後にどんな形で詰むか</b>を先に思いうかべると見つけやすいんだ。</p><p>捨て駒、逃げ道をふさぐ手、持ち駒を打つ順番。いろいろな手筋の組み合わせを見てね。</p>',
        '<p>A sample mate in 7. With long mates it helps to picture <b>the final mating shape</b> first, rather than thinking from move 1.</p><p>Watch how sacrifices, blocking escape squares and the order of drops combine.</p>') },
  ],
  d2: [
    { k: 'explain', sfen: 'ln5+R1/3k1l3/4pp3/3p5/2P3+b1p/pP6S/2SPPPP2/3G2S2/L+p2KG1NL b R2G3Pbs2n3p 85', seq: ['R*6a', '6b7b', 'G*8b', '7b8b', '6a8a+', '8b9c', '9i9f', 'P*9d', 'N*8e'],
      t: J('持ち駒を使う順番', 'The order of your drops'),
      body: J('<p>9手詰の見本だよ。持ち駒が多いときは、<b>どの駒をどの順番で打つか</b>で、詰むか詰まないかが分かれるんだ。</p><p>一手ごとに、相手のいちばんねばる受けを考えながら進めていこうね。</p>',
        '<p>A sample mate in 9. With many pieces in hand, <b>which piece you drop, and in what order</b>, decides whether it mates.</p><p>At every move, think of the defence that holds out longest.</p>') },
  ],
  d3: [
    { k: 'explain', sfen: 'ln3+R3/2+N3G2/k3S2g1/3S2p2/p8/1PPS1PPp1/P2PP4/3GK1S1l/LN3G3 b BN8Prbl 109', seq: ['N*8e', '9c8c', '4a8a', '8c9d', '8a9a', '9d8c', '9a8a', '8c9d', '8a9b', '9d8d', '6d7e'],
      t: J('長い詰みは、あわてず一手ずつ', 'Long mates: one move at a time'),
      body: J('<p>11手詰の見本だよ。手数が長くても、やっていることは「王手→応手」のくり返しなんだ。</p><p>このステップには、王手ではない<b>静かな好手</b>も出てくるよ。じっと力をためる手が、いちばん強いこともあるんだ。</p>',
        '<p>A sample mate in 11. However long, it is still “check, reply” over and over.</p><p>This step also has <b>quiet moves</b> that aren’t checks. Sometimes a patient move is the strongest.</p>') },
  ],
  rx: [
    { k: 'explain', sfen: '3nkn3/9/4G4/9/9/9/9/9/4K4 b P 1', marks: [['5b', 'ng']],
      t: J('歩を打って詰ませるのは反則', 'Mating with a dropped pawn is illegal'),
      body: J('<p>赤いマスに持ち駒の歩を打つと、玉は逃げられず詰みの形になるね。でも<b>歩を打って詰ませるのは反則</b>（打ち歩詰め）なんだ。</p><p>歩を打って王手するだけならOK。盤の上の歩を動かして詰ませるのもOKだよ。</p>',
        '<p>Drop a pawn on the red square and the king would be trapped. But <b>mating with a dropped pawn is illegal</b> (uchifuzume).</p><p>A pawn drop that only gives check is fine, and so is mating by moving a pawn already on the board.</p>') },
    { k: 'explain', sfen: '4k4/9/9/9/4P4/9/9/9/4K4 b P 1', marks: [['5c', 'ng'], ['5d', 'ng'], ['5f', 'ng'], ['5g', 'ng'], ['5h', 'ng']],
      t: J('同じ列に歩を2枚は置けない', 'Never two pawns in one file'),
      body: J('<p>自分の歩がある縦の列（赤いマス）に、もう1枚歩を打つのは<b>二歩</b>という反則だよ。</p><p>歩を打つときは、その列に自分の歩がないかを確かめてね。</p>',
        '<p>Dropping a second pawn in a file that already has one of your pawns (the red squares) is <b>nifu</b>, a foul.</p><p>Before dropping a pawn, check that file for one of your own.</p>') },
    { k: 'explain', sfen: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',
      t: J('千日手と入玉', 'Repetition and entering kings'),
      body: J('<p>同じ局面が4回あらわれると<b>千日手</b>で引き分け。でも、王手をずっと続けてそうなった場合は、王手をかけた側の負けだよ。</p><p>両方の玉が敵陣に入って詰ませられないときは、駒の点数（飛・角は5点、ほかは1点）で決めるんだ。くわしくは問題の説明を読んでね。</p>',
        '<p>If the same position appears four times it is <b>sennichite</b>, a draw — unless one side was giving check every move: then that side loses.</p><p>When both kings enter the enemy camp and can’t be mated, the game is decided by points (rook and bishop 5, others 1). The problems explain the details.</p>') },
  ],
};
// the other languages
for (const g in R) R[g].forEach((it, i) => ['t', 'body', 'g', 'h', 'y'].forEach(f => { if (it[f]) Object.assign(it[f], TR[`${g}/${i}/${f}`] || {}); }));
module.exports = R;
