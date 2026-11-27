// The words of the lessons' warm-up steps (lessons.json ramp), 14 languages. {m} = the answer's move, {n} = moves.
// Used by tools/gen_content.js; the problems' own words live in i18n-bt.js (ls.<id>.*).
'use strict';
const T = {
  b_cap: {
    t: { ja: 'ただで取れる駒を探す', en: 'Find a piece you can take for free' },
    body: { ja: '<p>取れる駒が2つ以上あるときは、<b>取ったあとに取り返されるか</b>を確かめます。取った駒の斜め前に相手の駒がいれば取り返されます。</p><p>ここでは {m} なら取り返されません。</p>', en: '<p>When you can take more than one piece, check <b>whether you get taken back</b>. If an enemy piece stands diagonally in front of the square you land on, it can take back.</p><p>Here {m} cannot be taken back.</p>' },
    g: { ja: '取り返されない取り方を選ぼう。', en: 'Take a piece that cannot be taken back.' },
    h: { ja: '取ったあとのマスの斜め前に、相手の駒はいるかな？', en: 'After taking, is there an enemy piece diagonally in front of your square?' },
    y: { ja: '{m} は取り返されません。駒を1つ得しました。', en: '{m} cannot be taken back — a piece won.' },
  },
  b_stop: {
    t: { ja: '侵入してくる駒を止める', en: 'Stop the piece coming in' },
    body: { ja: '<p>相手の駒が自陣のすぐ近くまで来たら、<b>取って止める</b>のが基本です。放っておくと、数手でゴールに届かれます。</p><p>ここでは {m} と取るのが、ただ一つの守りです。</p>', en: '<p>When an enemy piece comes close to your home row, <b>take it</b>. Left alone it reaches the goal in a few moves.</p><p>Here taking with {m} is the only defence.</p>' },
    g: { ja: '突破されない手を指そう。', en: 'Play the move that stops the breakthrough.' },
    h: { ja: '自陣に近い相手の駒を、どの駒で取れば次も守れるかな？', en: 'Which of your pieces should take the intruder so that you can still defend next move?' },
    y: { ja: '{m} で止めました。ほかの手だと突破されます。', en: '{m} stops it — any other move lets them through.' },
  },
  b_win2: {
    t: { ja: '2手で突破する', en: 'Break through in two' },
    body: { ja: '<p>ゴールの2段手前まで来た駒は、<b>取られずに一歩進めば</b>次の手でゴールです。相手が取れないマスを選ぶのがコツです。</p><p>ここでは {m} から、{n}手で突破できます。</p>', en: '<p>A piece two rows from the goal wins if it can <b>step forward without being taken</b> — next move it walks in. Pick a square the enemy cannot capture on.</p><p>Here {m} breaks through in {n} moves.</p>' },
    g: { ja: '2手で突破できる手を指そう。', en: 'Play the move that breaks through in two.' },
    h: { ja: '進んだ先のマスの斜め前に、相手の駒がいないところは？', en: 'Which square in front has no enemy piece diagonally ahead of it?' },
    y: { ja: '{m} は取られません。次にゴールできます。', en: '{m} cannot be taken — the goal is next.' },
  },
  s_break: {
    t: { ja: '手薄な所を攻める', en: 'Attack where they are thin' },
    body: { ja: '<p>守りは2つ以上の駒で組むもの。<b>守り手が足りない場所に攻め手を集める</b>と、相手は全部を止められません。</p><p>ここでは {m} から{n}手で突破できます。</p>', en: '<p>Defence takes two or more pieces. <b>Bring your attackers where their defenders are too few</b> and they cannot stop them all.</p><p>Here {m} breaks through in {n} moves.</p>' },
    g: { ja: '{n}手で突破できる最初の一手を指そう。', en: 'Play the first move of a breakthrough in {n}.' },
    h: { ja: '守り手の数より多い駒で攻められる場所はどこ？', en: 'Where can you attack with more pieces than they have defenders?' },
    y: { ja: '{m} で攻め手が守り手を上回りました。', en: '{m} brings more attackers than there are defenders.' },
  },
  s_wall: {
    t: { ja: '壁で守る', en: 'Defend with a wall' },
    body: { ja: '<p>横並び・縦並びの駒の列は、相手がすり抜けられません。取るだけが守りではなく、<b>空いた侵入路をふさぐ</b>手が必要なこともあります。</p><p>ここでは {m} が、ただ一つの守りです。</p>', en: '<p>Rows and columns of pieces cannot be slipped past. Defence is not only capturing: sometimes you must <b>close the open entry route</b>.</p><p>Here {m} is the only defence.</p>' },
    g: { ja: '突破されない手を指そう。', en: 'Play the move that holds.' },
    h: { ja: '相手の駒がすり抜けられる道はどこ？ そこをふさごう。', en: 'Where can the enemy piece slip through? Close it.' },
    y: { ja: '{m} で侵入路をふさぎました。', en: '{m} closes the way in.' },
  },
  s_trade: {
    t: { ja: '交換で道を開ける', en: 'Open the way with an exchange' },
    body: { ja: '<p>取り返される取り方でも、<b>交換で守り手を減らせば</b>残った駒が突破できることがあります。</p><p>ここでは {m} と取り、取り返されても{n}手で突破できます。</p>', en: '<p>Even a capture that gets taken back can win: <b>trading off a defender</b> may let your remaining piece through.</p><p>Here {m}, even when taken back, breaks through in {n} moves.</p>' },
    g: { ja: '{n}手で突破できる最初の一手を指そう。', en: 'Play the first move of a breakthrough in {n}.' },
    h: { ja: '取り返されても、そのあと道が開く取り方は？', en: 'Which capture, even when taken back, opens the way?' },
    y: { ja: '{m} の交換で守りが足りなくなりました。', en: 'After the exchange {m} they are a defender short.' },
  },
  s_tempo: {
    t: { ja: '手待ちで相手を動かす', en: 'Wait and make them move' },
    body: { ja: '<p>ブレイクスルーにパスはありません。守りの形が崩れない<b>手待ち</b>を指すと、相手が先に形を崩さなければならなくなります（ツークツワンク）。</p><p>ここでは {m} が、{n}手で勝つ手待ちです。もし相手がパスできたら、この勝ちはありません。</p>', en: '<p>There is no passing in Breakthrough. A <b>waiting move</b> that keeps your shape forces the opponent to break theirs first (zugzwang).</p><p>Here {m} is the waiting move that wins in {n}. If they could pass, there would be no win.</p>' },
    g: { ja: '{n}手で勝てる最初の一手を指そう。', en: 'Play the first move of a win in {n}.' },
    h: { ja: '相手の番にすると、相手はどの手を指しても形が崩れる。そうなる手は？', en: 'After which move does every reply of theirs break their own shape?' },
    y: { ja: '{m} で手を渡し、相手に形を崩させます。', en: '{m} passes the move back and makes them break their shape.' },
  },
  s_race: {
    t: { ja: 'ゴールまでの段数を数える', en: 'Count the rows to the goal' },
    body: { ja: '<p>守りが崩れた終盤は<b>競走</b>です。止められない駒どうしなら、ゴールまでの段数が少ない方が勝ち。数えて、先に着く手を選びます。</p><p>ここでは {m} から{n}手で勝てます。</p>', en: '<p>When the defences are gone it is a <b>race</b>: between unstoppable pieces, the one with fewer rows to go wins. Count, then choose the move that arrives first.</p><p>Here {m} wins in {n}.</p>' },
    g: { ja: '{n}手で勝てる最初の一手を指そう。', en: 'Play the first move of a win in {n}.' },
    h: { ja: '自分と相手、ゴールまでそれぞれ何段？ 相手の駒を止める手はある？', en: 'How many rows does each side need? Can you stop their piece?' },
    y: { ja: '{m} で競走に勝ちます。', en: '{m} wins the race.' },
  },
};
const UI = {
  step: { ja: '準備 {i}/{n}', en: 'Warm-up {i}/{n}' },
  next: { ja: '次へ', en: 'Next' },
  main: { ja: '本番の問題へ', en: 'To the problems' },
  skip: { ja: '準備をとばす', en: 'Skip the warm-up' },
  note: { ja: '（準備の問題は採点しません）', en: '(Warm-up moves are not scored)' },
  look: { ja: '光っている駒を見てみよう。', en: 'Look at the glowing pieces.' },
  ans: { ja: '答え：{m}', en: 'Answer: {m}' },
  ng: { ja: 'ちがうみたい。局面を戻すので、もう一度考えてみよう。', en: 'Not quite! The position goes back — try again.' },
};
let MORE = {}; try { MORE = require('./bt_text_more.js'); } catch (e) {}
function obj(id, key, v) {
  const o = Object.assign({}, T[id][key]);
  for (const l in MORE) if (MORE[l][id] && MORE[l][id][key]) o[l] = MORE[l][id][key];
  for (const l in o) o[l] = o[l].replace(/\{(\w+)\}/g, (_, k) => v && v[k] !== undefined ? v[k] : '{' + k + '}');
  return o;
}
const ui = () => { const o = {}; for (const k in UI) { o[k] = Object.assign({}, UI[k]); for (const l in MORE) if (MORE[l]._ui && MORE[l]._ui[k]) o[k][l] = MORE[l]._ui[k]; } return o; };
module.exports = {
  T, UI, rampUi: ui,
  rampT: id => obj(id, 't'), rampBody: (id, v) => obj(id, 'body', v), rampG: (id, v) => obj(id, 'g', v), rampH: id => obj(id, 'h'), rampY: (id, v) => obj(id, 'y', v),
};
