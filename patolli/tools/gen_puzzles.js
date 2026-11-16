// 次の一手パズル patolli/puzzles.json を作る（node tools/gen_puzzles.js）。点検は node tools/audit_puzzles.js。
// 自己対局の局面から、「その目でいちばん良い手」が勝率（2投げ先まで読む）で2番目よりはっきり良く、3投げ先まで読んでも
// 同じ手が最善のものだけを選ぶ。手番は手前（side 0）に直してある。
// ベルの復元は「先に6個上げた方の勝ち」なので、勝率に効くのは もう一度のマス・入場・上がり。宝の損得（印のマス）と
// 中央の取り合いは、宝がなくなると負ける「広く知られたルール」の問題にしている。
const fs = require('fs'), path = require('path'), C = require('./learn_common.js'), E = C.E;
const THEMES = [
  { id: 'again', rule: 'bell', kind: 'again', cat: 'basic', n: 30, name: { ja: '腕の先でもう一度', en: 'Arm ends: throw again' }, desc: { ja: '腕の先の丸いマスに止まって、もう一度投げる一手。', en: 'Land on a rounded arm-end square and throw again.' }, hint: { ja: '腕の先の丸いマスは8つ。出た数を足して届く駒は？', en: 'There are eight rounded arm-end squares. Which piece reaches one with this throw?' } },
  { id: 'enter', rule: 'bell', kind: 'enter', cat: 'basic', n: 30, name: { ja: '「1」で入れる', en: 'Enter with a 1' }, desc: { ja: '「1」の目が出たとき、待ちの駒を入れるか、盤上の駒を進めるか。', en: 'You threw a 1: bring a waiting piece on, or move a piece on the board?' }, hint: { ja: '盤に駒があるとき、入れるのは「1」の目だけ。「1」は6回に1回ほどです。', en: 'With pieces on the board only a 1 enters — about one throw in six.' } },
  { id: 'goal', rule: 'bell', kind: 'goal', cat: 'basic', n: 20, name: { ja: 'ちょうどで上がる', en: 'Home by exact throw' }, desc: { ja: 'ちょうどの目で上がれる駒を見つける。', en: 'Find the piece that goes home with the exact throw.' }, hint: { ja: '上がりは最後のマスの次。残りのマスの数と出た数が同じ駒は？', en: 'Home is the step after the last square. Which piece is exactly that far away?' } },
  { id: 'pen', rule: 'popular', kind: 'pen', cat: 'tactics', n: 30, name: { ja: '印のマスを避ける', en: 'Avoid the marked squares' }, desc: { ja: '宝がなくなると負け。黒い三角のマスに止まらない一手。', en: 'Run out of stakes and you lose. Find the move that stays off the black triangles.' }, hint: { ja: '赤い輪のマスが印のマス。そこに止まらない駒を選ぼう。', en: 'Red rings show marked squares. Pick a piece that does not land on one.' } },
  { id: 'cap', rule: 'popular', kind: 'cap', cat: 'tactics', n: 20, name: { ja: '中央で取る', en: 'Capture in the centre' }, desc: { ja: '中央の4マスにいる相手の駒に、ちょうど止まって取る。', en: 'Land exactly on a rival piece on one of the four centre squares.' }, hint: { ja: '取れるのは中央の4マスだけ。相手の駒までの数を数えよう。', en: 'Captures happen only on the four centre squares. Count the distance to the rival piece.' } },
  { id: 'safe', rule: 'popular', kind: 'safe', cat: 'tactics', n: 20, name: { ja: '中央の危険を避ける', en: 'Stay safe in the centre' }, desc: { ja: '中央のマスで取られにくい方の手を選ぶ。', en: 'Choose the move that is harder to capture in the centre.' }, hint: { ja: '中央のマスに止まる駒は、相手の駒が1〜4マス手前にいると取られやすい。', en: 'A piece on a centre square is easy to capture when a rival piece stands 1–4 squares behind it.' } },
  { id: 'pagain', rule: 'popular', kind: 'again', cat: 'vari', n: 20, name: { ja: 'もう一度（52マス）', en: 'Throw again (52 squares)' }, desc: { ja: '52マスの盤で、腕の先に止まる一手。', en: 'On the 52-square board, land on an arm end.' }, hint: { ja: '腕の先の丸いマスに届く駒は？', en: 'Which piece reaches a rounded arm-end square?' } },
  { id: 'penter', rule: 'popular', kind: 'enter', cat: 'vari', n: 20, name: { ja: '「1」で入れる（52マス）', en: 'Enter with a 1 (52 squares)' }, desc: { ja: '入れるのはいつも「1」の目だけ。入れるか、進めるか。', en: 'Only a 1 ever enters. Enter, or move on?' }, hint: { ja: '出発マスは中央。近くに相手の駒がいないか見よう。', en: 'The entry square is in the centre. Is a rival piece close behind it?' } },
  { id: 'pgoal', rule: 'popular', kind: 'goal', cat: 'vari', n: 10, name: { ja: '上がって宝をもらう', en: 'Go home, take a stake' }, desc: { ja: '上がるたびに相手から宝を1もらえる。', en: 'Every piece home takes 1 from your rival.' }, hint: { ja: '残りのマスの数と出た数が同じ駒は？', en: 'Which piece is exactly that far from home?' } },
];
const CATS = [
  { id: 'basic', name: { ja: 'ベルの復元', en: 'Bell’s rules' } },
  { id: 'tactics', name: { ja: '宝と取り合い', en: 'Stakes & captures' } },
  { id: 'vari', name: { ja: '広く知られたルール', en: 'Popular rules' } },
];
const MINGAP = 0.04;
function collect(rule, seed, want) {   // want: { kind: 数 }
  const got = {}, seen = new Set(); for (const k in want) got[k] = [];
  const full = () => Object.keys(want).every(k => got[k].length >= want[k]);
  let tried = 0;
  for (const q of C.positions(rule, seed, 4000)) {
    if (full()) break;
    const key = E.key(q.s) + '#' + q.n; if (seen.has(key)) continue; seen.add(key);
    const e2 = E.evaluate(q.s, q.n, 2); if (e2.length < 2 || e2[0].wp - e2[1].wp < MINGAP) continue;
    const kind = C.kindOf(q.s, q.n, e2); if (!(kind in want) || got[kind].length >= want[kind]) continue;
    const j = C.judge(q.s, q.n, MINGAP); tried++; if (!j) continue;
    got[kind].push({ s: q.s, n: q.n, ev: j.ev, gap: j.gap, kind });
  }
  return got;
}
function make(theme, list) {
  // やさしい順：差の大きいものから。同じ形ばかりにならないよう、目の数もまぜる
  list.sort((a, b) => b.gap - a.gap);
  return list.map((q, i) => {
    const best = q.ev[0].move, ok = q.ev.filter(e => q.ev[0].wp - e.wp < .005).map(e => [e.move.from, e.move.to]);
    return { id: theme.id + '-' + (i + 1), s: C.pack(q.s), n: q.n, ok, best: [best.from, best.to], ev: q.ev.map(e => [e.move.from, e.move.to, Math.round(e.wp * 1000) / 1000]),
      why: C.whyOf(q.s, q.n, q.kind, q.ev), ng: C.ngOf(q.s, q.n, q.kind, q.ev), look: C.lookOf(q.s, q.n, q.kind, best) };
  });
}
const out = { version: 1, rule: 'bell', ui: C.UI, msg: C.MSG, cats: CATS, daily: ['again', 'enter', 'goal'], themes: [] };
for (const rule of ['bell', 'popular']) {
  const ths = THEMES.filter(t => t.rule === rule), want = {}; ths.forEach(t => { want[t.kind] = t.n; });
  const got = collect(rule, rule === 'bell' ? 20261116 : 20261117, want);
  for (const t of ths) { const pz = make(t, got[t.kind]); console.log(t.id, pz.length + '/' + t.n); out.themes.push({ id: t.id, cat: t.cat, rule, name: t.name, desc: t.desc, hint: t.hint, puzzles: pz }); }
}
out.themes.sort((a, b) => THEMES.findIndex(t => t.id === a.id) - THEMES.findIndex(t => t.id === b.id));
C.TR.fill(out);   // テーマ名・説明・ヒントなどに残りの12言語を足す（tools/learn_i18n.js）
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(out));
console.log('puzzles.json', out.themes.reduce((a, t) => a + t.puzzles.length, 0), 'puzzles');
