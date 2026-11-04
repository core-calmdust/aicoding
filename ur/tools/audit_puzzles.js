// ur/tools/audit_puzzles.js — ur/puzzles.json の点検
// 局面の正しさ・最善手が合法で深さ3でも明確に最善・重複なし・10言語の文言・10問ステージ
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), X = require('./learn_text.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
let bad = 0, n = 0; const seen = new Set();
const ng = (id, m) => { bad++; console.log('NG', id, m); };
const has10 = (o, id, k) => { for (const l of X.LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) ng(id, `text ${k} ${l}`); };
const deep = process.argv.includes('--deep');
for (const T of D.themes) {
  has10(T.name, T.id, 'name'); has10(T.desc, T.id, 'desc'); has10(T.hint, T.id, 'hint');
  if (T.puzzles.length < 15 || T.puzzles.length > 50) ng(T.id, 'count ' + T.puzzles.length);
  let prevGap = 9;
  for (const p of T.puzzles) {
    n++;
    const s = { rule: p.s.rule, pos: p.s.pos, turn: 0, winner: -1 }, rl = E.RULES[s.rule];
    if (s.pos[0].length !== rl.pieces || s.pos[1].length !== rl.pieces) ng(p.id, 'piece count');
    for (const sd of [0, 1]) { const on = s.pos[sd].filter(x => x >= 1 && x <= rl.pathLen); if (new Set(on).size !== on.length) ng(p.id, 'stacked'); }
    const c0 = new Set(s.pos[0].filter(x => x >= 1 && x <= rl.pathLen).map(x => rl.cell[0][x]));
    if (s.pos[1].some(x => x >= 1 && x <= rl.pathLen && c0.has(rl.cell[1][x]))) ng(p.id, 'two sides on one square');
    if (s.pos[0].every(x => x === rl.goal) || s.pos[1].every(x => x === rl.goal)) ng(p.id, 'finished');
    const ms = E.legalMoves(s, p.n);
    if (ms.length < 2) ng(p.id, 'only one move');
    if (!ms.find(m => m.from === p.best[0] && m.to === p.best[1])) ng(p.id, 'best not legal');
    if (p.ev.length !== ms.length) ng(p.id, 'ev length');
    const k = E.key(s) + '/' + p.n; if (seen.has(k)) ng(p.id, 'duplicate'); seen.add(k);
    if (!(p.gap >= 0.03)) ng(p.id, 'gap ' + p.gap);
    if (p.gap > prevGap + 1e-9) ng(p.id, 'not easy→hard'); prevGap = p.gap;
    if (deep) { const ev = E.evaluate(s, p.n, { depth: 3 }); if (ev[0].move.from !== p.best[0] || ev[0].wp - ev[1].wp < 0.03) ng(p.id, 'depth3 disagrees'); }
    if (!X.MSG[p.why[0]]) ng(p.id, 'why key');
    for (const f in p.ng || {}) if (!X.MSG[p.ng[f][0]]) ng(p.id, 'ng key');
  }
}
for (const k in D.ui) has10(D.ui[k], 'ui', k);
for (const k in D.msg) has10(D.msg[k], 'msg', k);
console.log(`${n} puzzles, ${D.themes.length} themes (${D.themes.map(t => t.id + ':' + t.puzzles.length + '=' + Math.ceil(t.puzzles.length / 10) + 'st').join(' ')}), problems: ${bad}`);
process.exit(bad ? 1 : 0);
