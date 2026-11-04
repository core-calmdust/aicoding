// ur/tools/gen_puzzles.js — 「次の一手」パズル（ur/puzzles.json）を作る
// 自己対局の局面（learn_common.pool）＋合成のレース局面から、evaluate（深さ2）で最善手が次善より明確に良く、
// 深さ3でも同じ最善手・差が十分なものだけを採用。テーマ別・易しい順（差の大きい順）、重複・ほぼ同じ局面は除く。
// 使い方: node ur/tools/gen_puzzles.js [--cache DIR]
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./learn_common.js'), X = require('./learn_text.js');
const E = L.E;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || path.join(require('os').tmpdir(), 'ur-learn-cache');
fs.mkdirSync(CACHE, { recursive: true });

const MIN_GAP = 0.04, MIN_GAP3 = 0.03;
// テーマ：割り当ての優先順（少ないものから）と目標数
const PLAN = [
  { id: 'race', from: ['race'], want: 20, cat: 'end' },
  { id: 'goal', from: ['goal'], want: 22, cat: 'end' },
  { id: 'escape', from: ['escape'], want: 22, cat: 'tactics' },
  { id: 'center', from: ['center', 'hold'], want: 30, cat: 'basic' },
  { id: 'enter', from: ['enter', 'advance'], want: 24, cat: 'basic' },
  { id: 'capture', from: ['capture'], want: 32, cat: 'tactics' },
  { id: 'rosette', from: ['rosette'], want: 28, cat: 'basic' },
  { id: 'safe', from: ['safe'], want: 24, cat: 'tactics' },
];
function fill(key, params) { const t = X.MSG[key], o = {}; for (const l of X.LANGS) o[l] = t[l].replace(/\{(\w+)\}/g, (_, k) => params[k] != null ? params[k] : ''); return o; }

function build() {
  const P = L.pool('finkel', 200, 1, path.join(CACHE, 'pool-finkel-1.json')).concat(L.synthRace(4000, 5).concat(L.synthRace(8000, 77), L.synthRace(8000, 313), L.synthRace(8000, 529)));
  const cand = P.filter(p => p.ev.length >= 2 && p.ev[0][2] - p.ev[1][2] >= (L.contact(p.s) ? MIN_GAP : 0.03) && p.ev[0][2] > 0.03 && p.ev[0][2] < 0.985);
  cand.forEach(p => { p.th = L.classify(p); p.gap = p.ev[0][2] - p.ev[1][2]; });
  const used = new Set(), out = {};
  for (const T of PLAN) {
    const list = cand.filter(p => !used.has(L.sig(p)) && T.from.some(t => p.th.includes(t)))
      .sort((a, b) => b.gap - a.gap);
    const got = [];
    for (const p of list) {
      if (got.length >= T.want) break;
      const sg = L.sig(p); if (used.has(sg)) continue;
      const ev3 = L.verify(p, MIN_GAP3); if (!ev3) continue;
      used.add(sg); p.ev3 = ev3; got.push(p);
    }
    got.sort((a, b) => (b.ev3[0][2] - b.ev3[1][2]) - (a.ev3[0][2] - a.ev3[1][2]) || a.ev3.length - b.ev3.length);
    out[T.id] = got;
    process.stderr.write(`${T.id}: ${got.length} / cand ${list.length}\n`);
  }
  return out;
}
function main() {
  const sel = build();
  const SHOW = ['rosette', 'center', 'enter', 'capture', 'escape', 'safe', 'goal', 'race'];
  const themes = SHOW.map(id => PLAN.find(T => T.id === id)).map(T => ({
    id: T.id, cat: T.cat, name: X.THEME[T.id].name, desc: X.THEME[T.id].desc, hint: X.THEME[T.id].hint,
    puzzles: sel[T.id].map((p, i) => {
      const th = T.id === 'center' ? (p.th.includes('hold') && !p.th.includes('center') ? 'hold' : 'center') : T.id === 'enter' ? (p.th.includes('advance') ? 'advance' : 'enter') : T.id;
      const q = Object.assign({}, p, { ev: p.ev3 });
      const r = L.reasons(q, th);
      const best = p.ev3[0];
      return { id: `${T.id}-${i + 1}`, s: { rule: p.s.rule, pos: p.s.pos, turn: 0 }, n: p.n, ok: [[best[0], best[1]]], best: [best[0], best[1]], ev: p.ev3, gap: +(p.ev3[0][2] - p.ev3[1][2]).toFixed(3), why: r.why, ng: r.ng, look: L.lookMarks(q, th) };
    }),
  }));
  const cats = ['basic', 'tactics', 'end'].map(id => ({ id, name: X.CATS[id] }));
  const data = { version: 1, rule: 'finkel', ui: X.UI, msg: X.MSG, cats, daily: themes.map(t => t.id), themes };
  const file = path.join(__dirname, '..', 'puzzles.json');
  fs.writeFileSync(file, JSON.stringify(data));
  console.log('wrote', file, themes.map(t => t.id + ':' + t.puzzles.length).join(' '), 'total', themes.reduce((a, t) => a + t.puzzles.length, 0));
}
main();
