// レッスン patolli/lessons.json と、レッスンのページの豆知識 patolli/lux.json を作る（node tools/gen_lessons.js）。
// 点検は node tools/check_lessons.js。各レッスン＝考え方（実演）→ やさしい練習 → 採点5問（1問20点、75点で合格）。
// 問題の局面は自己対局から。パズル（puzzles.json）と同じ局面は使わない。豆知識は claude/patolli-spec.md §0 の事実だけ。
const fs = require('fs'), path = require('path'), C = require('./learn_common.js'), E = C.E;
let used = new Set();
try { for (const T of require('../puzzles.json').themes) for (const z of T.puzzles) used.add(E.key(C.unpack(z.s)) + '#' + z.n); } catch (e) {}
const MINGAP = 0.04;
function collect(rule, seed, want) {
  const got = {}, seen = new Set(); for (const k in want) got[k] = [];
  for (const q of C.positions(rule, seed, 4000)) {
    if (Object.keys(want).every(k => got[k].length >= want[k])) break;
    const key = E.key(q.s) + '#' + q.n; if (seen.has(key) || used.has(key)) continue; seen.add(key);
    const e2 = E.evaluate(q.s, q.n, 2); if (e2.length < 2 || e2[0].wp - e2[1].wp < MINGAP) continue;
    const kind = C.kindOf(q.s, q.n, e2); if (!(kind in want) || got[kind].length >= want[kind]) continue;
    const j = C.judge(q.s, q.n, MINGAP); if (!j) continue;
    got[kind].push({ s: q.s, n: q.n, ev: j.ev, gap: j.gap, kind });
  }
  for (const k in got) got[k].sort((a, b) => b.gap - a.gap);
  return got;
}
const prob = q => { const b = q.ev[0].move; return { kind: 'move', s: C.pack(q.s), n: q.n, ok: q.ev.filter(e => q.ev[0].wp - e.wp < .005).map(e => [e.move.from, e.move.to]), best: [b.from, b.to], ev: q.ev.map(e => [e.move.from, e.move.to, Math.round(e.wp * 1000) / 1000]), why: C.whyOf(q.s, q.n, q.kind, q.ev), ng: C.ngOf(q.s, q.n, q.kind, q.ev), look: C.lookOf(q.s, q.n, q.kind, b) }; };
const fill = (o, v) => { const r = {}; for (const l in o) r[l] = o[l].replace(/\{(\w+)\}/g, (_, k) => v[k]); return r; };
const arrow = (q, m) => { const R = E.RULES[q.s.rule]; return m.from === 0 || m.to > R.L ? [] : [{ type: 'arrow', from: C.cellOf(q.s, m.from), to: C.cellOf(q.s, m.to), color: '#3df59a' }]; };
// 準備：実演（最善手を動かして見せる）と、やさしい練習1問
function ramp(L, A, B) {
  const a = A.ev[0].move, b = B.ev[0].move;
  return [
    { k: 'explain', s: C.pack(A.s), n: A.n, seq: [[a.from, a.to]], marks: C.lookOf(A.s, A.n, A.kind, a).concat(arrow(A, a)), t: L.ex.t, body: L.ex.body },
    { k: 'try', s: C.pack(B.s), n: B.n, ok: B.ev.filter(e => B.ev[0].wp - e.wp < .005).map(e => [e.move.from, e.move.to]), marks: [], look: C.lookOf(B.s, B.n, B.kind, b), t: L.tr.t, h: L.hints[0],
      g: fill(C.MSG['w.' + B.kind], { a: C.pct(B.ev[0].wp), b: C.pct(B.ev[1].wp) }), y: C.UI.rampRetry },
  ];
}
const LESSONS = [
  { id: 'again', cat: 'basic', rule: 'bell', kinds: ['again'], title: { ja: '腕の先でもう一度', en: 'Arm ends: throw again' }, tip: { ja: 'もう一度投げられる手は、それだけで得', en: 'A move that throws again is a free extra turn' },
    body: { ja: '<p>腕の先の丸いマス（8つ）に止まると<b>もう一度投げられます</b>。1回の番で2回動けるのは大きな得です。</p><p>迷ったら、まず腕の先に届く駒を探しましょう。</p>', en: '<p>Land on one of the eight rounded squares at the arm ends and you <b>throw again</b>. Two moves in one turn is a big gain.</p><p>When unsure, first look for a piece that reaches an arm end.</p>' },
    ex: { t: { ja: '腕の先に止まる', en: 'Land on an arm end' }, body: { ja: '<p>光るマスが腕の先。この目でそこに止まれる駒を動かすと、もう一度投げられます。</p>', en: '<p>The glowing square is an arm end. Moving the piece that lands there gives you another throw.</p>' } },
    tr: { t: { ja: '腕の先に止まる駒を動かそう', en: 'Move the piece that lands on an arm end' } },
    hints: [{ ja: '腕の先の丸いマスは、道の7・8マス目から15マスごと。出た数を足して届く駒は？', en: 'Arm ends are squares 7 and 8 of your road, then every 15. Which piece reaches one?' }, { ja: '光るマスに届く駒を探そう。', en: 'Find the piece that reaches the glowing square.' }] },
  { id: 'enter', cat: 'basic', rule: 'bell', kinds: ['enter'], title: { ja: '「1」が出たら入れる', en: 'A 1 brings a piece on' }, tip: { ja: '入れるのは「1」の目だけ。約16%', en: 'Only a 1 enters: about 16%' },
    body: { ja: '<p>盤に自分の駒があるとき、待ちの駒を入れられるのは<b>「1」の目だけ</b>。「1」が出る確率は約16%（6回に1回ほど）です。</p><p>6個すべて上げるには5回の「1」が要ります。「1」が出たら、まず入れることを考えましょう。</p>', en: '<p>With a piece on the board, a waiting piece enters <b>only with a 1</b> — about 16% of throws (one in six).</p><p>You need five 1s to bring all six pieces round. When a 1 comes, think of entering first.</p>' },
    ex: { t: { ja: '「1」で入れる', en: 'Enter with a 1' }, body: { ja: '<p>「1」が出ました。盤上の駒を1マス進めるより、待ちの駒を入れる方が、あとで使える目が増えます。</p>', en: '<p>A 1. Rather than move a piece one square, bring a waiting piece on: it gives you more usable throws later.</p>' } },
    tr: { t: { ja: '「1」の使い道を選ぼう', en: 'Choose how to use the 1' } },
    hints: [{ ja: '「1」は約16%。待ちの駒はあといくつ？', en: 'A 1 is about 16%. How many pieces are still waiting?' }, { ja: '待ちの駒をタップすると入れられます。', en: 'Tap a waiting piece to bring it on.' }] },
  { id: 'goal', cat: 'basic', rule: 'bell', kinds: ['goal'], title: { ja: 'ちょうどの目で上がる', en: 'Home by exact throw' }, tip: { ja: '上がりまでの残りを数える', en: 'Count the distance home' },
    body: { ja: '<p>上がりは最後のマス（59マス目）の次。<b>ちょうどの目</b>のときだけ上がれます。越える目では、その駒は動かせません。</p><p>上がれる駒があるときは、たいてい上がるのがいちばんです。</p>', en: '<p>Home is the step after the last square (59), reached only with the <b>exact throw</b>. A throw that would go past cannot move that piece.</p><p>When a piece can go home, that is usually the best move.</p>' },
    ex: { t: { ja: 'ちょうどで上がる', en: 'Home exactly' }, body: { ja: '<p>残りのマスの数と、出た数がぴったり同じ駒が上がれます。</p>', en: '<p>The piece whose distance home equals the throw goes home.</p>' } },
    tr: { t: { ja: '上がれる駒を動かそう', en: 'Bring the piece home' } },
    hints: [{ ja: '59マス目の駒は1、58マス目は2…で上がれます。', en: 'From square 59 you need 1, from 58 you need 2, and so on.' }, { ja: '上がり（盤の外）の印が出る駒を探そう。', en: 'Look for the piece whose green mark is on “Home”.' }] },
  { id: 'mix', cat: 'basic', rule: 'bell', kinds: ['again', 'enter', 'goal', 'again', 'enter'], mix: true, title: { ja: 'まとめ：ベルの復元', en: 'Review: Bell’s rules' }, tip: { ja: 'もう一度・入場・上がりを見分ける', en: 'Again, enter or home?' },
    body: { ja: '<p>ベルの復元は「先に6個上げた方の勝ち」。勝ち負けに大きくひびくのは、<b>もう一度のマス</b>・<b>「1」での入場</b>・<b>ちょうどでの上がり</b>です。</p><p>印のマスで払う宝は勝ち負けを変えませんが、勝ったときの取り分が減ります。</p>', en: '<p>In Bell’s rules the first to bring six home wins. What swings the race is <b>arm ends</b>, <b>entering with a 1</b>, and <b>going home exactly</b>.</p><p>Paying on a marked square does not change who wins, but it shrinks what you take home.</p>' },
    ex: { t: { ja: 'どの手が得？', en: 'Which move gains most?' }, body: { ja: '<p>動かせる駒を1つずつ見て、もう一度・入場・上がりのどれかにならないか確かめます。</p>', en: '<p>Check each piece that can move: does it throw again, enter, or go home?</p>' } },
    tr: { t: { ja: 'いちばん良い手を選ぼう', en: 'Choose the best move' } },
    hints: [{ ja: '腕の先に届く駒、入れられる駒、上がれる駒の順に探そう。', en: 'Look for a piece that reaches an arm end, one that can enter, one that can go home.' }, { ja: '光るマスが行き先です。', en: 'The glowing square is the destination.' }] },
  { id: 'pen', cat: 'vari', rule: 'popular', kinds: ['pen'], title: { ja: '印のマスを避ける', en: 'Avoid the marked squares' }, tip: { ja: '宝がなくなると負け', en: 'No stakes left means you lose' },
    body: { ja: '<p>広く知られたルールでは宝は各6。<b>相手の宝がなくなれば勝ち</b>、自分の宝がなくなれば負けです。</p><p>黒い三角の<b>印のマス</b>に止まると相手へ宝を1払います。別の駒で同じ目を使えないか、先に確かめましょう。</p>', en: '<p>In the popular rules each side has 6 stakes. <b>Take all your rival’s and you win</b>; lose all yours and you lose.</p><p>Landing on a <b>marked square</b> (black triangle) pays your rival 1. First check whether another piece can use the same throw.</p>' },
    ex: { t: { ja: '印のマスに止まらない', en: 'Stay off the marked square' }, body: { ja: '<p>赤い輪が印のマス。そこに止まる駒ではなく、別の駒を動かします。</p>', en: '<p>The red ring is a marked square. Move another piece instead of the one that lands there.</p>' } },
    tr: { t: { ja: '宝を払わない手を選ぼう', en: 'Choose the move that pays nothing' } },
    hints: [{ ja: '印のマスは各腕の先から数えて4つ目。そこに止まる駒はどれ？', en: 'Marked squares are the fourth from each arm end. Which piece would land on one?' }, { ja: '赤い輪のマスに止まらない駒を選ぼう。', en: 'Pick a piece that does not land on a red ring.' }] },
  { id: 'cap', cat: 'vari', rule: 'popular', kinds: ['cap'], title: { ja: '中央で取る', en: 'Capture in the centre' }, tip: { ja: '取れるのは中央の4マスだけ', en: 'Only on the four centre squares' },
    body: { ja: '<p>中央の4マスでだけ、相手の駒のいるマスに止まって<b>取れます</b>。取られた駒は待ちに戻り、持ち主が宝を1払います。</p><p>相手は進んだ分をやり直しになり、宝も動く大きな一手です。</p>', en: '<p>Only on the four centre squares may you land on a rival piece and <b>capture</b> it. It goes back to waiting and its owner pays 1.</p><p>Your rival loses the distance and a stake — a big move.</p>' },
    ex: { t: { ja: '中央の相手の駒を取る', en: 'Capture the piece in the centre' }, body: { ja: '<p>中央のマスにいる相手の駒まで、ちょうどの数で届く駒を動かします。</p>', en: '<p>Move the piece that reaches the rival piece on a centre square exactly.</p>' } },
    tr: { t: { ja: '取れる駒を動かそう', en: 'Make the capture' } },
    hints: [{ ja: '中央の4マスに相手の駒はいる？そこまでの数を数えよう。', en: 'Is a rival piece on a centre square? Count the distance to it.' }, { ja: '光るマスが取れる場所です。', en: 'The glowing square is where you capture.' }] },
  { id: 'safe', cat: 'vari', rule: 'popular', kinds: ['safe'], title: { ja: '中央の危険を避ける', en: 'Stay safe in the centre' }, tip: { ja: '中央に止まる前に、相手との距離を数える', en: 'Count the distance before you stop in the centre' },
    body: { ja: '<p>中央のマスにいる駒は、相手の駒が<b>1〜4マス手前</b>にいると次の番で取られるかもしれません（2か3マス手前がいちばん危険で、それぞれ約31%）。</p><p>中央に止まる手・中央に残る手は、取られる確率と比べて決めましょう。</p>', en: '<p>A piece on a centre square may be captured next turn when a rival piece stands <b>1–4 squares behind</b> it (2 or 3 behind is worst: about 31% each).</p><p>Before stopping or staying in the centre, weigh the chance of being captured.</p>' },
    ex: { t: { ja: '取られにくい手を選ぶ', en: 'Choose the safer move' }, body: { ja: '<p>中央でねらわれる駒を動かすか、中央に止まらない手を選びます。</p>', en: '<p>Move the piece that is threatened in the centre, or choose a move that does not stop there.</p>' } },
    tr: { t: { ja: '取られにくい手を選ぼう', en: 'Choose the move that is harder to capture' } },
    hints: [{ ja: '中央の4マスの近くに相手の駒はいる？', en: 'Is a rival piece close behind one of the centre squares?' }, { ja: '光るマスが安全な行き先です。', en: 'The glowing square is the safe destination.' }] },
  { id: 'pmix', cat: 'vari', rule: 'popular', kinds: ['pen', 'again', 'cap', 'enter', 'safe'], mix: true, title: { ja: 'まとめ：広く知られたルール', en: 'Review: popular rules' }, tip: { ja: '宝の損得まで考える', en: 'Count the stakes too' },
    body: { ja: '<p>広く知られたルールは52マス。入れるのは「1」だけ、中央の4マスでだけ取れ、0の目は場へ宝を1供えます。</p><p>宝がなくなると負けなので、<b>宝を払う手・もらえる手</b>を見落とさないことが大事です。</p>', en: '<p>The popular rules use 52 squares: only a 1 enters, captures happen only in the centre, and a 0 offers 1 to the pool.</p><p>Running out of stakes loses the game, so never miss a move that <b>pays or earns a stake</b>.</p>' },
    ex: { t: { ja: '宝の動きを見る', en: 'Watch the stakes' }, body: { ja: '<p>動かせる駒を1つずつ見て、印のマス・腕の先・中央の取り合いを確かめます。</p>', en: '<p>Check each piece that can move: marked square, arm end, or a fight in the centre?</p>' } },
    tr: { t: { ja: 'いちばん良い手を選ぼう', en: 'Choose the best move' } },
    hints: [{ ja: '印のマス（払う）・腕の先（もう一度）・中央（取る／取られる）を順に見よう。', en: 'Check marked squares (pay), arm ends (again) and the centre (capture or be captured).' }, { ja: '光るマスが行き先です。', en: 'The glowing square is the destination.' }] },
];
// 豆の確率のレッスン（選ぶ問題）
const empty = { rule: 'bell', pos: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], turn: 0 };
const ch = (q, opts, ans, why) => ({ kind: 'choice', s: empty, q, opts, ans, why: ['c.' + why, {}] });
const PROB = {
  id: 'prob', cat: 'basic', rule: 'bell', title: { ja: '豆の確率', en: 'Bean chances' }, tip: { ja: '2と3がいちばん出やすい', en: '2 and 3 come up most' },
  body: { ja: '<p>豆を5個投げ、白い印の出た数だけ進みます。どの豆も印が出るのは半々なので、出方は32通り。</p><p><b>1＝5通り（約16%）、2＝10通り（約31%）、3＝10通り（約31%）、4＝5通り（約16%）</b>。5個とも印（10マス進む）と0個（進めない）は1通りずつ（約3%）です。</p>', en: '<p>You throw five beans and move as many squares as white marks. Each bean is marked half the time, so there are 32 outcomes.</p><p><b>1: 5 ways (about 16%), 2: 10 ways (about 31%), 3: 10 ways (about 31%), 4: 5 ways (about 16%)</b>. All five marked (move 10) and none (no move) are 1 way each (about 3%).</p>' },
  diagram: { s: empty, marks: [] },
  ramp: [
    { k: 'explain', s: empty, n: null, seq: [], marks: [], t: { ja: '32通りを数える', en: 'Counting the 32 outcomes' }, body: { ja: '<p>印が2個出る出方は「5個から2個を選ぶ」ので10通り。3個も同じ10通りです。だから2と3がいちばん出やすく、合わせて約62%になります。</p>', en: '<p>Two marked beans can come up in 10 ways (choose 2 of 5), and three in 10 ways as well. So 2 and 3 are the most common: about 62% together.</p>' } },
    { k: 'try', kind: 'choice', s: empty, opts: [{ ja: '1', en: '1' }, { ja: '2と3', en: '2 and 3' }, { ja: '4', en: '4' }], ans: 1, t: { ja: 'いちばん出やすい目は？', en: 'Which throws are the most common?' }, h: { ja: '出方が10通りずつある目です。', en: 'The ones with 10 ways each.' }, g: { ja: '2と3はそれぞれ32通り中10通り（約31%）です。', en: '2 and 3 each come up in 10 of 32 outcomes (about 31%).' }, y: C.UI.rampRetry },
  ],
  problems: [
    ch({ ja: '「1」が出る確率は？（待ちの駒を入れられる目）', en: 'How likely is a 1 (the throw that brings a piece on)?' }, [{ ja: '約3%', en: 'about 3%' }, { ja: '約16%', en: 'about 16%' }, { ja: '約31%', en: 'about 31%' }], 1, 'one'),
    ch({ ja: '5個とも印が出ると、何マス進める？', en: 'All five beans marked: how far do you move?' }, [{ ja: '5マス', en: '5 squares' }, { ja: '10マス', en: '10 squares' }, { ja: '進めない', en: 'No move' }], 1, 'ten'),
    ch({ ja: '2か3が出る確率は、合わせてどのくらい？', en: 'How likely is a 2 or a 3, together?' }, [{ ja: '約31%', en: 'about 31%' }, { ja: '約47%', en: 'about 47%' }, { ja: '約62%', en: 'about 62%' }], 2, 'mid'),
    ch({ ja: '印が1つも出ない（進めない）確率は？', en: 'How likely is no mark at all (no move)?' }, [{ ja: '約3%', en: 'about 3%' }, { ja: '約16%', en: 'about 16%' }, { ja: '約25%', en: 'about 25%' }], 0, 'zero'),
    ch({ ja: '上がりまで残り4マスの駒。次の1投げでちょうど上がれる確率は？', en: 'A piece is 4 squares from home. How likely is it to go home on the next throw?' }, [{ ja: '約16%', en: 'about 16%' }, { ja: '約31%', en: 'about 31%' }, { ja: '約50%', en: 'about 50%' }], 0, 'four'),
  ],
  hints: [{ ja: '出方は全部で32通り。1＝5、2＝10、3＝10、4＝5、5個＝1、0個＝1。', en: 'There are 32 outcomes: 1 → 5, 2 → 10, 3 → 10, 4 → 5, five → 1, none → 1.' }, { ja: '通りの数を32で割ってみよう。', en: 'Divide the number of ways by 32.' }],
};
const CMSG = {
  'c.one': { ja: '「1」は32通り中5通り＝約16%。6回に1回ほどです。', en: 'A 1 is 5 of 32 outcomes — about 16%, roughly one throw in six.' },
  'c.ten': { ja: '5個とも印なら10マス進めます（確率は32分の1）。', en: 'All five marked counts 10 (a 1-in-32 throw).' },
  'c.mid': { ja: '2が10通り、3が10通りで、合わせて32通り中20通り＝約62%。', en: '10 ways for a 2 and 10 for a 3: 20 of 32, about 62%.' },
  'c.zero': { ja: '0個は32通り中1通り＝約3%です。', en: 'No mark is 1 of 32 outcomes — about 3%.' },
  'c.four': { ja: 'ちょうど4が要ります。4は32通り中5通り＝約16%。', en: 'You need exactly a 4: 5 of 32 outcomes, about 16%.' },
};
const out = { version: 1, rule: 'bell', score: { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 }, ui: C.UI, msg: Object.assign({}, C.MSG, CMSG),
  cats: [{ id: 'basic', name: { ja: '基本（ベルの復元）', en: 'Basics (Bell’s rules)' }, steps: ['prob', 'again', 'enter', 'goal', 'mix'] }, { id: 'vari', name: { ja: '広く知られたルール', en: 'Popular rules' }, steps: ['pen', 'cap', 'safe', 'pmix'] }], steps: [PROB] };
