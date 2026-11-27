// (2026-11-28 第2期・担当B) choose the castle problems from castleprobs-<id>-*.json: dd (the rivals: moves outside the castle set
// within 100 of it, depth 9), 5+ squares from every other shogi problem, every shown line's positions (追1) and each other, one
// answer at most twice, easy → hard by dd; writes lineprobs.json[id] (build.js puts it into openings-castle.json as lineProbs).
// node shogi/tools/openings/castlepick.js <id> [n=6]
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./wasm-engine.js').loadSync(), E = W.E, CU = require('./curate.js'), KIF = require('./kif.js');
const id = process.argv[2], N = +(process.argv.find(a => a.startsWith('n=')) || 'n=6').slice(2);
const C = []; fs.readdirSync(__dirname).filter(f => f.startsWith(`castleprobs-${id}-`)).forEach(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')).forEach(p => { if (!C.some(x => x.sfen === p.sfen)) C.push(p); }));
const ROOT = path.join(__dirname, '../../..'), others = [];
for (const c of ['beg', 'mid', 'adv', 'sp', 'new', 'castle']) {
  JSON.parse(fs.readFileSync(path.join(ROOT, `shogi/openings-${c}.json`), 'utf8')).sets.forEach(s => (s.problems || []).concat(s.id === id ? [] : s.lineProbs || []).forEach(p => others.push(CU.brd(p.sfen))));
  require(`./src/${c}.js`).forEach(e => { const q = new E.Position(); q.setSfen(e.start || KIF.START); for (const u of KIF.conv(e.line, e.start).usi) { q.doMove(q.fromUsi(u)); q.sp = 0; others.push(CU.brd(q.sfen())); } });
}
JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/openings.json'), 'utf8')).sets.forEach(s => (s.problems || []).forEach(p => others.push(CU.brd(p.sfen))));
const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/lessons.json'), 'utf8')); L.grades.forEach(g => { g.problems.forEach(p => others.push(CU.brd(p.sfen))); (g.ramp || []).forEach(r => r.sfen && others.push(CU.brd(r.sfen))); });
const ok = C.filter(p => others.every(b => CU.dist(CU.brd(p.sfen), b) >= 5));
console.log(C.length, 'candidates,', ok.length, 'apart from every other problem and line');
for (const p of ok) { const r = W.analyze(p.sfen, { depth: 9 }), v = new Map(r.map(x => [x.usi, x.s])), ref = Math.max(...p.G.map(u => v.get(u))); p.dd = r.filter(x => !p.G.includes(x.usi) && x.s >= ref - 100).length; }
ok.sort((a, b) => a.dd - b.dd || a.sfen.localeCompare(b.sfen));
// spread over dd: greedy from the evenly spaced places, apart from each other, one answer at most twice
const pick = [], cnt = new Map(), fits = p => pick.every(q => CU.dist(CU.brd(p.sfen), CU.brd(q.sfen)) >= 5) && p.accept.every(u => (cnt.get(u) || 0) < 2);
for (let i = 0; i < N; i++) { const at = Math.round(i * (ok.length - 1) / Math.max(1, N - 1)); for (let k = 0; k < ok.length; k++) { const p = ok[(at + k) % ok.length]; if (!pick.includes(p) && fits(p)) { pick.push(p); p.accept.forEach(u => cnt.set(u, (cnt.get(u) || 0) + 1)); break; } } }
pick.sort((a, b) => a.dd - b.dd);
pick.forEach(p => console.log('dd', p.dd, 'left', p.left, p.accept.join('/'), p.sfen));
const OUT = path.join(__dirname, 'lineprobs.json'), all = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const mk = require('./src/castle.js').find(x => x.id === id).story.marks;   // (the castle's squares: 3D says when the answer lands on one)
all[id] = pick.map(p => { const o = Object.assign({}, p, { mk }); delete o.sc8; return o; });
fs.writeFileSync(OUT, JSON.stringify(all));
