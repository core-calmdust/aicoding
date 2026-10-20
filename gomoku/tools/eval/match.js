// old eval vs learned eval, same search, fixed node budget per move. node match.js <rule> <pairs> <nodes> [wfile]
'use strict';
const fs = require('fs');
const E = require('/home/claude/aicoding/gomoku/engine.js');
const [RULE, PAIRS, NODES, WF] = [process.argv[2] || 'renju', +process.argv[3] || 20, +process.argv[4] || 20000, process.argv[5]];
const G = RULE === 'renju' ? 'renju' : 'std';
if (WF !== 'none') { const W = JSON.parse(fs.readFileSync(WF || `/home/claude/work/eval/w_${G}.json`, 'utf8')), NF = E.NCOMB * 4 + 202;
  const K = process.env.OLDK ? +process.env.OLDK : 0; E.setWeights(G, W.slice(0, NF), K); if (W.length > NF) E.setLineWeights(G, W.slice(NF)); }
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(g => (RULE === 'renju') === (g.rule === 'renju'));
let seed = +process.env.SEED || 99; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
if (process.env.NN) E.setNN(G, fs.readFileSync('/home/claude/aicoding/gomoku/nn.wasm'), fs.readFileSync(process.env.NN));
const eOld = new E.Engine(), eNew = new E.Engine(); eOld.learned = !!process.env.OLDLEARNED; eOld.useNN = false; eNew.learned = true;
let sc = { new: 0, old: 0, draw: 0 };
function play(open, newBlack) {
  const pos = E.setup(RULE, { b: [], w: [] });
  for (const m of open) pos.make(m);
  eOld.clear(); eNew.clear();
  while (true) {
    const st = pos.status(); if (st.over) return st.winner;
    if (!pos.legal().length) return 3 - pos.side;
    const eng = (pos.side === 1) === newBlack ? eNew : eOld;
    const r = eng.best(pos, { ms: 1e9, nodes: NODES, vct: 9, defend: 5 });
    let m = r.i >= 0 ? E.I2M[r.i] : pos.legal()[0];
    if (!pos.isLegal(m)) return 3 - pos.side;
    pos.make(m);
    if (pos.ply >= 225) return 0;
  }
}
// balanced openings: Rapfi-labelled positions at ply 6-14 with |eval| <= 120
const all = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const OPENS = [];
for (const f of fs.readdirSync('/home/claude/work/eval').filter(f => /^labels_\d+\.jsonl$/.test(f))) for (const l of fs.readFileSync('/home/claude/work/eval/' + f, 'utf8').split('\n')) {
  if (!l) continue; let o; try { o = JSON.parse(l); } catch (e) { continue; }
  const g = all[o.g], ev = String(o.ev); if ((RULE === 'renju') !== (g.rule === 'renju') || (RULE !== 'renju' && g.rule !== RULE)) continue;
  if (ev.includes('M') || Math.abs(+ev) > 120 || o.k < 6 || o.k > 14) continue;
  OPENS.push(g.moves.slice(0, o.k));
}
console.log('openings', OPENS.length);
for (let k = 0; k < PAIRS; k++) {
  const open = OPENS[Math.floor(rnd() * OPENS.length)];
  for (const nb of [true, false]) {
    const w = play(open, nb);
    if (!w) sc.draw++; else if ((w === 1) === nb) sc.new++; else sc.old++;
  }
  const N = sc.new + sc.old + sc.draw, s = (sc.new + sc.draw / 2) / N;
  console.log(`pair ${k + 1}: new ${sc.new} old ${sc.old} draw ${sc.draw}  score ${(s * 100).toFixed(1)}%  elo ${(-400 * Math.log10(1 / Math.max(0.01, Math.min(0.99, s)) - 1)).toFixed(0)}`);
}
