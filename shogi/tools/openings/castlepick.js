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
const STF = path.join(__dirname, `castlestable-${id}.json`), ST = fs.existsSync(STF) ? JSON.parse(fs.readFileSync(STF, 'utf8')) : null;   // (castlestable.js: 追84, the reads after other reads agree)
// (2026-11-28 担当B, c_furiana・c_ibiana) quiet for both sides: the opponent, if it were its move, has no capture that wins material
// (SEE > 0) — a ☖ tokin in the camp attacking the bishop is not a "build the castle" position — and even material (no hand pieces,
// the same pieces on both sides: a castle side a bishop down is not an opening position)
const threat = sf => { const q = new E.Position(); q.setSfen(sf.replace(/ b /, ' w ')); let w = 0; for (const m of q.legalMoves(true)) if (!E.isDrop(m) && q.board[E.mTo(m)]) w = Math.max(w, q.see(m)); return w; };
const even = sf => { const [b, , h] = sf.split(' '); if (h !== '-') return false; const c = {}; for (const ch of b.replace(/\+/g, '')) if (/[a-z]/i.test(ch)) c[ch] = (c[ch] || 0) + 1; return 'plnsgbrk'.split('').every(x => (c[x] || 0) === (c[x.toUpperCase()] || 0)); };
const ok = C.filter(p => even(p.sfen) && threat(p.sfen) === 0 && others.every(b => CU.dist(CU.brd(p.sfen), b) >= 5) && (!ST || (ST[p.sfen] && ST[p.sfen].ok && ST[p.sfen].dd[1] - ST[p.sfen].dd[0] <= 2)));
console.log(C.length, 'candidates,', ok.length, 'apart from every other problem and line');
// (2026-11-28 担当B) the reads again as tools/lesson-verify.js reads them (a new engine for each candidate, depth 8 then 9): the
// accepted set by both, no grey zone, the castle within 80 of the best, |best| ≤ 300 and no promoted piece, 3+ moves outside; the
// stored accept / cand / floor / dd from these reads (candidates made before castleprobs.js had the even / promoted filter too)
for (const p of ok.slice()) { const W2 = require('./wasm-engine.js').loadSync(), R = [8, 9].map(d => W2.analyze(p.sfen, { depth: d })), sets = []; let bad = false;
  const q = new E.Position(); q.setSfen(p.sfen); if (q.board.some(x => x && E.typeOf(x) > 8)) bad = true;
  for (const r of R) { const v = new Map(r.map(x => [x.usi, x.s])), ref = Math.max(...p.G.map(u => v.get(u)));
    if (r[0].s - ref > 80 || Math.abs(r[0].s) > 300 || p.G.some(u => v.get(u) < ref - 40 && v.get(u) >= ref - 100)) bad = true; sets.push(p.G.filter(u => v.get(u) >= ref - 40).sort().join(',')); }
  const r = R[1], v = new Map(r.map(x => [x.usi, x.s])), acc = sets[1].split(',');
  if (bad || sets[0] !== sets[1] || r.length - acc.length < 3) { ok.splice(ok.indexOf(p), 1); continue; }
  p.accept = acc.sort((a, b) => v.get(b) - v.get(a)); p.pv = [p.accept[0]]; p.floor = r[r.length - 1].s;
  p.cand = r.slice(0, 12).map(x => [x.usi, x.s]); for (const u of p.accept) if (!p.cand.some(c => c[0] === u)) p.cand.push([u, v.get(u)]);
  const ref = Math.max(...p.G.map(u => v.get(u))); p.dd = r.filter(x => !p.G.includes(x.usi) && x.s >= ref - 100).length; }
console.log(ok.length, 'still pass by a new engine');
ok.sort((a, b) => a.dd - b.dd || a.sfen.localeCompare(b.sfen));
// spread over dd: greedy from the evenly spaced places, apart from each other, one answer at most twice
const pick = [], cnt = new Map(), fits = p => pick.every(q => CU.dist(CU.brd(p.sfen), CU.brd(q.sfen)) >= 5) && p.accept.every(u => (cnt.get(u) || 0) < 2);
for (let i = 0; i < N; i++) { const at = Math.round(i * (ok.length - 1) / Math.max(1, N - 1)); for (let k = 0; k < ok.length; k++) { const p = ok[(at + k) % ok.length]; if (!pick.includes(p) && fits(p)) { pick.push(p); p.accept.forEach(u => cnt.set(u, (cnt.get(u) || 0) + 1)); break; } } }
pick.sort((a, b) => a.dd - b.dd);
pick.forEach(p => console.log('dd', p.dd, 'left', p.left, p.accept.join('/'), p.sfen));
const OUT = path.join(__dirname, 'lineprobs.json'), all = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const mk = require('./src/castle.js').find(x => x.id === id).story.marks;   // (the castle's squares: 3D says when the answer lands on one)
// (2026-11-28) mp: the piece of the line's final position on each castle square (3D: 「決まった場所に入る」 only for that piece)
const KIF2 = require('./kif.js'), e2 = require('./src/castle.js').find(x => x.id === id), q2 = new E.Position(); q2.setSfen(e2.start || KIF2.START); for (const u of KIF2.conv(e2.line, e2.start).usi) { q2.doMove(q2.fromUsi(u)); q2.sp = 0; }
const mp = mk.map(m => 'xplnsbrgk'[E.typeOf(q2.board[E.makeSq(+m[0], +m[1])])]);
all[id] = pick.map(p => { const o = Object.assign({}, p, { mk, mp }); delete o.sc8; return o; });
fs.writeFileSync(OUT, JSON.stringify(all));
