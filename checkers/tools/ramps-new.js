// Warm-ups for the checkers lessons that had none (2026-11-15). (2026-11-24 第2期 追14: the e_* warm-ups in lessons.json are the
// verified ones — tools/lesson-verify.js checkers ckWarm; their lessons' problems were rebuilt after, so do not rebuild these from
// problem 1: the warm-up would repeat it, 追1.) Each: explain (the lesson's first problem, the best move
// marked: its piece gold-ringed, its landing square green) → try (the same problem turned 180° with the colours swapped —
// a symmetry of checkers — so the player plays the other side; its answers are the problem's verified ones, turned).
// Texts ja / en here; the other 12 languages in ramps-new-tr.json ({ "<step>/<index>/<field>": { zh, … } }); the try's hint
// is the lesson's own (ls.<step>.hint in i18n.js, all languages). Merged by tools/ramps.js; check_lessons.js trusts
// the turned answers (src: 'turn' — the problems themselves were verified when they were made).
'use strict';
const fs = require('fs'), path = require('path'), E = require('../engine.js');
const TR = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'ramps-new-tr.json'), 'utf8')); } catch (e) { return {}; } })();
const P = (ja, en) => ({ ja, en });
const SW = { b: 'w', w: 'b', B: 'W', W: 'B', '.': '.' };
const turnS = s => ({ b: s.b.split('').reverse().map(c => SW[c]).join(''), side: 3 - s.side });
const turnName = nm => nm.replace(/\d+/g, k => String(33 - +k));

