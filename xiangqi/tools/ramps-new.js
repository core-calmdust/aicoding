// Warm-ups for the Xiangqi lessons that had none (2026-11-15). Each: explain (the lesson's first problem, the best move
// marked: its piece glowing, its target point green) → try (the same problem mirrored left↔right — a symmetry of xiangqi —
// whose answers are the problem's verified ones, mirrored). Texts ja / en here; the other 12 languages in ramps-new-tr.json
// ({ "<step>/<index>/<field>": { zh, … } }); the try's hint is the lesson's own (ls.<step>.hint, all languages).
// Merged by tools/ramps.js; check_lessons.js trusts the mirrored answers (src: 'mirror').
'use strict';
const fs = require('fs'), path = require('path'), E = require('../engine.js');
const TR = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'ramps-new-tr.json'), 'utf8')); } catch (e) { return {}; } })();
const P = (ja, en) => ({ ja, en });
const mirFen = fen => { const [b, ...rest] = fen.split(' '); return [b.split('/').map(r => r.replace(/\d/g, d => '.'.repeat(+d)).split('').reverse().join('').replace(/\.+/g, m => String(m.length))).join('/'), ...rest].join(' '); };
const mirSq = q => String.fromCharCode(105 - (q.charCodeAt(0) - 97)) + q.slice(1);   // a↔i
const mirMv = m => mirSq(m.slice(0, 2)) + mirSq(m.slice(2, 4));

