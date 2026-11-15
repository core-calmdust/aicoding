// Warm-ups for the go lessons that had none (2026-11-15). Each: explain (the lesson's diagram, its marks read aloud)
// → try (the same idea, mirrored: the problem the diagram shows — or the first one — turned left↔right; its answers
// are the problem's verified ok + good, mirrored). Texts ja / en here; the other 12 languages in lessons-ramps-new-tr.json
// ({ "<step>/<index>/<field>": { zh, … } }); the try's hint is the lesson's own (step.hint, all languages).
// Merged by lessons-ramps.mjs.
import fs from 'fs';
import path from 'path';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const TR = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'lessons-ramps-new-tr.json'), 'utf8')); } catch (e) { return {}; } })();
const C = 'ABCDEFGHJKLMNOPQRST';
const P = (ja, en) => ({ ja, en });
// mirror left↔right: a spec, and a point name
const mirS = sp => { const n = sp.n; let o = ''; for (let r = 0; r < n; r++) o += sp.stones.slice(r * n, r * n + n).split('').reverse().join(''); return Object.assign({}, sp, { stones: o }); };
const mirP = (q, n) => C[n - 1 - C.indexOf(q[0])] + q.slice(1);

export const TEXT = {
  atari: {
    t: P('アタリの石は、最後のダメで取れる', 'A stone in atari is captured on its last liberty'),
    body: P('<p>まん中の白石のまわりを見てください。3方向は黒石で、空いているのは<b>緑の丸</b>の1か所だけ。ダメが1つ＝<b>アタリ</b>です。</p><p>黒がそこに打つと、白石のダメがなくなって取れます。</p>',
      '<p>Look around the white stone in the middle. Three sides are black stones; only the <b>green circle</b> is empty. One liberty left: <b>atari</b>.</p><p>When Black plays there, the white stone has no liberties and is captured.</p>'),
    g: P('向きを変えた同じ形。白石を取ろう。', 'The same shape, mirrored. Capture the white stone.'),
    y: P('取れた！ダメが1つの石は、そのダメに打てば取れます。', 'Captured! A stone with one liberty falls when you play on it.') },
  escape: {
    t: P('アタリにされたら、ノビてダメを増やす', 'In atari? Extend to gain liberties'),
    body: P('<p>黒石は白に3方向を囲まれ、ダメは<b>緑の丸</b>の1つだけ。アタリです。</p><p>そこへ黒がノビると、つながった2つの石のダメが3つに増えて、すぐには取られなくなります。</p>',
      '<p>The black stone is surrounded on three sides; its only liberty is the <b>green circle</b>. It is in atari.</p><p>Extending there gives the two connected stones three liberties, so they cannot be captured right away.</p>'),
    g: P('向きを変えた同じ形。黒石を助けよう。', 'The same shape, mirrored. Save the black stone.'),
    y: P('正解！ノビてダメが増え、もう取られません。', 'Right! Extending added liberties; it is safe now.') },
  connect: {
    t: P('切れ目をつなぐ', 'Close the gap'),
    body: P('<p>上の黒石と下の黒石は、<b>緑の丸</b>の点で切れています。白にそこへ打たれると、下の黒石はアタリになってしまいます。</p><p>先に黒がつなげば2つの石は1つのかたまりになり、ダメも増えます。</p>',
      '<p>The upper and lower black stones are split at the <b>green circle</b>. If White plays there, the lower stone is in atari.</p><p>Connecting first makes them one group with more liberties.</p>'),
    g: P('向きを変えた同じ形。正しい一手を打とう。', 'The same shape, mirrored. Play the right move.'),
    y: P('正解！つながった石は、ダメを分け合って強くなります。', 'Right! Connected stones share their liberties and grow strong.') },
  direction: {
    t: P('端へ追いこむ方からアタリ', 'Give atari from the side that drives it to the edge'),
    body: P('<p>白石のダメは2つ。<b>緑の丸</b>からアタリすると、白は盤の端（<b>×</b>の方）へしか逃げられません。</p><p>端へ逃げてもダメは増えないので、続けてアタリして取れます。反対からアタリすると、広い方へ逃げられてしまいます。</p>',
      '<p>The white stone has two liberties. Atari from the <b>green circle</b> leaves White only one way out — toward the edge (the <b>×</b>).</p><p>Running to the edge gains nothing, so you keep giving atari and capture it. From the other side, White escapes into open space.</p>'),
    g: P('向きを変えた同じ形。白石を取りにいこう。', 'The same shape, mirrored. Go and capture the white stone.'),
    y: P('正解！端へ追いこめば、逃げてもダメが増えません。', 'Right! Driven to the edge, it gains no liberties as it runs.') },
  eyes: {
    t: P('眼が2つあれば取られない', 'Two eyes cannot be captured'),
    body: P('<p>黒石に囲まれた空き点を<b>眼</b>といい、白は眼の中に打てません。眼が2つあれば、白はどちらにも打てないので、ずっと取られません（<b>二眼で生き</b>）。</p><p>この黒石には眼になりそうな空き点が2つありますが、<b>緑の丸</b>のところが切れています。ここでつなげば、2つの空き点が本物の眼になって生きです。</p>',
      '<p>An empty point surrounded by black stones is an <b>eye</b>, and White cannot play inside it. With two eyes White can play in neither, so the stones are never captured (<b>two eyes = alive</b>).</p><p>These black stones have two would-be eyes, but they are split at the <b>green circle</b>. Connect there and both become real eyes: alive.</p>'),
    g: P('黒番。二眼をつくって生きよう。', 'Black to play. Make two eyes and live.'),
    y: P('正解！眼が2つできて、もう取られません。', 'Right! Two eyes — these stones can never be captured.') },
  semeai: {
    t: P('攻め合いは外ダメから詰める', 'In a race, fill the outside liberties first'),
    body: P('<p>まん中で黒と白がお互いを囲んでいます。<b>×</b>の2点が黒のダメ、白のダメはそのうちの1点と<b>緑の丸</b>。どちらもダメは2つです。</p><p>白だけのダメ（外ダメ）の緑の丸を詰めると、白のダメは1つになり、黒が先に取れます。両方のダメ（内ダメ）から詰めると、自分のダメも減ってしまいます。</p>',
      '<p>Black and White surround each other in the middle. Black’s liberties are the two <b>×</b> points; White’s are one of those and the <b>green circle</b>. Two each.</p><p>Fill the green circle, White’s own outside liberty: White drops to one and Black captures first. Filling the shared liberty costs you one too.</p>'),
    g: P('向きを変えた同じ形。攻め合いに勝とう。', 'The same shape, mirrored. Win the race.'),
    y: P('正解！外ダメを詰めて、白のダメだけを減らしました。', 'Right! Filling the outside liberty took one from White only.') },
  tesuji: {
    t: P('シチョウがだめなら、ゲタ', 'If the ladder fails, use a net'),
    body: P('<p>白石を追いかけたい場面。でも遠くに白石があり、アタリで追うとそこにつながって逃げられます（シチョウアタリ）。</p><p>そこで<b>緑の丸</b>に打って、逃げ道にふたをする<b>ゲタ</b>。アタリではありませんが、白がどちらへ出ても取れます。</p>',
      '<p>You want to chase the white stone, but a distant white stone would rescue a ladder (a ladder breaker).</p><p>So play the <b>green circle</b>: a <b>net</b> that lids the escape. It is not atari, yet White is captured whichever way it runs.</p>'),
    g: P('向きを変えた同じ形。手筋で白石を取ろう。', 'The same shape, mirrored. Capture with a tesuji.'),
    y: P('正解！ふたをすれば、白はどちらへ出ても取られます。', 'Right! With the lid on, White is caught whichever way it goes.') },
  live: {
    t: P('眼の空間を2つに分ける', 'Split the eye space in two'),
    body: P('<p>黒石の中に空いた場所がありますが、まだ眼は決まっていません。<b>緑の丸</b>は、空間を2つに分けて二眼をつくる急所です。</p><p>「この一手で、どことどこが眼になるか」を指さしながら考えましょう。</p>',
      '<p>There is open space inside the black stones, but no eyes are settled yet. The <b>green circle</b> is the vital point that splits it into two eyes.</p><p>Point to where the two eyes will be before you play.</p>'),
    g: P('向きを変えた同じ形。黒石を生かそう。', 'The same shape, mirrored. Make the black stones live.'),
    y: P('正解！これで眼が2つ。もう生きています。', 'Right! Two eyes now — the group lives.') },
  kill: {
    t: P('眼の空間を狭める・急所に置く', 'Shrink the eye space, or take the vital point'),
    body: P('<p>白番で、黒石を殺したい場面です。<b>緑の丸</b>は、眼の空間をはしから狭める点と、空間の中で眼を分けさせない急所です。</p><p>黒が打てば生きる点は、白にとっても急所。「自分が黒ならどこに打つか」を考えましょう。</p>',
      '<p>White to play, wanting to kill the black stones. The <b>green circles</b> are the point that shrinks the eye space from its end, and the vital point inside that stops it splitting.</p><p>Where Black would play to live is White’s vital point too: ask where you would play as Black.</p>'),
    g: P('白番。向きを変えた形で、黒石を殺そう。', 'White to play, mirrored shape: kill the black stones.'),
    y: P('正解！黒はもう二眼をつくれません。', 'Right! Black can no longer make two eyes.') },
  nakade: {
    t: P('眼の空間のまん中に置く（中手）', 'Play in the middle of the eye space (nakade)'),
    body: P('<p>黒の眼の空間は、まっすぐ3つ並んだ<b>直三</b>。そのまん中（<b>緑の丸</b>）が急所です。</p><p>白がまん中に打つと、黒は眼を2つに分けられず一眼になります。黒が先に打てば二眼で生き。先に打った方が勝ちです。</p>',
      '<p>Black’s eye space is three points in a row: a <b>straight three</b>. Its middle (<b>green circle</b>) is the vital point.</p><p>If White plays there, Black cannot split it into two eyes. If Black plays there first, Black lives. Whoever plays it first decides.</p>'),
    g: P('白番。中手で黒石を殺そう。', 'White to play. Kill the black stones with nakade.'),
    y: P('正解！まん中に置いて、黒の眼を1つにしました。', 'Right! The middle stone leaves Black only one eye.') },
  corner: {
    t: P('隅はすき間と「二の一」に注意', 'In the corner, mind the gap and the 2-1 point'),
    body: P('<p>隅の黒石。端に<b>すき間</b>（<b>緑の丸</b>）があり、ここから白にハネこまれると眼の空間が狭くなります。</p><p>先にすき間をふさげば、一線に4つ並んだ空き点（直四）が残って生きられます。隅では「すき間をふさぐ」「二の一に打つ」を意識しましょう。</p>',
      '<p>Black stones in the corner. There is a <b>gap</b> at the edge (<b>green circle</b>); a white hane there would shrink the eye space.</p><p>Close the gap first and four empty points in a row on the first line remain (a straight four): Black lives. In corners, think “close the gap” and “play the 2-1 point”.</p>'),
    g: P('黒番。向きを変えた隅の形で、黒石を生かそう。', 'Black to play, mirrored corner: make the black stones live.'),
    y: P('正解！すき間をふさいで、二眼の空間を守りました。', 'Right! The gap is closed and the eye space is safe.') },
  corners: {
    t: P('空いている隅が一番大きい', 'An empty corner is the biggest point'),
    body: P('<p>打ち始めの局面です。<b>緑の丸</b>は、まだ誰も打っていない隅。隅は2辺の盤端が味方してくれるので、少ない石で地を囲めます。</p><p>まん中（<b>×</b>）は盤端の助けがなく、今はまだ小さい手です。</p>',
      '<p>The opening. The <b>green circles</b> are corners nobody has played yet. Two board edges help you there, so a few stones enclose territory.</p><p>The centre (<b>×</b>) gets no help from the edges — it is small for now.</p>'),
    g: P('向きを変えた同じ局面。一番大きいところに打とう。', 'The same position, mirrored. Play the biggest point.'),
    y: P('正解！まずは空いている隅からです。', 'Right! Empty corners come first.') },
  urgent: {
    t: P('弱い石があれば、大場より急場', 'With a weak group about, urgent beats big'),
    body: P('<p>隅に入った白石には、まだ眼がありません。<b>緑の丸</b>は白の広がり先を止めて攻めながら、自分の地も守る急場です。</p><p><b>×</b>のような大きく見える場所は、弱い石の問題が片づいてからで間に合います。</p>',
      '<p>The white stones that slid into the corner have no eyes yet. The <b>green circle</b> blocks their extension — attacking them while guarding your own area. That is urgent.</p><p>Big-looking points like the <b>×</b> can wait until the weak group is settled.</p>'),
    g: P('向きを変えた同じ局面。急場を見つけよう。', 'The same position, mirrored. Find the urgent point.'),
    y: P('正解！弱い石への攻めは、どんな大場より先です。', 'Right! Attacking a weak group comes before any big point.') },
  base: {
    t: P('下から根拠を奪う', 'Take the base from below'),
    body: P('<p>根拠（眼をつくる足場）のない白石を攻める場面です。<b>緑の丸</b>は辺の下側で白の広がり先を止め、自分の地も固める手。</p><p>外から押す手（<b>×</b>）は白を強くするだけです。攻めは「下から、根拠を奪う」。</p>',
      '<p>Attacking white stones with no base (no footing for eyes). The <b>green circle</b> stops their extension along the side from below and firms up your area.</p><p>Pushing from outside (<b>×</b>) only makes White stronger. Attack from below: take the base.</p>'),
    g: P('向きを変えた同じ局面。相手の弱い石を攻めよう。', 'The same position, mirrored. Attack the weak stones.'),
    y: P('正解！根拠を奪えば、相手は苦しい戦いになります。', 'Right! Without a base, White is in for a hard fight.') },
  thickness: {
    t: P('星の下の三々は、地になる', 'The 3-3 under a 4-4 stone is territory'),
    body: P('<p>相手の星の石は外に強い反面、隅の<b>三々</b>（<b>緑の丸</b>）が空いています。ここに入れば、相手の陣地の中で地を取りながら生きられます。</p><p>相手の厚みに近いまん中（<b>×</b>）に打っても、効率が悪いだけです。</p>',
      '<p>A 4-4 stone is strong toward the outside but leaves the <b>3-3 point</b> (<b>green circles</b>) open. Invading there takes territory and lives inside the opponent’s area.</p><p>Playing near the opponent’s thickness in the centre (<b>×</b>) is just inefficient.</p>'),
    g: P('向きを変えた同じ局面。一番大きいところに打とう。', 'The same position, mirrored. Play the biggest point.'),
    y: P('正解！三々に入って、確実な地をつくれます。', 'Right! The 3-3 invasion makes sure territory.') },
  sente: {
    t: P('先手のヨセから打つ', 'Play the endgame moves in sente first'),
    body: P('<p>境界を決めていく終盤です。<b>緑の丸</b>のハネは、白が受けないと損をするので、白は必ず受けます。受けたあと、また黒の番＝<b>先手</b>です。</p><p><b>×</b>の手は後手。先手のヨセを先に打てば、後手の手もあとで打てます。</p>',
      '<p>The endgame, fixing the borders. The hane at the <b>green circle</b> must be answered, so White replies and it is Black’s turn again: <b>sente</b>.</p><p>The <b>×</b> move is gote. Play sente moves first and you still get the gote one afterwards.</p>'),
    g: P('向きを変えた同じ局面。一番大きいヨセを打とう。', 'The same position, mirrored. Play the biggest endgame move.'),
    y: P('正解！先手のハネを打って、まだ黒の番が続きます。', 'Right! The sente hane keeps the move with Black.') },
  hane: {
    t: P('ハネてツぐのが基本のヨセ', 'Hane and connect: the basic endgame move'),
    body: P('<p>境界が決まっていない端です。<b>緑の丸</b>にハネると、白の陣地を1路へこませられます。そのあとツいで、自分の石をしっかりさせます。</p><p>下がって守るだけ（<b>×</b>）だと、白にハネられる分だけ損をします。</p>',
      '<p>An unsettled border at the edge. A hane at the <b>green circle</b> pushes into White’s area by one line; then connect to keep your stones solid.</p><p>Just drawing back (<b>×</b>) loses the points White gains by playing the hane instead.</p>'),
    g: P('向きを変えた同じ局面。境界の一番よいヨセを打とう。', 'The same position, mirrored. Play the best border move.'),
    y: P('正解！ハネて、相手の陣地を減らしました。', 'Right! The hane shrank White’s area.') },
};

