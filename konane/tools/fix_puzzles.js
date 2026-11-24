// Kōnane: rebuilds konane/puzzles.json so that every puzzle passes tools/lesson-verify-konane.js (2026-11-24 担当C, the 3D table).
// Keeps the puzzles that pass on their own, replaces the others with raw candidates of gen_puzzles.js (JSON lines) that pass, no two
// positions within 4 squares of each other (the 8 symmetries, colours as they are or swapped; the lesson positions too), each theme
// ordered easy → hard by d (near misses × 2 + wrong first moves).
//   node konane/tools/fix_puzzles.js raw1.jsonl [raw2.jsonl …]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const V = require(path.join(ROOT, 'tools/lesson-verify-konane.js'));
const E = require('../engine.js');
const FILE = path.join(__dirname, '..', 'puzzles.json');
const PZ = JSON.parse(fs.readFileSync(FILE, 'utf8'));
E.setRule(PZ.rule || 's8');
const SIZE = { w1: 10 };
const one = (id, P) => V.verify({ data: { rule: PZ.rule, themes: [{ id, puzzles: [P] }] }, no2d: true });
const okIn = (id, P) => { const r = one(id, P); return r.out.length ? null : r.rows[0]; };
const S = V.SYM(8), vars = b => { const v = []; for (const f of S) for (const sw of [false, true]) v.push(V.symB(b, f, 8, sw)); return v; };
const chosen = [];
const near = b => chosen.some(v => v.some(x => V.diff(b, x) <= 4));
// the lesson positions (verify() checks them as well; a single-puzzle verify already reports ⑤ against them)
const raw = []; for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) { try { raw.push(JSON.parse(l)); } catch (e) {} }
const seen = new Set(), cands = raw.filter(p => { const k = p.s.b + p.s.side; if (seen.has(k)) return false; seen.add(k); return true; });
let kept = 0, replaced = 0;
const out = PZ.themes.map(T => ({ id: T.id, grp: T.grp, list: [] }));
// 1) the puzzles that pass on their own
PZ.themes.forEach((T, ti) => T.puzzles.forEach(P => { const r = okIn(T.id, P); if (r && !near(P.s.b)) { chosen.push(vars(P.s.b)); out[ti].list.push({ P: { s: { b: P.s.b, side: P.s.side }, n: P.n, a: P.a }, d: r.d }); kept++; } }));
// 2) fill from the candidates (the tactical themes first: they are rarer)
const order = ['chain', 'stop', 'w1', 'w2', 'w3', 'w4', 'w5'];
for (const id of order) {
  const ti = out.findIndex(T => T.id === id), want = SIZE[id] || 36;
  for (const c of cands) {
    if (out[ti].list.length >= want) break;
    if (c.used) continue;
    if (/^w/.test(id) && c.n !== +id.slice(1)) continue;
    if (!/^w/.test(id) && !(c.n >= 2 && c.n <= 5)) continue;
    const P = { s: { b: c.s.b, side: c.s.side }, n: c.n, a: c.nm };
    if (near(P.s.b)) continue;
    const r = okIn(id, P); if (!r) continue;
    c.used = true; chosen.push(vars(P.s.b)); out[ti].list.push({ P, d: r.d }); replaced++;
  }
}
const themes = out.map(T => ({ id: T.id, grp: T.grp, puzzles: T.list.sort((a, b) => a.d - b.d).map(x => x.P) }));
const res = Object.assign({}, PZ, { themes, rev: '2026-11-24' });
fs.writeFileSync(FILE, JSON.stringify(res));
process.stderr.write(`kept ${kept}, new ${replaced}; ` + themes.map(T => T.id + ' ' + T.puzzles.length).join(', ') + '\n');