const TEXT = {
  b_move: {
    t: P('進んだ先の「すぐ後ろ」を見る', 'Check the square right behind'),
    body: P('<p>マンは斜め前に1マスずつ進みます。光っている駒を<b>緑のマス</b>へ動かすと、跳び越えた先のマスがないか、ふさがっているので、相手に取られません。</p><p>相手の駒が斜め前にいて、進んだ先のすぐ後ろが空いていると、跳び越えられて取られてしまいます。</p>',
      '<p>A man moves one square diagonally forward. Move the glowing piece to the <b>green square</b>: the square beyond it is off the board or occupied, so it cannot be jumped.</p><p>If an enemy piece is diagonally in front and the square right behind is empty, you get jumped and lose the piece.</p>'),
    g: P('色と向きを入れかえた同じ形。取られない手を指そう。', 'The same shape with colours and sides swapped. Make a safe move.'),
    y: P('正解！そこなら跳び越えられません。', 'Right! No one can jump it there.') },
  b_jump: {
    t: P('取ったあとに取り返されないか', 'After capturing, can they capture back?'),
    body: P('<p>取れる駒があるときは必ず取りますが、どの駒で取るかは選べます。光っている駒で取って<b>緑のマス</b>に着地すると、相手に取り返されません。</p><p>ほかの取り方だと、着地した駒がすぐ取り返されて、得が帳消しになります。</p>',
      '<p>When you can capture you must, but you may choose which piece captures. Capturing with the glowing piece and landing on the <b>green square</b> leaves nothing for the opponent to take back.</p><p>Capture another way and the piece that lands is taken right back — the gain is gone.</p>'),
    g: P('色と向きを入れかえた同じ形。いちばん得になる取り方を。', 'The same shape, colours and sides swapped. Choose the best capture.'),
    y: P('正解！取り返されない取り方です。', 'Right! A capture that cannot be answered.') },
  b_multi: {
    t: P('跳んだ先から、さらに跳ぶ', 'Jump again from where you land'),
    body: P('<p>跳び越えた先からさらに跳べるときは、続けて跳んで何枚も取れます。光っている駒から<b>緑のマス</b>まで、跳べる道をたどってみましょう。</p><p>英国式では取り方を選べます。ここではいちばん多く取れる道を探します。</p>',
      '<p>If you can jump again from where you land, keep going and take several pieces. Trace the path from the glowing piece to the <b>green square</b>.</p><p>In English draughts you may choose your capture; here, find the path that takes the most.</p>'),
    g: P('色と向きを入れかえた同じ形。いちばん多く取ろう。', 'The same shape, colours and sides swapped. Take the most pieces.'),
    y: P('正解！続けて跳んで、たくさん取れました。', 'Right! A chain of jumps took the most.') },
  b_king: {
    t: P('奥の段に着いたらキング', 'Reach the last row and crown a king'),
    body: P('<p>マンが相手側のいちばん奥の段に着くと<b>キング</b>になります。キングは後ろにも動ける強い駒です。</p><p>光っている駒を<b>緑のマス</b>へ進めれば、キングになれて、すぐに取られる心配もありません。</p>',
      '<p>A man that reaches the far row becomes a <b>king</b>, which can move backwards too — a much stronger piece.</p><p>Move the glowing piece to the <b>green square</b>: it is crowned and cannot be taken right away.</p>'),
    g: P('色と向きを入れかえた同じ形。マンをキングにしよう。', 'The same shape, colours and sides swapped. Crown a king.'),
    y: P('正解！キングになりました。', 'Right! You have a king.') },
  b_safe: {
    t: P('ねらわれた駒を守る', 'Save the piece under attack'),
    body: P('<p>このままだと、相手の番に駒を取られてしまう形です。守り方は、逃げる・跳ばれる先のマスをふさぐ・取られても取り返せる形にする、の3つ。</p><p>光っている駒を<b>緑のマス</b>へ動かせば、損をしません。</p>',
      '<p>As it stands, a piece will be taken on the opponent’s turn. You can run, block the landing square, or make sure you can take back.</p><p>Moving the glowing piece to the <b>green square</b> loses nothing.</p>'),
    g: P('色と向きを入れかえた同じ形。駒を守ろう。', 'The same shape, colours and sides swapped. Keep your pieces safe.'),
    y: P('正解！駒をただで取られずにすみました。', 'Right! Nothing is lost for free.') },
  b_win: {
    t: P('全部取るか、動けなくする', 'Take them all, or leave them no move'),
    body: P('<p>相手の駒をすべて取るか、相手が1手も動けない形にすれば勝ちです。</p><p>光っている駒を<b>緑のマス</b>へ動かすと、相手はもう動かせる手がありません。</p>',
      '<p>You win by taking every enemy piece or by leaving the opponent no legal move.</p><p>Move the glowing piece to the <b>green square</b> and the opponent has nothing left to play.</p>'),
    g: P('色と向きを入れかえた同じ形。1手で勝とう。', 'The same shape, colours and sides swapped. Win in one move.'),
    y: P('勝ち！相手はもう動けません。', 'You win! The opponent cannot move.') },
  t_best: {
    t: P('ほかよりはっきり良い一手', 'The one clearly best move'),
    body: P('<p>終盤に近い局面では、ほかの手よりはっきり良い手が一つだけ、ということがよくあります。</p><p>ここでは、光っている駒を<b>緑のマス</b>へ動かすのが決め手。キングを作る、相手の駒を止める、交換で得をする…どれに当たるか考えてみましょう。</p>',
      '<p>Near the endgame there is often just one move that is clearly better than the rest.</p><p>Here it is moving the glowing piece to the <b>green square</b>. Is it making a king, stopping an enemy piece, or winning an exchange?</p>'),
    g: P('色と向きを入れかえた同じ形。決め手を指そう。', 'The same shape, colours and sides swapped. Find the winning idea.'),
    y: P('正解！それが決め手です。', 'Right! That is the key move.') },
  e_kings: {
    t: P('キングの終盤は、勝ちを保つ手が少ない', 'King endings: few moves keep the win'),
    body: P('<p>キングどうしの終盤です。勝てる局面でも、勝ちを保てる手は少ないことがあります。ここでは5つの手のうち2つだけ。</p><p>光っている駒を<b>緑のマス</b>へ動かすのがその一つ。ほかの3つの手は、どれも相手のキングのとなりに入って跳び越され、キングを取られてしまいます。</p>',
      '<p>A king ending. Even when you are winning, few moves keep the win — here only 2 of the 5.</p><p>Moving the glowing piece to the <b>green square</b> is one of them. The other 3 moves all step next to the enemy king, which jumps over and takes that king.</p>'),
    g: P('色と向きを入れかえた同じ形。勝ちを保とう。', 'The same shape, colours and sides swapped. Keep the win.'),
    y: P('正解！勝ちを保てました。', 'Right! The win is kept.') },
  e_men: {
    t: P('マンの終盤は、キング競争と位置取り', 'Men endings: the race to crown and the right squares'),
    body: P('<p>マンが残った終盤では、どちらが先にキングになるかの競争と、相手のマンを止める位置取りが勝負を決めます。</p><p>光っている駒を<b>緑のマス</b>へ動かすのが勝ちにつながる手です。</p>',
      '<p>With men left, the race to crown first and the squares that stop the enemy men decide the game.</p><p>Moving the glowing piece to the <b>green square</b> leads to the win.</p>'),
    g: P('色と向きを入れかえた同じ形。勝ちにつながる手を。', 'The same shape, colours and sides swapped. Play the winning move.'),
    y: P('正解！これで勝ちにつながります。', 'Right! That wins.') },
  e_draw: {
    t: P('劣勢でも、引き分けに持ちこむ', 'Behind? Hold the draw'),
    body: P('<p>劣勢の局面でも、正しく指せば引き分けにできることがあります。負けを避ける手は、たいてい一つか二つだけ。</p><p>ここでは光っているマンが、相手のキングに跳び越されそうです。<b>緑のマス</b>へ進めば、取られずにキングになれます。ほかの手では、このマンを取られて負けてしまいます。</p>',
      '<p>Even when behind, correct play can hold a draw — usually only one or two moves avoid the loss.</p><p>Here the glowing man is about to be jumped by the enemy king. Moving it to the <b>green square</b> crowns it out of danger. Any other move lets that man be taken, and you lose.</p>'),
    g: P('色と向きを入れかえた同じ形。負けない手を指そう。', 'The same shape, colours and sides swapped. Play the move that does not lose.'),
    y: P('正解！これで引き分けに持ちこめます。', 'Right! That holds the draw.') },
};

