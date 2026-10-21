// Lessons — course "tactics" (手筋). Checked by the capture reader in lessons-lib.mjs (lessons-build.mjs).
import { T } from './lessons-lib.mjs';
export const course = {
  id: 'tactics',
  title: { ja: '手筋', en: 'Tactics' },
  sub: { ja: 'シチョウ・ゲタ・ウッテガエシ・両アタリ', en: 'Ladder, net, snapback, double atari' },
};
const E7 = '.......', E9 = '.........';
const L = (ab, aw) => { const a = new Array(81).fill('.'); const P = s => (9 - +s.slice(1)) * 9 + 'ABCDEFGHJ'.indexOf(s[0]); for (const s of ab) a[P(s)] = 'X'; for (const s of aw) a[P(s)] = 'O'; const r = []; for (let y = 0; y < 9; y++) r.push(a.slice(y * 9, y * 9 + 9).join('')); return r; };
const Na = L(['C5', 'C4', 'D3', 'E3'], ['D4', 'G6']);
const Nb = L(['C6', 'C5', 'C4', 'D3', 'E4'], ['D4', 'D5', 'G6']);
const Nc = L(['B4', 'B3', 'C2', 'D2'], ['C3', 'F5']);
const Sd = [E9, E9, E9, E9, E9, '...O.....', 'XXXO.....', 'OOXO.....', '..OO.....'];
const Sg = [E9, E9, E9, E9, E9, '......O..', '..XXXX...', '..XOOXO..', '..X..OO..'];
const Sg3 = [E9, E9, E9, E9, E9, '.......O.', '..XXXXX..', '..XOOOXO.', '..XX..OO.'];
const ladder = (tgt, extra) => [{ goal: 'capture', tgt, depth: 14, libsOnly: true, pvDepth: 14 }, { goal: 'capture', tgt, depth: 4, noOk: true }];
const tac = (tgt, depth) => [{ goal: 'capture', tgt, depth }];
export const steps = [
// ------------------------------------------------------------------ 1
{ id: 'ladder', course: 'tactics',
  title: { ja: 'シチョウ', en: 'Ladders' },
  sub: { ja: 'アタリを続けて、端まで追いかける', en: 'Keep giving atari all the way to the edge' },
  intro: {
    ja: '<p>ダメ2つの石に、逃げても逃げてもアタリが続くように追いかけて取る手筋が<b>シチョウ</b>です。石はジグザグに逃げ、最後は盤端で取られます。</p><p>ただし、逃げる先に相手の石（<b>シチョウアタリ</b>）があると、つながってダメが増え、逆にこちらがボロボロになります。</p><p>打つ前に、斜めに盤端まで線を引いて、途中に相手の石がないか確かめましょう。</p>',
    en: '<p>A <b>ladder</b> chases a stone with two liberties by giving atari after atari. The stone zigzags across the board and is finally captured at the edge.</p><p>But if one of the opponent’s stones sits on the ladder’s path (a <b>ladder breaker</b>), the running stones connect to it and escape, and your chasing stones are left full of weaknesses.</p><p>Before starting a ladder, trace the diagonal to the edge and check for breakers.</p>' },
  goal: { ja: 'シチョウで取る／シチョウから逃げる', en: 'Capture with a ladder / escape a ladder' },
  hint: { ja: '逃げた石のダメが2つのまま、という方向からアタリしましょう。逃げる先に味方はいるかな？', en: 'Atari from the side that keeps the runner at two liberties. Is there a friendly stone on the path?' },
  diagram: { rows: [E9, E9, E9, E9, '...X.....', '..XO.....', '....X....', E9, E9], marks: [['E4', 'ok']], arrows: [['D4', 'D3'], ['D3', 'C3'], ['C3', 'C2']] },
  problems: [
    { rows: [E9, E9, E9, E9, E9, E9, '...X.....', '..XO.....', E9], turn: 1, ok: ['E2'], line: 'auto', chk: ladder(['D2']),
      why: { ja: '<bdi>E2</bdi>からアタリすると白は一線へ逃げるしかなく、アタリが続いて取れます。二線のシチョウです。', en: 'Atari from <bdi>E2</bdi> drives White onto the first line, and the ataris continue until it is captured: a ladder on the second line.' },
      ng: { ja: '<bdi>D1</bdi>からのアタリでは白は<bdi>E2</bdi>へ広く逃げます。端へ追い込みましょう。', en: 'Atari from <bdi>D1</bdi> lets White run out to <bdi>E2</bdi>. Drive it toward the edge.' } },
    { rows: [E9, E9, '.......X.', E9, '...O.....', '..OX.....', '....O....', E9, E9], turn: 2, ok: ['E4'], line: 'auto', chk: ladder(['D4']),
      why: { ja: '白<bdi>E4</bdi>からアタリすれば、黒は左下へ逃げるシチョウになり、盤端で取れます。', en: 'Atari from <bdi>E4</bdi>: Black has to run toward the lower left in a ladder and is captured at the edge.' },
      ng: { ja: '<bdi>D3</bdi>からアタリすると黒は右上へ逃げ、<bdi>H7</bdi>の黒石（シチョウアタリ）につながって逃げられます。', en: 'Atari from <bdi>D3</bdi> sends Black toward the upper right, where black <bdi>H7</bdi> is a ladder breaker.' } },
    { rows: [E9, E9, E9, '......O..', '...X.....', '..XO.....', '....X....', E9, E9], turn: 1, ok: ['E4'], line: 'auto', chk: ladder(['D4']),
      why: { ja: '<bdi>E4</bdi>からのアタリなら、白は左下の盤端へ向かって逃げるしかなく、シチョウで取れます。', en: 'Atari from <bdi>E4</bdi>: White can only run toward the lower-left edge, and the ladder works.' },
      ng: { ja: '<bdi>D3</bdi>からだと白は右上へ逃げ、<bdi>G6</bdi>の白石につながってしまいます（シチョウアタリ）。', en: 'From <bdi>D3</bdi>, White runs to the upper right and connects to <bdi>G6</bdi> — a ladder breaker.' } },
    { rows: [E9, E9, E9, '...O.....', '..OXX....', '...OO....', E9, E9, E9], turn: 2, ok: ['F5'], line: 'auto', chk: ladder(['D5']),
      why: { ja: '2子でもシチョウになります。<bdi>F5</bdi>からアタリすれば黒は上へ逃げるしかなく、右上の盤端で取れます。', en: 'Two stones can be laddered too. Atari from <bdi>F5</bdi>: Black can only run upward and is captured at the upper-right edge.' },
      ng: { ja: '<bdi>E6</bdi>からのアタリでは黒が<bdi>F5</bdi>へ逃げてダメが3つになります。', en: 'Atari from <bdi>E6</bdi> lets Black extend to <bdi>F5</bdi> with three liberties.' } },
    { rows: [E9, E9, '......X..', E9, '...O.....', '..OX.....', '...OO....', E9, E9], turn: 1, ok: ['E4'], chk: [{ goal: 'escape', tgt: ['D4'], depth: 14, libsOnly: true }],
      why: { ja: '<bdi>E4</bdi>と逃げれば白はシチョウで追ってきますが、右上の<bdi>G7</bdi>の黒石がシチョウアタリ。つながって逃げ切れます。', en: 'Run out with <bdi>E4</bdi>. White can try a ladder, but black <bdi>G7</bdi> on the upper right breaks it, and Black escapes.' },
      ng: { ja: '黒<bdi>D4</bdi>はアタリです。シチョウアタリがあるので、<bdi>E4</bdi>に逃げてよい場面です。', en: 'Black <bdi>D4</bdi> is in atari. Thanks to the ladder breaker, running out at <bdi>E4</bdi> is correct.' } },
  ] },
// ------------------------------------------------------------------ 2
{ id: 'net', course: 'tactics',
  title: { ja: 'ゲタ', en: 'Nets' },
  sub: { ja: 'アタリにせず、ふたをして取る', en: 'Don’t give atari — put a lid on it' },
  intro: {
    ja: '<p>アタリをかけずに、逃げ道に<b>ふたをする</b>ように打って取る手筋が<b>ゲタ</b>です。石から1つ離れた斜め（ケイマの位置）に打つことが多い形です。</p><p>相手がどちらへ出ても、すぐにアタリで押し戻せるので逃げられません。</p><p>シチョウが失敗する（シチョウアタリがある）ときこそ、ゲタの出番です。</p>',
    en: '<p>A <b>net</b> captures without giving atari: you play a move that <b>closes the exit</b>, often a knight’s move or diagonal away from the stone.</p><p>Whichever way the stone tries to come out, you push it back with atari, so it cannot escape.</p><p>Nets are especially useful when a ladder does not work.</p>' },
  goal: { ja: 'ゲタで石を取ってください', en: 'Capture with a net' },
  hint: { ja: '相手の石の逃げ道2つを、同時にふさぐ点はどこ？', en: 'Which point closes both escape routes at once?' },
  diagram: { rows: Na, marks: [['E5', 'ok'], ['D5', 'x'], ['E4', 'x']] },
  problems: [
    { rows: Nc, turn: 1, ok: ['D4'], line: ['D4', 'C4', 'C5', 'D3', 'E3'], chk: tac(['C3'], 6),
      why: { ja: '<bdi>D4</bdi>がゲタ。白が<bdi>C4</bdi>や<bdi>D3</bdi>に出ても、すぐアタリで取れます。', en: '<bdi>D4</bdi> is the net. If White pushes out at <bdi>C4</bdi> or <bdi>D3</bdi>, Black gives atari again and captures.' },
      ng: { ja: '<bdi>C4</bdi>や<bdi>D3</bdi>からアタリすると、白は反対側へ伸びて逃げてしまいます。', en: 'Atari at <bdi>C4</bdi> or <bdi>D3</bdi> lets White extend the other way and escape.' } },
    { rows: T.flipH(T.swap(Na)), turn: 2, ok: ['E5'], line: 'auto', chk: tac(['F4'], 6),
      why: { ja: '白<bdi>E5</bdi>のゲタ。黒が<bdi>F5</bdi>や<bdi>E4</bdi>に出ても、アタリで押し戻して取れます。', en: 'The net at <bdi>E5</bdi>. Whether Black pushes out at <bdi>F5</bdi> or <bdi>E4</bdi>, White pushes back with atari and captures.' },
      ng: { ja: 'アタリから追うと、<bdi>C6</bdi>の黒石の方へ逃げられます（シチョウ不成立）。ゲタで包みましょう。', en: 'Chasing with atari lets Black run toward <bdi>C6</bdi> — the ladder fails. Use a net.' } },
    { rows: Nb, turn: 1, ok: ['E6'], line: 'auto', chk: tac(['D4'], 6),
      why: { ja: '2子でもゲタは効きます。<bdi>E6</bdi>で白の出口<bdi>D6</bdi>・<bdi>E5</bdi>をまとめてふさぎます。', en: 'Nets work on two stones as well. <bdi>E6</bdi> closes both exits, <bdi>D6</bdi> and <bdi>E5</bdi>.' },
      ng: { ja: '<bdi>E5</bdi>や<bdi>D6</bdi>のアタリでは逃げられます。右上の<bdi>G6</bdi>があるのでシチョウも不成立です。', en: 'Atari at <bdi>E5</bdi> or <bdi>D6</bdi> lets White out, and <bdi>G6</bdi> breaks any ladder.' } },
    { rows: T.flipV(T.swap(Nc)), turn: 2, ok: ['D6'], line: 'auto', chk: tac(['C7'], 6),
      why: { ja: '白<bdi>D6</bdi>がゲタ。黒が<bdi>D7</bdi>・<bdi>C6</bdi>どちらに出ても取れます。', en: 'White <bdi>D6</bdi> is the net. Black is captured whether it pushes out at <bdi>D7</bdi> or <bdi>C6</bdi>.' },
      ng: { ja: '<bdi>D7</bdi>や<bdi>C6</bdi>からのアタリでは、黒に反対側へ伸びられてしまいます。', en: 'Atari from <bdi>D7</bdi> or <bdi>C6</bdi> lets Black extend the other way.' } },
    { rows: T.flipV(T.transpose(Na)), turn: 1, ok: ['E5'], line: 'auto', chk: tac(['F4'], 6),
      why: { ja: '<bdi>E5</bdi>のゲタ。白が<bdi>F5</bdi>・<bdi>E4</bdi>に出てもアタリが続き、逃げられません。', en: 'The net at <bdi>E5</bdi>. If White pushes out at <bdi>F5</bdi> or <bdi>E4</bdi>, the ataris keep coming.' },
      ng: { ja: 'シチョウは<bdi>D7</bdi>の白石に当たって失敗します。ゲタならシチョウアタリに関係なく取れます。', en: 'A ladder would run into white <bdi>D7</bdi>. A net works regardless of ladder breakers.' } },
  ] },
// ------------------------------------------------------------------ 3
{ id: 'snapback', course: 'tactics',
  title: { ja: 'ウッテガエシ', en: 'Snapback' },
  sub: { ja: 'わざと取らせて、取り返す', en: 'Let one stone be taken, then take back more' },
  intro: {
    ja: '<p>相手のダメに<b>1子をわざと放り込み</b>、取らせたあとで、取った石ごと取り返す手筋が<b>ウッテガエシ</b>です。</p><p>ポイントは、相手が1子を取ったあとも、相手の石のダメが1つしか残らないこと。すぐに同じ点に打ち返して、まとめて取れます。</p><p>「ここに打つと取られるけど…」という点が正解になる、気持ちのいい手筋です。</p>',
    en: '<p>In a <b>snapback</b> you <b>throw in a stone</b> on the opponent’s liberty on purpose. After it is captured, you play on the same point again and capture the capturing stones.</p><p>The key: after taking your stone, the opponent still has only one liberty, so you can retake at once.</p><p>It feels wrong to play where you will be captured — that is what makes it a tesuji.</p>' },
  goal: { ja: 'ウッテガエシで取ってください', en: 'Capture with a snapback' },
  hint: { ja: '取られてもいいから、相手のダメに打ち込んでみましょう。', en: 'Throw a stone into the opponent’s liberty, even though it can be captured.' },
  diagram: { rows: Sd, view: [0, 4, 5, 8], marks: [['B1', 'ok']] },
  problems: [
    { rows: Sd, view: [0, 3, 6, 8], turn: 1, ok: ['B1'], line: 'auto', chk: tac(['A2'], 3),
      why: { ja: '<bdi>B1</bdi>に放り込むと、白は<bdi>A1</bdi>で取りますが、白3子はまだダメ1つ。<bdi>B1</bdi>に打ち返して3子を取れます。', en: 'Throw in at <bdi>B1</bdi>. White captures at <bdi>A1</bdi>, but the three white stones still have one liberty, so Black retakes at <bdi>B1</bdi>.' },
      ng: { ja: '<bdi>A1</bdi>からのアタリでは、白に<bdi>B1</bdi>で取られ、<bdi>C1</bdi>とつながって逃げられます。', en: 'Atari at <bdi>A1</bdi> lets White capture at <bdi>B1</bdi> and connect to <bdi>C1</bdi>.' } },
    { rows: T.flipV(T.swap(Sg)), view: [0, 0, 8, 4], turn: 2, ok: ['E9'], line: 'auto', chk: tac(['D8'], 3),
      why: { ja: '<bdi>E9</bdi>に放り込むのが手筋。黒が<bdi>D9</bdi>で取っても、黒3子のダメは<bdi>E9</bdi>だけ。打ち返して取れます。', en: 'Throw in at <bdi>E9</bdi>. If Black takes at <bdi>D9</bdi>, the three black stones have only <bdi>E9</bdi> left, and White takes them back.' },
      ng: { ja: '<bdi>D9</bdi>からアタリすると、黒は<bdi>E9</bdi>とつないで<bdi>F9</bdi>側の黒石と連絡してしまいます。', en: 'Atari at <bdi>D9</bdi> lets Black connect at <bdi>E9</bdi> to the stones at <bdi>F9</bdi>.' } },
    { rows: Sg3, view: [0, 3, 8, 8], turn: 1, ok: ['F1'], line: 'auto', chk: tac(['D2'], 3),
      why: { ja: '<bdi>F1</bdi>に放り込めば、白が<bdi>E1</bdi>で取っても白4子はダメ1つ。<bdi>F1</bdi>に打ち返して4子取りです。', en: 'Throw in at <bdi>F1</bdi>. If White captures at <bdi>E1</bdi>, the four white stones have one liberty, and <bdi>F1</bdi> again captures four.' },
      ng: { ja: '<bdi>E1</bdi>からアタリすると、白は<bdi>F1</bdi>とつないで<bdi>G1</bdi>の白石と連絡します。', en: 'Atari at <bdi>E1</bdi> lets White connect at <bdi>F1</bdi> to <bdi>G1</bdi>.' } },
    { rows: T.flipV(T.flipH(T.swap(Sd))), view: [2, 0, 8, 5], turn: 2, ok: ['H9'], line: 'auto', chk: tac(['H8'], 3),
      why: { ja: '<bdi>H9</bdi>に放り込みます。黒が<bdi>J9</bdi>で取っても、黒3子はダメ1つ。<bdi>H9</bdi>で打ち返して取れます。', en: 'Throw in at <bdi>H9</bdi>. If Black captures at <bdi>J9</bdi>, its three stones have one liberty, and White retakes at <bdi>H9</bdi>.' },
      ng: { ja: '<bdi>J9</bdi>からのアタリでは、黒に<bdi>H9</bdi>で取られて<bdi>G9</bdi>とつながられます。', en: 'Atari at <bdi>J9</bdi> lets Black capture at <bdi>H9</bdi> and connect to <bdi>G9</bdi>.' } },
    { rows: T.flipH(Sg), view: [0, 3, 8, 8], turn: 1, ok: ['E1'], line: 'auto', chk: tac(['E2'], 3),
      why: { ja: '<bdi>E1</bdi>に放り込むと、白が<bdi>F1</bdi>で取っても白3子のダメは<bdi>E1</bdi>だけ。打ち返して取れます。', en: 'Throw in at <bdi>E1</bdi>. If White captures at <bdi>F1</bdi>, the three white stones have only <bdi>E1</bdi>, and Black retakes.' },
      ng: { ja: '<bdi>F1</bdi>からアタリすると、白は<bdi>E1</bdi>とつないで左の白石と連絡します。', en: 'Atari at <bdi>F1</bdi> lets White connect at <bdi>E1</bdi> to the stones on the left.' } },
  ] },
// ------------------------------------------------------------------ 4
{ id: 'double', course: 'tactics',
  title: { ja: '両アタリと切り', en: 'Double atari and cutting' },
  sub: { ja: '2か所を同時にアタリにする', en: 'Two ataris with one move' },
  intro: {
    ja: '<p>1手で相手の石2つを同時にアタリにするのが<b>両アタリ</b>です。相手は片方しか助けられないので、もう片方を取れます。</p><p>両アタリは、相手の<b>切れ目</b>に打つと生まれやすい手筋です。ダメが2つずつの石が並んでいたら、共通のダメを探しましょう。</p><p>逆に、自分の石に切れ目があるときは、両アタリされないよう先につないでおきます。</p>',
    en: '<p>A <b>double atari</b> puts two separate groups in atari with one move. The opponent can save only one, so you capture the other.</p><p>Double ataris often appear when you play on the opponent’s <b>cutting point</b>. When you see two groups with two liberties each, look for a liberty they share.</p><p>Conversely, connect your own weak points before the opponent can do this to you.</p>' },
  goal: { ja: '両アタリで石を取ってください', en: 'Capture with a double atari' },
  hint: { ja: '2つの石に共通するダメはどこ？', en: 'Which liberty do the two groups share?' },
  diagram: { rows: [E7, E7, '..X.X..', '.XO.OX.', E7, E7, E7], marks: [['D4', 'ok']] },
  problems: [
    { rows: [E7, E7, '..X.X..', '.XO.OX.', E7, E7, E7], turn: 1, ok: ['D4'], line: ['D4', 'C3', 'E3'], chk: tac(['C4', 'E4'], 2),
      why: { ja: '<bdi>D4</bdi>で白2子が同時にアタリ。白は片方しか逃げられません。', en: '<bdi>D4</bdi> puts both white stones in atari. White can save only one of them.' },
      ng: { ja: '片方だけのアタリでは逃げられます。2つの石に共通のダメ<bdi>D4</bdi>が急所です。', en: 'A single atari just lets White run. The shared liberty <bdi>D4</bdi> is the key point.' } },
    { rows: [E7, '...O...', '..OX...', '.OX....', E7, E7, E7], turn: 2, ok: ['D4'], line: ['D4', 'C3', 'E5'], chk: tac(['C4', 'D5'], 2),
      why: { ja: '斜めの黒2子の切れ目<bdi>D4</bdi>に切ると両アタリ。どちらかを取れます。', en: 'Cutting at <bdi>D4</bdi>, between the diagonal black stones, is a double atari. White captures one of them.' },
      ng: { ja: '黒<bdi>C4</bdi>と<bdi>D5</bdi>はどちらもダメ2つ。共通のダメ<bdi>D4</bdi>で切りましょう。', en: 'Black <bdi>C4</bdi> and <bdi>D5</bdi> each have two liberties. Cut at their shared liberty, <bdi>D4</bdi>.' } },
    { rows: [E9, E9, E9, E9, E9, E9, '..X.X....', '.XO.OX...', E9], view: [0, 4, 8, 8], turn: 1, ok: ['D2'], line: ['D2', 'C1', 'E1'], chk: tac(['C2', 'E2'], 2),
      why: { ja: '<bdi>D2</bdi>で白2子が両アタリ。辺でも考え方は同じです。', en: '<bdi>D2</bdi> is a double atari on the two white stones. The same idea works on the edge.' },
      ng: { ja: '<bdi>C1</bdi>や<bdi>E1</bdi>のアタリは片方だけ。<bdi>D2</bdi>なら一度に2つです。', en: 'Atari at <bdi>C1</bdi> or <bdi>E1</bdi> hits only one stone; <bdi>D2</bdi> hits both.' } },
    { rows: T.flipV(T.swap([E9, E9, E9, E9, E9, E9, '..X.X....', '.XO.OX...', E9])), view: [0, 0, 8, 4], turn: 2, ok: ['D8'], line: ['D8', 'C9', 'E9'], chk: tac(['C8', 'E8'], 2),
      why: { ja: '白<bdi>D8</bdi>で黒<bdi>C8</bdi>と<bdi>E8</bdi>が同時にアタリになります。', en: 'White <bdi>D8</bdi> puts black <bdi>C8</bdi> and <bdi>E8</bdi> in atari at the same time.' },
      ng: { ja: '2つの黒石が共有しているダメ<bdi>D8</bdi>を探しましょう。', en: 'Look for the liberty the two black stones share: <bdi>D8</bdi>.' } },
    { rows: T.flipH(T.swap(['.........', '.........', '...O.....', '..OX.....', '.OX......', E9, E9, E9, E9])), turn: 1, ok: ['F5'], line: ['F5', 'G4', 'E6'], chk: tac(['F6', 'G5'], 2),
      why: { ja: '斜めの白2子の切れ目<bdi>F5</bdi>に切れば両アタリ。片方を取れます。', en: 'Cut at <bdi>F5</bdi>, the gap between the diagonal white stones: a double atari.' },
      ng: { ja: '白<bdi>F6</bdi>と<bdi>G5</bdi>は斜めにつながっているだけ。切れ目の<bdi>F5</bdi>が急所です。', en: 'White <bdi>F6</bdi> and <bdi>G5</bdi> are only diagonally linked. The cutting point <bdi>F5</bdi> is vital.' } },
  ] },
];