const pool = { bell: collect('bell', 771, { again: 12, enter: 10, goal: 9 }), popular: collect('popular', 772, { pen: 9, cap: 9, safe: 9, again: 2, enter: 2 }) };
for (const L of LESSONS) {
  const P = pool[L.rule], take = k => { const q = P[k].shift(); if (!q) throw new Error('not enough ' + k + ' for ' + L.id); return q; };
  let A, B, probs;
  if (L.mix) { probs = L.kinds.map(k => P[k].pop()); A = P[L.kinds[0]].pop(); B = P[L.kinds[1]].pop(); if (!A || !B || probs.some(x => !x)) throw new Error('not enough for ' + L.id); }
  else { A = take(L.kinds[0]); B = take(L.kinds[0]); probs = [0, 1, 2, 3, 4].map(() => take(L.kinds[0])); }
  out.steps.push({ id: L.id, cat: L.cat, rule: L.rule, title: L.title, tip: L.tip, body: L.body, diagram: { s: C.pack(A.s), marks: C.lookOf(A.s, A.n, A.kind, A.ev[0].move) }, ramp: ramp(L, A, B), problems: probs.map(prob), hints: L.hints });
  console.log(L.id, 'ok');
}
const order = out.cats.flatMap(c => c.steps); out.steps.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
C.TR.fill(out);   // 題・本文・ヒントなどに残りの12言語を足す（tools/learn_i18n.js）
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(out));
// ---- lux.json：レッスンのページ（shared/luxintro.js）の見出しの文言と豆知識。事実は claude/patolli-spec.md §0 にあるものだけ
const LUX = {
  ui: {
    ja: { course: 'コース', kind: '形式', pass: '合格', stages: '{n}ステージ', probs: '{n}問', passDrill: '全クリア', passPts: '75点以上', figL: 'レッスンの局面', figO: '定跡の局面', howDrill: '', howProbs: '{n}問、1問20点の100点満点。75点以上で合格です。ヒントを見ると、その問題の点数が下がります。', line: '手順', lineV: '{n}手', practice: '練習', practiceV: '{n}問' },
    en: { course: 'Course', kind: 'Format', pass: 'Pass', stages: '{n} stages', probs: '{n} puzzles', passDrill: 'Clear all', passPts: '75 pts+', figL: 'Lesson position', figO: 'The opening position', howDrill: '', howProbs: '{n} puzzles, 20 points each (100 in all). 75 points passes. Using a hint lowers that puzzle’s score.', line: 'Line', lineV: '{n} moves', practice: 'Practice', practiceV: '{n} puzzles' },
  },
  lessons: {
    prob: { trivia: { ja: '豆の数は記録によって違います。16世紀のサアグンは4個、デュランは5個か6個と書いています。このゲームでは5個で遊びます。', en: 'The accounts differ on the number of beans: in the sixteenth century Sahagún wrote of four, Durán of five or six. This game uses five.' } },
    again: { trivia: { ja: 'デュランによると、盤はござ（ペタテ）に液状のゴムで描いた X 形でした。', en: 'According to Durán, the board was an X drawn with liquid rubber on a reed mat (petate).' } },
    enter: { trivia: { ja: '駒は小石12個。赤6個と青6個を2人で分けたと、デュランとサアグンが書いています。', en: 'The pieces were twelve pebbles — six red and six blue, shared between the two players, as Durán and Sahagún record.' } },
    goal: { trivia: { ja: '当時の入り方・進む向き・上がり方は、どの史料にも残っていません。ここで遊ぶルールは、R.C.ベルが1960年に「知られていることが少なすぎる」と断ったうえで示した復元です。', en: 'How pieces entered, which way they ran and how they went home is recorded nowhere. The rules here are the reconstruction R. C. Bell offered in 1960, with the warning that too little is known.' } },
    mix: { trivia: { ja: 'デュランは、豆5個すべてに印が出ると10と数えた、と書いています。', en: 'Durán writes that all five beans showing their mark counted as ten.' } },
    pen: { trivia: { ja: 'パトリは大きな賭けを伴うゲームで、身分を問わず遊ばれました。', en: 'Patolli was played for high stakes, by people of every rank.' } },
    cap: { trivia: { ja: '「52マスは暦の52年周期を表す」という説があります。考古学者カソの解釈で、当時の史料にそう書かれているわけではありません。', en: 'One theory holds that 52 squares stand for the 52-year calendar cycle. It is the archaeologist Caso’s interpretation; no source of the time says so.' } },
    safe: { trivia: { ja: 'スペイン人はパトリを禁じ、ござや豆を焼いたと、デュランは書いています。', en: 'Durán writes that the Spanish banned patolli and burned the mats and beans.' } },
    pmix: { trivia: { ja: 'ゲームの名前は、投げる豆（ナワトル語でパトリ）から来ています。', en: 'The game is named after the beans that are thrown (patolli in Nahuatl).' } },
  },
  openings: {},
};
C.TR.fill(LUX.lessons); Object.assign(LUX.ui, C.TR.LUX_UI);   // 豆知識と見出しの残り12言語
fs.writeFileSync(path.join(__dirname, '..', 'lux.json'), JSON.stringify(LUX));
console.log('lessons.json', out.steps.length, 'lessons; lux.json');
