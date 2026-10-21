// Lessons — course "lifedeath" (死活). Groups are drawn with ldRows(): eye space S enclosed by a black wall and a
// white wall; `gap` = wall points left empty. Every answer is checked by the region solver (lessons-lib.mjs).
import { ldRows } from './lessons-lib.mjs';
export const course = {
  id: 'lifedeath',
  title: { ja: '死活', en: 'Life and death' },
  sub: { ja: '二眼・急所・中手・隅の形', en: 'Two eyes, vital points, nakade, corner shapes' },
};
const VS = [0, 3, 8, 8], VC = [0, 3, 5, 8];     // views: bottom side / bottom-left corner
// a life-and-death problem: S eye space, gap, turn, tgt (a black stone), ok ...
function ld(S, gap, turn, tgt, o) {
  const rows = ldRows(9, S, [], { empty: gap });
  return Object.assign({ rows, turn, view: o.view || VS, chk: [{ goal: turn === 1 ? 'live' : 'kill', tgt: [tgt], region: [...S, ...gap], depth: 12 }] }, o);
}
export const steps = [
// ------------------------------------------------------------------ 1
{ id: 'live', course: 'lifedeath',
  title: { ja: '二眼をつくる（生き）', en: 'Making two eyes (living)' },
  sub: { ja: '眼を分ける急所に先着する', en: 'Take the point that divides the eyes' },
  intro: {
    ja: '<p>石が生きるには<b>二眼</b>が必要です。眼になりそうな空間（眼形）があっても、相手に急所を打たれると一眼にされてしまいます。</p><p>生きるコツは2つ。<b>眼の空間を広げる</b>こと、そして<b>空間を2つに分ける急所</b>に打つことです。</p><p>「この一手で、眼がどことどこにできるか」を具体的に指さして確かめましょう。</p>',
    en: '<p>A group needs <b>two eyes</b> to live. Even with plenty of eye space, the opponent can reduce it to one eye by taking the vital point.</p><p>Two ways to live: <b>widen the eye space</b>, or play the <b>vital point that divides it into two eyes</b>.</p><p>After your move, point to exactly where the two eyes are.</p>' },
  goal: { ja: '黒番。黒石を生かしてください', en: 'Black to play and live' },
  hint: { ja: '一手で「確実な眼」が2つできる点を探しましょう。', en: 'Find the move that makes two certain eyes at once.' },
  diagram: { rows: ldRows(9, ['C1', 'D1', 'E1', 'F1', 'D2'], [], { empty: ['G2', 'G1'] }), view: VS, marks: [['D1', 'ok'], ['C1', 'ok'], ['D2', 'ok']] },
  problems: [
    ld(['C1', 'D1', 'E1', 'F1', 'E2'], ['B2', 'B1'], 1, 'D3', { ok: ['E1'],
      why: { ja: '<bdi>E1</bdi>で<bdi>E2</bdi>と<bdi>F1</bdi>の2つの眼が同時に確定します。左側をどう攻められても、もう生きています。', en: '<bdi>E1</bdi> secures two eyes at once: <bdi>E2</bdi> and <bdi>F1</bdi>. Whatever White does on the left, Black is alive.' },
      ng: { ja: '白に<bdi>E1</bdi>を打たれると<bdi>E2</bdi>も<bdi>F1</bdi>も眼にならず、左側だけでは二眼ができません。', en: 'If White takes <bdi>E1</bdi>, neither <bdi>E2</bdi> nor <bdi>F1</bdi> becomes an eye, and the left side alone cannot make two.' } }),
    ld(['C1', 'D1', 'E1', 'F1', 'D2'], ['G2', 'G1'], 1, 'C3', { ok: ['D1'],
      why: { ja: '<bdi>D1</bdi>で<bdi>D2</bdi>と<bdi>C1</bdi>の二眼ができます。右側から白がハネてきても関係ありません。', en: '<bdi>D1</bdi> makes two eyes, <bdi>D2</bdi> and <bdi>C1</bdi>. White’s hane from the right no longer matters.' },
      ng: { ja: '<bdi>D1</bdi>を白に打たれると、<bdi>D2</bdi>の眼も<bdi>C1</bdi>の眼もなくなります。', en: 'If White plays <bdi>D1</bdi>, both the <bdi>D2</bdi> eye and the <bdi>C1</bdi> eye disappear.' } }),
    ld(['A1', 'B1', 'C1', 'A2', 'B2'], [], 1, 'A3', { ok: ['B1'], view: VC,
      why: { ja: '隅の5つの空き点（花五）は、3つの点に接する<bdi>B1</bdi>が急所。黒が打てば<bdi>C1</bdi>と<bdi>A1</bdi>側に眼が分かれます。', en: 'Five points in a bulky shape: the vital point is <bdi>B1</bdi>, which touches three of them. Black plays there and gets eyes at <bdi>C1</bdi> and on the <bdi>A1</bdi> side.' },
      ng: { ja: '<bdi>B1</bdi>を白に打たれると、眼の空間が1つのかたまりのまま二眼になりません。', en: 'If White takes <bdi>B1</bdi>, the space stays one lump and never becomes two eyes.' } }),
    ld(['A1', 'B1', 'C1', 'A2', 'B2', 'C2'], ['D1'], 1, 'A3', { ok: ['B1'], view: VC,
      why: { ja: '隅の急所「二の一」の<bdi>B1</bdi>。ここを占めれば、白が<bdi>D1</bdi>からハネてきても二眼を確保できます。', en: 'The corner’s vital “2-1 point”, <bdi>B1</bdi>. With it, Black keeps two eyes even if White hanes at <bdi>D1</bdi>.' },
      ng: { ja: '白に<bdi>B1</bdi>（二の一）を打たれると、眼を2つに分けられなくなります。', en: 'If White gets the 2-1 point <bdi>B1</bdi>, Black can no longer split the space into two eyes.' } }),
    ld(['C1', 'D1', 'E1', 'F1'], ['G1'], 1, 'B2', { ok: ['G1', 'D1'],
      why: { ja: '<bdi>G1</bdi>と下がれば一線に4つ並んだ眼形（直四）で生き。<bdi>D1</bdi>で<bdi>C1</bdi>と<bdi>E1</bdi>側に眼を分けても生きです。', en: 'Blocking at <bdi>G1</bdi> leaves a straight four on the edge, which lives. <bdi>D1</bdi>, dividing eyes at <bdi>C1</bdi> and on the <bdi>E1</bdi> side, also lives.' },
      ng: { ja: '白に<bdi>G1</bdi>とハネられ、さらに中に置かれると眼が1つしかできません。眼を広げるか分けるかしましょう。', en: 'If White hanes at <bdi>G1</bdi> and then plays inside, Black gets only one eye. Widen the space or divide it.' } }),
  ] },
// ------------------------------------------------------------------ 2
{ id: 'kill', course: 'lifedeath',
  title: { ja: '眼を奪う（殺し）', en: 'Taking away eyes (killing)' },
  sub: { ja: 'ハネで狭め、急所に置く', en: 'Narrow with a hane, then hit the vital point' },
  intro: {
    ja: '<p>相手の石を殺すには、二眼をつくらせなければよいのです。</p><p>基本の手順は<b>外から眼の空間を狭める（ハネ）</b>ことと、<b>眼を分ける急所に置く</b>こと。相手が生きるために打ちたい点は、こちらにとっても急所です。</p><p>「自分が黒ならどこに打って生きるか」を考えると、白の打つべき場所が見えてきます。</p>',
    en: '<p>To kill a group, you only have to stop it from making two eyes.</p><p>The basic tools: <b>narrow the eye space from outside (hane)</b> and <b>play the vital point inside</b>. The point your opponent wants for life is also your key point.</p><p>Ask yourself: “Where would I play to live if I were Black?”</p>' },
  goal: { ja: '白番。黒石を殺してください', en: 'White to play and kill' },
  hint: { ja: '黒が打てば生きる点が、白の急所です。', en: 'The point that would let Black live is White’s vital point.' },
  diagram: { rows: ldRows(9, ['C1', 'D1', 'E1', 'F1', 'G1'], [], { empty: ['B1', 'H1'] }), view: VS, marks: [['B1', 'ok'], ['H1', 'ok'], ['E1', 'ok']], arrows: [['A1', 'B1']] },
  problems: [
    ld(['C1', 'D1', 'E1', 'F1'], ['G1'], 2, 'B2', { ok: ['G1', 'D1'],
      why: { ja: '<bdi>G1</bdi>とハネて眼の空間を狭めれば、残りは中手で殺せます。<bdi>D1</bdi>に置いて眼を分けさせない手も正解です。', en: 'The hane at <bdi>G1</bdi> shrinks the space, and the rest can be killed with a placement. Placing at <bdi>D1</bdi> right away also works.' },
      ng: { ja: '黒に<bdi>G1</bdi>と下がられると直四で生きてしまいます。', en: 'If Black blocks at <bdi>G1</bdi>, the straight four lives.' } }),
    ld(['C1', 'D1', 'E1', 'F1', 'E2'], ['B1'], 2, 'D3', { ok: ['E1'],
      why: { ja: '<bdi>E1</bdi>が<bdi>E2</bdi>と<bdi>F1</bdi>の眼を同時に消す急所。黒は左側に一眼しか作れません。', en: '<bdi>E1</bdi> is the vital point that removes both the <bdi>E2</bdi> and the <bdi>F1</bdi> eyes. Black can make only one eye on the left.' },
      ng: { ja: '黒に<bdi>E1</bdi>を打たれると、<bdi>E2</bdi>と<bdi>F1</bdi>の二眼で生きてしまいます。', en: 'If Black gets <bdi>E1</bdi>, <bdi>E2</bdi> and <bdi>F1</bdi> are two eyes.' } }),
    ld(['C1', 'D1', 'E1', 'F1', 'D2'], ['G1'], 2, 'C3', { ok: ['D1'],
      why: { ja: '<bdi>D1</bdi>への置きが急所。<bdi>D2</bdi>と<bdi>C1</bdi>の眼がどちらもできなくなります。', en: 'The placement at <bdi>D1</bdi> is vital: neither the <bdi>D2</bdi> eye nor the <bdi>C1</bdi> eye can be made.' },
      ng: { ja: '<bdi>G1</bdi>のハネだけでは、黒に<bdi>D1</bdi>と打たれて生きられます。', en: 'A hane at <bdi>G1</bdi> alone lets Black live with <bdi>D1</bdi>.' } }),
    ld(['C1', 'D1', 'E1', 'F1', 'C2'], ['B1', 'G1'], 2, 'B3', { ok: ['C1'],
      why: { ja: '<bdi>C1</bdi>が急所。<bdi>C2</bdi>を眼にさせず、一線の空間も分けさせません。両側のすき間は後からハネて狭められます。', en: '<bdi>C1</bdi> is vital: <bdi>C2</bdi> can no longer become an eye, and the first-line space cannot be divided. The gaps on both sides can be closed later with hane.' },
      ng: { ja: '黒に<bdi>C1</bdi>を打たれると<bdi>C2</bdi>が眼になり、一線にもう1つ眼ができます。', en: 'If Black plays <bdi>C1</bdi>, <bdi>C2</bdi> becomes an eye and another eye forms on the first line.' } }),
    ld(['C1', 'D1', 'E1', 'F1', 'G1'], ['B1', 'H1'], 2, 'B2', { ok: ['B1', 'H1'], line: ['B1', 'C1', 'H1', 'G1', 'E1'],
      why: { ja: '二線に7子並んだ形は、白が<bdi>B1</bdi>（または<bdi>H1</bdi>）とハネれば殺せます。両側からハネて、残った直三の真ん中<bdi>E1</bdi>に置くのが手順です。', en: 'Seven stones on the second line die if White hanes at <bdi>B1</bdi> (or <bdi>H1</bdi>). Hane on both sides, then place in the middle of the remaining straight three at <bdi>E1</bdi>.' },
      ng: { ja: '中から打つより、まず端からハネて眼の空間を狭めましょう。', en: 'Don’t start inside: first narrow the space with a hane from the end.' } }),
  ] },
// ------------------------------------------------------------------ 3
{ id: 'nakade', course: 'lifedeath',
  title: { ja: '急所と中手', en: 'Vital points and nakade' },
  sub: { ja: '直三・曲がり三・ハナ四・花五', en: 'Straight three, bent three, pyramid four, bulky five' },
  intro: {
    ja: '<p>囲まれた眼の空間が小さく、真ん中に打たれると一眼にしかならない形があります。その真ん中に打つ手を<b>中手（なかで）</b>といいます。</p><p>覚えておきたい形：<b>直三・曲がり三</b>（真ん中）、<b>ハナ四</b>（凸の中心）、<b>花五</b>（3つに接する点）。どれも<b>先に打った方が生き死にを決めます</b>。</p><p>四目でも<b>直四・曲がり四</b>は生き、<b>四角の四目</b>は打たなくても死、と覚えましょう。</p>',
    en: '<p>Some small eye spaces become a single eye once the opponent plays in the middle. That move is called <b>nakade</b>.</p><p>Shapes to remember: <b>straight three / bent three</b> (the middle), <b>pyramid four</b> (the centre of the T), <b>bulky five</b> (the point touching three others). Whoever plays the vital point first decides life or death.</p><p>Among four-point spaces, <b>straight four</b> and <b>bent four</b> live, while the <b>square four</b> is dead even without a move.</p>' },
  goal: { ja: '白番。中手で黒石を殺してください', en: 'White to play: kill with nakade' },
  hint: { ja: '眼の空間の「真ん中」はどこ？', en: 'Where is the middle of the eye space?' },
  diagram: { rows: ldRows(9, ['C1', 'D1', 'E1', 'D2'], []), view: VS, marks: [['D1', 'ok']] },
  problems: [
    ld(['C1', 'D1', 'E1'], [], 2, 'B2', { ok: ['D1'], line: ['D1'],
      why: { ja: '直三の真ん中<bdi>D1</bdi>。黒は<bdi>C1</bdi>と<bdi>E1</bdi>に分かれた眼を作れません。', en: 'The middle of the straight three, <bdi>D1</bdi>. Black can no longer make separate eyes at <bdi>C1</bdi> and <bdi>E1</bdi>.' },
      ng: { ja: '黒に<bdi>D1</bdi>を打たれると<bdi>C1</bdi>・<bdi>E1</bdi>の二眼で生きです。', en: 'If Black plays <bdi>D1</bdi>, <bdi>C1</bdi> and <bdi>E1</bdi> are two eyes.' } }),
    ld(['C1', 'D1', 'D2'], [], 2, 'C3', { ok: ['D1'], line: ['D1'],
      why: { ja: '曲がり三は曲がり角の<bdi>D1</bdi>が急所。白が先に打てば一眼です。', en: 'In a bent three the vital point is the corner of the bend, <bdi>D1</bdi>. With White there, Black has one eye.' },
      ng: { ja: '<bdi>D1</bdi>を黒に打たれると<bdi>C1</bdi>と<bdi>D2</bdi>の二眼ができます。', en: 'If Black gets <bdi>D1</bdi>, <bdi>C1</bdi> and <bdi>D2</bdi> become two eyes.' } }),
    ld(['C1', 'D1', 'E1', 'D2'], [], 2, 'C3', { ok: ['D1'], line: ['D1'],
      why: { ja: 'ハナ四（凸形）は中心の<bdi>D1</bdi>が急所。ほかの3点は全部<bdi>D1</bdi>にくっついています。', en: 'Pyramid four: the centre <bdi>D1</bdi> is vital — all three other points touch it.' },
      ng: { ja: '黒に<bdi>D1</bdi>を打たれると、<bdi>C1</bdi>・<bdi>E1</bdi>・<bdi>D2</bdi>と眼が分かれて生きます。', en: 'If Black plays <bdi>D1</bdi>, the space splits into <bdi>C1</bdi>, <bdi>E1</bdi> and <bdi>D2</bdi>, and Black lives.' } }),
    ld(['B1', 'C1', 'D1', 'B2', 'C2'], [], 2, 'A3', { ok: ['C1'], view: VC, line: ['C1'],
      why: { ja: '花五は3つの点に接する<bdi>C1</bdi>が急所。ここに置けば黒は二眼になれません。', en: 'Bulky five: the vital point is <bdi>C1</bdi>, which touches three other points. With White there, Black cannot get two eyes.' },
      ng: { ja: '<bdi>C1</bdi>以外に打つと、黒に<bdi>C1</bdi>を打たれて眼が2つに分かれます。', en: 'Anywhere else, and Black plays <bdi>C1</bdi> to split the space into two eyes.' } }),
    ld(['A1', 'B1', 'C1', 'A2', 'B2'], [], 2, 'A3', { ok: ['B1'], view: VC, line: ['B1'],
      why: { ja: '隅の花五。急所は<bdi>B1</bdi>です。前のレッスンの「生き」の問題と同じ点が、殺す側の急所にもなります。', en: 'A bulky five in the corner. The vital point is <bdi>B1</bdi> — the same point Black used to live in the previous lesson.' },
      ng: { ja: '黒に<bdi>B1</bdi>を打たれると生きてしまいます。生きる急所＝殺す急所です。', en: 'If Black gets <bdi>B1</bdi>, Black lives. The vital point for life is the vital point for killing.' } }),
  ] },
// ------------------------------------------------------------------ 4
{ id: 'corner', course: 'lifedeath',
  title: { ja: '隅の死活', en: 'Life and death in the corner' },
  sub: { ja: '隅は眼が作りやすく、急所も特殊', en: 'Corners: easy eyes, special vital points' },
  intro: {
    ja: '<p>隅は2辺が盤端なので、少ない石で眼を囲めます。そのかわり、<b>「二の一」</b>のような隅独特の急所があります。</p><p>また、<b>隅の曲がり四目</b>は、ルール上そのまま「死に」とされる特別な形です（日本ルール）。</p><p>隅の形では「すき間をふさぐ」「二の一に打つ」の2つを特に意識しましょう。</p>',
    en: '<p>Two sides of the corner are the board edge, so eyes are easy to surround there. In exchange, the corner has its own vital points, such as the <b>2-1 point</b>.</p><p>The <b>bent four in the corner</b> is a special shape that is simply counted as dead under Japanese rules.</p><p>In corner shapes, think about two things: closing the gap, and the 2-1 point.</p>' },
  goal: { ja: '黒は生き／白は殺し', en: 'Black lives / White kills' },
  hint: { ja: 'すき間（ハネられる所）と、二の一の点に注目。', en: 'Look at the gap where the opponent can hane, and at the 2-1 point.' },
  diagram: { rows: ldRows(9, ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'], [], { empty: ['D1'] }), view: VC, marks: [['B1', 'ok'], ['D1', 'x']] },
  problems: [
    ld(['A1', 'B1', 'C1', 'D1'], ['A2'], 1, 'B2', { ok: ['A2'], view: VC,
      why: { ja: '<bdi>A2</bdi>ですき間をふさげば、一線の4つの空き点（直四）が残って生きです。', en: 'Closing the gap at <bdi>A2</bdi> leaves a straight four on the first line, which is alive.' },
      ng: { ja: '白に<bdi>A2</bdi>と打たれると眼の空間が狭まり、中に置かれて死にます。', en: 'If White plays <bdi>A2</bdi>, the space shrinks and a placement inside kills.' } }),
    ld(['A1', 'B1', 'C1', 'A2'], ['A3'], 1, 'B3', { ok: ['B1'], view: VC,
      why: { ja: '<bdi>B1</bdi>で<bdi>C1</bdi>と<bdi>A1</bdi>側の眼が分かれます。上から<bdi>A3</bdi>とハネられても生きています。', en: '<bdi>B1</bdi> separates the eyes at <bdi>C1</bdi> and on the <bdi>A1</bdi> side. Black lives even if White hanes at <bdi>A3</bdi>.' },
      ng: { ja: '白に<bdi>B1</bdi>を打たれると眼が分かれず死んでしまいます。', en: 'If White takes <bdi>B1</bdi>, the eyes cannot be separated and Black dies.' } }),
    ld(['A1', 'B1', 'C1', 'A2'], ['A3'], 2, 'B3', { ok: ['B1', 'A3'], view: VC,
      why: { ja: '前の問題と同じ形で白番。急所の<bdi>B1</bdi>に置くか、<bdi>A3</bdi>とハネて眼の空間を狭めれば殺せます。', en: 'The same shape as the previous problem, White to play. Placing at the vital point <bdi>B1</bdi> or narrowing the space with the hane at <bdi>A3</bdi> both kill.' },
      ng: { ja: '黒に<bdi>B1</bdi>を打たれると生きてしまいます。急所かすき間、どちらかに打ちましょう。', en: 'If Black gets <bdi>B1</bdi>, Black lives. Play the vital point or the gap.' } }),
    ld(['A1', 'B1', 'C1', 'D1', 'A2', 'B2'], ['E2', 'E1'], 1, 'A3', { ok: ['B1'], view: VC,
      why: { ja: '隅の二の一<bdi>B1</bdi>が生きの急所。<bdi>E1</bdi>の方からハネられても、<bdi>A1</bdi>側と<bdi>C1</bdi>側に眼が分かれます。', en: 'The corner’s 2-1 point <bdi>B1</bdi> is the key to life. Even if White hanes in from <bdi>E1</bdi>, eyes form on the <bdi>A1</bdi> side and the <bdi>C1</bdi> side.' },
      ng: { ja: '<bdi>B1</bdi>を白に置かれると、眼を2つに分けられません。', en: 'If White places at <bdi>B1</bdi>, Black cannot divide the space into two eyes.' } }),
    ld(['A1', 'B1', 'C1', 'D1'], ['E1'], 2, 'B2', { ok: ['B1', 'E1'], view: VC,
      why: { ja: '<bdi>E1</bdi>とハネて狭めても、<bdi>B1</bdi>に置いても殺せます。どちらも黒に直四を作らせない手です。', en: 'Both the hane at <bdi>E1</bdi> and the placement at <bdi>B1</bdi> kill: neither lets Black make a straight four.' },
      ng: { ja: '黒に<bdi>E1</bdi>とふさがれると、一線に4つ並んだ直四で生きてしまいます。', en: 'If Black closes at <bdi>E1</bdi>, the straight four on the first line lives.' } }),
  ] },
];