// the items: built from lessons.json (the lessons' diagrams and problems), so this runs after lessons-build.mjs
export function build(D) {
  const out = {};
  for (const id in TEXT) {
    const s = D.steps.find(x => x.id === id); if (!s) throw new Error('no lesson ' + id);
    const T = TEXT[id], d = s.diagram, k = Math.max(0, s.problems.findIndex(p => JSON.stringify(p.s) === JSON.stringify(d.s))), Pb = s.problems[k], n = Pb.s.n;
    const ok = [...Pb.ok, ...(Pb.good || [])].map(q => mirP(q, n)), a = ok[0], ax = C.indexOf(a[0]), ay = +a.slice(1);
    const look = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => [ax + dx, ay + dy]).filter(([x, y]) => x >= 0 && x < n && y >= 1 && y <= n).map(([x, y]) => C[x] + y);
    const tx = (j, f) => Object.assign({}, T[f], TR[`${id}/${j}/${f}`] || {});
    out[id] = [
      // explain: the problem itself (its verified answers marked green; the diagram's × too when the diagram is this problem)
      { k: 'explain', s: Pb.s, marks: Pb.ok.map(q => [q, 'ok']).concat(JSON.stringify(Pb.s) === JSON.stringify(d.s) ? (d.marks || []).filter(m => m[1] === 'x') : []), t: tx(0, 't'), body: tx(0, 'body') },
      { k: 'try', s: mirS(Pb.s), ok, look, g: tx(1, 'g'), h: s.hint, y: tx(1, 'y') },
    ];
  }
  return out;
}
