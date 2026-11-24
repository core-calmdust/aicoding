// Warm-ups for the lessons that had none (2026-11-15): five, block, three, sfour, forbid33, forbid44, fourthreeB.
// The same item shape as tools/ramps.js; texts ja / en here, the other 12 languages in ramps-new-tr.json
// ({ "<step>/<index>/<field>": { zh, ko, … } }). Merged into lessons.json by tools/ramps.js, verified by tools/check_lessons.js.
'use strict';
const fs = require('fs'), path = require('path'), E = require('../engine.js');
const TR = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'ramps-new-tr.json'), 'utf8')); } catch (e) { return {}; } })();
const rot = (s, k) => String(s).split(' ').filter(Boolean).map(q => E.sqName(E.sym(E.sqOf(q), k))).join(' ');
const turn = (it, k) => Object.assign({}, it, { b: rot(it.b, k), w: rot(it.w, k) });
const P = (ja, en) => ({ ja, en });

const FIVE = { rule: 'free', b: 'e8 f8 g8 h8', w: 'd8 f9 h9 g7', side: 1 };
const FIVE2 = { rule: 'free', b: 'e5 f6 h8 i9', w: 'd4 j10 g8 h6', side: 1 };
const BLOCK = { rule: 'free', w: 'f9 g9 h9 i9', b: 'e9 g8 h8', side: 1 };
const BLOCK2 = { rule: 'free', w: 'h5 h6 h8 h9', b: 'h4 g7 i6', side: 1 };
const THREE = { rule: 'free', w: 'g8 h8 i8', b: 'g9 h9', side: 1 };
const THREE2 = { rule: 'free', w: 'g7 h8 j10', b: 'g8 h7 k9', side: 1 };   // (追80, 2026-11-25: not f9 — f9 g8 h7 was Black's own open three)
const SFOUR = { rule: 'free', b: 'g8 h8 i8', w: 'g9 i9 h7', side: 1 };
const SFOUR2 = { rule: 'free', b: 'h6 h7 h9', w: 'g7 i8 g9', side: 1 };
const F33 = { rule: 'renju', b: 'g8 i8 h9 h10', w: 'f9 j10 l5', side: 1 };
const F33b = { rule: 'renju', b: 'f7 h7 e5 f6', w: 'i6 c9 k8', side: 1 };
const F44 = { rule: 'renju', b: 'e8 f8 g8 h9 h10 h11', w: 'd8 h12 k5', side: 1 };
const LONG = { rule: 'renju', b: 'd8 e8 f8 h8 i8', w: 'd9 g10 j6', side: 1 };
const F44b = { rule: 'renju', b: 'e5 f6 g7 h9 h10 h11', w: 'd4 h12 l3', side: 1 };
const B43 = { rule: 'renju', b: 'e8 f8 g8 h9 h10 j12 k12 l10 l11', w: 'd8 i11 c3 m12 l13', side: 1 };
const B43b = { rule: 'renju', b: 'f6 g7 h8 j9 k9 d10 e10 f11 f12', w: 'e5 g9 h10 l4 c12', side: 1 };