const G = (ja, en) => P('左右を反対にした同じ形。' + ja, 'The same shape, mirrored. ' + en);
const TEXT = {
  b_rook: { t: P('車は縦横にどこまでも', 'The chariot runs any distance straight'),
    body: P('<p>車は縦と横に、何マスでも進めます。光っている車を<b>緑の点</b>へ動かすと、相手の駒を取れます。</p><p>取ったあと、相手に取り返されないか（その駒が守られていないか）も確かめましょう。</p>',
      '<p>The chariot moves straight along files and ranks, any distance. Move the glowing chariot to the <b>green point</b> to capture.</p><p>Check that the opponent cannot take back — that the piece was not protected.</p>'),
    g: G('車でただの駒を取ろう。', 'Win a free piece with the chariot.'), y: P('正解！取り返されない駒を取りました。', 'Right! A piece that cannot be won back.') },
  b_horse: { t: P('馬は「まっすぐ1つ＋ななめ1つ」', 'The horse: one straight, one diagonal'),
    body: P('<p>馬は1つまっすぐ進んでから、1つななめに跳びます。最初のまっすぐの点（<b>馬の足</b>）に駒があると、その方向へは跳べません。</p><p>光っている馬は、<b>緑の点</b>へ跳んで駒を取れます。馬の足はふさがっていません。</p>',
      '<p>The horse goes one point straight, then one diagonally. If the first straight point (the <b>horse’s leg</b>) is occupied, it cannot jump that way.</p><p>The glowing horse can jump to the <b>green point</b> and capture; its leg is free.</p>'),
    g: G('馬でただの駒を取ろう。', 'Win a free piece with the horse.'), y: P('正解！馬の足もふさがっていませんね。', 'Right! And its leg was not blocked.') },
  b_cannon: { t: P('炮は、1つ飛び越えて取る', 'The cannon captures over one piece'),
    body: P('<p>炮は車と同じように動きますが、取るときだけ、間にちょうど1つの駒（<b>炮台</b>）を飛び越えます。炮台は敵でも味方でもかまいません。</p><p>光っている炮は、炮台を飛び越えて<b>緑の点</b>の駒を取れます。</p>',
      '<p>The cannon moves like a chariot, but to capture it must jump exactly one piece in between (the <b>screen</b>) — friend or foe.</p><p>The glowing cannon jumps its screen to take the piece on the <b>green point</b>.</p>'),
    g: G('炮台を使って、ただの駒を取ろう。', 'Use a screen to win a free piece.'), y: P('正解！炮台を飛び越えて取りました。', 'Right! It jumped the screen to capture.') },
  b_pawn: { t: P('兵は前へ、川を渡ると横へも', 'The soldier goes forward — and sideways after the river'),
    body: P('<p>兵（卒）は1つ前へ進みます。川を渡ると、横にも1つ動けるようになります。後ろには戻れません。</p><p>光っている兵で<b>緑の点</b>の駒を取れます。小さな駒でも、大きな駒をただで取れることがあります。</p>',
      '<p>A soldier moves one point forward; after crossing the river it may also step sideways. It never moves back.</p><p>The glowing soldier can take the piece on the <b>green point</b> — a small piece can win a big one for free.</p>'),
    g: G('兵（卒）で駒を取ろう。', 'Capture with a soldier.'), y: P('正解！兵で駒を取りました。', 'Right! The soldier captured.') },
  b_escape: { t: P('ねらわれた駒を、安全な場所へ', 'Move the attacked piece to safety'),
    body: P('<p>光っている駒が、相手にねらわれています。このままだと次に取られてしまいます。</p><p><b>緑の点</b>へ逃げれば、もうねらわれません。逃げた先でまたねらわれないかも確かめましょう。</p>',
      '<p>The glowing piece is under attack and will be taken next move.</p><p>Flee to the <b>green point</b> and it is safe. Always check the new square is not attacked too.</p>'),
    g: G('ねらわれた駒を逃がそう。', 'Save the attacked piece.'), y: P('正解！安全な場所へ逃げました。', 'Right! It is safe there.') },
  b_mate1: { t: P('王手をかけて、逃げ道をなくす', 'Check, with no way out'),
    body: P('<p>王手をかけて、相手がどうやっても王手をはずせなければ<b>詰み</b>で勝ちです。將（帥）は九宮から出られないので、逃げ道は少ししかありません。</p><p>光っている駒を<b>緑の点</b>へ動かすと詰みです。</p>',
      '<p>Give check so that nothing can stop it: that is <b>checkmate</b>, and you win. The general cannot leave its palace, so it has few escapes.</p><p>Moving the glowing piece to the <b>green point</b> is mate.</p>'),
    g: G('1手で詰ませよう。', 'Mate in one.'), y: P('詰み！あなたの勝ちです。', 'Checkmate — you win!'),
    // (2026-11-24 第2期) its own position: the lesson's first problem is not repeated, and this is a real check-mate (the old one was a stalemate)
    from: { s: '4k4/1R2c4/5a3/C8/5c3/9/2p6/9/9/3K5 w', ok: [100], best: 100 } },
  t_capture: { t: P('自分より価値の高い駒を取る', 'Take a piece worth more than yours'),
    body: P('<p>守られている駒でも、自分の駒より価値が高ければ取る価値があります。目安は、車9・炮4.5・馬4・仕と相2・兵1（川を渡ると2）。</p><p>光っている駒で<b>緑の点</b>の駒を取ると、取り返されても得をします。</p>',
      '<p>Even a protected piece is worth taking if it is worth more than yours. Rough values: chariot 9, cannon 4.5, horse 4, advisor and elephant 2, soldier 1 (2 across the river).</p><p>Take the piece on the <b>green point</b> with the glowing piece: even if it is taken back, you gain.</p>'),
    g: G('得になる取り方を見つけよう。', 'Find the profitable capture.'), y: P('正解！取り返されても得をします。', 'Right! You gain even if it is taken back.') },
  t_check: { t: P('王手のついでに駒得', 'Win material with a check'),
    body: P('<p>相手は王手を必ず受けなければなりません。その間に、別の駒を取る準備ができる王手はとても強い手です。</p><p>光っている駒を<b>緑の点</b>へ動かして王手。相手が受けている間に、駒を取れます。</p>',
      '<p>A check must be answered. A check that also sets up a capture is a very strong move.</p><p>Move the glowing piece to the <b>green point</b> with check; while the opponent deals with it, you win a piece.</p>'),
    g: G('王手をかけて駒得しよう。', 'Check and win material.'), y: P('正解！王手を受けている間に駒を取れます。', 'Right! You capture while they answer the check.') },
  t_defend: { t: P('相手のねらいを先に防ぐ', 'Stop the threat first'),
    body: P('<p>相手の次の手を考えましょう。ただで取られそうな駒があるなら、守るか、間に駒を入れて防ぎます。</p><p>ここでは光っている駒を<b>緑の点</b>へ動かすと、相手のねらいを防げます。</p>',
      '<p>Think about the opponent’s next move. If a piece is about to be taken for free, protect it or block the line.</p><p>Here, moving the glowing piece to the <b>green point</b> stops the threat.</p>'),
    g: G('相手のねらいを防ごう。', 'Stop the threat.'), y: P('正解！相手のねらいを防ぎました。', 'Right! The threat is stopped.') },
  m_mate2: { t: P('次で必ず詰む1手目', 'A first move that mates next turn'),
    body: P('<p>相手がどう受けても、次の手で必ず詰む。そんな最初の1手を探します。王手から始まるとは限りません。</p><p>ここでは光っている駒を<b>緑の点</b>へ。相手のどの受けにも、次の詰みが待っています。</p>',
      '<p>Find a first move after which every reply allows mate. It need not be a check.</p><p>Here, the glowing piece goes to the <b>green point</b>; every answer runs into mate.</p>'),
    g: G('2手で詰ませる最初の手を。', 'Find the first move of a mate in two.'), y: P('正解！どう受けても次で詰みます。', 'Right! Mate follows whatever they do.') },
  e_rook: { t: P('帥で筋を押さえ、車でせばめる', 'General holds a file, chariot squeezes'),
    body: P('<p>車と帥だけでも、士に守られた將を詰ませられます。帥で筋を押さえ、車で將の動ける場所を少しずつ減らすのがコツです。</p><p>ここでは光っている駒を<b>緑の点</b>へ動かすのが、いちばん早く詰みに近づく手です。</p>',
      '<p>A chariot and the general can mate a general guarded by advisors. Hold a file with your general and squeeze the enemy general’s room with the chariot.</p><p>Here, the glowing piece to the <b>green point</b> is the fastest way toward mate.</p>'),
    g: G('詰みに向かういちばん良い手を。', 'Play the best move toward mate.'), y: P('正解！いちばん早く詰みに近づきます。', 'Right! The quickest way to mate.') },
  e_pawn: { t: P('兵は九宮で強くなる', 'Soldiers grow strong in the palace'),
    body: P('<p>川を渡った兵は、九宮に入ると強い駒になります。兵は後ろに戻れないので、奥まで進めすぎないのがコツ。帥のにらみも使いましょう。</p><p>ここでは光っている駒を<b>緑の点</b>へ動かすのが、いちばん良い手です。</p>',
      '<p>A soldier across the river becomes strong inside the palace. It cannot go back, so do not push it too deep too soon, and use your general’s glare.</p><p>Here, the glowing piece to the <b>green point</b> is the best move.</p>'),
    g: G('詰みに向かういちばん良い手を。', 'Play the best move toward mate.'), y: P('正解！それがいちばん良い手です。', 'Right! That is the best move.') },
};

