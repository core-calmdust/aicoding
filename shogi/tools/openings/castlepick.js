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
const ok = C.filter(p => others.every(b => CU.dist(CU.brd(p.sfen), b) >= 5) && (!ST || (ST[p.sfen] && ST[p.sfen].ok && ST[p.sfen].dd[1] - ST[p.sfen].dd[0] <= 2)));
console.log(C.length, 'candidates,', ok.length, 'apart from every other problem and line');
for (const p of ok) { const r = require('./wasm-engine.js').loadSync().analyze(p.sfen, { depth: 9 }), v = new Map(r.map(x => [x.usi, x.s])), ref = Math.max(...p.G.map(u => v.get(u))); p.dd = r.filter(x => !p.G.includes(x.usi) && x.s >= ref - 100).length; }
// (2026-11-28 c_kinmusou) dd with a new engine for every candidate, as lesson-verify.js recounts it (追84: the history moves depth 9 a little)
ok.sort((a, b) => a.dd - b.dd || a.sfen.localeCompare(b.sfen));
// (2026-11-28 担当B, ④ the castle's own theme) a castle built on another (高美濃 on 美濃, 銀冠 on 高美濃): at least half of the
// problems' answers bring a piece toward a square of this castle that the parent castle does not have (its own piece there)
const PARENT = { c_takamino: 'c_mino', c_ginkan: 'c_takamino' }, SRC = require('./src/castle.js');
const own = new Set(), par = PARENT[id] ? SRC.find(x => x.id === PARENT[id]) : null;
const finOf = e => { const q = new E.Position(); q.setSfen(e.start || KIF.START); for (const u of KIF.conv(e.line, e.start).usi) { q.doMove(q.fromUsi(u)); q.sp = 0; } return q.board; };
const pairs = e => { const b = finOf(e); return e.story.marks.map(m => m + ':' + E.typeOf(b[E.makeSq(+m[0], +m[1])])); };
if (par) { const pp = new Set(pairs(par)); pairs(SRC.find(x => x.id === id)).forEach(x => { if (!pp.has(x)) own.add(x); }); }
const STP = { 4: [[0, -1], [1, -1], [-1, -1], [1, 1], [-1, 1]], 7: [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1]], 8: [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]] };
const dst = (t, a0, b0) => { const d = new Array(81).fill(99), q = [a0]; d[a0] = 0; while (q.length) { const s0 = q.shift(), f = E.sqFile(s0), r = E.sqRank(s0); for (const [df, dr] of STP[t] || []) { const f2 = f - df, r2 = r + dr; if (f2 < 1 || f2 > 9 || r2 < 1 || r2 > 9) continue; const s2 = E.makeSq(f2, r2); if (d[s2] > d[s0] + 1) { d[s2] = d[s0] + 1; q.push(s2); } } } return d[b0]; };
const themed = p => { const q = new E.Position(); q.setSfen(p.sfen); return p.accept.some(u => { const m = q.fromUsi(u); if (E.isDrop(m)) return false; const fr = E.mFrom(m), to = E.mTo(m), t = E.typeOf(q.board[fr]);
  return [...own].some(x => { const [mk, tt] = x.split(':'), sq = E.makeSq(+mk[0], +mk[1]); return +tt === t && dst(t, to, sq) < dst(t, fr, sq); }); }); };
ok.forEach(p => { p.th = own.size ? themed(p) : true; });
if (own.size) console.log('own squares', [...own].join(' '), '—', ok.filter(p => p.th).length, 'of', ok.length, 'candidates bring a piece toward them');
// spread over dd: greedy from the evenly spaced places, apart from each other, one answer at most twice
const pick = [], cnt = new Map(), fits = p => pick.every(q => CU.dist(CU.brd(p.sfen), CU.brd(q.sfen)) >= 5) && p.accept.every(u => (cnt.get(u) || 0) < 2) && (p.th || pick.filter(q => !q.th).length < Math.floor(N / 2));
for (let i = 0; i < N; i++) { const at = Math.round(i * (ok.length - 1) / Math.max(1, N - 1)); for (let k = 0; k < ok.length; k++) { const p = ok[(at + k) % ok.length]; if (!pick.includes(p) && fits(p)) { pick.push(p); p.accept.forEach(u => cnt.set(u, (cnt.get(u) || 0) + 1)); break; } } }
pick.sort((a, b) => a.dd - b.dd);
pick.forEach(p => console.log(p.th ? '★' : ' ', 'dd', p.dd, 'left', p.left, p.accept.join('/'), p.sfen));
const OUT = path.join(__dirname, 'lineprobs.json'), all = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const mk = require('./src/castle.js').find(x => x.id === id).story.marks;   // (the castle's squares: 3D says when the answer lands on one)
// (2026-11-28) mp: the piece of the line's final position on each castle square (3D: 「決まった場所に入る」 only for that piece)
const KIF2 = require('./kif.js'), e2 = require('./src/castle.js').find(x => x.id === id), q2 = new E.Position(); q2.setSfen(e2.start || KIF2.START); for (const u of KIF2.conv(e2.line, e2.start).usi) { q2.doMove(q2.fromUsi(u)); q2.sp = 0; }
const mp = mk.map(m => 'xplnsbrgk'[E.typeOf(q2.board[E.makeSq(+m[0], +m[1])])]);
all[id] = pick.map(p => { const o = Object.assign({}, p, { mk, mp }); delete o.sc8; delete o.th; return o; });
fs.writeFileSync(OUT, JSON.stringify(all));