const NEW = {
  five: [
    Object.assign({ k: 'explain', marks: [['e8', 't4'], ['f8', 't4'], ['g8', 't4'], ['h8', 't4'], ['i8', 'hl2']] }, FIVE, {
      t: P('あと1つで5つ並ぶ点', 'The point that makes five'),
      body: P('<p>黒が<b>4つ</b>並んでいます（赤い丸）。片方のはしは白にふさがれていますが、もう片方の<b>光っている点</b>はあいています。</p><p>ここに打てば<b>5つ並んで勝ち</b>。縦・横・斜め、どの向きでも同じです。</p>',
        '<p>Black has <b>four</b> in a row (red circles). One end is blocked by White, but the other end — the <b>highlighted point</b> — is empty.</p><p>Play there and you have <b>five in a row: you win</b>. It works the same across, down or diagonally.</p>') }),
    Object.assign({ k: 'try', goal: 'five', ok: ['i8'], look: ['e8', 'f8', 'g8', 'h8'] }, FIVE, {
      g: P('図と同じ形。5つ並べて勝とう。', 'Same shape as the diagram: make five and win.'),
      h: P('黒の4つ並びの、あいているほうのはしは？', 'Which end of the black four is still empty?'),
      y: P('5つ並んで勝ち！', 'Five in a row — you win!') }),
    Object.assign({ k: 'try', goal: 'five', ok: ['g7'], look: ['e5', 'f6', 'h8', 'i9'] }, FIVE2, {
      g: P('練習：今度はナナメ。すき間に気をつけて。', 'Practice: a diagonal this time. Watch for the gap.'),
      h: P('黒の石がナナメに並んでいるね。1つだけあいている点を埋めると…？', 'The black stones line up diagonally. What if you fill the one empty point between them?'),
      y: P('正解！すき間を埋めても5つ並びになります。', 'Right! Filling the gap also makes five.') }),
  ],
  block: [
    Object.assign({ k: 'explain', marks: [['f9', 't4'], ['g9', 't4'], ['h9', 't4'], ['i9', 't4'], ['j9', 'hl2']] }, BLOCK, {
      t: P('相手の四は、すぐ止める', 'Block the opponent’s four at once'),
      body: P('<p>白が<b>4つ</b>並んでいます（赤い丸）。片方のはしは黒がふさいでいますが、もう片方（光っている点）があいています。</p><p>黒がここに打たないと、次に白が5つ並べて負け。自分が5つ並べられないときは、<b>四を止めるのが最優先</b>です。</p>',
        '<p>White has <b>four</b> in a row (red circles). Black blocks one end, but the other end (the highlighted point) is open.</p><p>If Black does not play there, White makes five next and wins. When you cannot make five yourself, <b>blocking a four comes first</b>.</p>') }),
    Object.assign({ k: 'try', goal: 'block', ok: ['j9'], look: ['f9', 'g9', 'h9', 'i9'] }, BLOCK, {
      g: P('図と同じ形。白の四を止めよう。', 'Same shape as the diagram: block White’s four.'),
      h: P('白の4つ並びのうち、まだあいているはしは？', 'Which end of White’s four is still open?'),
      y: P('止めた！これで白は5つ並べられません。', 'Blocked! Now White cannot make five.') }),
    Object.assign({ k: 'try', goal: 'block', ok: ['h7'], look: ['h5', 'h6', 'h8', 'h9'] }, BLOCK2, {
      g: P('練習：すき間のある四も、四です。', 'Practice: a four with a gap is still a four.'),
      h: P('白がタテに4つ。すき間の1点に白が入ると5つ並ぶね。', 'White has four stones in a column. If White fills the one gap, that makes five.'),
      y: P('正解！すき間の四は、すき間に打って止めます。', 'Right! You stop a four with a gap by playing in the gap.') }),
  ],
  three: [
    Object.assign({ k: 'explain', marks: [['g8', 't3'], ['h8', 't3'], ['i8', 't3'], ['f8', 'ok'], ['j8', 'ok']] }, THREE, {
      t: P('三は、はしを止める', 'Stop a three at its end'),
      body: P('<p>白が<b>3つ</b>並び、両はしがあいています。これが<b>三</b>（活三）。</p><p>放っておくと白は次に<b>両はしがあいた四（達四）</b>を作り、もう止められません。三を見たら、<b>どちらかのはし</b>（緑の丸）に打って止めましょう。</p>',
        '<p>White has <b>three</b> in a row with both ends open: a <b>three</b> (open three).</p><p>Left alone, White makes a <b>four open at both ends</b> (a straight four) next, and that cannot be stopped. When you see a three, block <b>one of its ends</b> (green circles).</p>') }),
    Object.assign({ k: 'try', goal: 'block3', ok: ['f8', 'j8'], look: ['g8', 'h8', 'i8'] }, THREE, {
      g: P('図と同じ形。白の三を止めよう。', 'Same shape as the diagram: stop White’s three.'),
      h: P('白の3つ並びの、すぐとなりのはしに打つと…？', 'What if you play right next to one end of White’s three?'),
      y: P('正解！片方のはしをふさげば、白は達四を作れません。', 'Right! With one end closed, White cannot make a straight four.') }),
    Object.assign({ k: 'try', goal: 'block3', ok: ['f6', 'i9', 'k11'], look: ['g7', 'h8', 'j10'] }, THREE2, {
      g: P('練習：すき間のある三（飛び三）も三です。', 'Practice: a three with a gap (a split three) is still a three.'),
      h: P('白がナナメに3つ、すき間が1つ。すき間か、両はしのどれかで止められるよ。', 'Three white stones on a diagonal with one gap. You can stop it in the gap or at either end.'),
      y: P('正解！飛び三は、すき間でも、はしでも止められます。', 'Right! A split three can be stopped in the gap or at an end.') }),
  ],
  sfour: [
    Object.assign({ k: 'explain', marks: [['g8', 't3'], ['h8', 't3'], ['i8', 't3'], ['f8', 'ok'], ['j8', 'ok']] }, SFOUR, {
      t: P('三を伸ばして達四', 'Extend a three into a straight four'),
      body: P('<p>黒の<b>三</b>（両はしがあいた3つ並び）があります。どちらかのはし（緑の丸）に打つと4つ並びになり、<b>両はしがあいた四＝達四</b>ができます。</p><p>白は片方しか止められないので、次に必ず5つ並べられます。</p>',
        '<p>Black has a <b>three</b> (three in a row, both ends open). Play at either end (green circles) to make four in a row with <b>both ends open: a straight four</b>.</p><p>White can block only one end, so you make five next for sure.</p>') }),
    Object.assign({ k: 'try', goal: 'sfour', ok: ['f8', 'j8'], look: ['g8', 'h8', 'i8'] }, SFOUR, {
      g: P('図と同じ形。達四を作ろう。', 'Same shape as the diagram: make a straight four.'),
      h: P('黒の3つ並びを、あいているはしに伸ばしてみよう。', 'Extend Black’s three toward an open end.'),
      y: P('達四！白がどちらを止めても、もう片方で5つ並びます。', 'A straight four! Whichever end White blocks, you make five at the other.') }),
    Object.assign({ k: 'try', goal: 'sfour', ok: ['h8'], look: ['h6', 'h7', 'h9'] }, SFOUR2, {
      g: P('練習：すき間のある三から達四を作ろう。', 'Practice: make a straight four from a three with a gap.'),
      h: P('黒がタテに3つ、すき間が1つ。どこに打てば、すき間のない4つ並びになる？', 'Three black stones in a column with one gap. Where do you play to get four in a row with no gap?'),
      y: P('正解！すき間を埋めると、両はしがあいた四になります。', 'Right! Filling the gap gives a four open at both ends.') }),
  ],
  forbid33: [
    Object.assign({ k: 'explain', marks: [['g8', 't3'], ['i8', 't3'], ['h9', 't3'], ['h10', 't3'], ['h8', 'hl2']] }, F33, {
      t: P('三が2つ同時＝三三（黒だけ禁手）', 'Two threes at once: double three (forbidden for Black)'),
      body: P('<p>黒が<b>光っている点</b>に打つと、ヨコに三、タテに三が<b>同時に2つ</b>できます。これが<b>三三</b>。</p><p>連珠では黒だけ、この手を打てません。盤の×は、黒が打てない点のしるしです。</p>',
        '<p>If Black plays the <b>highlighted point</b>, a three across and a three down appear <b>at the same time</b>: a <b>double three</b>.</p><p>In renju, only Black may not play this. The × on the board marks the points Black cannot play.</p>') }),
    Object.assign({ k: 'try', goal: 'forbid', pick: true, ok: [rot('h8', 2)], look: ['g8', 'i8', 'h9', 'h10'].map(q => rot(q, 2)) }, turn(F33, 2), {
      g: P('同じ形を向きを変えて、×を消しました。三三の点をタップしよう。', 'The same shape turned, with the × hidden. Tap the double-three point.'),
      h: P('黒の2つ並びが2本あるね。2本の線が交わる点に打つと、三が2つ…？', 'There are two black pairs. If Black plays where their two lines cross, that makes two threes…'),
      y: P('正解！そこは三三。黒は打てない点です。', 'Right! That is a double three: Black cannot play there.') }),
    Object.assign({ k: 'try', goal: 'forbid', pick: true, ok: ['g7'], look: ['e5', 'f6', 'f7', 'h7'] }, F33b, {
      g: P('練習：今度はナナメとヨコ。三三の点をタップしよう。', 'Practice: a diagonal and a row this time. Tap the double-three point.'),
      h: P('ナナメの2つ並びと、すき間のあるヨコの2つ。どちらも三になる点は？', 'A diagonal pair and a row of two with a gap. Which point makes both of them a three?'),
      y: P('正解！ナナメとヨコの三が同時にできる三三です。', 'Right! A diagonal three and a row three at once: a double three.') }),
  ],
  forbid44: [
    Object.assign({ k: 'explain', marks: [['e8', 't4'], ['f8', 't4'], ['g8', 't4'], ['h9', 't4'], ['h10', 't4'], ['h11', 't4'], ['h8', 'hl2']] }, F44, {
      t: P('四が2つ同時＝四四', 'Two fours at once: double four'),
      body: P('<p>黒が<b>光っている点</b>に打つと、ヨコとタテに<b>四が2つ</b>同時にできます。これが<b>四四</b>で、黒の禁手です。</p><p>四四は、同じ列に四が2つできる形でも禁手になります。</p>',
        '<p>If Black plays the <b>highlighted point</b>, <b>two fours</b> appear at once, across and down. That is a <b>double four</b>, forbidden for Black.</p><p>Two fours on the same line are a double four too.</p>') }),
    Object.assign({ k: 'explain', marks: [['d8', 't4'], ['e8', 't4'], ['f8', 't4'], ['h8', 't4'], ['i8', 't4'], ['g8', 'hl2']] }, LONG, {
      t: P('6つ以上＝長連', 'Six or more: overline'),
      body: P('<p>黒が光っている点に打つと、<b>6つ</b>並びます。これが<b>長連</b>で、黒の禁手。黒は<b>ちょうど5つ</b>でないと勝ちになりません。</p><p>ただし、ちょうど5つ並ぶ手は、同時に禁手の形ができても<b>五が優先</b>で黒の勝ちです。</p>',
        '<p>If Black plays the highlighted point, <b>six</b> line up. That is an <b>overline</b>, forbidden for Black: Black wins only with <b>exactly five</b>.</p><p>But a move that makes exactly five wins for Black even if it also makes a forbidden shape: <b>five comes first</b>.</p>') }),
    Object.assign({ k: 'try', goal: 'forbid', pick: true, ok: [rot('h8', 5)], look: ['e8', 'f8', 'g8', 'h9', 'h10', 'h11'].map(q => rot(q, 5)) }, turn(F44, 5), {
      g: P('四四の形を向きを変えて、×を消しました。禁手の点をタップしよう。', 'The double-four shape turned, with the × hidden. Tap the forbidden point.'),
      h: P('黒の3つ並びが2本。両方を同時に4つにできる点は？', 'Two black threes. Which point turns both into fours at once?'),
      y: P('正解！四が2つできる四四。黒は打てません。', 'Right! Two fours at once: a double four. Black cannot play there.') }),
    Object.assign({ k: 'try', goal: 'forbid', pick: true, ok: ['h8'], look: ['e5', 'f6', 'g7', 'h9', 'h10', 'h11'] }, F44b, {
      g: P('練習：ナナメとタテ。黒の禁手をタップしよう。', 'Practice: a diagonal and a column. Tap Black’s forbidden point.'),
      h: P('ナナメの3つ並びとタテの3つ並び。2本が交わる点は？', 'A diagonal three and a column of three. Where do the two lines cross?'),
      y: P('正解！ナナメとタテに四ができる四四です。', 'Right! A diagonal four and a column four: a double four.') }),
  ],
  fourthreeB: [
    Object.assign({ k: 'explain', marks: [['e8', 't4'], ['f8', 't4'], ['g8', 't4'], ['h9', 't3'], ['h10', 't3'], ['h8', 'hl2']] }, B43, {
      t: P('禁手をよけて四三', 'A four-three that avoids the forbidden points'),
      body: P('<p>黒の勝ち方は<b>四三</b>。四と三が1つずつなら、禁手ではありません。</p><p>光っている点は、ヨコに四・タテに三ができる四三。×の点は三三の禁手なので、黒は打てません。打つ前に×かどうか確かめましょう。</p>',
        '<p>Black wins with a <b>four-three</b>: one four plus one three is not forbidden.</p><p>The highlighted point makes a four across and a three down: a four-three. The × point is a forbidden double three, so Black cannot play it. Check for an × before you play.</p>') }),
    Object.assign({ k: 'try', goal: 'fourthree', ok: ['h8'], look: ['e8', 'f8', 'g8', 'h9', 'h10'] }, B43, {
      g: P('図と同じ形。黒の四三を打とう。', 'Same shape as the diagram: play Black’s four-three.'),
      h: P('×の点は打てないよ。ヨコの3つ並びとタテの2つ並びが交わる点は？', 'The × point is off limits. Where do the row of three and the column of two cross?'),
      y: P('四三！禁手でもないので、黒の勝ちが決まります。', 'A four-three, and not forbidden: Black’s win is sure.') }),
    Object.assign({ k: 'try', goal: 'fourthree', ok: ['i9'], look: ['f6', 'g7', 'h8', 'j9', 'k9'] }, B43b, {
      g: P('練習：×をよけて、黒の四三を探そう。', 'Practice: avoid the × and find Black’s four-three.'),
      h: P('ナナメの3つ並びと、ヨコの2つ並び。2本が交わる点は？', 'A diagonal three and a row of two. Where do the two lines cross?'),
      y: P('正解！×をよけた四三です。', 'Right! A four-three that avoids the ×.') }),
  ],
};
for (const id in NEW) NEW[id].forEach((it, j) => ['t', 'body', 'g', 'h', 'y'].forEach(f => { if (it[f]) Object.assign(it[f], TR[`${id}/${j}/${f}`] || {}); }));
module.exports = { NEW };
