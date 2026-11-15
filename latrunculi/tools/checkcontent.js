// 収録コンテンツの検査：詰め問題は「表示手数ちょうどで解け、それより短くは解けない」こと、
// レッスンは正解手がすべて合法で、最善手が正解に含まれることを全問確かめる。
//   node tools/checkcontent.js
const E = require('../engine.js'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
let bad = 0, n = 0;
const pz = JSON.parse(fs.readFileSync(path.join(dir, 'puzzles.json'), 'utf8'));
const seen = new Set();
for (const t of pz.themes) {
  if (t.puzzles.length < 20) { console.log('NG theme', t.id, 'only', t.puzzles.length); bad++; }
  for (const [i, p] of t.puzzles.entries()) {
    n++;
    if (seen.has(p.s)) { console.log('NG dup', t.id, i); bad++; } seen.add(p.s);
    const r = E.goalMin(p.s, [], p.n, p.g, pz.rule, 4e6);
    if (!r || r.n !== p.n) { console.log('NG puzzle', t.id, i, p.s, 'n', p.n, 'got', r && r.n); bad++; }
  }
}
const ls = JSON.parse(fs.readFileSync(path.join(dir, 'lessons.json'), 'utf8'));
for (const st of ls.steps) for (const [i, p] of st.problems.entries()) {
  n++;
  const pos = E.Pos.from(p.s), legal = new Set(pos.moves());
  if (!p.ok.length || p.ok.some(m => !legal.has(m))) { console.log('NG lesson illegal', st.id, i); bad++; }
  if (p.best != null && !p.ok.includes(p.best)) { console.log('NG lesson best', st.id, i); bad++; }
  if (p.ok.length === legal.size) { console.log('NG lesson trivial', st.id, i); bad++; }
}
console.log(bad ? 'FAILED ' + bad : 'OK', n, 'items');
process.exit(bad ? 1 : 0);