function build(I18N) {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8')), out = {};
  for (const id in TEXT) {
    const s = D.steps.find(x => x.id === id), Pb = TEXT[id].from || s.problems[0], pos = E.Pos.from(Pb.s), T = TEXT[id];
    let okM = Pb.ok; if (!okM) { const b = Math.max(...Pb.sc.map(e => e[1])); okM = Pb.sc.filter(e => e[1] >= b - 10).map(e => e[0]); }
    const okN = okM.map(m => E.name(pos, m, 'iccs')), bestN = E.name(pos, Pb.best, 'iccs');
    const hint = {}; for (const l in I18N) if (I18N[l]['ls.' + id + '.hint']) hint[l] = I18N[l]['ls.' + id + '.hint'];
    const tx = (j, f) => Object.assign({}, T[f], TR[`${id}/${j}/${f}`] || {});
    out[id] = [
      { k: 'explain', s: Pb.s, marks: [[bestN.slice(0, 2), 'hl'], [bestN.slice(2, 4), 'ok']], t: tx(0, 't'), body: tx(0, 'body') },
      { k: 'try', src: 'mirror', s: mirFen(Pb.s), ok: okN.map(mirMv), look: [...new Set(okN.map(m => mirSq(m.slice(0, 2))))], g: tx(1, 'g'), h: hint, y: tx(1, 'y') },
    ];
  }
  return out;
}
module.exports = { TEXT, build };