function build(I18N) {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8')), out = {};
  for (const id in TEXT) {
    const s = D.steps.find(x => x.id === id), Pb = s.problems[0], pos = E.Pos.from(Pb.s), T = TEXT[id];
    let okM = Pb.ok;
    if (!okM) { const best = Math.max(...Pb.sc.map(e => e[1])); okM = Pb.sc.filter(e => e[1] >= best - 6).map(e => e[0]); }
    const okN = okM.map(m => E.name(pos, m)), bestM = Pb.best != null ? Pb.best : okM[0];
    const hint = {}; for (const l in I18N) if (I18N[l]['ls.' + id + '.hint']) hint[l] = I18N[l]['ls.' + id + '.hint'];
    const tx = (j, f) => Object.assign({}, T[f], TR[`${id}/${j}/${f}`] || {});
    out[id] = [
      { k: 'explain', s: Pb.s, marks: [[E.mFrom(bestM) + 1, 'hl'], [E.mTo(bestM) + 1, 'ok']], t: tx(0, 't'), body: tx(0, 'body') },
      { k: 'try', src: 'turn', s: turnS(Pb.s), ok: okN.map(turnName), look: [...new Set(okM.map(m => 33 - (E.mFrom(m) + 1)))], g: tx(1, 'g'), h: hint, y: tx(1, 'y') },
    ];
  }
  return out;
}
module.exports = { TEXT, build };
